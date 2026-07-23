[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$sourceRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $sourceRoot) { throw 'Not inside the source repository.' }
$pipelinePath = Join-Path $sourceRoot 'scripts/ai-pipeline.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($pipelinePath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw 'Pipeline does not parse.' }

function Get-PipelineFunctionDefinition {
    param([string]$Name)
    $definition = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name }, $true)
    if (-not $definition) { throw "Pipeline function not found: $Name" }
    return $definition.Extent.Text
}
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Test-ReviewJson')
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Remove-InternalReviewArtifacts')
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Invoke-CodexReview')
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Get-InternalExecutionFiles')
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Get-ReviewerChangedFiles')

$script:UseCodexUserConfig = $false
$script:ReviewerTimeoutSeconds = 10
$script:HeartbeatSeconds = 1
$script:MockOutputs = @()
$script:MockCalls = New-Object System.Collections.Generic.List[object]

function Resolve-AgentCommandPath { param([string]$Name) return 'mock-codex.cmd' }
function Invoke-NativeProcess {
    param($StageName,$FilePath,[string[]]$ArgumentList,$RunDirectory,$TimeoutSeconds,$HeartbeatIntervalSeconds,$StandardInputText)
    [void]$script:MockCalls.Add([pscustomobject]@{ stage=$StageName; arguments=@($ArgumentList); stdin=$StandardInputText })
    if (-not $PSBoundParameters.ContainsKey('StandardInputText')) { throw 'Reviewer did not use prompt by stdin.' }
    if (@($ArgumentList | Where-Object { $_ -eq '-' }).Count -ne 1 -or $ArgumentList[-1] -ne '-') { throw 'Reviewer prompt marker must occur exactly once at the end.' }
    if ($ArgumentList -contains 'review' -or $ArgumentList -contains '--uncommitted') { throw 'Reviewer used forbidden review subcommand.' }
    $outputIndex = [Array]::IndexOf($ArgumentList, '--output-last-message')
    $outputPath = $ArgumentList[$outputIndex + 1]
    $nextOutput = $script:MockOutputs[$script:MockCalls.Count - 1]
    $nextOutput | Set-Content -LiteralPath $outputPath -Encoding utf8
    return [pscustomobject]@{ stdout=''; stderr=''; exitCode=0 }
}

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("reviewer-test-{0}" -f ([guid]::NewGuid().ToString('N')))
$runDirectory = Join-Path $testRoot 'run'
$schemaPath = Join-Path $sourceRoot 'automation/schemas/review.schema.json'
$phase = [ordered]@{
    id='phase-test'; title='test'; description='test'; allowedFiles=@('tests/allowed.js'); forbiddenFiles=@('app/');
    phpTests=@(); jsTests=@('node tests/allowed.js'); phpLint=@(); jsLint=@(); commitMessage='test: review'
} | ConvertTo-Json -Depth 5
$validJson = [ordered]@{ approved=$true; blockers=@(); warnings=@(); filesReviewed=@('tests/allowed.js'); recommendedCommitMessage='test: review' } | ConvertTo-Json -Compress
$internalFiles = @('automation/phases/phase-19.json','automation/runs/test/')

try {
    New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null

    $script:MockCalls.Clear(); $script:MockOutputs = @($validJson)
    $filtered = @(Get-ReviewerChangedFiles -ChangedFiles @('tests/allowed.js','automation/phases/phase-19.json','app/outside.js') -InternalFiles $internalFiles)
    if ($filtered -contains 'automation/phases/phase-19.json' -or $filtered -notcontains 'app/outside.js') { throw 'Reviewer internal-file filtering is incorrect.' }
    $phaseReviewed = [ordered]@{ approved=$false; blockers=@('automation/phases/phase-19.json is forbidden'); warnings=@(); filesReviewed=@('automation/phases/phase-19.json'); recommendedCommitMessage='' } | ConvertTo-Json -Compress
    if ((Test-ReviewJson -Text $phaseReviewed -AllowedReviewedFiles @('tests/allowed.js') -InternalFiles $internalFiles).valid) { throw 'Reviewer accepted internal phase JSON in filesReviewed/blockers.' }
    $outsideReviewed = [ordered]@{ approved=$true; blockers=@(); warnings=@(); filesReviewed=@('app/outside.js'); recommendedCommitMessage='' } | ConvertTo-Json -Compress
    if ((Test-ReviewJson -Text $outsideReviewed -AllowedReviewedFiles @('tests/allowed.js') -InternalFiles $internalFiles).valid) { throw 'Reviewer accepted an application file outside the filtered review list.' }

    $script:MockCalls.Clear(); $script:MockOutputs = @($phaseReviewed)
    $internalOnlyResult = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}' -InternalFiles $internalFiles
    $internalOnlyReview = $internalOnlyResult | ConvertFrom-Json
    if ($script:MockCalls.Count -ne 1 -or -not $internalOnlyReview.approved -or @($internalOnlyReview.blockers).Count -ne 0 -or @($internalOnlyReview.filesReviewed).Count -ne 0) { throw 'Reviewer did not discard an internal-only phase artifact finding.' }

    $script:MockCalls.Clear(); $script:MockOutputs = @($validJson)
    $result = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}' -InternalFiles $internalFiles
    if ($script:MockCalls.Count -ne 1) { throw 'Valid Reviewer JSON triggered an unnecessary second call.' }
    if (-not (Test-ReviewJson -Text $result -AllowedReviewedFiles @('tests/allowed.js') -InternalFiles $internalFiles).valid) { throw 'Valid Reviewer JSON was rejected.' }
    if ($script:MockCalls[0].stdin -notmatch 'Analyze `git diff`' -or $script:MockCalls[0].stdin -match 'stdout') { throw 'Reviewer prompt is not minimal.' }

    $script:MockCalls.Clear(); $script:MockOutputs = @('not json', $validJson)
    $result = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}' -InternalFiles $internalFiles
    if ($script:MockCalls.Count -ne 2 -or $script:MockCalls[1].stage -ne 'ReviewerRepair') { throw 'Invalid JSON did not trigger exactly one repair call.' }
    if ($script:MockCalls[1].stdin -notmatch 'sem alterar o significado') { throw 'Repair prompt is incorrect.' }

    $script:MockCalls.Clear(); $script:MockOutputs = @('not json', 'still not json')
    $blocked = $false
    try {
        $null = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}' -InternalFiles $internalFiles
    } catch {
        $blocked = $true
    }
    if (-not $blocked -or $script:MockCalls.Count -ne 2) { throw 'Second invalid JSON did not block after one repair.' }

    Write-Host 'Reviewer controlled test: OK'
}
finally {
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolved = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolved.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $resolved)) { Remove-Item $resolved -Recurse -Force }
}
