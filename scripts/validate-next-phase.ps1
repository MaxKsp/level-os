[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$DecisionPath,

    [Parameter(Mandatory = $true)]
    [int]$ExpectedPhaseNumber,

    [int]$MaxAllowedFiles = 8
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-PhasePath {
    param([string]$Path)

    $normalized = $Path.Trim().Replace('\', '/')
    while ($normalized.StartsWith('./')) {
        $normalized = $normalized.Substring(2)
    }
    return $normalized
}

function Test-PathRuleMatch {
    param(
        [string]$File,
        [string]$Rule
    )

    if ($Rule.EndsWith('/')) {
        return $File.StartsWith($Rule, [System.StringComparison]::OrdinalIgnoreCase)
    }
    return $File.Equals($Rule, [System.StringComparison]::OrdinalIgnoreCase)
}

if (-not (Test-Path -LiteralPath $DecisionPath)) {
    throw "Next-phase decision not found: $DecisionPath"
}

$decision = Get-Content -LiteralPath $DecisionPath -Raw | ConvertFrom-Json
foreach ($property in @('completed', 'reason', 'phase')) {
    if (-not ($decision.PSObject.Properties.Name -contains $property)) {
        throw "Next-phase decision missing property: $property"
    }
}

if ($decision.completed -isnot [bool]) {
    throw 'Next-phase completed must be a boolean.'
}
if ($decision.reason -isnot [string]) {
    throw 'Next-phase reason must be a string.'
}
if ($decision.completed) {
    [pscustomobject]@{ valid = $true; completed = $true; reason = $decision.reason } | ConvertTo-Json
    return
}

$phase = $decision.phase
if ($null -eq $phase) {
    throw 'Next-phase phase object is required when completed=false.'
}

$required = @('id','title','description','allowedFiles','forbiddenFiles','phpTests','jsTests','phpLint','jsLint','commitMessage')
foreach ($property in $required) {
    if (-not ($phase.PSObject.Properties.Name -contains $property)) {
        throw "Generated phase missing property: $property"
    }
}

$expectedId = "phase-$ExpectedPhaseNumber"
if ($phase.id -ne $expectedId) {
    throw "Generated phase id must be $expectedId."
}

$allowed = @($phase.allowedFiles | ForEach-Object { Normalize-PhasePath -Path $_.ToString() })
$forbidden = @($phase.forbiddenFiles | ForEach-Object { Normalize-PhasePath -Path $_.ToString() })
if ($allowed.Count -eq 0 -or $allowed.Count -gt $MaxAllowedFiles) {
    throw "Generated phase must allow between 1 and $MaxAllowedFiles files."
}
if (@($allowed | Sort-Object -Unique).Count -ne $allowed.Count) {
    throw 'Generated phase allowlist contains duplicates.'
}

$genericAllowed = @('*','**','.','./','/','assets','assets/','app','app/','scripts','scripts/','automation','automation/')
$sensitivePattern = '(^|/)(\.env(?:\..*)?|config\.php|.*secret.*|.*credential.*|.*token.*|.*private[-_]?key.*)$'
foreach ($file in $allowed) {
    if ([string]::IsNullOrWhiteSpace($file) -or $file.EndsWith('/') -or $file.Contains('*') -or $file.Contains('?')) {
        throw "Allowlist entry must be an explicit file: $file"
    }
    if ($genericAllowed -contains $file -or $file.StartsWith('scripts/', [System.StringComparison]::OrdinalIgnoreCase) -or $file.StartsWith('automation/', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe allowlist entry: $file"
    }
    if ($file -match $sensitivePattern -or $file -eq 'schema.sql' -or $file.StartsWith('migrations/', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Sensitive allowlist entry: $file"
    }
}

foreach ($file in $allowed) {
    foreach ($rule in $forbidden) {
        if (Test-PathRuleMatch -File $file -Rule $rule) {
            throw "Allowed and forbidden paths overlap: $file / $rule"
        }
    }
}

$newTestFiles = @($allowed | Where-Object { $_ -match '(^|/)tests?/' -or $_ -match '(^|/)test[^/]*\.' })
$allTestCommands = @($phase.phpTests) + @($phase.jsTests)
$hasRunnableNewTest = $false
foreach ($testFile in $newTestFiles) {
    if (($allTestCommands -join "`n").Contains($testFile)) {
        $hasRunnableNewTest = $true
        break
    }
}
if (-not $hasRunnableNewTest -and -not $phase.description.ToString().StartsWith('[test-justification]')) {
    throw 'Generated phase requires a new focused test or a [test-justification] description.'
}

$publicAssets = @($allowed | Where-Object { $_ -match '^assets/[^/]+\.js$' -and $_ -ne 'assets/app.js' })
foreach ($asset in $publicAssets) {
    $name = Split-Path -Leaf $asset
    $source = "app/Modules/Finance/Frontend/$name"
    if ($allowed -notcontains $source) {
        throw "Public frontend asset requires canonical source: $source"
    }
    $commands = (@($phase.phpTests) + @($phase.jsTests) + @($phase.phpLint) + @($phase.jsLint)) -join "`n"
    if (-not ($commands.Contains('Get-FileHash') -and $commands.Contains($source) -and $commands.Contains($asset))) {
        throw "Canonical source and public asset require byte-for-byte validation: $source / $asset"
    }
}

[pscustomobject]@{
    valid = $true
    completed = $false
    phaseId = $phase.id
    allowedFileCount = $allowed.Count
} | ConvertTo-Json
