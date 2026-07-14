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
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Invoke-CodexReview')

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

try {
    New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null

    $script:MockCalls.Clear(); $script:MockOutputs = @($validJson)
    $result = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}'
    if ($script:MockCalls.Count -ne 1) { throw 'Valid Reviewer JSON triggered an unnecessary second call.' }
    if (-not (Test-ReviewJson -Text $result).valid) { throw 'Valid Reviewer JSON was rejected.' }
    if ($script:MockCalls[0].stdin -notmatch 'Analyze `git diff`' -or $script:MockCalls[0].stdin -match 'stdout') { throw 'Reviewer prompt is not minimal.' }

    $script:MockCalls.Clear(); $script:MockOutputs = @('not json', $validJson)
    $result = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}'
    if ($script:MockCalls.Count -ne 2 -or $script:MockCalls[1].stage -ne 'ReviewerRepair') { throw 'Invalid JSON did not trigger exactly one repair call.' }
    if ($script:MockCalls[1].stdin -notmatch 'sem alterar o significado') { throw 'Repair prompt is incorrect.' }

    $script:MockCalls.Clear(); $script:MockOutputs = @('not json', 'still not json')
    $blocked = $false
    try {
        $null = Invoke-CodexReview -RepoRoot $sourceRoot -RunDirectory $runDirectory -PhaseJson $phase -SchemaPath $schemaPath -ChangedFiles @('tests/allowed.js') -ValidationSummary '{"passed":true}'
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
