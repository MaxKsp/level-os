[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Phase,

    [switch]$AutoCommit,

    [switch]$Push,

    [switch]$DryRun,

    [switch]$SkipArchitect,

    [int]$MaxFixAttempts = 2,

    [switch]$VerboseLogs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
    $root = & git rev-parse --show-toplevel 2>$null
    if (-not $root) {
        throw 'Not inside a Git repository.'
    }
    return ($root | Select-Object -First 1).Trim()
}

function Get-PowerShellExecutable {
    return (Get-Process -Id $PID).Path
}

function Resolve-AgentCommandPath {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('codex', 'claude')]
        [string]$Name
    )

    $appData = [Environment]::GetFolderPath('ApplicationData')
    $cmdPath = Join-Path $appData "npm/$Name.cmd"

    if (-not (Test-Path -LiteralPath $cmdPath)) {
        throw "Required agent command not found: $cmdPath"
    }

    return $cmdPath
}

function Get-PhaseObject {
    param([string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Find-LatestPlanPath {
    param(
        [string]$RepoRoot
    )

    $runsRoot = Join-Path $RepoRoot 'automation/runs'
    if (-not (Test-Path -LiteralPath $runsRoot)) {
        return $null
    }

    $dirs = Get-ChildItem -LiteralPath $runsRoot -Directory | Sort-Object Name -Descending
    foreach ($dir in $dirs) {
        $planPath = Join-Path $dir.FullName 'plan.json'
        if (Test-Path -LiteralPath $planPath) {
            return $planPath
        }
    }

    return $null
}

function Assert-CleanPreconditions {
    param(
        [string]$RepoRoot,
        [string]$ResolvedPhasePath
    )

    $gitRoot = (& git rev-parse --show-toplevel).Trim()
    if ($gitRoot.Replace('\', '/') -ne $RepoRoot.Replace('\', '/')) {
        throw "Current directory is not the Git root: $RepoRoot"
    }

    $branch = (& git branch --show-current).Trim()
    if (-not $branch) {
        throw 'Unable to determine current branch.'
    }

    if ($branch -in @('main', 'master')) {
        throw "Refusing to run on protected branch: $branch"
    }

    $status = @(& git status --porcelain)
    if ($status.Count -gt 0) {
        throw 'Working tree must be clean before starting a phase.'
    }

    foreach ($toolName in @('git', 'node')) {
        if (-not (Get-Command $toolName -ErrorAction SilentlyContinue)) {
            throw "Required executable not found: $toolName"
        }
    }

    $null = Resolve-AgentCommandPath -Name 'codex'
    $null = Resolve-AgentCommandPath -Name 'claude'

    if (-not (Test-Path -LiteralPath $ResolvedPhasePath)) {
        throw "Phase file not found: $ResolvedPhasePath"
    }

    $phaseObject = Get-PhaseObject -Path $ResolvedPhasePath
    foreach ($phpCommand in @($phaseObject.phpTests) + @($phaseObject.phpLint)) {
        $exe = ($phpCommand -split '\s+')[0]
        if ($exe -match '^[A-Za-z]:\\') {
            if (-not (Test-Path -LiteralPath $exe)) {
                throw "Referenced PHP executable not found: $exe"
            }
        } elseif (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
            throw "Required executable not found: $exe"
        }
    }

    return $branch
}

function New-RunDirectory {
    param([string]$RepoRoot)

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $runDir = Join-Path $RepoRoot "automation/runs/$timestamp"
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    return $runDir
}

function Get-ChangedFiles {
    $lines = @(& git status --porcelain)
    $files = @()
    foreach ($line in $lines) {
        if (-not $line) {
            continue
        }

        $entry = if ($line.Length -ge 4) { $line.Substring(3).Trim() } else { $line.Trim() }
        if ($entry -like '* -> *') {
            $entry = ($entry -split ' -> ')[-1]
        }

        if ($entry) {
            $files += $entry.Replace('\', '/')
        }
    }

    return $files | Sort-Object -Unique
}

function Invoke-NativeAndCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )

    $argumentDisplay = if ($ArgumentList.Count -gt 0) {
        ($ArgumentList | ForEach-Object {
            if ($_ -match '\s') { '"' + $_.Replace('"', '\"') + '"' } else { $_ }
        }) -join ' '
    } else {
        ''
    }

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = $argumentDisplay
    $startInfo.WorkingDirectory = (Get-Location).Path
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $null = $process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $exitCode = $process.ExitCode

    $combined = @()
    if ($stdout) {
        $combined += ($stdout -split "`r?`n")
    }
    if ($stderr) {
        $combined += ($stderr -split "`r?`n")
    }
    $combined = @($combined | Where-Object { $_ -ne '' })
    $combined | Out-File -LiteralPath $OutputPath -Encoding utf8

    if ($exitCode -ne 0) {
        $message = @(
            'Native command failed.',
            "Command: $FilePath",
            "Arguments: $argumentDisplay",
            "ExitCode: $exitCode",
            'stderr:',
            ($stderr.TrimEnd())
        ) -join [Environment]::NewLine
        throw $message
    }

    return [pscustomobject]@{
        output   = @($combined)
        stdout   = $stdout
        stderr   = $stderr
        exitCode = $exitCode
        command  = $FilePath
        arguments = @($ArgumentList)
    }
}

function Get-PromptText {
    param(
        [string]$TemplatePath,
        [string]$PhaseJson,
        [string]$PlanJson
    )

    $text = Get-Content -LiteralPath $TemplatePath -Raw
    $text = $text.Replace('{{PHASE_JSON}}', $PhaseJson)
    $text = $text.Replace('{{PLAN_JSON}}', $PlanJson)
    return $text
}

function Invoke-CodexPlan {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [string]$PhaseJson,
        [string]$SchemaPath
    )

    $prompt = Get-PromptText -TemplatePath (Join-Path $RepoRoot 'automation/prompts/architect.md') -PhaseJson $PhaseJson -PlanJson ''
    $promptPath = Join-Path $RunDirectory 'architect-prompt.txt'
    $planOutputPath = Join-Path $RunDirectory 'plan.json'
    $prompt | Out-File -LiteralPath $promptPath -Encoding utf8

    $codexCmd = Resolve-AgentCommandPath -Name 'codex'
    $result = Invoke-NativeAndCapture -FilePath $codexCmd -ArgumentList @(
        'exec',
        '--sandbox', 'read-only',
        '--output-last-message', $planOutputPath,
        '--output-schema', $SchemaPath,
        $prompt
    ) -OutputPath (Join-Path $RunDirectory 'plan.stdout.log')

    $planText = ($result.output -join [Environment]::NewLine).Trim()
    $planText | Out-File -LiteralPath (Join-Path $RunDirectory 'plan.txt') -Encoding utf8
    return $planText
}

function Invoke-ClaudeImplementation {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [string]$PhaseJson,
        [string]$PlanJson
    )

    $prompt = Get-PromptText -TemplatePath (Join-Path $RepoRoot 'automation/prompts/implementer.md') -PhaseJson $PhaseJson -PlanJson $PlanJson
    $promptPath = Join-Path $RunDirectory 'implementer-prompt.txt'
    $prompt | Out-File -LiteralPath $promptPath -Encoding utf8

    $claudeCmd = Resolve-AgentCommandPath -Name 'claude'
    $result = Invoke-NativeAndCapture -FilePath $claudeCmd -ArgumentList @(
        '-p',
        $prompt
    ) -OutputPath (Join-Path $RunDirectory 'implementer.stdout.log')

    ($result.output -join [Environment]::NewLine) | Out-File -LiteralPath (Join-Path $RunDirectory 'implementer.txt') -Encoding utf8
}

function Invoke-CodexReview {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [string]$PhaseJson,
        [string]$PlanJson,
        [string]$SchemaPath
    )

    $prompt = Get-PromptText -TemplatePath (Join-Path $RepoRoot 'automation/prompts/reviewer.md') -PhaseJson $PhaseJson -PlanJson $PlanJson
    $promptPath = Join-Path $RunDirectory 'reviewer-prompt.txt'
    $reviewOutputPath = Join-Path $RunDirectory 'review.json'
    $prompt | Out-File -LiteralPath $promptPath -Encoding utf8

    $codexCmd = Resolve-AgentCommandPath -Name 'codex'
    $result = Invoke-NativeAndCapture -FilePath $codexCmd -ArgumentList @(
        'exec',
        '--sandbox', 'read-only',
        '--output-last-message', $reviewOutputPath,
        '--output-schema', $SchemaPath,
        $prompt
    ) -OutputPath (Join-Path $RunDirectory 'review.stdout.log')

    $reviewText = ($result.output -join [Environment]::NewLine).Trim()
    $reviewText | Out-File -LiteralPath (Join-Path $RunDirectory 'review.txt') -Encoding utf8
    return $reviewText
}

