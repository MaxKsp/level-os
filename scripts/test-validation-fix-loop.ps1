[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $sourceRoot) { throw 'Not inside the source repository.' }
$pipelinePath = Join-Path $sourceRoot 'scripts/ai-pipeline.ps1'
$pipelineText = Get-Content -LiteralPath $pipelinePath -Raw
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($pipelinePath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw 'Pipeline must parse before controlled fix-loop tests run.' }

function Get-PipelineFunctionDefinition {
    param([string]$Name)
    $definition = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name }, $true)
    if (-not $definition) { throw "Pipeline function not found: $Name" }
    return $definition.Extent.Text
}

foreach ($functionName in @(
    'Get-ChangedFiles',
    'Get-WorkspaceSnapshot',
    'Get-SnapshotChangedFiles',
    'Get-TestFilesFromFailures',
    'Get-RelatedProductionFiles',
    'Get-ValidationFailureClassification',
    'Get-ValidationRetryAction',
    'Get-ValidatedDiffHash',
    'Find-ReusableValidation',
    'Save-ValidatedDiff',
    'New-FixBackup',
    'Restore-FixBackup'
)) {
    Invoke-Expression (Get-PipelineFunctionDefinition -Name $functionName)
}

$phase = [pscustomobject]@{
    id = 'phase-test'
    allowedFiles = @(
        'app/Modules/Finance/Frontend/finance-period-calculation.js',
        'assets/finance-period-calculation.js',
        'tests/js/finance_period_calculation_test.js'
    )
}
$ieeeFailure = [pscustomobject]@{
    label = 'js-test-1'
    command = 'node tests/js/finance_period_calculation_test.js'
    stdout = "Actual: 1000.0000000000001`nExpected: 1000"
    stderr = ''
}
$ieee = Get-ValidationFailureClassification -FailedItems @($ieeeFailure) -PhaseObject $phase -Tolerance 1e-9
if ($ieee.classification -ne 'test-only' -or @($ieee.allowedFiles).Count -ne 1 -or $ieee.allowedFiles[0] -ne 'tests/js/finance_period_calculation_test.js') {
    throw 'IEEE-754 failure did not restrict correction to the associated test.'
}
if ($ieee.expectedCorrection -notmatch 'assert\.ok' -or $ieee.expectedCorrection -notmatch 'Nao arredonde') {
    throw 'IEEE-754 guidance does not require tolerance without production rounding.'
}

$crossRealmFailure = [pscustomobject]@{
    label = 'js-test-1'; command = 'node tests/js/finance_period_calculation_test.js'
    stdout = 'Values have same structure but are not reference-equal'; stderr = ''
}
$crossRealm = Get-ValidationFailureClassification -FailedItems @($crossRealmFailure) -PhaseObject $phase
if ($crossRealm.classification -ne 'test-only' -or @($crossRealm.allowedFiles | Where-Object { -not $_.StartsWith('tests/') }).Count -gt 0) {
    throw 'Cross-realm failure allowed a production file.'
}

$functionalFailure = [pscustomobject]@{
    label = 'js-test-1'; command = 'node tests/js/finance_period_calculation_test.js'
    stdout = 'Actual: 700'; stderr = 'Expected: 1000'
}
$functional = Get-ValidationFailureClassification -FailedItems @($functionalFailure) -PhaseObject $phase
if ($functional.classification -ne 'production-possible' -or @($functional.allowedFiles | Where-Object { $_.StartsWith('app/') }).Count -ne 1) {
    throw 'Confirmed functional mismatch did not authorize only related phase production files.'
}

$unknownFailure = [pscustomobject]@{ label = 'js-test-1'; command = 'node tests/js/finance_period_calculation_test.js'; stdout = 'unclassified failure'; stderr = '' }
$unknown = Get-ValidationFailureClassification -FailedItems @($unknownFailure) -PhaseObject $phase
if ($unknown.classification -ne 'unknown') { throw 'Unknown failure was classified for automatic Claude execution.' }

