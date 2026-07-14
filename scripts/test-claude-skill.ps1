[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$sourceRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $sourceRoot) { throw 'Not inside the source repository.' }
$statusBefore = @(& git status --short) -join "`n"
$pipelinePath = Join-Path $sourceRoot 'scripts/ai-pipeline.ps1'
$pipelineText = Get-Content -LiteralPath $pipelinePath -Raw
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
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Resolve-ClaudeSkillPath')
Invoke-Expression (Get-PipelineFunctionDefinition -Name 'Add-ClaudeSkillInvocation')

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("claude-skill-test-{0}" -f ([guid]::NewGuid().ToString('N')))
$repo = Join-Path $testRoot 'repo'
$fakeHome = Join-Path $testRoot 'home'
$script:ClaudeSkill = 'ponytail'
$script:NoClaudeSkill = $false
try {
    New-Item -ItemType Directory -Path $repo,$fakeHome -Force | Out-Null

    $missingBlocked = $false
    try { $null = Resolve-ClaudeSkillPath -RepoRoot $repo -SkillName 'ponytail' -HomeDirectory $fakeHome } catch { $missingBlocked = $true }
    if (-not $missingBlocked) { throw 'Missing skill did not block before Claude.' }

    $skillDirectory = Join-Path $repo '.claude/skills/ponytail'
    New-Item -ItemType Directory -Path $skillDirectory -Force | Out-Null
    $skillPath = Join-Path $skillDirectory 'SKILL.md'
    "---`nname: ponytail`n---`nSkill body" | Set-Content -LiteralPath $skillPath -Encoding utf8
    $resolved = Resolve-ClaudeSkillPath -RepoRoot $repo -SkillName 'ponytail' -HomeDirectory $fakeHome
    if ($resolved -ne [System.IO.Path]::GetFullPath($skillPath)) { throw 'Skill discovery order did not prefer repository skill.' }

    $script:ResolvedClaudeSkillPath = $null
    $initialPrompt = Add-ClaudeSkillInvocation -Prompt 'initial implementation' -RepoRoot $repo
    if (($initialPrompt -split "`r?`n")[0] -ne '/ponytail') { throw '/ponytail is not the first line of initial prompt.' }
    $script:ResolvedClaudeSkillPath = $null
    $fixPrompt = Add-ClaudeSkillInvocation -Prompt 'validation correction' -RepoRoot $repo
    if (($fixPrompt -split "`r?`n")[0] -ne '/ponytail') { throw '/ponytail is not the first line of correction prompt.' }

    "---`nname: ponytail`nuser-invocable: false`n---" | Set-Content -LiteralPath $skillPath -Encoding utf8
    $disabledBlocked = $false
    try { $null = Resolve-ClaudeSkillPath -RepoRoot $repo -SkillName 'ponytail' -HomeDirectory $fakeHome } catch { $disabledBlocked = $true }
    if (-not $disabledBlocked) { throw 'user-invocable: false did not block.' }

    "---`nname: ponytail`n---" | Set-Content -LiteralPath $skillPath -Encoding utf8
    $settingsPath = Join-Path $repo '.claude/settings.json'
    '{"skillOverrides":{"ponytail":"off"}}' | Set-Content -LiteralPath $settingsPath -Encoding utf8
    $overrideBlocked = $false
    try { $null = Resolve-ClaudeSkillPath -RepoRoot $repo -SkillName 'ponytail' -HomeDirectory $fakeHome } catch { $overrideBlocked = $true }
    if (-not $overrideBlocked) { throw 'skillOverrides.ponytail=off did not block.' }

    if ($pipelineText -notmatch 'if \(-not \$ResumePhase\)' -or $pipelineText -notmatch 'Add-ClaudeSkillInvocation') {
        throw 'ResumePhase or centralized skill invocation wiring is missing.'
    }
    Write-Host 'Claude skill controlled test: OK'
}
finally {
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $resolvedRoot = [System.IO.Path]::GetFullPath($testRoot)
    if ($resolvedRoot.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $resolvedRoot)) { Remove-Item $resolvedRoot -Recurse -Force }
}

$statusAfter = @(& git status --short) -join "`n"
if ($statusAfter -ne $statusBefore) { throw 'Claude skill controlled test changed the application working tree.' }