function Invoke-FixAttempt {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [string]$PhaseJson,
        [string]$PlanJson,
        [string[]]$Blockers,
        [int]$AttemptNumber
    )

    $prompt = @"
You are Claude Code fixing a rejected Orby migration phase.

Only address the blockers below.
Do not widen scope.
Do not make commits.
Keep the same allowlist and denylist.

Phase definition:
$PhaseJson

Approved plan:
$PlanJson

Blockers:
$($Blockers -join [Environment]::NewLine)
"@

    $claudeCmd = Resolve-AgentCommandPath -Name 'claude'
    $result = Invoke-NativeAndCapture -FilePath $claudeCmd -ArgumentList @(
        '-p',
        $prompt
    ) -OutputPath (Join-Path $RunDirectory "fix-$AttemptNumber.stdout.log")
}

function Write-Summary {
    param(
        [string]$Path,
        [hashtable]$Data
    )

    $lines = @(
        "# Pipeline Summary",
        "",
        "- Phase: $($Data.Phase)",
        "- Branch: $($Data.Branch)",
        "- Plan approved: $($Data.PlanApproved)",
        "- Review approved: $($Data.ReviewApproved)",
        "- Attempts: $($Data.Attempts)",
        "- Duration: $($Data.Duration)",
        "- Commit: $($Data.CommitMessage)",
        "- SHA: $($Data.CommitSha)",
        "- Push: $($Data.PushStatus)",
        "",
        "## Files Modified",
        ""
    )

    if ($Data.Files.Count -eq 0) {
        $lines += '- none'
    } else {
        foreach ($file in $Data.Files) {
            $lines += "- $file"
        }
    }

    $lines += @(
        "",
        "## Failures",
        ""
    )

    if ($Data.Failures.Count -eq 0) {
        $lines += '- none'
    } else {
        foreach ($failure in $Data.Failures) {
            $lines += "- $failure"
        }
    }

    $lines -join [Environment]::NewLine | Out-File -LiteralPath $Path -Encoding utf8
}