if ((Get-ValidationRetryAction -ExitCode 1 -AttemptsUsed 0 -MaximumAttempts 2 -FailedItems @($ieeeFailure)) -ne 'retry') { throw 'First retry was not allowed.' }
if ((Get-ValidationRetryAction -ExitCode 1 -AttemptsUsed 2 -MaximumAttempts 2 -FailedItems @($ieeeFailure)) -ne 'stop') { throw 'MaxFixAttempts was not enforced.' }
if ($pipelineText.IndexOf("'-SingleCommand'") -lt 0 -or $pipelineText.IndexOf("ResultPrefix 'validation-specific-attempt'") -lt 0) {
    throw 'Failed command is not validated before the complete suite.'
}
if ($pipelineText -notmatch 'Unknown validation failure requires human review; Claude was not called') {
    throw 'Unknown failure does not stop before Claude.'
}

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("validation-fix-loop-{0}" -f ([guid]::NewGuid().ToString('N')))
$runDirectory = Join-Path $testRoot 'automation/runs/test'
$originalLocation = Get-Location
$script:GeneratedPhaseDefinition = ''
try {
    New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
    Set-Location -LiteralPath $testRoot
    & git init --quiet
    & git config user.email 'automation-test@example.invalid'
    & git config user.name 'Automation Test'
    New-Item -ItemType Directory -Path 'app/Modules/Finance/Frontend','assets','tests/js',$runDirectory -Force | Out-Null
    'head production' | Set-Content 'app/Modules/Finance/Frontend/finance-period-calculation.js' -Encoding utf8
    'head production' | Set-Content 'assets/finance-period-calculation.js' -Encoding utf8
    'head test' | Set-Content 'tests/js/finance_period_calculation_test.js' -Encoding utf8
    & git add -- app assets tests
    & git commit --quiet -m baseline

    # Existing phase implementation must survive rollback; it is intentionally different from HEAD.
    'phase implementation' | Set-Content 'app/Modules/Finance/Frontend/finance-period-calculation.js' -Encoding utf8
    'phase implementation' | Set-Content 'assets/finance-period-calculation.js' -Encoding utf8
    $backup = New-FixBackup -RepoRoot $testRoot -RunDirectory $runDirectory -AttemptNumber 1 -PhaseObject $phase
    'bad correction' | Set-Content 'app/Modules/Finance/Frontend/finance-period-calculation.js' -Encoding utf8
    'bad correction' | Set-Content 'assets/finance-period-calculation.js' -Encoding utf8
    'test tolerance correction' | Set-Content 'tests/js/finance_period_calculation_test.js' -Encoding utf8
    'new unauthorized file' | Set-Content 'assets/unauthorized.js' -Encoding utf8
    $after = Get-WorkspaceSnapshot
    $delta = @(Get-SnapshotChangedFiles -Before $backup.snapshot -After $after)
    Restore-FixBackup -Backup $backup -DeltaFiles $delta -RepoRoot $testRoot

    if ((Get-Content 'app/Modules/Finance/Frontend/finance-period-calculation.js' -Raw).Trim() -ne 'phase implementation') {
        throw 'Rollback restored tracked production to HEAD instead of the pre-attempt phase implementation.'
    }
    if ((Get-Content 'assets/finance-period-calculation.js' -Raw).Trim() -ne 'phase implementation') {
        throw 'Public asset phase implementation was not preserved by rollback.'
    }
    if (Test-Path 'assets/unauthorized.js') { throw 'New unauthorized file was not removed by rollback.' }
    if ((Get-Content 'tests/js/finance_period_calculation_test.js' -Raw).Trim() -ne 'head test') {
        throw 'Invalid attempt was not rolled back atomically.'
    }

    # A subsequent restricted attempt changes only the test and leaves production intact.
    'test tolerance correction' | Set-Content 'tests/js/finance_period_calculation_test.js' -Encoding utf8
    if ((Get-Content 'app/Modules/Finance/Frontend/finance-period-calculation.js' -Raw).Trim() -ne 'phase implementation') {
        throw 'Restricted test-only correction changed production.'
    }

    $validatedHash = Get-ValidatedDiffHash -RepoRoot $testRoot -PhaseObject $phase
    $validationData = [pscustomobject]@{ phaseId='phase-test'; passed=$true; results=@(); failed=@() }
    Save-ValidatedDiff -RunDirectory $runDirectory -ValidationResult $validationData -Hash $validatedHash
    $reused = Find-ReusableValidation -RepoRoot $testRoot -PhaseId 'phase-test' -CurrentHash $validatedHash
    if ($null -eq $reused) { throw 'Unchanged validated diff was not reused.' }
    'changed after validation' | Set-Content 'tests/js/finance_period_calculation_test.js' -Encoding utf8
    $changedHash = Get-ValidatedDiffHash -RepoRoot $testRoot -PhaseObject $phase
    if ($changedHash -eq $validatedHash) { throw 'Changed diff did not change validation hash.' }
    $notReusable = Find-ReusableValidation -RepoRoot $testRoot -PhaseId 'phase-test' -CurrentHash $changedHash
    if ($null -ne $notReusable) { throw 'Changed diff incorrectly reused validation.' }
}
finally {
    Set-Location -LiteralPath $originalLocation
    $resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolvedTestRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $resolvedTestRoot)) {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}

Write-Host 'Validation fix-loop controlled tests: OK'
