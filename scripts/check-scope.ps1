[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Phase,

    [string[]]$ChangedFiles
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

function Get-PhaseObject {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Phase file not found: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-ChangedFilesFromGit {
    $trackedWorkingTree = @(& git -c core.quotepath=false diff --name-only --diff-filter=ACDMRTUXB --)
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to list tracked working-tree changes.'
    }

    $trackedIndex = @(& git -c core.quotepath=false diff --cached --name-only --diff-filter=ACDMRTUXB --)
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to list staged changes.'
    }

    $untracked = @(& git -c core.quotepath=false ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to list untracked files.'
    }

    $files = @($trackedWorkingTree) + @($trackedIndex) + @($untracked)
    $normalizedFiles = @()
    foreach ($file in $files) {
        if ([string]::IsNullOrWhiteSpace($file)) {
            continue
        }

        $normalized = $file.Trim().Replace('\', '/')
        while ($normalized.StartsWith('./')) {
            $normalized = $normalized.Substring(2)
        }
        if ($normalized -and -not $normalized.EndsWith('/')) {
            $normalizedFiles += $normalized
        }
    }

    return $normalizedFiles | Sort-Object -Unique
}

function Test-PathMatch {
    param(
        [string]$File,
        [string]$Rule
    )

    $normalizedFile = $File.Replace('\', '/').Trim()
    $normalizedRule = $Rule.Replace('\', '/').Trim()

    while ($normalizedFile.StartsWith('./')) {
        $normalizedFile = $normalizedFile.Substring(2)
    }
    while ($normalizedRule.StartsWith('./')) {
        $normalizedRule = $normalizedRule.Substring(2)
    }

    if ($normalizedRule.EndsWith('/')) {
        return $normalizedFile.StartsWith($normalizedRule, [System.StringComparison]::OrdinalIgnoreCase)
    }

    return $normalizedFile.Equals($normalizedRule, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-IsSensitivePath {
    param([string]$File)

    $patterns = @(
        '^config\.php$',
        '(^|/)\.env(\..+)?$',
        '(^|/).*secret.*$',
        '(^|/).*credential.*$',
        '(^|/).*token.*$',
        '(^|/).*key.*$'
    )

    foreach ($pattern in $patterns) {
        if ($File -match $pattern) {
            return $true
        }
    }

    return $false
}

$repoRoot = Resolve-RepoRoot
Set-Location -LiteralPath $repoRoot

$phaseObject = Get-PhaseObject -Path (Join-Path $repoRoot $Phase)

$allowed = @($phaseObject.allowedFiles | ForEach-Object { $_.ToString().Replace('\', '/') })
$forbidden = @($phaseObject.forbiddenFiles | ForEach-Object { $_.ToString().Replace('\', '/') })
$files = @()
if ($ChangedFiles -and $ChangedFiles.Count -gt 0) {
    $normalizedChangedFiles = @()
    foreach ($file in $ChangedFiles) {
        if ([string]::IsNullOrWhiteSpace($file)) {
            continue
        }

        $normalized = $file.Trim().Replace('\', '/')
        while ($normalized.StartsWith('./')) {
            $normalized = $normalized.Substring(2)
        }
        if ($normalized -and -not $normalized.EndsWith('/')) {
            $normalizedChangedFiles += $normalized
        }
    }
    $files = @($normalizedChangedFiles | Sort-Object -Unique)
} else {
    $files = @(Get-ChangedFilesFromGit)
}

$outsideAllowlist = @()
$forbiddenTouched = @()
$sensitiveTouched = @()

foreach ($file in $files) {
    $inAllowlist = $false
    foreach ($rule in $allowed) {
        if (Test-PathMatch -File $file -Rule $rule) {
            $inAllowlist = $true
            break
        }
    }

    if (-not $inAllowlist) {
        $outsideAllowlist += $file
    }

    foreach ($rule in $forbidden) {
        if (Test-PathMatch -File $file -Rule $rule) {
            $forbiddenTouched += $file
            break
        }
    }

    if (Test-IsSensitivePath -File $file) {
        $sensitiveTouched += $file
    }
}

$result = [pscustomobject]@{
    phaseId           = $phaseObject.id
    changedFiles      = @($files)
    hasChanges        = ($files.Count -gt 0)
    outsideAllowlist  = @($outsideAllowlist | Sort-Object -Unique)
    forbiddenTouched  = @($forbiddenTouched | Sort-Object -Unique)
    sensitiveTouched  = @($sensitiveTouched | Sort-Object -Unique)
    passed            = ($files.Count -gt 0 -and $outsideAllowlist.Count -eq 0 -and $forbiddenTouched.Count -eq 0 -and $sensitiveTouched.Count -eq 0)
}

$result | ConvertTo-Json -Depth 6

if (-not $result.passed) {
    exit 1
}
