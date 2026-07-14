[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Phase,

    [string]$RunDirectory,

    [switch]$SkipScope,

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

function Get-PhaseObject {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Phase file not found: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Assert-PhaseDefinition {
    param($Definition)

    $required = @(
        'id',
        'title',
        'description',
        'allowedFiles',
        'forbiddenFiles',
        'phpTests',
        'jsTests',
        'phpLint',
        'jsLint',
        'commitMessage'
    )

    foreach ($name in $required) {
        if (-not ($Definition.PSObject.Properties.Name -contains $name)) {
            throw "Phase definition missing required property: $name"
        }
    }

    foreach ($collectionName in @('allowedFiles', 'forbiddenFiles', 'phpTests', 'jsTests', 'phpLint', 'jsLint')) {
        $items = @($Definition.$collectionName)
        if ($items.Count -eq 0 -and $collectionName -in @('allowedFiles')) {
            throw "Phase definition requires at least one entry in $collectionName"
        }
    }
}

function Invoke-LoggedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(Mandatory = $true)]
        [string]$Label,

        [string]$OutputDirectory
    )

    Write-Host "==> $Label"
    $lines = & powershell -NoProfile -Command $Command 2>&1
    $exitCode = $LASTEXITCODE

    if ($OutputDirectory) {
        $logPath = Join-Path $OutputDirectory ($Label -replace '[^A-Za-z0-9\-_]+', '_').ToLower() + '.log'
        $lines | Out-File -LiteralPath $logPath -Encoding utf8
    }

    if ($VerboseLogs) {
        $lines | ForEach-Object { Write-Host $_ }
    }

    [pscustomobject]@{
        label    = $Label
        command  = $Command
        exitCode = $exitCode
        passed   = ($exitCode -eq 0)
    }
}

$repoRoot = Resolve-RepoRoot
$powerShellExe = Get-PowerShellExecutable
Set-Location -LiteralPath $repoRoot

$phasePath = Join-Path $repoRoot $Phase
$phaseObject = Get-PhaseObject -Path $phasePath
Assert-PhaseDefinition -Definition $phaseObject

$results = New-Object System.Collections.Generic.List[object]

if (-not $SkipScope) {
    $scopeJson = & $powerShellExe -NoProfile -File (Join-Path $repoRoot 'scripts/check-scope.ps1') -Phase $Phase
    $scopeExitCode = $LASTEXITCODE

    if ($RunDirectory) {
        $scopeJson | Out-File -LiteralPath (Join-Path $RunDirectory 'scope.json') -Encoding utf8
    }

    if ($scopeExitCode -ne 0) {
        throw 'Scope validation failed.'
    }
}

foreach ($command in @($phaseObject.phpTests)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "php-test-$($results.Count + 1)" -OutputDirectory $RunDirectory))
}

foreach ($command in @($phaseObject.jsTests)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "js-test-$($results.Count + 1)" -OutputDirectory $RunDirectory))
}

foreach ($command in @($phaseObject.phpLint)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "php-lint-$($results.Count + 1)" -OutputDirectory $RunDirectory))
}

foreach ($command in @($phaseObject.jsLint)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "js-lint-$($results.Count + 1)" -OutputDirectory $RunDirectory))
}

$failed = @($results | Where-Object { -not $_.passed })
$summary = [pscustomobject]@{
    phaseId  = $phaseObject.id
    passed   = ($failed.Count -eq 0)
    results  = @($results)
    failed   = @($failed)
}

$summary | ConvertTo-Json -Depth 6

if ($failed.Count -gt 0) {
    exit 1
}
