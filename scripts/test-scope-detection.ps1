[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $sourceRoot) {
    throw 'Not inside the source Git repository.'
}

$checkScopePath = Join-Path $sourceRoot 'scripts/check-scope.ps1'
$powerShellExe = Join-Path $PSHOME 'powershell.exe'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("scope-detection-{0}" -f ([guid]::NewGuid().ToString('N')))
$allowedRelativePath = 'app/Modules/Finance/Frontend/finance-category-key-calculation.js'
$allowedAssetPath = 'assets/finance-category-key-calculation.js'
$allowedTestPath = 'tests/js/finance_category_key_calculation_test.js'
$allowedReportPath = 'docs/architecture/finance/PHASE_24_CATEGORY_KEY_CALCULATION_REPORT.md'
$rejectedRelativePath = 'app/Modules/Finance/Frontend/unexpected.js'
$trackedRelativePath = 'tracked.txt'
$originalLocation = Get-Location

try {
    New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
    Set-Location -LiteralPath $testRoot

    & git init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Failed to initialize temporary Git repository.' }
    & git config user.email 'scope-test@example.invalid'
    & git config user.name 'Scope Test'

    'initial' | Set-Content -LiteralPath $trackedRelativePath -Encoding utf8
    $phase = [ordered]@{
        id = 'scope-test'
        title = 'Scope detection test'
        description = 'Internal scope detection fixture.'
        allowedFiles = @($allowedRelativePath, $allowedAssetPath, $allowedTestPath, $allowedReportPath, $trackedRelativePath, 'db.php')
        forbiddenFiles = @('api/', 'migrations/', 'app/Modules/Finance/Backend/')
        phpTests = @()
        jsTests = @()
        phpLint = @()
        jsLint = @()
        commitMessage = 'test: scope detection'
    }
    $phase | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath 'phase.json' -Encoding utf8
    & git add -- $trackedRelativePath 'phase.json'
    & git commit --quiet -m 'test: initialize fixture'
    if ($LASTEXITCODE -ne 0) { throw 'Failed to commit temporary test fixture.' }

    'modified' | Set-Content -LiteralPath $trackedRelativePath -Encoding utf8
    $allowedPath = Join-Path $testRoot $allowedRelativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $allowedPath) -Force | Out-Null
    'allowed' | Set-Content -LiteralPath $allowedPath -Encoding utf8

    $allowedOutput = & $powerShellExe -NoProfile -NonInteractive -File $checkScopePath -Phase 'phase.json'
    $allowedExitCode = $LASTEXITCODE
    if ($allowedExitCode -ne 0) { throw 'Allowed untracked file was rejected.' }
    $allowedResult = ($allowedOutput -join [Environment]::NewLine) | ConvertFrom-Json
    if ($allowedResult.changedFiles -notcontains $allowedRelativePath) { throw 'Allowed untracked file was not detected.' }
    if ($allowedResult.changedFiles -notcontains $trackedRelativePath) { throw 'Modified tracked file was not detected.' }
    if ($allowedResult.changedFiles -contains 'app/Modules/Finance/Frontend/') { throw 'Aggregated directory appeared as a changed file.' }

    $controlledAllowedFiles = @($allowedRelativePath, $allowedAssetPath, $allowedTestPath, $allowedReportPath)
    foreach ($file in $controlledAllowedFiles) {
        $controlledOutput = & $powerShellExe -NoProfile -NonInteractive -File $checkScopePath -Phase 'phase.json' -ChangedFiles $file
        if ($LASTEXITCODE -ne 0) { throw "Explicitly allowed sensitive file was rejected: $file" }
        $controlledResult = ($controlledOutput -join [Environment]::NewLine) | ConvertFrom-Json
        if ($controlledResult.sensitiveTouched -notcontains $file) { throw "Allowed sensitive file was not reported diagnostically: $file" }
        if ($controlledResult.sensitiveViolations -contains $file) { throw "Allowed sensitive file was reported as a violation: $file" }
    }

    $absoluteOutput = & $powerShellExe -NoProfile -NonInteractive -File $checkScopePath -Phase 'phase.json' -ChangedFiles 'db.php'
    if ($LASTEXITCODE -eq 0) { throw 'Absolutely protected db.php was accepted from the allowlist.' }
    $absoluteResult = ($absoluteOutput -join [Environment]::NewLine) | ConvertFrom-Json
    if ($absoluteResult.sensitiveViolations -notcontains 'db.php') { throw 'Absolutely protected db.php was not reported as a sensitive violation.' }

    $sensitiveOutsidePath = 'unapproved-secret.txt'
    $sensitiveOutput = & $powerShellExe -NoProfile -NonInteractive -File $checkScopePath -Phase 'phase.json' -ChangedFiles $sensitiveOutsidePath
    if ($LASTEXITCODE -eq 0) { throw 'Sensitive file outside the allowlist was accepted.' }
    $sensitiveResult = ($sensitiveOutput -join [Environment]::NewLine) | ConvertFrom-Json
    if ($sensitiveResult.sensitiveTouched -notcontains $sensitiveOutsidePath) { throw 'Sensitive file outside the allowlist was not reported diagnostically.' }
    if ($sensitiveResult.sensitiveViolations -notcontains $sensitiveOutsidePath) { throw 'Sensitive file outside the allowlist was not reported as a violation.' }

    & git checkout -- $trackedRelativePath
    Remove-Item -LiteralPath $allowedPath -Force
    $noChangesOutput = & $powerShellExe -NoProfile -NonInteractive -File $checkScopePath -Phase 'phase.json'
    if ($LASTEXITCODE -eq 0) { throw 'Phase without changes was accepted.' }
    $noChangesResult = ($noChangesOutput -join [Environment]::NewLine) | ConvertFrom-Json
    if ($noChangesResult.hasChanges) { throw 'Phase without changes reported hasChanges=true.' }

    $rejectedPath = Join-Path $testRoot $rejectedRelativePath
    'rejected' | Set-Content -LiteralPath $rejectedPath -Encoding utf8
    $rejectedOutput = & $powerShellExe -NoProfile -NonInteractive -File $checkScopePath -Phase 'phase.json'
    $rejectedExitCode = $LASTEXITCODE
    if ($rejectedExitCode -eq 0) { throw 'Unexpected untracked file was accepted.' }
    $rejectedResult = ($rejectedOutput -join [Environment]::NewLine) | ConvertFrom-Json
    if ($rejectedResult.outsideAllowlist -notcontains $rejectedRelativePath) { throw 'Unexpected untracked file was not reported outside the allowlist.' }

    Write-Host 'Scope detection test: OK'
}
finally {
    Set-Location -LiteralPath $originalLocation
    $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolvedTestRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTestRoot)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