$startTime = Get-Date
$repoRoot = Resolve-RepoRoot
$powerShellExe = Get-PowerShellExecutable
Set-Location -LiteralPath $repoRoot

$resolvedPhasePath = Join-Path $repoRoot $Phase
$branch = Assert-CleanPreconditions -RepoRoot $repoRoot -ResolvedPhasePath $resolvedPhasePath
$runDirectory = New-RunDirectory -RepoRoot $repoRoot
$phaseJson = Get-Content -LiteralPath $resolvedPhasePath -Raw
$phaseObject = Get-PhaseObject -Path $resolvedPhasePath
$planSchemaPath = Join-Path $repoRoot 'automation/schemas/plan.schema.json'
$reviewSchemaPath = Join-Path $repoRoot 'automation/schemas/review.schema.json'
$failures = New-Object System.Collections.Generic.List[string]
$attempts = 0
$commitSha = ''
$pushStatus = 'not-requested'

if ($VerboseLogs) {
    Write-Host "Run directory: $runDirectory"
}

$planJson = $null
if ($SkipArchitect) {
    $skipPath = Join-Path $runDirectory 'plan.json'
    if (-not (Test-Path -LiteralPath $skipPath)) {
        $skipPath = Find-LatestPlanPath -RepoRoot $repoRoot
    }
    if (-not $skipPath) {
        throw 'SkipArchitect requires an existing approved plan.json in automation/runs/.'
    }
    $planJson = Get-Content -LiteralPath $skipPath -Raw
} else {
    $planJson = Invoke-CodexPlan -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -SchemaPath $planSchemaPath
}

$planObject = $planJson | ConvertFrom-Json
if (-not $planObject.approved) {
    $failures.Add('Codex did not approve the phase plan.')
    Write-Summary -Path (Join-Path $runDirectory 'summary.md') -Data @{
        Phase        = $phaseObject.id
        Branch       = $branch
        PlanApproved = $false
        ReviewApproved = $false
        Attempts     = 0
        Duration     = ((Get-Date) - $startTime).ToString()
        CommitMessage = ''
        CommitSha    = ''
        PushStatus   = $pushStatus
        Files        = @()
        Failures     = @($failures)
    }
    throw 'Plan not approved.'
}

if (-not $DryRun) {
    Invoke-ClaudeImplementation -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson
}

$validationArgs = @(
    '-NoProfile',
    '-File', (Join-Path $repoRoot 'scripts/validate-phase.ps1'),
    '-Phase', $Phase,
    '-RunDirectory', $runDirectory
)
if ($VerboseLogs) {
    $validationArgs += '-VerboseLogs'
}
$validationJson = & $powerShellExe @validationArgs
if ($LASTEXITCODE -ne 0) {
    $failures.Add('Deterministic validation failed after implementation.')
    throw 'Validation failed.'
}

