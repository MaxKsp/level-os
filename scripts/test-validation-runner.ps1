[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $sourceRoot) { throw 'Not inside the source repository.' }
$validator = Join-Path $sourceRoot 'scripts/validate-phase.ps1'
$powerShellExe = Join-Path $PSHOME 'powershell.exe'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("validation-runner-{0}" -f ([guid]::NewGuid().ToString('N')))
$originalLocation = Get-Location

function Write-TestPhase {
    param(
        [string]$Path,
        [string[]]$Commands
    )

    [ordered]@{
        id = 'validation-runner-test'
        title = 'Validation runner test'
        description = 'Controlled temporary validation fixture.'
        allowedFiles = @('fixture.txt')
        forbiddenFiles = @('api/')
        phpTests = @()
        jsTests = $Commands
        phpLint = @()
        jsLint = @()
        commitMessage = 'test: validation runner'
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Invoke-Validator {
    param(
        [string]$PhasePath,
        [string]$RunDirectory,
        [int]$TimeoutSeconds
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $powerShellExe `
            -NoProfile `
            -NonInteractive `
            -File $validator `
            -Phase $PhasePath `
            -RunDirectory $RunDirectory `
            -ResultPath (Join-Path $RunDirectory 'validation-result.json') `
            -SkipScope `
            -ValidationCommandTimeoutSeconds $TimeoutSeconds 2>&1
        return [pscustomobject]@{
            output = @($output)
            exitCode = $LASTEXITCODE
        }
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

try {
    New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
    Set-Location -LiteralPath $testRoot
    & git init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Failed to initialize temporary repository.' }
    'fixture' | Set-Content -LiteralPath 'fixture.txt' -Encoding utf8

    $successRun = Join-Path $testRoot 'success-run'
    $successPhase = Join-Path $testRoot 'success.json'
    $stdoutCommand = 'powershell.exe -NoProfile -NonInteractive -Command "Write-Output validation-ok; [Console]::Error.WriteLine(''validation-stderr'')"'
    $stdinCommand = 'powershell.exe -NoProfile -NonInteractive -Command "$null = [Console]::In.ReadToEnd(); Write-Output stdin-closed"'
    Write-TestPhase -Path $successPhase -Commands @($stdoutCommand, $stdinCommand)
    $success = Invoke-Validator -PhasePath 'success.json' -RunDirectory $successRun -TimeoutSeconds 10
    if ($success.exitCode -ne 0) { throw "Controlled successful validation failed:`n$($success.output -join [Environment]::NewLine)" }
    $successText = $success.output -join [Environment]::NewLine
    if ($successText -notmatch '\[Validation\] starting:' -or $successText -notmatch '\[Validation\] passed:') {
        throw 'Validation progress messages were not emitted.'
    }
    if ($successText -notmatch 'stdin-closed') {
        throw 'Validation command did not observe closed stdin.'
    }
    if (-not (Test-Path -LiteralPath $successRun -PathType Container)) {
        throw 'Validator did not create the missing run directory.'
    }
    $successLastCommandPath = Join-Path $successRun 'validation-last-command.txt'
    if (-not (Test-Path -LiteralPath $successLastCommandPath -PathType Leaf)) {
        throw 'Validator did not write validation-last-command.txt in the newly created run directory.'
    }
    $successLastCommand = Get-Content -LiteralPath $successLastCommandPath -Raw
    if ($successLastCommand.Trim() -ne $stdinCommand) {
        throw 'Last validation command was not recorded in the newly created run directory.'
    }
    $successResult = Get-Content -LiteralPath (Join-Path $successRun 'validation-result.json') -Raw | ConvertFrom-Json
    if (-not $successResult.passed) { throw 'Structured validation result did not report success.' }

    $timeoutRun = Join-Path $testRoot 'timeout-run'
    $timeoutPhase = Join-Path $testRoot 'timeout.json'
    $timeoutCommand = 'powershell.exe -NoProfile -NonInteractive -Command "Start-Sleep 30"'
    Write-TestPhase -Path $timeoutPhase -Commands @($timeoutCommand)
    $startedAt = Get-Date
    $timeout = Invoke-Validator -PhasePath 'timeout.json' -RunDirectory $timeoutRun -TimeoutSeconds 1
    $elapsed = (Get-Date) - $startedAt
    if ($timeout.exitCode -eq 0) { throw 'Timed-out validation command unexpectedly passed.' }
    if ($elapsed.TotalSeconds -ge 15) { throw 'Per-command timeout did not terminate promptly.' }
    $timeoutText = $timeout.output -join [Environment]::NewLine
    if ($timeoutText -notmatch 'TimedOut: True' -or $timeoutText -notmatch 'ExitCode:' -or $timeoutText -notmatch 'stdout:' -or $timeoutText -notmatch 'stderr:') {
        throw 'Timed-out command diagnostics were incomplete.'
    }
    $lastCommand = Get-Content -LiteralPath (Join-Path $timeoutRun 'validation-last-command.txt') -Raw
    if ($lastCommand.Trim() -ne $timeoutCommand) { throw 'Last validation command was not recorded.' }
    $timeoutResult = Get-Content -LiteralPath (Join-Path $timeoutRun 'validation-result.json') -Raw | ConvertFrom-Json
    if ($timeoutResult.passed -or @($timeoutResult.failed).Count -ne 1) { throw 'Structured validation result did not preserve the failed command.' }

    Write-Host 'Validation runner controlled test: OK'
}
finally {
    Set-Location -LiteralPath $originalLocation
    $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolvedTestRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTestRoot)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
