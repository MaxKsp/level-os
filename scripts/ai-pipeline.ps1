[CmdletBinding()]
param(
    [string]$Phase,

    [string]$ResumePhase,

    [switch]$AutoNextPhase,

    [int]$MaxPhases = 1,

    [Nullable[int]]$StartPhaseNumber,

    [switch]$StopAfterPlan,

    [switch]$StopAfterCommit,

    [switch]$CommitPhaseDefinition,

    [switch]$AutoCommit,

    [switch]$Push,

    [switch]$DryRun,

    [switch]$SkipArchitect,

    [switch]$UseCodexUserConfig,

    [int]$MaxFixAttempts = 2,

    [double]$TestOnlyTolerance = 1e-9,

    [int]$ArchitectTimeoutSeconds = 300,

    [int]$ImplementerTimeoutSeconds = 900,

    [string]$ClaudePermissionMode = 'acceptEdits',

    [string]$ClaudeSkill = 'ponytail',

    [switch]$NoClaudeSkill,

    [int]$PostProcessTimeoutSeconds = 30,

    [int]$ValidationCommandTimeoutSeconds = 180,

    [int]$ReviewerTimeoutSeconds = 300,

    [int]$HeartbeatSeconds = 10,

    [switch]$VerboseLogs,

    [Parameter(DontShow = $true)]
    [string]$GeneratedPhaseDefinition,

    [Parameter(DontShow = $true)]
    [switch]$CommitGeneratedPhaseDefinition
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
        [string]$ResolvedPhasePath,
        [string]$AllowedDirtyPath,
        [switch]$ResumeMode
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

    $dirtyFiles = @(Get-ChangedFiles)
    if ($AllowedDirtyPath) {
        $normalizedAllowedDirtyPath = $AllowedDirtyPath.Replace('\', '/').TrimStart('.', '/')
        $dirtyFiles = @($dirtyFiles | Where-Object { $_ -ne $normalizedAllowedDirtyPath })
    }
    if ($ResumeMode) {
        $resumePhase = Get-PhaseObject -Path $ResolvedPhasePath
        $phaseRelativePath = $ResolvedPhasePath.Substring($RepoRoot.Length).TrimStart('\', '/').Replace('\', '/')
        $resumeAllowedFiles = @($resumePhase.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') }) + @($phaseRelativePath)
        $unexpectedDirtyFiles = @()
        foreach ($dirtyFile in $dirtyFiles) {
            $dirtyFileAllowed = $false
            foreach ($allowedFile in $resumeAllowedFiles) {
                if (($allowedFile.EndsWith('/') -and $dirtyFile.StartsWith($allowedFile, [System.StringComparison]::OrdinalIgnoreCase)) -or $dirtyFile.Equals($allowedFile, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $dirtyFileAllowed = $true
                    break
                }
            }
            if (-not $dirtyFileAllowed) {
                $unexpectedDirtyFiles += $dirtyFile
            }
        }
        $dirtyFiles = @($unexpectedDirtyFiles)
    }
    if ($dirtyFiles.Count -gt 0) {
        throw "Working tree must be clean before starting a phase. Unexpected: $($dirtyFiles -join ', ')"
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

function Assert-FilesWithinAllowlist {
    param(
        [string[]]$Files,
        $PhaseObject
    )

    $allowedFiles = @($PhaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') })
    $outsideAllowlist = @()
    foreach ($file in $Files) {
        $isAllowed = $false
        foreach ($rule in $allowedFiles) {
            if (($rule.EndsWith('/') -and $file.StartsWith($rule, [System.StringComparison]::OrdinalIgnoreCase)) -or $file.Equals($rule, [System.StringComparison]::OrdinalIgnoreCase)) {
                $isAllowed = $true
                break
            }
        }
        if (-not $isAllowed) {
            $outsideAllowlist += $file
        }
    }
    if ($outsideAllowlist.Count -gt 0) {
        throw "Claude modified files outside the phase allowlist: $($outsideAllowlist -join ', ')"
    }
}

function Get-WorkspaceSnapshot {
    param([string[]]$ExcludePaths = @())

    $snapshot = @{}
    foreach ($file in @(Get-ChangedFiles -ExcludePaths $ExcludePaths)) {
        $nativePath = $file.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        if (Test-Path -LiteralPath $nativePath -PathType Leaf) {
            $snapshot[$file] = (Get-FileHash -LiteralPath $nativePath -Algorithm SHA256).Hash
        } else {
            $snapshot[$file] = '<deleted>'
        }
    }
    return $snapshot
}

function Get-SnapshotChangedFiles {
    param([hashtable]$Before, [hashtable]$After)

    $keys = @($Before.Keys) + @($After.Keys) | Sort-Object -Unique
    $changed = @()
    foreach ($key in $keys) {
        if (-not $Before.ContainsKey($key) -or -not $After.ContainsKey($key) -or $Before[$key] -ne $After[$key]) {
            $changed += $key
        }
    }
    return @($changed)
}

function Get-ValidatedDiffHash {
    param(
        [string]$RepoRoot,
        $PhaseObject,
        [string[]]$ExcludePaths = @()
    )

    $normalizedExclusions = @($ExcludePaths | ForEach-Object { $_.Replace('\', '/').TrimStart('.', '/') })
    $builder = New-Object System.Text.StringBuilder
    $diffArguments = @('-c','core.quotepath=false','diff','HEAD','--binary','--','.')
    foreach ($excludedPath in $normalizedExclusions) {
        if ($excludedPath) { $diffArguments += ":(exclude)$excludedPath" }
    }
    $trackedDiff = @(& git @diffArguments) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw 'Failed to calculate tracked diff for validation hash.' }
    [void]$builder.AppendLine('TRACKED-DIFF')
    [void]$builder.AppendLine($trackedDiff)

    $allowed = @($PhaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') })
    $untracked = @(& git -c core.quotepath=false ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to enumerate untracked files for validation hash.' }
    foreach ($fileValue in @($untracked | Sort-Object -Unique)) {
        $file = $fileValue.ToString().Replace('\', '/').TrimStart('.', '/')
        if ($normalizedExclusions -contains $file) { continue }
        $isAllowed = $false
        foreach ($rule in $allowed) {
            if (($rule.EndsWith('/') -and $file.StartsWith($rule, [System.StringComparison]::OrdinalIgnoreCase)) -or $file.Equals($rule, [System.StringComparison]::OrdinalIgnoreCase)) {
                $isAllowed = $true
                break
            }
        }
        if (-not $isAllowed) { continue }
        $bytes = [System.IO.File]::ReadAllBytes((Join-Path $RepoRoot $file))
        [void]$builder.AppendLine("UNTRACKED:$file")
        [void]$builder.AppendLine([Convert]::ToBase64String($bytes))
    }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($builder.ToString()))
        return ([BitConverter]::ToString($hashBytes)).Replace('-', '')
    } finally {
        $sha.Dispose()
    }
}

function Find-ReusableValidation {
    param([string]$RepoRoot, [string]$PhaseId, [string]$CurrentHash)

    $runsRoot = Join-Path $RepoRoot 'automation/runs'
    if (-not (Test-Path -LiteralPath $runsRoot -PathType Container)) { return $null }
    $runDirectories = @(Get-ChildItem -LiteralPath $runsRoot -Directory | Sort-Object Name -Descending)
    foreach ($directory in $runDirectories) {
        $hashPath = Join-Path $directory.FullName 'validated-diff.sha256'
        $resultPath = Join-Path $directory.FullName 'validation-result.json'
        if (-not (Test-Path -LiteralPath $hashPath -PathType Leaf) -or -not (Test-Path -LiteralPath $resultPath -PathType Leaf)) { continue }
        $validatedHash = (Get-Content -LiteralPath $hashPath -Raw).Trim()
        if (-not $validatedHash.Equals($CurrentHash, [System.StringComparison]::OrdinalIgnoreCase)) { continue }
        try {
            $result = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
        } catch {
            continue
        }
        $resultPassed = [System.Convert]::ToBoolean($result.passed)
        if ($result.phaseId -eq $PhaseId -and $resultPassed) {
            return [pscustomobject]@{ result = $result; hash = $validatedHash; sourceDirectory = $directory.FullName }
        }
    }
    return $null
}

function Save-ValidatedDiff {
    param([string]$RunDirectory, $ValidationResult, [string]$Hash)

    $ValidationResult | ConvertTo-Json -Depth 8 | Out-File -LiteralPath (Join-Path $RunDirectory 'validation-result.json') -Encoding utf8
    $Hash | Out-File -LiteralPath (Join-Path $RunDirectory 'validated-diff.sha256') -Encoding ascii
}

function Get-PhaseReportPath {
    param([string]$RepoRoot, $PhaseObject)

    $reports = @($PhaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') } | Where-Object {
        $_ -match '^docs/architecture/finance/[^/]+_REPORT\.md$'
    })
    if ($reports.Count -eq 0) { return $null }
    if ($reports.Count -gt 1) { throw 'Phase allowlist contains more than one Finance report.' }
    return $reports[0]
}

function Test-PhaseReportNeedsValidationSync {
    param([string]$Path)

    if (-not $Path -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    $content = Get-Content -LiteralPath $Path -Raw
    return [bool]($content -match '(?i)nao\s+executad|não\s+executad|not\s+executed|validation\s+pending|validacao\s+pendente|validação\s+pendente')
}

function Invoke-PhaseReportValidationSync {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        $PhaseObject,
        [string]$ReportPath,
        $ValidationResult
    )

    $absoluteReportPath = Join-Path $RepoRoot $ReportPath
    if (-not (Test-PhaseReportNeedsValidationSync -Path $absoluteReportPath)) { return $false }
    $passedResults = @($ValidationResult.results | Where-Object { $_.passed })
    $commands = @($ValidationResult.results | ForEach-Object { $_.command } | Where-Object { $_ })
    $prompt = @(
        "Report path: $ReportPath",
        'Executed commands:',
        ($commands -join [Environment]::NewLine),
        'Validation result: passed=true',
        "Approved checks: $($passedResults.Count)",
        'Update only the validation section of this report. Do not change code or any other file.'
    ) -join [Environment]::NewLine
    $prompt = Add-ClaudeSkillInvocation -Prompt $prompt -RepoRoot $RepoRoot
    $prompt | Out-File -LiteralPath (Join-Path $RunDirectory 'report-sync-prompt.txt') -Encoding utf8

    $backup = New-FixBackup -RepoRoot $RepoRoot -RunDirectory $RunDirectory -AttemptNumber 0 -PhaseObject $PhaseObject
    $claudeCmd = Resolve-AgentCommandPath -Name 'claude'
    $claudeTools = 'Read,Edit'
    $claudeArgs = @(
        '-p',
        '--permission-mode', $ClaudePermissionMode,
        '--tools', $claudeTools,
        '--allowedTools', $claudeTools,
        '--disallowedTools', 'Bash,Write,Glob,Grep,WebFetch,WebSearch',
        '--no-session-persistence'
    )
    $null = Invoke-NativeProcess `
        -StageName 'ReportSync' `
        -FilePath $claudeCmd `
        -ArgumentList $claudeArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $ImplementerTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds `
        -StandardInputText $prompt

    $after = Get-WorkspaceSnapshot -ExcludePaths @($GeneratedPhaseDefinition)
    $delta = @(Get-SnapshotChangedFiles -Before $backup.snapshot -After $after)
    $unauthorized = @($delta | Where-Object { -not $_.Equals($ReportPath, [System.StringComparison]::OrdinalIgnoreCase) })
    if ($unauthorized.Count -gt 0) {
        Restore-FixBackup -Backup $backup -DeltaFiles $delta -RepoRoot $RepoRoot
        throw "Report synchronization modified unauthorized files: $($unauthorized -join ', ')"
    }
    if ($delta.Count -eq 0) { throw 'Report synchronization completed without updating the pending report.' }
    return $true
}

function New-RunDirectory {
    param([string]$RepoRoot)

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $runDir = Join-Path $RepoRoot "automation/runs/$timestamp"
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    return $runDir
}

function Get-ChangedFiles {
    param([string[]]$ExcludePaths = @())

    $trackedWorkingTree = @(& git -c core.quotepath=false diff --name-only --diff-filter=ACDMRTUXB --)
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to list tracked working-tree changes.'
    }

    $trackedIndex = @(& git -c core.quotepath=false diff --cached --name-only --diff-filter=ACDMRTUXB --)
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to list staged changes.'
    }

    $untracked = @(& git -c core.quotepath=false ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to list untracked files.'
    }

    $files = @($trackedWorkingTree) + @($trackedIndex) + @($untracked)
    $normalizedFiles = @()
    foreach ($file in $files) {
        if ([string]::IsNullOrWhiteSpace($file)) {
            continue
        }

        $normalized = $file.Trim().Replace('\', '/')
        while ($normalized.StartsWith('./')) {
            $normalized = $normalized.Substring(2)
        }
        if ($normalized -and -not $normalized.EndsWith('/')) {
            $normalizedFiles += $normalized
        }
    }

    $normalizedExclusions = @($ExcludePaths | ForEach-Object { $_.Replace('\', '/').TrimStart('.', '/') })
    return $normalizedFiles | Where-Object { $normalizedExclusions -notcontains $_ } | Sort-Object -Unique
}

function Get-InternalExecutionFiles {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [string]$GeneratedPhasePath
    )

    $internalFiles = @()
    if ($GeneratedPhasePath) {
        $internalFiles += $GeneratedPhasePath.Replace('\', '/').TrimStart('.', '/')
    }
    if ($RunDirectory) {
        $absoluteRunDirectory = [System.IO.Path]::GetFullPath($RunDirectory)
        $absoluteRepoRoot = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
        if ($absoluteRunDirectory.StartsWith($absoluteRepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            $runRelative = $absoluteRunDirectory.Substring($absoluteRepoRoot.Length).TrimStart('\', '/').Replace('\', '/')
            if ($runRelative) { $internalFiles += ($runRelative.TrimEnd('/') + '/') }
        }
    }
    return @($internalFiles | Sort-Object -Unique)
}

function Get-ReviewerChangedFiles {
    param([string[]]$ChangedFiles, [string[]]$InternalFiles)

    $filtered = @()
    foreach ($fileValue in $ChangedFiles) {
        $file = $fileValue.ToString().Replace('\', '/').TrimStart('.', '/')
        $excluded = $false
        foreach ($internalValue in $InternalFiles) {
            $internal = $internalValue.ToString().Replace('\', '/').TrimStart('.', '/')
            if (($internal.EndsWith('/') -and $file.StartsWith($internal, [System.StringComparison]::OrdinalIgnoreCase)) -or $file.Equals($internal, [System.StringComparison]::OrdinalIgnoreCase)) {
                $excluded = $true
                break
            }
        }
        if (-not $excluded) { $filtered += $file }
    }
    return @($filtered | Sort-Object -Unique)
}

function Assert-AutoNextPreconditions {
    param([string]$RepoRoot)

    $branch = (& git branch --show-current).Trim()
    if (-not $branch) {
        throw 'Unable to determine current branch.'
    }
    if ($branch -in @('main', 'master')) {
        throw "Refusing to run on protected branch: $branch"
    }

    $dirtyFiles = @(Get-ChangedFiles)
    if ($dirtyFiles.Count -gt 0) {
        throw "Working tree must be clean before AutoNextPhase. Dirty: $($dirtyFiles -join ', ')"
    }

    $null = Resolve-AgentCommandPath -Name 'codex'
    $null = Resolve-AgentCommandPath -Name 'claude'
    return $branch
}

function Get-NextPhaseNumber {
    param(
        [string]$RepoRoot,
        [Nullable[int]]$RequestedNumber
    )

    if ($null -ne $RequestedNumber -and $RequestedNumber.Value -gt 0) {
        return $RequestedNumber.Value
    }

    $numbers = @()
    Get-ChildItem -LiteralPath (Join-Path $RepoRoot 'automation/phases') -Filter 'phase-*.json' -File | ForEach-Object {
        if ($_.BaseName -match '^phase-(\d+)$') {
            $numbers += [int]$matches[1]
        }
    }
    @(& git log -50 --pretty=format:%s) | ForEach-Object {
        if ($_ -match '(?i)phase[- ](\d+)') {
            $numbers += [int]$matches[1]
        }
    }

    if ($numbers.Count -eq 0) {
        return 1
    }
    return ([int](($numbers | Measure-Object -Maximum).Maximum) + 1)
}

function Invoke-CodexNextPhase {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [int]$PhaseNumber,
        [string]$SchemaPath,
        [int]$MaxAllowedFiles = 8
    )

    $expectedId = "phase-$PhaseNumber"
    $prompt = Get-Content -LiteralPath (Join-Path $RepoRoot 'automation/prompts/next-phase.md') -Raw
    $prompt = $prompt.Replace('{{EXPECTED_PHASE_ID}}', $expectedId)
    $prompt = $prompt.Replace('{{MAX_ALLOWED_FILES}}', $MaxAllowedFiles.ToString())
    $recentLog = @(& git log -15 --pretty=format:'%h %s') -join [Environment]::NewLine
    $prompt += "`n`nRecent git history:`n$recentLog"

    $promptPath = Join-Path $RunDirectory 'next-phase-prompt.txt'
    $decisionPath = Join-Path $RunDirectory 'next-phase.json'
    $prompt | Out-File -LiteralPath $promptPath -Encoding utf8

    $codexArgs = @('exec')
    if (-not $UseCodexUserConfig) {
        $codexArgs += '--ignore-user-config'
        $codexArgs += '--ephemeral'
    }
    $codexArgs += @(
        '--sandbox', 'read-only',
        '--cd', $RepoRoot,
        '--output-last-message', $decisionPath,
        '--output-schema', $SchemaPath,
        '-'
    )

    $codexCmd = Resolve-AgentCommandPath -Name 'codex'
    $null = Invoke-NativeProcess `
        -StageName 'NextPhase' `
        -FilePath $codexCmd `
        -ArgumentList $codexArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $ArchitectTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds `
        -StandardInputText $prompt

    if (-not (Test-Path -LiteralPath $decisionPath)) {
        throw "Codex did not create next-phase decision: $decisionPath"
    }

    $validatorArgs = @(
        '-NoProfile',
        '-NonInteractive',
        '-File', (Join-Path $RepoRoot 'scripts/validate-next-phase.ps1'),
        '-DecisionPath', $decisionPath,
        '-ExpectedPhaseNumber', $PhaseNumber,
        '-MaxAllowedFiles', $MaxAllowedFiles
    )
    $validatorResult = Invoke-NativeProcess `
        -StageName 'NextPhaseValidation' `
        -FilePath $powerShellExe `
        -ArgumentList $validatorArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $PostProcessTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds
    $validatorResult.stdout | Out-File -LiteralPath (Join-Path $RunDirectory 'next-phase-validation.json') -Encoding utf8

    return Get-Content -LiteralPath $decisionPath -Raw | ConvertFrom-Json
}

function Write-AutoNextSummary {
    param(
        [string]$Path,
        [int]$PhaseNumber,
        [bool]$Completed,
        [string]$Reason,
        [string]$PhasePath
    )

    @(
        '# Auto Next Phase Summary',
        '',
        "- Expected phase: phase-$PhaseNumber",
        "- Completed: $Completed",
        "- Reason: $Reason",
        "- Phase file: $PhasePath"
    ) -join [Environment]::NewLine | Out-File -LiteralPath $Path -Encoding utf8
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
    $asyncReadsStopped = $false

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

        $postProcessStartedAt = Get-Date
        $postProcessDeadline = $postProcessStartedAt.AddSeconds($PostProcessTimeoutSeconds)
        $processExited = $process.WaitForExit(5000)

        if (-not $processExited) {
            Stop-ProcessTree -ProcessId $process.Id
            throw "Post-process transition timed out waiting for $StageName to exit."
        }

        $previousStdoutLength = -1
        $previousStderrLength = -1
        $stableReadCount = 0

        while ((Get-Date) -lt $postProcessDeadline -and $stableReadCount -lt 2) {
            Start-Sleep -Milliseconds 100
            $currentStdoutLength = $stdoutBuilder.Length
            $currentStderrLength = $stderrBuilder.Length

            if ($currentStdoutLength -eq $previousStdoutLength -and $currentStderrLength -eq $previousStderrLength) {
                $stableReadCount++
            } else {
                $stableReadCount = 0
                $previousStdoutLength = $currentStdoutLength
                $previousStderrLength = $currentStderrLength
            }
        }

        try {
            $process.CancelOutputRead()
        } catch [System.InvalidOperationException] {
        }
        try {
            $process.CancelErrorRead()
        } catch [System.InvalidOperationException] {
        }
        $asyncReadsStopped = $true

        if ($stdoutRegistration) {
            Unregister-Event -SourceIdentifier $stdoutRegistration.Name -ErrorAction SilentlyContinue
            Stop-Job -Id $stdoutRegistration.Id -ErrorAction SilentlyContinue
            Remove-Job -Id $stdoutRegistration.Id -Force -ErrorAction SilentlyContinue
            $stdoutRegistration = $null
        }
        if ($stderrRegistration) {
            Unregister-Event -SourceIdentifier $stderrRegistration.Name -ErrorAction SilentlyContinue
            Stop-Job -Id $stderrRegistration.Id -ErrorAction SilentlyContinue
            Remove-Job -Id $stderrRegistration.Id -Force -ErrorAction SilentlyContinue
            $stderrRegistration = $null
        }

        if ((Get-Date) -ge $postProcessDeadline) {
            throw "Post-process transition timed out while draining output for $StageName."
        }

        $duration = (Get-Date) - $startTime
        $exitCode = -1

        if ($process.HasExited) {
            $exitCode = $process.ExitCode
        }

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

        $outputLines = @()

        if (-not [string]::IsNullOrWhiteSpace($stdout)) {
            $outputLines = $stdout -split "`r?`n"
        }

        return [pscustomobject]@{
            output        = @($outputLines)
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
        if ($process -and -not $asyncReadsStopped) {
            try {
                $process.CancelOutputRead()
            } catch [System.InvalidOperationException] {
            }
            try {
                $process.CancelErrorRead()
            } catch [System.InvalidOperationException] {
            }
        }
        if ($stdoutRegistration) {
            Unregister-Event -SourceIdentifier $stdoutRegistration.Name -ErrorAction SilentlyContinue
            Stop-Job -Id $stdoutRegistration.Id -ErrorAction SilentlyContinue
            Remove-Job -Id $stdoutRegistration.Id -Force -ErrorAction SilentlyContinue
        }
        if ($stderrRegistration) {
            Unregister-Event -SourceIdentifier $stderrRegistration.Name -ErrorAction SilentlyContinue
            Stop-Job -Id $stderrRegistration.Id -ErrorAction SilentlyContinue
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

function Resolve-ClaudeSkillPath {
    param(
        [string]$RepoRoot,
        [string]$SkillName,
        [string]$HomeDirectory = $HOME
    )

    $candidates = @(
        (Join-Path $RepoRoot ".claude/skills/$SkillName/SKILL.md"),
        (Join-Path $HomeDirectory ".claude/skills/$SkillName/SKILL.md"),
        (Join-Path $RepoRoot ".claude/commands/$SkillName.md"),
        (Join-Path $HomeDirectory ".claude/commands/$SkillName.md")
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            try {
                $content = Get-Content -LiteralPath $candidate -Raw -ErrorAction Stop
            } catch {
                throw "Claude skill is not readable: $candidate"
            }
            if ($content -match '(?im)^\s*user-invocable\s*:\s*false\s*$') {
                throw "Claude skill is not user-invocable: $candidate"
            }

            $settingsCandidates = @(
                (Join-Path $RepoRoot '.claude/settings.json'),
                (Join-Path $RepoRoot '.claude/settings.local.json'),
                (Join-Path $HomeDirectory '.claude/settings.json'),
                (Join-Path $HomeDirectory '.claude/settings.local.json')
            )
            foreach ($settingsPath in $settingsCandidates) {
                if (-not (Test-Path -LiteralPath $settingsPath -PathType Leaf)) { continue }
                try {
                    $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
                } catch {
                    continue
                }
                if ($settings.PSObject.Properties.Name -contains 'skillOverrides') {
                    $overrides = $settings.skillOverrides
                    if ($null -ne $overrides -and $overrides.PSObject.Properties.Name -contains $SkillName) {
                        $overrideValue = $overrides.$SkillName.ToString()
                        if ($overrideValue.Equals('off', [System.StringComparison]::OrdinalIgnoreCase)) {
                            throw "Claude skill /$SkillName is disabled by $settingsPath"
                        }
                    }
                }
            }
            return [System.IO.Path]::GetFullPath($candidate)
        }
    }
    throw "Required Claude skill /$SkillName was not found in repository or user skill/command paths."
}

function Add-ClaudeSkillInvocation {
    param([Parameter(Mandatory = $true)][string]$Prompt, [string]$RepoRoot)

    if ($NoClaudeSkill) {
        return $Prompt
    }
    if (-not $script:ResolvedClaudeSkillPath) {
        $script:ResolvedClaudeSkillPath = Resolve-ClaudeSkillPath -RepoRoot $RepoRoot -SkillName $ClaudeSkill
        Write-Host "Claude skill: /$ClaudeSkill"
        Write-Host "Claude skill path: $($script:ResolvedClaudeSkillPath)"
        Write-Host 'Claude skill invocation: explicit'
    }
    return "/$ClaudeSkill`n`n$Prompt"
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
    $codexArgs = @(
        'exec'
    )

    if (-not $UseCodexUserConfig) {
        $codexArgs += '--ignore-user-config'
        $codexArgs += '--ephemeral'
    }

    $codexArgs += @(
        '--sandbox', 'read-only',
        '--cd', $RepoRoot,
        '--output-last-message', $planOutputPath,
        '--output-schema', $SchemaPath,
        '-'
    )
    $result = Invoke-NativeProcess `
        -StageName 'Architect' `
        -FilePath $codexCmd `
        -ArgumentList $codexArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $ArchitectTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds `
        -StandardInputText $prompt

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
    $prompt = Add-ClaudeSkillInvocation -Prompt $prompt -RepoRoot $RepoRoot
    $promptPath = Join-Path $RunDirectory 'implementer-prompt.txt'
    $prompt | Out-File -LiteralPath $promptPath -Encoding utf8

    $generatedPhaseHash = ''
    if ($GeneratedPhaseDefinition) {
        $generatedPhasePath = Join-Path $RepoRoot $GeneratedPhaseDefinition
        $generatedPhaseHash = (Get-FileHash -LiteralPath $generatedPhasePath -Algorithm SHA256).Hash
    }

    $claudeCmd = Resolve-AgentCommandPath -Name 'claude'
    $claudeTools = 'Read,Glob,Grep,Edit,Write'
    $claudeArgs = @(
        '-p',
        '--permission-mode', $ClaudePermissionMode,
        '--tools', $claudeTools,
        '--allowedTools', $claudeTools,
        '--disallowedTools', 'Bash,WebFetch,WebSearch',
        '--no-session-persistence'
    )

    Write-Host "Claude permission mode: $ClaudePermissionMode"
    Write-Host "Claude allowed tools: $claudeTools"
    Write-Host "Claude working directory: $RepoRoot"

    $result = Invoke-NativeProcess `
        -StageName 'Implementer' `
        -FilePath $claudeCmd `
        -ArgumentList $claudeArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $ImplementerTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds `
        -StandardInputText $prompt

    (Get-LogTextOrEmpty -Text $result.stdout) | Out-File -LiteralPath (Join-Path $RunDirectory 'implementer.txt') -Encoding utf8

    if ($GeneratedPhaseDefinition) {
        $currentGeneratedPhaseHash = (Get-FileHash -LiteralPath $generatedPhasePath -Algorithm SHA256).Hash
        if ($currentGeneratedPhaseHash -ne $generatedPhaseHash) {
            throw "Claude modified the generated phase definition: $GeneratedPhaseDefinition"
        }
    }

    $changedFiles = @(Get-ChangedFiles -ExcludePaths @($GeneratedPhaseDefinition))
    if ($changedFiles.Count -eq 0) {
        throw 'Claude completed without modifying the workspace.'
    }

    $phaseObject = $PhaseJson | ConvertFrom-Json
    $allowedFiles = @($phaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') })
    $outsideAllowlist = @()

    foreach ($file in $changedFiles) {
        $isAllowed = $false
        foreach ($rule in $allowedFiles) {
            if ($rule.EndsWith('/')) {
                if ($file.StartsWith($rule, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $isAllowed = $true
                    break
                }
            } elseif ($file.Equals($rule, [System.StringComparison]::OrdinalIgnoreCase)) {
                $isAllowed = $true
                break
            }
        }

        if (-not $isAllowed) {
            $outsideAllowlist += $file
        }
    }

    Write-Host 'Claude changed files:'
    $changedFiles | ForEach-Object { Write-Host " - $_" }

    if ($outsideAllowlist.Count -gt 0) {
        throw "Claude modified files outside the phase allowlist: $($outsideAllowlist -join ', ')"
    }
}

function Test-ReviewJson {
    param(
        [AllowEmptyString()][string]$Text,
        [string[]]$AllowedReviewedFiles = @(),
        [string[]]$InternalFiles = @()
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return [pscustomobject]@{ valid = $false; value = $null; error = 'empty output' }
    }
    try {
        $value = $Text | ConvertFrom-Json
    } catch {
        return [pscustomobject]@{ valid = $false; value = $null; error = $_.Exception.Message }
    }
    $required = @('approved','blockers','warnings','filesReviewed','recommendedCommitMessage')
    foreach ($property in $required) {
        if (-not ($value.PSObject.Properties.Name -contains $property)) {
            return [pscustomobject]@{ valid = $false; value = $null; error = "missing property: $property" }
        }
    }
    $unexpected = @($value.PSObject.Properties.Name | Where-Object { $required -notcontains $_ })
    if ($unexpected.Count -gt 0) {
        return [pscustomobject]@{ valid = $false; value = $null; error = "unexpected properties: $($unexpected -join ', ')" }
    }
    foreach ($reviewedFileValue in @($value.filesReviewed)) {
        $reviewedFile = $reviewedFileValue.ToString().Replace('\', '/')
        if ($AllowedReviewedFiles -notcontains $reviewedFile) {
            return [pscustomobject]@{ valid = $false; value = $null; error = "filesReviewed contains excluded file: $reviewedFile" }
        }
    }
    foreach ($blockerValue in @($value.blockers)) {
        $blocker = $blockerValue.ToString().Replace('\', '/')
        foreach ($internalFile in $InternalFiles) {
            if ($internalFile -and $blocker.IndexOf($internalFile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                return [pscustomobject]@{ valid = $false; value = $null; error = "blocker is based on internal file: $internalFile" }
            }
        }
    }
    return [pscustomobject]@{ valid = $true; value = $value; error = '' }
}

function Remove-InternalReviewArtifacts {
    param([string]$Text, [string[]]$ChangedFiles, [string[]]$InternalFiles)

    try { $value = $Text | ConvertFrom-Json } catch { return $Text }
    if (-not ($value.PSObject.Properties.Name -contains 'filesReviewed') -or -not ($value.PSObject.Properties.Name -contains 'blockers')) { return $Text }
    $value.filesReviewed = @($value.filesReviewed | Where-Object {
        $reviewed = $_.ToString().Replace('\', '/')
        @($InternalFiles | Where-Object { $reviewed.Equals($_, [System.StringComparison]::OrdinalIgnoreCase) }).Count -eq 0
    })
    $remainingBlockers = @()
    foreach ($blockerValue in @($value.blockers)) {
        $blocker = $blockerValue.ToString().Replace('\', '/')
        $mentionsInternal = @($InternalFiles | Where-Object { $_ -and $blocker.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count -gt 0
        $mentionsChanged = @($ChangedFiles | Where-Object { $_ -and $blocker.IndexOf($_, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count -gt 0
        if (-not $mentionsInternal -or $mentionsChanged) { $remainingBlockers += $blockerValue }
    }
    $value.blockers = @($remainingBlockers)
    if (@($value.blockers).Count -eq 0) { $value.approved = $true }
    return ($value | ConvertTo-Json -Depth 8 -Compress)
}

function Invoke-CodexReview {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        [string]$PhaseJson,
        [string]$SchemaPath,
        [string[]]$ChangedFiles,
        [string]$ValidationSummary,
        [string[]]$InternalFiles = @()
    )

    $reviewOutputPath = Join-Path $RunDirectory 'review.json'
    $reviewRawPath = Join-Path $RunDirectory 'review.raw.txt'
    $reviewPhase = $PhaseJson | ConvertFrom-Json
    $reviewPrompt = Get-Content -LiteralPath (Join-Path $RepoRoot 'automation/prompts/reviewer.md') -Raw
    $reviewPrompt = $reviewPrompt.Replace('{{PHASE_JSON}}', $PhaseJson)
    $reviewPrompt = $reviewPrompt.Replace('{{ALLOWED_FILES}}', (@($reviewPhase.allowedFiles) -join [Environment]::NewLine))
    $reviewPrompt = $reviewPrompt.Replace('{{FORBIDDEN_FILES}}', (@($reviewPhase.forbiddenFiles) -join [Environment]::NewLine))
    $reviewPrompt = $reviewPrompt.Replace('{{CHANGED_FILES}}', ($ChangedFiles -join [Environment]::NewLine))
    $reviewPrompt = $reviewPrompt.Replace('{{INTERNAL_FILES}}', ($InternalFiles -join [Environment]::NewLine))
    $reviewPrompt = $reviewPrompt.Replace('{{VALIDATION_SUMMARY}}', $ValidationSummary)

    $codexCmd = Resolve-AgentCommandPath -Name 'codex'
    $reviewArgs = @('exec')
    if (-not $UseCodexUserConfig) {
        $reviewArgs += '--ignore-user-config'
        $reviewArgs += '--ephemeral'
    }
    $reviewArgs += @(
        '--sandbox', 'read-only',
        '--cd', $RepoRoot,
        '--output-last-message', $reviewOutputPath,
        '--output-schema', $SchemaPath,
        '-'
    )
    $null = Invoke-NativeProcess `
        -StageName 'Reviewer' `
        -FilePath $codexCmd `
        -ArgumentList $reviewArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $ReviewerTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds `
        -StandardInputText $reviewPrompt

    if (-not (Test-Path -LiteralPath $reviewOutputPath -PathType Leaf)) {
        throw "Codex review did not create output file: $reviewOutputPath"
    }
    $reviewText = Get-Content -LiteralPath $reviewOutputPath -Raw
    $reviewText | Out-File -LiteralPath $reviewRawPath -Encoding utf8
    $reviewText = Remove-InternalReviewArtifacts -Text $reviewText -ChangedFiles $ChangedFiles -InternalFiles $InternalFiles
    $reviewText | Out-File -LiteralPath $reviewOutputPath -Encoding utf8
    $reviewCheck = Test-ReviewJson -Text $reviewText -AllowedReviewedFiles $ChangedFiles -InternalFiles $InternalFiles
    if (-not $reviewCheck.valid) {
        $repairOutputPath = Join-Path $RunDirectory 'review-repair.json'
        $schemaText = Get-Content -LiteralPath $SchemaPath -Raw
        $repairPrompt = "Converta esta resposta para JSON valido sem alterar o significado.`n`nResposta invalida:`n$reviewText`n`nSchema obrigatorio:`n$schemaText"
        $repairArgs = @('exec')
        if (-not $UseCodexUserConfig) {
            $repairArgs += '--ignore-user-config'
            $repairArgs += '--ephemeral'
        }
        $repairArgs += @(
            '--sandbox', 'read-only',
            '--cd', $RepoRoot,
            '--output-last-message', $repairOutputPath,
            '--output-schema', $SchemaPath,
            '-'
        )
        $null = Invoke-NativeProcess `
            -StageName 'ReviewerRepair' `
            -FilePath $codexCmd `
            -ArgumentList $repairArgs `
            -RunDirectory $RunDirectory `
            -TimeoutSeconds $ReviewerTimeoutSeconds `
            -HeartbeatIntervalSeconds $HeartbeatSeconds `
            -StandardInputText $repairPrompt
        if (-not (Test-Path -LiteralPath $repairOutputPath -PathType Leaf)) {
            throw 'Codex review JSON repair did not create review-repair.json.'
        }
        $reviewText = Get-Content -LiteralPath $repairOutputPath -Raw
        $reviewText = Remove-InternalReviewArtifacts -Text $reviewText -ChangedFiles $ChangedFiles -InternalFiles $InternalFiles
        $reviewCheck = Test-ReviewJson -Text $reviewText -AllowedReviewedFiles $ChangedFiles -InternalFiles $InternalFiles
        if (-not $reviewCheck.valid) {
            throw "Codex review JSON remained invalid after one repair attempt: $($reviewCheck.error)"
        }
        $reviewText | Out-File -LiteralPath $reviewOutputPath -Encoding utf8
    }
    return $reviewText.Trim()
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
You are Claude Code fixing a rejected Level OS migration phase.

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
    $prompt = Add-ClaudeSkillInvocation -Prompt $prompt -RepoRoot $RepoRoot

    $claudeCmd = Resolve-AgentCommandPath -Name 'claude'
    $result = Invoke-NativeProcess -StageName ("FixAttempt{0}" -f $AttemptNumber) -FilePath $claudeCmd -ArgumentList @(
        '-p'
    ) -RunDirectory $RunDirectory -TimeoutSeconds $ImplementerTimeoutSeconds -HeartbeatIntervalSeconds $HeartbeatSeconds -StandardInputText $prompt
}

function Get-TestFilesFromFailures {
    param([object[]]$FailedItems, $PhaseObject)

    $phaseTests = @($PhaseObject.allowedFiles | Where-Object { $_.ToString().Replace('\', '/').StartsWith('tests/') } | ForEach-Object { $_.ToString().Replace('\', '/') })
    $testFiles = @()
    foreach ($failure in $FailedItems) {
        $failureText = "$($failure.command)`n$($failure.stdout)`n$($failure.stderr)".Replace('\', '/')
        foreach ($testFile in $phaseTests) {
            if ($failureText.IndexOf($testFile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $testFiles += $testFile
            }
        }
    }
    return @($testFiles | Sort-Object -Unique)
}

function Get-RelatedProductionFiles {
    param([object[]]$FailedItems, $PhaseObject, [string[]]$TestFiles)

    $failureText = @($FailedItems | ForEach-Object { "$($_.command)`n$($_.stdout)`n$($_.stderr)" }) -join "`n"
    $normalizedTestNames = @($TestFiles | ForEach-Object {
        ([System.IO.Path]::GetFileNameWithoutExtension($_) -replace '_test$', '' -replace '[^A-Za-z0-9]', '').ToLowerInvariant()
    })
    $related = @()
    foreach ($allowedFileValue in @($PhaseObject.allowedFiles)) {
        $allowedFile = $allowedFileValue.ToString().Replace('\', '/')
        if ($allowedFile.StartsWith('tests/')) { continue }
        $baseName = ([System.IO.Path]::GetFileNameWithoutExtension($allowedFile) -replace '[^A-Za-z0-9]', '').ToLowerInvariant()
        $mentioned = $failureText.Replace('\', '/').IndexOf($allowedFile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        $nameRelated = @($normalizedTestNames | Where-Object { $_ -and ($_.Contains($baseName) -or $baseName.Contains($_)) }).Count -gt 0
        if ($mentioned -or $nameRelated) {
            $related += $allowedFile
        }
    }
    return @($related | Sort-Object -Unique)
}

function Get-ValidationFailureClassification {
    param(
        [object[]]$FailedItems,
        $PhaseObject,
        [double]$Tolerance = 1e-9
    )

    $failureText = @($FailedItems | ForEach-Object { "$($_.command)`n$($_.stdout)`n$($_.stderr)" }) -join "`n"
    $testFiles = @(Get-TestFilesFromFailures -FailedItems $FailedItems -PhaseObject $PhaseObject)
    $classification = 'unknown'
    $expectedCorrection = 'No safe automatic correction was identified.'

    if ($failureText -match 'Values have same structure but are not reference-equal') {
        $classification = 'test-only'
        $expectedCorrection = 'Normalize cross-realm arrays with Array.from() and objects with Object.assign({}, value), spread, or equivalent test-only normalization. Do not alter production.'
    } elseif ($failureText -match '(?i)stub|harness' -and $failureText -match '(?i)real implementation|implementation real|diverg') {
        $classification = 'test-only'
        $expectedCorrection = 'Align only the test stub or harness with the real implementation. Do not alter production.'
    } elseif ($failureText -match 'MODULE_NOT_FOUND' -and $testFiles.Count -gt 0) {
        $classification = 'test-only'
        $expectedCorrection = 'Correct only the inconsistent test module name or path. Do not create duplicate artifacts or alter production.'
    } else {
        $numberMatch = [regex]::Match($failureText, '(?ims)(?:Actual:\s*)?(-?\d+(?:\.\d+)?)\s*(?:!==|Expected:\s*)(-?\d+(?:\.\d+)?)')
        if (-not $numberMatch.Success) {
            $numberMatch = [regex]::Match($failureText, '(?ims)Actual:\s*(-?\d+(?:\.\d+)?).*?Expected:\s*(-?\d+(?:\.\d+)?)')
        }
        if (-not $numberMatch.Success) {
            $numberMatch = [regex]::Match($failureText, '(?m)^\+\s*(-?\d+(?:\.\d+)?)\s*$\s*^-\s*(-?\d+(?:\.\d+)?)\s*$')
        }
        if ($numberMatch.Success) {
            $actual = [double]::Parse($numberMatch.Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture)
            $expected = [double]::Parse($numberMatch.Groups[2].Value, [System.Globalization.CultureInfo]::InvariantCulture)
            $difference = [Math]::Abs($actual - $expected)
            $scale = [Math]::Max(1.0, [Math]::Abs($expected))
            if ($difference -le ($Tolerance * $scale)) {
                $classification = 'test-only'
                $expectedCorrection = "Corrija exclusivamente o teste usando tolerancia numerica, por exemplo: assert.ok(Math.abs(actual - expected) < $Tolerance). Nao arredonde nem altere producao."
            } else {
                $classification = 'production-possible'
                $expectedCorrection = 'Investigate the functional mismatch using only files directly related to the failed test and preserve the phase contracts.'
            }
        } elseif ($failureText -match '(?i)(TypeError|ReferenceError|RangeError|SyntaxError|regression confirmed|functional mismatch|unexpected result)') {
            $classification = 'production-possible'
            $expectedCorrection = 'Investigate the production exception or confirmed functional regression using only directly related phase files.'
        }
    }

    $allowedFiles = @($testFiles)
    if ($classification -eq 'production-possible') {
        $allowedFiles += @(Get-RelatedProductionFiles -FailedItems $FailedItems -PhaseObject $PhaseObject -TestFiles $testFiles)
        $allowedFiles = @($allowedFiles | Sort-Object -Unique)
        if (@($allowedFiles | Where-Object { -not $_.StartsWith('tests/') }).Count -eq 0) {
            $classification = 'unknown'
            $expectedCorrection = 'A possible production failure was detected, but no directly related production file could be identified safely.'
            $allowedFiles = @()
        }
    }
    if ($classification -eq 'test-only' -and $testFiles.Count -eq 0) {
        $classification = 'unknown'
        $expectedCorrection = 'The failure resembles a test-only issue, but no associated test file could be identified safely.'
        $allowedFiles = @()
    }

    return [pscustomobject]@{
        classification = $classification
        allowedFiles = @($allowedFiles)
        expectedCorrection = $expectedCorrection
        failedCommands = @($FailedItems | ForEach-Object { $_.command })
    }
}

function New-FixBackup {
    param([string]$RepoRoot, [string]$RunDirectory, [int]$AttemptNumber, $PhaseObject)

    $backupRoot = Join-Path $RunDirectory ("fix-backup-attempt-{0}" -f $AttemptNumber)
    $filesRoot = Join-Path $backupRoot 'files'
    New-Item -ItemType Directory -Path $filesRoot -Force | Out-Null
    $repoFiles = @(& git -c core.quotepath=false ls-files --cached --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) { throw 'Failed to enumerate repository files for correction backup.' }
    $repoFiles += @($PhaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') })
    $changedFilesBefore = @(Get-ChangedFiles -ExcludePaths @($GeneratedPhaseDefinition))
    ConvertTo-Json -InputObject $changedFilesBefore -Depth 3 | Out-File -LiteralPath (Join-Path $backupRoot 'changed-files-before.json') -Encoding utf8
    $entries = New-Object System.Collections.Generic.List[object]
    foreach ($fileValue in @($repoFiles | Sort-Object -Unique)) {
        $file = $fileValue.ToString().Replace('\', '/').TrimStart('.', '/')
        if (-not $file) { continue }
        $sourcePath = Join-Path $RepoRoot $file
        $exists = Test-Path -LiteralPath $sourcePath -PathType Leaf
        [void]$entries.Add([pscustomobject]@{ path = $file; existed = $exists })
        if ($exists) {
            $backupPath = Join-Path $filesRoot $file
            $backupParent = Split-Path -Parent $backupPath
            New-Item -ItemType Directory -Path $backupParent -Force | Out-Null
            Copy-Item -LiteralPath $sourcePath -Destination $backupPath -Force
        }
    }
    $manifestPath = Join-Path $backupRoot 'manifest.json'
    $entryArray = $entries.ToArray()
    ConvertTo-Json -InputObject $entryArray -Depth 4 | Out-File -LiteralPath $manifestPath -Encoding utf8
    return [pscustomobject]@{
        root = $backupRoot
        filesRoot = $filesRoot
        manifestPath = $manifestPath
        snapshot = Get-WorkspaceSnapshot -ExcludePaths @($GeneratedPhaseDefinition)
    }
}

function Restore-FixBackup {
    param($Backup, [string[]]$DeltaFiles, [string]$RepoRoot)

    $entries = Get-Content -LiteralPath $Backup.manifestPath -Raw | ConvertFrom-Json
    foreach ($file in $DeltaFiles) {
        $targetPath = Join-Path $RepoRoot $file
        $entry = $null
        foreach ($candidate in $entries) {
            if ($candidate.path.ToString().Equals($file, [System.StringComparison]::OrdinalIgnoreCase)) {
                $entry = $candidate
                break
            }
        }
        $entryExisted = $false
        if ($null -ne $entry) {
            $entryExisted = [System.Convert]::ToBoolean($entry.existed)
        }
        if ($entryExisted) {
            $backupPath = Join-Path $Backup.filesRoot $file
            $targetParent = Split-Path -Parent $targetPath
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
            Copy-Item -LiteralPath $backupPath -Destination $targetPath -Force
        } elseif (Test-Path -LiteralPath $targetPath) {
            Remove-Item -LiteralPath $targetPath -Force
        }
    }
}

function Get-ValidationRetryAction {
    param(
        [int]$ExitCode,
        [int]$AttemptsUsed,
        [int]$MaximumAttempts,
        [object[]]$FailedItems
    )

    if ($ExitCode -eq 0) {
        return 'review'
    }
    if (@($FailedItems | Where-Object { $_.label -eq 'scope' }).Count -gt 0) {
        return 'reject-scope'
    }
    if ($AttemptsUsed -ge $MaximumAttempts) {
        return 'stop'
    }
    return 'retry'
}

function Invoke-PhaseValidationAttempt {
    param(
        [string]$PowerShellExecutable,
        [string[]]$ValidationArguments,
        [string]$RunDirectory,
        [int]$AttemptNumber,
        [string]$ResultPrefix = 'validation-attempt',
        [switch]$SkipFailureArtifact
    )

    $validationPath = Join-Path $RunDirectory ("{0}-{1}.json" -f $ResultPrefix, $AttemptNumber)
    $attemptArguments = @($ValidationArguments + @('-ResultPath', $validationPath))
    $null = & $PowerShellExecutable @attemptArguments
    $exitCode = $LASTEXITCODE
    if (-not (Test-Path -LiteralPath $validationPath -PathType Leaf)) {
        throw "Validation did not create its structured result at $validationPath. ExitCode=$exitCode"
    }
    $validationText = Get-Content -LiteralPath $validationPath -Raw

    try {
        $validationObject = $validationText | ConvertFrom-Json
    } catch {
        throw "Validation did not produce valid JSON at $validationPath. ExitCode=$exitCode"
    }
    if ($exitCode -ne 0 -and -not $SkipFailureArtifact) {
        $failedPath = Join-Path $RunDirectory ("validation-failures-attempt-{0}.json" -f $AttemptNumber)
        ConvertTo-Json -InputObject @($validationObject.failed) -Depth 8 | Out-File -LiteralPath $failedPath -Encoding utf8
    }

    return [pscustomobject]@{
        exitCode = $exitCode
        data = $validationObject
        path = $validationPath
    }
}

function Invoke-ValidationCorrection {
    param(
        [string]$RepoRoot,
        [string]$RunDirectory,
        $PhaseObject,
        [object[]]$FailedItems,
        [int]$AttemptNumber,
        $Classification
    )

    $classification = $Classification
    if ($null -eq $classification) {
        $classification = Get-ValidationFailureClassification -FailedItems $FailedItems -PhaseObject $PhaseObject -Tolerance $TestOnlyTolerance
    }
    if ($classification.classification -eq 'unknown') {
        return [pscustomobject]@{
            status = 'unknown'
            classification = $classification
            changedFiles = @()
        }
    }

    $changedBefore = @(Get-ChangedFiles -ExcludePaths @($GeneratedPhaseDefinition))
    Assert-FilesWithinAllowlist -Files $changedBefore -PhaseObject $PhaseObject
    $backup = New-FixBackup -RepoRoot $RepoRoot -RunDirectory $RunDirectory -AttemptNumber $AttemptNumber -PhaseObject $PhaseObject
    $failedCommands = @($FailedItems | ForEach-Object {
        $stdoutLines = @($_.stdout -split "`r?`n")
        $stderrLines = @($_.stderr -split "`r?`n")
        $stdoutStart = [Math]::Max(0, $stdoutLines.Count - 80)
        $stderrStart = [Math]::Max(0, $stderrLines.Count - 80)
        [ordered]@{
            command = $_.command
            stdout = (@($stdoutLines[$stdoutStart..($stdoutLines.Count - 1)]) -join [Environment]::NewLine)
            stderr = (@($stderrLines[$stderrStart..($stderrLines.Count - 1)]) -join [Environment]::NewLine)
        }
    }) | ConvertTo-Json -Depth 6
    $forbiddenFiles = @($PhaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') } | Where-Object { @($classification.allowedFiles) -notcontains $_ })
    $forbiddenFiles += @('app/', 'assets/', 'index.php', 'api/', 'schema.sql', 'migrations/')
    if ($classification.classification -eq 'production-possible') {
        $forbiddenFiles = @($PhaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') } | Where-Object { @($classification.allowedFiles) -notcontains $_ })
        $forbiddenFiles += @($PhaseObject.forbiddenFiles)
    }
    $forbiddenFiles = @($forbiddenFiles | Sort-Object -Unique)

    $template = Get-Content -LiteralPath (Join-Path $RepoRoot 'automation/prompts/validation-fix.md') -Raw
    $prompt = $template.Replace('{{CLASSIFICATION}}', $classification.classification)
    $prompt = $prompt.Replace('{{ALLOWED_FILES}}', (@($classification.allowedFiles) -join [Environment]::NewLine))
    $prompt = $prompt.Replace('{{FORBIDDEN_FILES}}', ($forbiddenFiles -join [Environment]::NewLine))
    $prompt = $prompt.Replace('{{FAILED_COMMANDS}}', $failedCommands)
    $prompt = $prompt.Replace('{{EXPECTED_CORRECTION}}', $classification.expectedCorrection)
    $prompt = Add-ClaudeSkillInvocation -Prompt $prompt -RepoRoot $RepoRoot
    $promptPath = Join-Path $RunDirectory ("fix-prompt-attempt-{0}.txt" -f $AttemptNumber)
    $prompt | Out-File -LiteralPath $promptPath -Encoding utf8

    $claudeCmd = Resolve-AgentCommandPath -Name 'claude'
    $claudeTools = 'Read,Glob,Grep,Edit,Write'
    $claudeArgs = @(
        '-p',
        '--permission-mode', $ClaudePermissionMode,
        '--tools', $claudeTools,
        '--allowedTools', $claudeTools,
        '--disallowedTools', 'Bash,WebFetch,WebSearch',
        '--no-session-persistence'
    )
    $null = Invoke-NativeProcess `
        -StageName ("fix-implementer-attempt-{0}" -f $AttemptNumber) `
        -FilePath $claudeCmd `
        -ArgumentList $claudeArgs `
        -RunDirectory $RunDirectory `
        -TimeoutSeconds $ImplementerTimeoutSeconds `
        -HeartbeatIntervalSeconds $HeartbeatSeconds `
        -StandardInputText $prompt

    $snapshotAfter = Get-WorkspaceSnapshot -ExcludePaths @($GeneratedPhaseDefinition)
    $filesChangedByFix = @(Get-SnapshotChangedFiles -Before $backup.snapshot -After $snapshotAfter)
    if ($filesChangedByFix.Count -eq 0) {
        return [pscustomobject]@{
            status = 'no-change'
            classification = $classification
            changedFiles = @()
        }
    }

    $unauthorizedFiles = @($filesChangedByFix | Where-Object { @($classification.allowedFiles) -notcontains $_ })
    if ($unauthorizedFiles.Count -gt 0) {
        Restore-FixBackup -Backup $backup -DeltaFiles $filesChangedByFix -RepoRoot $RepoRoot
        $violationPath = Join-Path $RunDirectory ("fix-scope-violation-attempt-{0}.json" -f $AttemptNumber)
        [ordered]@{
            classification = $classification.classification
            allowedFiles = @($classification.allowedFiles)
            changedFiles = @($filesChangedByFix)
            unauthorizedFiles = @($unauthorizedFiles)
            rolledBack = $true
        } | ConvertTo-Json -Depth 5 | Out-File -LiteralPath $violationPath -Encoding utf8
        return [pscustomobject]@{
            status = 'violation-rolled-back'
            classification = $classification
            changedFiles = @($filesChangedByFix)
            unauthorizedFiles = @($unauthorizedFiles)
        }
    }

    return [pscustomobject]@{
        status = 'changed'
        classification = $classification
        changedFiles = @($filesChangedByFix)
    }
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
$script:ResolvedClaudeSkillPath = $null
$repoRoot = Resolve-RepoRoot
$powerShellExe = Get-PowerShellExecutable
Set-Location -LiteralPath $repoRoot

if ($AutoNextPhase) {
    if ($Phase -or $ResumePhase) {
        throw 'Use -AutoNextPhase, -Phase, or -ResumePhase; do not combine them.'
    }
    if ($MaxPhases -lt 1) {
        throw 'MaxPhases must be at least 1.'
    }

    $branch = Assert-AutoNextPreconditions -RepoRoot $repoRoot
    $nextPhaseNumber = Get-NextPhaseNumber -RepoRoot $repoRoot -RequestedNumber $StartPhaseNumber
    $nextPhaseSchemaPath = Join-Path $repoRoot 'automation/schemas/next-phase.schema.json'

    for ($phaseIndex = 0; $phaseIndex -lt $MaxPhases; $phaseIndex++) {
        $runDirectory = New-RunDirectory -RepoRoot $repoRoot
        $decision = Invoke-CodexNextPhase `
            -RepoRoot $repoRoot `
            -RunDirectory $runDirectory `
            -PhaseNumber $nextPhaseNumber `
            -SchemaPath $nextPhaseSchemaPath

        if ($decision.completed) {
            Write-AutoNextSummary `
                -Path (Join-Path $runDirectory 'summary.md') `
                -PhaseNumber $nextPhaseNumber `
                -Completed $true `
                -Reason $decision.reason `
                -PhasePath ''
            Write-Host "AutoNextPhase completed: $($decision.reason)"
            return
        }

        $phaseRelativePath = "automation/phases/phase-$nextPhaseNumber.json"
        $phasePath = Join-Path $repoRoot $phaseRelativePath
        if (Test-Path -LiteralPath $phasePath) {
            throw "Generated phase path already exists: $phaseRelativePath"
        }
        $decision.phase | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $phasePath -Encoding utf8
        Write-AutoNextSummary `
            -Path (Join-Path $runDirectory 'summary.md') `
            -PhaseNumber $nextPhaseNumber `
            -Completed $false `
            -Reason $decision.reason `
            -PhasePath $phaseRelativePath

        $generatedPhaseArgument = $phaseRelativePath

        $childArgs = @(
            '-NoProfile',
            '-File', $PSCommandPath,
            '-Phase', $phaseRelativePath,
            '-MaxFixAttempts', $MaxFixAttempts,
            '-TestOnlyTolerance', $TestOnlyTolerance,
            '-ArchitectTimeoutSeconds', $ArchitectTimeoutSeconds,
            '-ImplementerTimeoutSeconds', $ImplementerTimeoutSeconds,
            '-ClaudePermissionMode', $ClaudePermissionMode,
            '-ClaudeSkill', $ClaudeSkill,
            '-PostProcessTimeoutSeconds', $PostProcessTimeoutSeconds,
            '-ValidationCommandTimeoutSeconds', $ValidationCommandTimeoutSeconds,
            '-ReviewerTimeoutSeconds', $ReviewerTimeoutSeconds,
            '-HeartbeatSeconds', $HeartbeatSeconds
        )
        if ($generatedPhaseArgument) { $childArgs += @('-GeneratedPhaseDefinition', $generatedPhaseArgument) }
        if ($CommitPhaseDefinition) { $childArgs += '-CommitGeneratedPhaseDefinition' }
        if ($AutoCommit) { $childArgs += '-AutoCommit' }
        if ($Push) { $childArgs += '-Push' }
        if ($UseCodexUserConfig) { $childArgs += '-UseCodexUserConfig' }
        if ($NoClaudeSkill) { $childArgs += '-NoClaudeSkill' }
        if ($VerboseLogs) { $childArgs += '-VerboseLogs' }
        if ($DryRun -or $StopAfterPlan) { $childArgs += '-DryRun' }

        & $powerShellExe @childArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Phase $nextPhaseNumber pipeline failed."
        }

        if ($DryRun -or $StopAfterPlan) {
            return
        }
        if ($StopAfterCommit) {
            return
        }

        $nextPhaseNumber = Get-NextPhaseNumber -RepoRoot $repoRoot -RequestedNumber $null
    }

    Write-Host "AutoNextPhase reached MaxPhases=$MaxPhases."
    return
}

if ($Phase -and $ResumePhase) {
    throw 'Use either -Phase or -ResumePhase, not both.'
}
if ($ResumePhase) {
    $Phase = $ResumePhase
}
if (-not $Phase) {
    throw 'Specify -Phase, -ResumePhase, or -AutoNextPhase.'
}

$resolvedPhasePath = Join-Path $repoRoot $Phase
$branch = Assert-CleanPreconditions -RepoRoot $repoRoot -ResolvedPhasePath $resolvedPhasePath -AllowedDirtyPath $GeneratedPhaseDefinition -ResumeMode:$([bool]$ResumePhase)
if ($ResumePhase -and -not $GeneratedPhaseDefinition) {
    $GeneratedPhaseDefinition = $Phase
}
$runDirectory = New-RunDirectory -RepoRoot $repoRoot
if ($ClaudePermissionMode -eq 'bypassPermissions') {
    throw 'ClaudePermissionMode bypassPermissions is prohibited.'
}
if ($UseCodexUserConfig) {
    Write-Host 'Codex user config: enabled'
} else {
    Write-Host 'Codex user config: isolated'
}
$phaseJson = Get-Content -LiteralPath $resolvedPhasePath -Raw
$phaseObject = Get-PhaseObject -Path $resolvedPhasePath
$phaseReportPath = Get-PhaseReportPath -RepoRoot $repoRoot -PhaseObject $phaseObject
$validationHashExclusions = @($GeneratedPhaseDefinition)
if ($phaseReportPath) { $validationHashExclusions += $phaseReportPath }
$planSchemaPath = Join-Path $repoRoot 'automation/schemas/plan.schema.json'
$reviewSchemaPath = Join-Path $repoRoot 'automation/schemas/review.schema.json'
$failures = New-Object System.Collections.Generic.List[string]
$attempts = 0
$validationFixAttempts = 0
$reviewFixAttempts = 0
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
    if ($ResumePhase) {
        $planJson = '{"approved":true,"summary":"Resume existing phase diff.","steps":[],"risks":[]}'
    } elseif ($SkipArchitect) {
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

    if ($CommitGeneratedPhaseDefinition -and -not $DryRun) {
        & git add -- $GeneratedPhaseDefinition
        if ($LASTEXITCODE -ne 0) {
            throw 'Failed to stage generated phase definition.'
        }
        $generatedPhaseId = [System.IO.Path]::GetFileNameWithoutExtension($GeneratedPhaseDefinition)
        & git commit -m "chore(automation): define $generatedPhaseId"
        if ($LASTEXITCODE -ne 0) {
            throw 'Failed to commit generated phase definition after Architect approval.'
        }
    }

    if ($DryRun) {
        Write-Host 'DryRun completed after planning. No implementation, validation, review, commit, or push performed.'
        return
    }

    if (-not $ResumePhase) {
        Invoke-ClaudeImplementation -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson
    }

    $validationArgs = @(
        '-NoProfile',
        '-File', (Join-Path $repoRoot 'scripts/validate-phase.ps1'),
        '-Phase', $Phase,
        '-RunDirectory', $runDirectory,
        '-ValidationCommandTimeoutSeconds', $ValidationCommandTimeoutSeconds
    )
    if ($GeneratedPhaseDefinition) {
        $validationArgs += '-ExcludedFiles'
        $validationArgs += $GeneratedPhaseDefinition
    }
    if ($VerboseLogs) {
        $validationArgs += '-VerboseLogs'
    }
    if ($ResumePhase) {
        Write-Host 'ResumePhase starting validation'
    } else {
        Write-Host 'Implementer finished, starting validation'
    }

    $validationAttemptNumber = 1
    $currentDiffHash = Get-ValidatedDiffHash -RepoRoot $repoRoot -PhaseObject $phaseObject -ExcludePaths $validationHashExclusions
    $validatedDiffHash = ''
    $validationReused = $false
    $validationResult = $null
    if ($ResumePhase) {
        $resumeFiles = @(Get-ChangedFiles -ExcludePaths @($GeneratedPhaseDefinition))
        Assert-FilesWithinAllowlist -Files $resumeFiles -PhaseObject $phaseObject
        $reusableValidation = Find-ReusableValidation -RepoRoot $repoRoot -PhaseId $phaseObject.id -CurrentHash $currentDiffHash
        if ($null -ne $reusableValidation) {
            $validationReused = $true
            $validatedDiffHash = $reusableValidation.hash
            $validationResult = [pscustomobject]@{ exitCode = 0; data = $reusableValidation.result; path = (Join-Path $reusableValidation.sourceDirectory 'validation-result.json') }
        }
    }
    Write-Host "Validation reused: $($validationReused.ToString().ToLowerInvariant())"
    Write-Host "Validated diff hash: $validatedDiffHash"
    Write-Host "Current diff hash: $currentDiffHash"
    if (-not $validationReused) {
        $validationResult = Invoke-PhaseValidationAttempt -PowerShellExecutable $powerShellExe -ValidationArguments $validationArgs -RunDirectory $runDirectory -AttemptNumber $validationAttemptNumber
    }
    $validationAction = Get-ValidationRetryAction -ExitCode $validationResult.exitCode -AttemptsUsed $validationFixAttempts -MaximumAttempts $MaxFixAttempts -FailedItems @($validationResult.data.failed)
    while ($validationAction -eq 'retry') {
        $failedItems = @($validationResult.data.failed)
        if ($failedItems.Count -eq 0) {
            throw "Validation attempt $validationAttemptNumber failed without structured failed items."
        }
        $scopeFailures = @($failedItems | Where-Object { $_.label -eq 'scope' })
        if ($scopeFailures.Count -gt 0) {
            throw 'Scope validation failed; automatic scope expansion is prohibited.'
        }

        $failureClassification = Get-ValidationFailureClassification -FailedItems $failedItems -PhaseObject $phaseObject -Tolerance $TestOnlyTolerance
        if ($failureClassification.classification -eq 'unknown') {
            $failures.Add("Validation failure classification is unknown: $($failureClassification.expectedCorrection)")
            throw 'Unknown validation failure requires human review; Claude was not called.'
        }

        $validationFixAttempts++
        $attempts++
        Write-Host ("[Fix {0}/{1}] preparing targeted correction" -f $validationFixAttempts, $MaxFixAttempts)
        Write-Host ("[Fix {0}/{1}] Claude running..." -f $validationFixAttempts, $MaxFixAttempts)
        $fixResult = Invoke-ValidationCorrection -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseObject $phaseObject -FailedItems $failedItems -AttemptNumber $validationFixAttempts -Classification $failureClassification
        if ($fixResult.status -eq 'no-change') {
            throw "Claude made no workspace change during fix attempt $validationFixAttempts. Stopping to avoid an infinite retry loop."
        }
        if ($fixResult.status -eq 'violation-rolled-back') {
            Write-Host ("[Fix {0}/{1}] unauthorized changes rolled back: {2}" -f $validationFixAttempts, $MaxFixAttempts, ($fixResult.unauthorizedFiles -join ', '))
            $validationAction = Get-ValidationRetryAction -ExitCode $validationResult.exitCode -AttemptsUsed $validationFixAttempts -MaximumAttempts $MaxFixAttempts -FailedItems @($validationResult.data.failed)
            continue
        }
        $fixChangedFiles = @($fixResult.changedFiles)
        Write-Host ("[Fix {0}/{1}] changed files: {2}" -f $validationFixAttempts, $MaxFixAttempts, ($fixChangedFiles -join ', '))
        Write-Host ("[Fix {0}/{1}] revalidating..." -f $validationFixAttempts, $MaxFixAttempts)

        $targetedPassed = $true
        foreach ($failedCommand in @($failureClassification.failedCommands | Sort-Object -Unique)) {
            $targetedArguments = @($validationArgs + @('-SingleCommand', $failedCommand))
            $targetedResult = Invoke-PhaseValidationAttempt -PowerShellExecutable $powerShellExe -ValidationArguments $targetedArguments -RunDirectory $runDirectory -AttemptNumber $validationFixAttempts -ResultPrefix 'validation-specific-attempt' -SkipFailureArtifact
            if ($targetedResult.exitCode -ne 0) {
                $validationResult = $targetedResult
                $targetedPassed = $false
                break
            }
        }
        if ($targetedPassed) {
            $validationAttemptNumber++
            $validationResult = Invoke-PhaseValidationAttempt -PowerShellExecutable $powerShellExe -ValidationArguments $validationArgs -RunDirectory $runDirectory -AttemptNumber $validationAttemptNumber
        }
        if ($validationResult.exitCode -eq 0) {
            Write-Host ("[Fix {0}/{1}] validation passed" -f $validationFixAttempts, $MaxFixAttempts)
        }
        $validationAction = Get-ValidationRetryAction -ExitCode $validationResult.exitCode -AttemptsUsed $validationFixAttempts -MaximumAttempts $MaxFixAttempts -FailedItems @($validationResult.data.failed)
    }
    if ($validationAction -eq 'reject-scope') {
        throw 'Scope validation failed; automatic scope expansion is prohibited.'
    }
    if ($validationAction -eq 'stop') {
        $finalBlockers = @($validationResult.data.failed | ForEach-Object { $_.command })
        $failures.Add("Validation still failed after $validationFixAttempts correction attempt(s): $($finalBlockers -join '; ')")
        throw 'Validation failed after reaching MaxFixAttempts.'
    }

    $currentDiffHash = Get-ValidatedDiffHash -RepoRoot $repoRoot -PhaseObject $phaseObject -ExcludePaths $validationHashExclusions
    $validatedDiffHash = $currentDiffHash
    Save-ValidatedDiff -RunDirectory $runDirectory -ValidationResult $validationResult.data -Hash $validatedDiffHash
    Write-Host "Validated diff hash: $validatedDiffHash"
    Write-Host "Current diff hash: $currentDiffHash"

    if ($phaseReportPath) {
        $null = Invoke-PhaseReportValidationSync -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseObject $phaseObject -ReportPath $phaseReportPath -ValidationResult $validationResult.data
    }
    $reviewDiffHash = Get-ValidatedDiffHash -RepoRoot $repoRoot -PhaseObject $phaseObject -ExcludePaths @($GeneratedPhaseDefinition)
    $internalExecutionFiles = @(Get-InternalExecutionFiles -RepoRoot $repoRoot -RunDirectory $runDirectory -GeneratedPhasePath $GeneratedPhaseDefinition)
    Write-Host 'Reviewer excluded internal files:'
    $internalExecutionFiles | ForEach-Object { Write-Host "- $_" }
    $allChangedForReview = @(Get-ChangedFiles)
    $changedForReview = @(Get-ReviewerChangedFiles -ChangedFiles $allChangedForReview -InternalFiles $internalExecutionFiles)
    $validationSummary = [ordered]@{ phaseId = $phaseObject.id; passed = $true; failedCount = 0; reused = $validationReused; validatedCodeHash = $validatedDiffHash; currentReviewDiffHash = $reviewDiffHash } | ConvertTo-Json -Compress
    $reviewJson = Invoke-CodexReview -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -SchemaPath $reviewSchemaPath -ChangedFiles $changedForReview -ValidationSummary $validationSummary -InternalFiles $internalExecutionFiles
    $reviewObject = $reviewJson | ConvertFrom-Json

    while ((-not $reviewObject.approved -or @($reviewObject.blockers).Count -gt 0) -and $reviewFixAttempts -lt $MaxFixAttempts) {
        $reviewFixAttempts++
        $attempts++

        Invoke-FixAttempt -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -PlanJson $planJson -Blockers @($reviewObject.blockers) -AttemptNumber $reviewFixAttempts

        $reviewFixValidation = Invoke-PhaseValidationAttempt -PowerShellExecutable $powerShellExe -ValidationArguments $validationArgs -RunDirectory $runDirectory -AttemptNumber $reviewFixAttempts -ResultPrefix 'review-fix-validation'
        if ($reviewFixValidation.exitCode -ne 0) {
            $failures.Add("Validation failed after fix attempt $attempts.")
            throw 'Validation failed after fix attempt.'
        }

        $currentDiffHash = Get-ValidatedDiffHash -RepoRoot $repoRoot -PhaseObject $phaseObject -ExcludePaths $validationHashExclusions
        $validatedDiffHash = $currentDiffHash
        Save-ValidatedDiff -RunDirectory $runDirectory -ValidationResult $reviewFixValidation.data -Hash $validatedDiffHash
        $allChangedForReview = @(Get-ChangedFiles)
        $changedForReview = @(Get-ReviewerChangedFiles -ChangedFiles $allChangedForReview -InternalFiles $internalExecutionFiles)
        $validationSummary = [ordered]@{ phaseId = $phaseObject.id; passed = $true; failedCount = 0; reused = $false; diffHash = $validatedDiffHash } | ConvertTo-Json -Compress

        $reviewJson = Invoke-CodexReview -RepoRoot $repoRoot -RunDirectory $runDirectory -PhaseJson $phaseJson -SchemaPath $reviewSchemaPath -ChangedFiles $changedForReview -ValidationSummary $validationSummary -InternalFiles $internalExecutionFiles
        $reviewObject = $reviewJson | ConvertFrom-Json
    }

    $reviewApproved = [bool]($reviewObject.approved -and @($reviewObject.blockers).Count -eq 0)
    if (-not $reviewApproved) {
        $failures.Add('Review still has blockers after allowed attempts.')
        throw 'Review rejected.'
    }

    $changedFiles = @(Get-ChangedFiles -ExcludePaths @($GeneratedPhaseDefinition))
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

    if ($GeneratedPhaseDefinition) {
        & git add -- $GeneratedPhaseDefinition
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to stage generated phase definition: $GeneratedPhaseDefinition"
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
