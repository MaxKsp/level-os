[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Phase,

    [switch]$AutoCommit,

    [switch]$Push,

    [switch]$DryRun,

    [switch]$SkipArchitect,

    [int]$MaxFixAttempts = 2,

    [int]$ArchitectTimeoutSeconds = 300,

    [int]$ImplementerTimeoutSeconds = 900,

    [int]$ReviewerTimeoutSeconds = 300,

    [int]$HeartbeatSeconds = 10,

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

function Resolve-CmdExecutable {
    $cmdPath = Join-Path $env:SystemRoot 'System32\cmd.exe'
    if (-not (Test-Path -LiteralPath $cmdPath)) {
        throw "cmd.exe not found: $cmdPath"
    }
    return $cmdPath
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

function ConvertTo-WindowsCommandLineArgument {
    param(
        [AllowNull()]
        [string]$Argument
    )

    if ($null -eq $Argument -or $Argument.Length -eq 0) {
        return '""'
    }

    if ($Argument -notmatch '[\s"]') {
        return $Argument
    }

    $builder = New-Object System.Text.StringBuilder
    $null = $builder.Append('"')
    $backslashCount = 0

    foreach ($character in $Argument.ToCharArray()) {
        if ($character -eq '\') {
            $backslashCount++
            continue
        }

        if ($character -eq '"') {
            $null = $builder.Append('\' * (($backslashCount * 2) + 1))
            $null = $builder.Append('"')
            $backslashCount = 0
            continue
        }

        if ($backslashCount -gt 0) {
            $null = $builder.Append('\' * $backslashCount)
            $backslashCount = 0
        }

        $null = $builder.Append($character)
    }

    if ($backslashCount -gt 0) {
        $null = $builder.Append('\' * ($backslashCount * 2))
    }

    $null = $builder.Append('"')
    return $builder.ToString()
}

function Join-WindowsCommandLine {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$ArgumentList = @()
    )

    $parts = New-Object System.Collections.Generic.List[string]
    $parts.Add((ConvertTo-WindowsCommandLineArgument -Argument $FilePath))
    foreach ($argument in @($ArgumentList)) {
        $parts.Add((ConvertTo-WindowsCommandLineArgument -Argument $argument))
    }
    return ($parts -join ' ')
}

function Get-CommandExecutableToken {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandText
    )

    if ($CommandText -match '^\s*"([^"]+)"') {
        return $matches[1]
    }

    if ($CommandText -match '^\s*([^\s]+)') {
        return $matches[1]
    }

    throw "Unable to parse executable from command text: $CommandText"
}

function Get-LogTextOrEmpty {
    param([AllowNull()][string]$Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return ''
    }

    return $Text.TrimEnd()
}

function Get-LogTail {
    param(
        [string[]]$Lines,
        [int]$MaxLines = 30
    )

    if (-not $Lines -or $Lines.Count -eq 0) {
        return @()
    }

    return @($Lines | Select-Object -Last $MaxLines)
}

function Stop-ProcessTree {
    param(
        [int]$ProcessId
    )

    if ($ProcessId -le 0) {
        return
    }

    $taskKill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
    if (Test-Path -LiteralPath $taskKill) {
        & $taskKill /PID $ProcessId /T /F *> $null
        return
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
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
        $exe = Get-CommandExecutableToken -CommandText $phpCommand
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

function Invoke-NativeProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StageName,

        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,

        [Parameter(Mandatory = $true)]
        [string]$RunDirectory,

        [Parameter(Mandatory = $true)]
        [int]$TimeoutSeconds,

        [string]$StandardInputText,

        [int]$HeartbeatIntervalSeconds = 10
    )

    $stdoutLogPath = Join-Path $RunDirectory ("{0}.stdout.log" -f $StageName.ToLower())
    $stderrLogPath = Join-Path $RunDirectory ("{0}.stderr.log" -f $StageName.ToLower())
    $commandLine = Join-WindowsCommandLine -FilePath $FilePath -ArgumentList $ArgumentList
    $cmdExe = Resolve-CmdExecutable
    $invocationArgs = "/d /s /c `"$commandLine`""

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $cmdExe
    $startInfo.Arguments = $invocationArgs
    $startInfo.WorkingDirectory = (Get-Location).Path
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $startTime = Get-Date
    $stdoutBuilder = New-Object System.Text.StringBuilder
    $stderrBuilder = New-Object System.Text.StringBuilder
    $stdoutTail = New-Object System.Collections.Generic.List[string]
    $stderrTail = New-Object System.Collections.Generic.List[string]
    $stdoutLock = New-Object object
    $stderrLock = New-Object object
    '' | Out-File -LiteralPath $stdoutLogPath -Encoding utf8
    '' | Out-File -LiteralPath $stderrLogPath -Encoding utf8

    $stdoutAction = {
        param($sender, $eventArgs)
        if ($null -ne $eventArgs.Data) {
            [System.Threading.Monitor]::Enter($stdoutLock)
            try {
                [void]$stdoutBuilder.AppendLine($eventArgs.Data)
                Add-Content -LiteralPath $stdoutLogPath -Value $eventArgs.Data -Encoding utf8
                [void]$stdoutTail.Add($eventArgs.Data)
                if ($stdoutTail.Count -gt 30) {
                    $stdoutTail.RemoveAt(0)
                }
            }
            finally {
                [System.Threading.Monitor]::Exit($stdoutLock)
            }
        }
    }

    $stderrAction = {
        param($sender, $eventArgs)
        if ($null -ne $eventArgs.Data) {
            [System.Threading.Monitor]::Enter($stderrLock)
            try {
                [void]$stderrBuilder.AppendLine($eventArgs.Data)
                Add-Content -LiteralPath $stderrLogPath -Value $eventArgs.Data -Encoding utf8
                [void]$stderrTail.Add($eventArgs.Data)
                if ($stderrTail.Count -gt 30) {
                    $stderrTail.RemoveAt(0)
                }
            }
            finally {
                [System.Threading.Monitor]::Exit($stderrLock)
            }
        }
    }

    $stdoutRegistration = $null
    $stderrRegistration = $null
    $null = $process.Start()
    $script:CurrentNativeProcess = $process
    $script:CurrentNativeStage = $StageName
    $script:CurrentNativeStdoutLog = $stdoutLogPath
    $script:CurrentNativeStderrLog = $stderrLogPath

    $stdoutRegistration = Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $stdoutAction
    $stderrRegistration = Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $stderrAction
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    if ($PSBoundParameters.ContainsKey('StandardInputText')) {
        $process.StandardInput.Write($StandardInputText)
    }
    $process.StandardInput.Close()

    $lastHeartbeat = Get-Date
    $timedOut = $false

    try {
        while (-not $process.HasExited) {
            $elapsed = (Get-Date) - $startTime

            if ($elapsed.TotalSeconds -ge $TimeoutSeconds) {
                $timedOut = $true
                Stop-ProcessTree -ProcessId $process.Id
                break
            }

            if (((Get-Date) - $lastHeartbeat).TotalSeconds -ge $HeartbeatIntervalSeconds) {
                Write-Host ("[{0}] running... {1}s" -f $StageName, [int][Math]::Floor($elapsed.TotalSeconds))
                $lastHeartbeat = Get-Date
            }

            Start-Sleep -Milliseconds 250
        }

        $null = $process.WaitForExit(5000)
        $duration = (Get-Date) - $startTime
        $exitCode = if ($process.HasExited) { $process.ExitCode } else { -1 }
        $stdout = $stdoutBuilder.ToString()
        $stderr = $stderrBuilder.ToString()

        if ($timedOut) {
            $message = @(
                "Process timed out.",
                "Stage: $StageName",
                "Command: $FilePath",
                "Arguments: $($ArgumentList -join ' | ')",
                "PID: $($process.Id)",
                "DurationMs: $([int][Math]::Round($duration.TotalMilliseconds))",
                "StdoutLog: $stdoutLogPath",
                "StderrLog: $stderrLogPath",
                'LastStdoutLines:',
                ((Get-LogTail -Lines @($stdoutTail)) -join [Environment]::NewLine),
                'LastStderrLines:',
                ((Get-LogTail -Lines @($stderrTail)) -join [Environment]::NewLine)
            ) -join [Environment]::NewLine
            throw $message
        }

        if ($exitCode -ne 0) {
            $message = @(
                'Native command failed.',
                "Stage: $StageName",
                "Command: $FilePath",
                "Arguments: $($ArgumentList -join ' | ')",
                "PID: $($process.Id)",
                "ExitCode: $exitCode",
                "DurationMs: $([int][Math]::Round($duration.TotalMilliseconds))",
                "StdoutLog: $stdoutLogPath",
                "StderrLog: $stderrLogPath",
                'stderr:',
                (Get-LogTextOrEmpty -Text $stderr)
            ) -join [Environment]::NewLine
            throw $message
        }

        return [pscustomobject]@{
            output        = @((if ($stdout) { $stdout -split "`r?`n" } else { @() }))
            stdout        = $stdout
            stderr        = $stderr
            exitCode      = $exitCode
            command       = $FilePath
            arguments     = @($ArgumentList)
            duration      = $duration
            stdoutLogPath = $stdoutLogPath
            stderrLogPath = $stderrLogPath
            pid           = $process.Id
        }
    }
    finally {
        if ($stdoutRegistration) {
            Unregister-Event -SourceIdentifier $stdoutRegistration.Name -ErrorAction SilentlyContinue
            Remove-Job -Id $stdoutRegistration.Id -Force -ErrorAction SilentlyContinue
        }
        if ($stderrRegistration) {
            Unregister-Event -SourceIdentifier $stderrRegistration.Name -ErrorAction SilentlyContinue
            Remove-Job -Id $stderrRegistration.Id -Force -ErrorAction SilentlyContinue
        }
        if ($process -and -not $process.HasExited) {
            Stop-ProcessTree -ProcessId $process.Id
        }
        $script:CurrentNativeProcess = $null
        $script:CurrentNativeStage = $null
        $script:CurrentNativeStdoutLog = $null
        $script:CurrentNativeStderrLog = $null
        if ($process) {
            $process.Dispose()
        }
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
    $result = Invoke-NativeProcess -StageName 'Architect' -FilePath $codexCmd -ArgumentList @(
        'exec',
        '--sandbox', 'read-only',
        '--cd', $RepoRoot,
        '--output-last-message', $planOutputPath,
        '--output-schema', $SchemaPath,
        '-'
    ) -RunDirectory $RunDirectory -TimeoutSeconds $ArchitectTimeoutSeconds -HeartbeatIntervalSeconds $HeartbeatSeconds -StandardInputText $prompt

    if (-not (Test-Path -LiteralPath $planOutputPath)) {
        throw "Codex planning did not create output file: $planOutputPath"
    }

    $planText = (Get-Content -LiteralPath $planOutputPath -Raw).Trim()
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
    $result = Invoke-NativeProcess -StageName 'Implementer' -FilePath $claudeCmd -ArgumentList @(
        '-p'
    ) -RunDirectory $RunDirectory -TimeoutSeconds $ImplementerTimeoutSeconds -HeartbeatIntervalSeconds $HeartbeatSeconds -StandardInputText $prompt

    (Get-LogTextOrEmpty -Text $result.stdout) | Out-File -LiteralPath (Join-Path $RunDirectory 'implementer.txt') -Encoding utf8
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
    $result = Invoke-NativeProcess -StageName 'Reviewer' -FilePath $codexCmd -ArgumentList @(
        'exec',
        '--sandbox', 'read-only',
        '--cd', $RepoRoot,
        'review',
        '--uncommitted',
        '--output-last-message', $reviewOutputPath,
        '--output-schema', $SchemaPath,
        '-'
    ) -RunDirectory $RunDirectory -TimeoutSeconds $ReviewerTimeoutSeconds -HeartbeatIntervalSeconds $HeartbeatSeconds -StandardInputText $prompt

    if (-not (Test-Path -LiteralPath $reviewOutputPath)) {
        throw "Codex review did not create output file: $reviewOutputPath"
    }

    $reviewText = (Get-Content -LiteralPath $reviewOutputPath -Raw).Trim()
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
    $result = Invoke-NativeProcess -StageName ("FixAttempt{0}" -f $AttemptNumber) -FilePath $claudeCmd -ArgumentList @(
        '-p'
    ) -RunDirectory $RunDirectory -TimeoutSeconds $ImplementerTimeoutSeconds -HeartbeatIntervalSeconds $HeartbeatSeconds -StandardInputText $prompt
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
        "- DryRun: $($Data.DryRun)",
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
$script:CurrentNativeProcess = $null
$script:CurrentNativeStage = $null
$script:CurrentNativeStdoutLog = $null
$script:CurrentNativeStderrLog = $null
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
$reviewApproved = $false
$planApproved = $false
$changedFiles = @()
$cancelHandler = [ConsoleCancelEventHandler]{
    param($sender, $eventArgs)
    $eventArgs.Cancel = $true
    if ($script:CurrentNativeProcess) {
        Stop-ProcessTree -ProcessId $script:CurrentNativeProcess.Id
    }
    throw 'Execution cancelled by user.'
}
[Console]::add_CancelKeyPress($cancelHandler)

if ($VerboseLogs) {
    Write-Host "Run directory: $runDirectory"
}

try {
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
    $planApproved = [bool]$planObject.approved
    if (-not $planObject.approved) {
        $failures.Add('Codex did not approve the phase plan.')
        throw 'Plan not approved.'
    }

    if ($DryRun) {
        Write-Host 'DryRun completed after planning. No implementation, validation, review, commit, or push performed.'
        return
    }

    Invoke-ClaudeImplementation -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson

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

        Invoke-FixAttempt -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson -Blockers @($reviewObject.blockers) -AttemptNumber $attempts

        $validationJson = & $powerShellExe @validationArgs
        if ($LASTEXITCODE -ne 0) {
            $failures.Add("Validation failed after fix attempt $attempts.")
            throw 'Validation failed after fix attempt.'
        }

        $reviewJson = Invoke-CodexReview -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson -SchemaPath $reviewSchemaPath
        $reviewObject = $reviewJson | ConvertFrom-Json
    }

    $reviewApproved = [bool]($reviewObject.approved -and @($reviewObject.blockers).Count -eq 0)
    if (-not $reviewApproved) {
        $failures.Add('Review still has blockers after allowed attempts.')
        throw 'Review rejected.'
    }

    $changedFiles = Get-ChangedFiles
    if ($changedFiles.Count -eq 0) {
        $failures.Add('Implementation produced no changes.')
        throw 'No changes detected.'
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

    $postValidationArgs = @($validationArgs + '-SkipScope')
    $postValidationJson = & $powerShellExe @postValidationArgs
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

    Write-Host "Pipeline completed successfully. Commit: $commitSha"
}
catch {
    if ($failures.Count -eq 0) {
        $failures.Add($_.Exception.Message)
    }
    throw
}
finally {
    [Console]::remove_CancelKeyPress($cancelHandler)
    if ($script:CurrentNativeProcess) {
        Stop-ProcessTree -ProcessId $script:CurrentNativeProcess.Id
    }
    if ($runDirectory) {
        Write-Summary -Path (Join-Path $runDirectory 'summary.md') -Data @{
            Phase          = $phaseObject.id
            Branch         = $branch
            PlanApproved   = $planApproved
            ReviewApproved = $reviewApproved
            Attempts       = $attempts
            Duration       = ((Get-Date) - $startTime).ToString()
            CommitMessage  = $phaseObject.commitMessage
            CommitSha      = $commitSha
            PushStatus     = $pushStatus
            DryRun         = [bool]$DryRun
            Files          = @($changedFiles)
            Failures       = @($failures)
        }
    }
}