$reviewJson = Invoke-CodexReview -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson -SchemaPath $reviewSchemaPath
$reviewObject = $reviewJson | ConvertFrom-Json

while ((-not $reviewObject.approved -or @($reviewObject.blockers).Count -gt 0) -and $attempts -lt $MaxFixAttempts) {
    $attempts++
    if ($DryRun) {
        break
    }

    Invoke-FixAttempt -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson -Blockers @($reviewObject.blockers) -AttemptNumber $attempts

    $validationJson = & $powerShellExe @validationArgs
    if ($LASTEXITCODE -ne 0) {
        $failures.Add("Validation failed after fix attempt $attempts.")
        throw 'Validation failed after fix attempt.'
    }

    $reviewJson = Invoke-CodexReview -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson -SchemaPath $reviewSchemaPath
    $reviewObject = $reviewJson | ConvertFrom-Json
}

if (-not $reviewObject.approved -or @($reviewObject.blockers).Count -gt 0) {
    $failures.Add('Review still has blockers after allowed attempts.')
    throw 'Review rejected.'
}

$changedFiles = Get-ChangedFiles
if ($changedFiles.Count -eq 0) {
    $failures.Add('Implementation produced no changes.')
    throw 'No changes detected.'
}

if ($DryRun) {
    Write-Summary -Path (Join-Path $runDirectory 'summary.md') -Data @{
        Phase         = $phaseObject.id
        Branch        = $branch
        PlanApproved  = $true
        ReviewApproved = $true
        Attempts      = $attempts
        Duration      = ((Get-Date) - $startTime).ToString()
        CommitMessage = ''
        CommitSha     = ''
        PushStatus    = 'dry-run'
        Files         = @($changedFiles)
        Failures      = @($failures)
    }
    Write-Host 'DryRun completed. No commit performed.'
    exit 0
}

foreach ($file in $changedFiles) {
    & git add -- $file
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stage file: $file"
    }
}

$cachedStat = @(& git diff --cached --stat)
$cachedStat | Out-File -LiteralPath (Join-Path $runDirectory 'cached-diff-stat.txt') -Encoding utf8
$cachedStat | ForEach-Object { Write-Host $_ }

Write-Host ''
Write-Host 'Files staged for commit:'
$changedFiles | ForEach-Object { Write-Host " - $_" }
Write-Host ''
Write-Host "Commit message: $($phaseObject.commitMessage)"

$shouldCommit = $AutoCommit
if (-not $AutoCommit) {
    $answer = Read-Host 'Create commit now? [y/N]'
    $shouldCommit = $answer -match '^(y|yes)$'
}

if (-not $shouldCommit) {
    $failures.Add('Commit cancelled by human confirmation step.')
    throw 'Commit not confirmed.'
}

& git commit -m $phaseObject.commitMessage
if ($LASTEXITCODE -ne 0) {
    throw 'git commit failed.'
}

$commitSha = (& git rev-parse HEAD).Trim()

$postValidationJson = & $powerShellExe @validationArgs
if ($LASTEXITCODE -ne 0) {
    $failures.Add('Post-commit validation failed.')
    throw 'Post-commit validation failed.'
}

$postStatus = @(& git status --porcelain)
if ($postStatus.Count -gt 0) {
    $failures.Add('Working tree is not clean after commit.')
    throw 'Working tree is not clean after commit.'
}

if ($Push) {
    $upstream = (& git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null)
    if (-not $upstream) {
        $failures.Add('Push requested but branch has no upstream.')
        throw 'No upstream configured.'
    }

    & git push
    if ($LASTEXITCODE -ne 0) {
        $failures.Add('git push failed.')
        throw 'git push failed.'
    }

    $pushStatus = 'pushed'
} else {
    $pushStatus = 'not-requested'
}

Write-Summary -Path (Join-Path $runDirectory 'summary.md') -Data @{
    Phase         = $phaseObject.id
    Branch        = $branch
    PlanApproved  = $true
    ReviewApproved = $true
    Attempts      = $attempts
    Duration      = ((Get-Date) - $startTime).ToString()
    CommitMessage = $phaseObject.commitMessage
    CommitSha     = $commitSha
    PushStatus    = $pushStatus
    Files         = @($changedFiles)
    Failures      = @($failures)
}

Write-Host "Pipeline completed successfully. Commit: $commitSha"
