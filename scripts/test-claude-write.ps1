[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
    throw 'Not inside a Git repository.'
}

$claudeCmd = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'npm\claude.cmd'
if (-not (Test-Path -LiteralPath $claudeCmd)) {
    throw "Claude command not found: $claudeCmd"
}

$testRelativePath = 'automation/claude-write-test.txt'
$testPath = Join-Path $repoRoot $testRelativePath
$prompt = "Create exactly one file named $testRelativePath with the exact content OK. Do not read, edit, or create any other file."
$originalLocation = Get-Location

try {
    Set-Location -LiteralPath $repoRoot

    if (Test-Path -LiteralPath $testPath) {
        throw "Controlled test file already exists: $testPath"
    }

    $prompt | & $claudeCmd `
        -p `
        --permission-mode acceptEdits `
        --tools Write `
        --allowedTools "Write($testRelativePath)" `
        --disallowedTools 'Bash,Edit,Read,Glob,Grep,WebFetch,WebSearch' `
        --no-session-persistence

    if ($LASTEXITCODE -ne 0) {
        throw "Claude controlled write test failed with exit code $LASTEXITCODE."
    }

    if (-not (Test-Path -LiteralPath $testPath)) {
        throw 'Claude did not create the controlled test file.'
    }

    $content = (Get-Content -LiteralPath $testPath -Raw).Trim()
    if ($content -ne 'OK') {
        throw "Unexpected controlled test content: $content"
    }

    Write-Host 'Claude controlled write test: OK'
}
finally {
    if (Test-Path -LiteralPath $testPath) {
        Remove-Item -LiteralPath $testPath -Force
    }
    Set-Location -LiteralPath $originalLocation
}
