[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $sourceRoot) { throw 'Not inside the source repository.' }
$validator = Join-Path $sourceRoot 'scripts/validate-next-phase.ps1'
$schemaPath = Join-Path $sourceRoot 'automation/schemas/next-phase.schema.json'
$powerShellExe = Join-Path $PSHOME 'powershell.exe'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("auto-next-phase-{0}" -f ([guid]::NewGuid().ToString('N')))
$originalLocation = Get-Location

function New-Decision {
    param(
        [string[]]$AllowedFiles,
        [string[]]$ForbiddenFiles,
        [string[]]$JsTests,
        [string]$Description = 'Small reversible extraction.'
    )

    return [ordered]@{
        completed = $false
        reason = 'Smallest safe seam.'
        phase = [ordered]@{
            id = 'phase-15'
            title = 'Extract focused Finance calculation'
            description = $Description
            allowedFiles = $AllowedFiles
            forbiddenFiles = $ForbiddenFiles
            phpTests = @('php tests/run.php')
            jsTests = $JsTests
            phpLint = @()
            jsLint = @()
            commitMessage = 'refactor(finance): extract focused calculation'
        }
    }
}

function Invoke-ValidationCase {
    param(
        [string]$Name,
        $Decision,
        [bool]$ShouldPass
    )

    $path = Join-Path $testRoot "$Name.json"
    $Decision | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding utf8
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $null = & $powerShellExe -NoProfile -NonInteractive -File $validator -DecisionPath $path -ExpectedPhaseNumber 15 2>&1
        $passed = ($LASTEXITCODE -eq 0)
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($passed -ne $ShouldPass) {
        throw "Validation case '$Name' expected pass=$ShouldPass but got pass=$passed."
    }
}

try {
    New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
    Set-Location -LiteralPath $testRoot
    & git init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Failed to initialize temporary repository.' }

    $null = Get-Content -LiteralPath $schemaPath -Raw | ConvertFrom-Json

    $source = 'app/Modules/Finance/Frontend/finance-projection.js'
    $asset = 'assets/finance-projection.js'
    $testFile = 'tests/js/finance_projection_test.js'
    $hashCommand = "powershell -Command Get-FileHash $source; Get-FileHash $asset"
    $valid = New-Decision `
        -AllowedFiles @('assets/app.js', $source, $asset, $testFile, 'index.php') `
        -ForbiddenFiles @('api/', 'scripts/', 'migrations/') `
        -JsTests @("node $testFile", $hashCommand)
    Invoke-ValidationCase -Name 'valid' -Decision $valid -ShouldPass $true

    $wildcard = New-Decision -AllowedFiles @('assets/*', $testFile) -ForbiddenFiles @('api/') -JsTests @("node $testFile")
    Invoke-ValidationCase -Name 'wildcard' -Decision $wildcard -ShouldPass $false

    $automation = New-Decision -AllowedFiles @('automation/generated.json', $testFile) -ForbiddenFiles @('api/') -JsTests @("node $testFile")
    Invoke-ValidationCase -Name 'automation' -Decision $automation -ShouldPass $false

    $overlap = New-Decision -AllowedFiles @('api/new.php', $testFile) -ForbiddenFiles @('api/') -JsTests @("node $testFile")
    Invoke-ValidationCase -Name 'overlap' -Decision $overlap -ShouldPass $false

    $noTest = New-Decision -AllowedFiles @('assets/app.js') -ForbiddenFiles @('api/') -JsTests @()
    Invoke-ValidationCase -Name 'no-new-test' -Decision $noTest -ShouldPass $false

    $completed = [ordered]@{
        completed = $true
        reason = 'No safe next phase.'
        phase = [ordered]@{
            id = 'phase-15'; title = ''; description = ''; allowedFiles = @(); forbiddenFiles = @()
            phpTests = @(); jsTests = @(); phpLint = @(); jsLint = @(); commitMessage = ''
        }
    }
    Invoke-ValidationCase -Name 'completed' -Decision $completed -ShouldPass $true

    Write-Host 'Auto next phase controlled test: OK'
}
finally {
    Set-Location -LiteralPath $originalLocation
    $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolvedTestRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTestRoot)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
