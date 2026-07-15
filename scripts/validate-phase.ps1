[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Phase,

    [string]$RunDirectory,

    [string]$ResultPath,

    [string]$SingleCommand,

    [switch]$SkipScope,

    [string[]]$ExcludedFiles = @(),

    [int]$ValidationCommandTimeoutSeconds = 180,

    [switch]$VerboseLogs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not ('ValidationProcessJob' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ValidationProcessJob
{
    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateJobObject(IntPtr securityAttributes, string name);

    [DllImport("kernel32.dll")]
    private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll")]
    public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr handle);

    public static IntPtr CreateKillOnCloseJob()
    {
        const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
        const int JobObjectExtendedLimitInformation = 9;
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) return IntPtr.Zero;

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr pointer = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, pointer, false);
            if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, pointer, (uint)length))
            {
                CloseHandle(job);
                return IntPtr.Zero;
            }
            return job;
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }
    }
}
'@
}

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

function Resolve-CmdExecutable {
    $cmdPath = Join-Path $env:SystemRoot 'System32\cmd.exe'
    if (-not (Test-Path -LiteralPath $cmdPath)) {
        throw "cmd.exe not found: $cmdPath"
    }
    return $cmdPath
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    if ($ProcessId -le 0) {
        return
    }

    try {
        $children = @(Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction Stop)
        foreach ($child in $children) {
            Stop-ProcessTree -ProcessId ([int]$child.ProcessId)
        }
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        return
    }
    catch {
        $taskKill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
        if (Test-Path -LiteralPath $taskKill) {
            & $taskKill /PID $ProcessId /T /F *> $null
            return
        }
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function ConvertTo-QuotedCommandArgument {
    param([string]$Value)

    return '"' + $Value.Replace('"', '""') + '"'
}

function Get-LogTextOrEmpty {
    param([AllowNull()][string]$Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return ''
    }

    return $Text.TrimEnd()
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

function Ensure-ParentDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $absolutePath = [System.IO.Path]::GetFullPath($Path)
    $parentDirectory = Split-Path -Parent $absolutePath
    if ([string]::IsNullOrWhiteSpace($parentDirectory)) {
        throw "Unable to resolve parent directory for output path: $Path"
    }

    New-Item -ItemType Directory -Path $parentDirectory -Force | Out-Null
    if (-not (Test-Path -LiteralPath $parentDirectory -PathType Container)) {
        throw "Output directory was not created: $parentDirectory"
    }
}

function Write-ValidationResult {
    param([Parameter(Mandatory = $true)]$Result)

    $json = $Result | ConvertTo-Json -Depth 6
    if ($ResultPath) {
        $absoluteResultPath = [System.IO.Path]::GetFullPath($ResultPath)
        Ensure-ParentDirectory -Path $absoluteResultPath
        $json | Out-File -LiteralPath $absoluteResultPath -Encoding utf8
    }
    Write-Output $json
}

function Invoke-LoggedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(Mandatory = $true)]
        [string]$Label,

        [string]$OutputDirectory,

        [int]$TimeoutSeconds = 180
    )

    Write-Host "[Validation] starting: $Command"
    $script:LastValidationCommand = $Command
    if ($OutputDirectory) {
        $lastCommandPath = Join-Path $OutputDirectory 'validation-last-command.txt'
        Ensure-ParentDirectory -Path $lastCommandPath
        $Command | Out-File -LiteralPath $lastCommandPath -Encoding utf8
    }

    $cmdExe = Resolve-CmdExecutable
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $cmdExe
    $startInfo.Arguments = "/d /s /c `"$Command`""
    $startInfo.WorkingDirectory = (Get-Location).Path
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $startedAt = Get-Date
    $stdout = ''
    $stderr = ''
    $exitCode = -1
    $timedOut = $false
    $processStarted = $false
    $jobHandle = [IntPtr]::Zero

    try {
        $jobHandle = [ValidationProcessJob]::CreateKillOnCloseJob()
        $null = $process.Start()
        $processStarted = $true
        if ($jobHandle -ne [IntPtr]::Zero) {
            $assignedToJob = [ValidationProcessJob]::AssignProcessToJobObject($jobHandle, $process.Handle)
            if (-not $assignedToJob) {
                $null = [ValidationProcessJob]::CloseHandle($jobHandle)
                $jobHandle = [IntPtr]::Zero
            }
        }
        $process.StandardInput.Close()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()

        $exited = $process.WaitForExit($TimeoutSeconds * 1000)
        if (-not $exited) {
            $timedOut = $true
            if ($jobHandle -ne [IntPtr]::Zero) {
                $null = [ValidationProcessJob]::CloseHandle($jobHandle)
                $jobHandle = [IntPtr]::Zero
            } else {
                Stop-ProcessTree -ProcessId $process.Id
            }
            $null = $process.WaitForExit(5000)
        } elseif ($jobHandle -ne [IntPtr]::Zero) {
            $null = [ValidationProcessJob]::CloseHandle($jobHandle)
            $jobHandle = [IntPtr]::Zero
        }

        $null = $stdoutTask.Wait(5000)
        $null = $stderrTask.Wait(5000)
        if ($stdoutTask.IsCompleted) {
            $stdout = $stdoutTask.Result
        }
        if ($stderrTask.IsCompleted) {
            $stderr = $stderrTask.Result
        }
        if ($process.HasExited) {
            $exitCode = $process.ExitCode
        }
    }
    finally {
        if ($jobHandle -ne [IntPtr]::Zero) {
            $null = [ValidationProcessJob]::CloseHandle($jobHandle)
        }
        if ($processStarted -and -not $process.HasExited) {
            Stop-ProcessTree -ProcessId $process.Id
        }
        $process.Dispose()
    }

    $duration = (Get-Date) - $startedAt
    $durationText = ('{0:N2}s' -f $duration.TotalSeconds)

    $logText = @(
        "Command: $Command",
        "WorkingDirectory: $((Get-Location).Path)",
        "ExitCode: $exitCode",
        "TimedOut: $timedOut",
        "TimeoutSeconds: $TimeoutSeconds",
        "DurationMs: $([int][Math]::Round($duration.TotalMilliseconds))",
        '',
        '--- STDOUT ---',
        (Get-LogTextOrEmpty -Text $stdout),
        '',
        '--- STDERR ---',
        (Get-LogTextOrEmpty -Text $stderr)
    ) -join [Environment]::NewLine

    if ($OutputDirectory) {
        $logFileName = (($Label -replace '[^A-Za-z0-9\-_]+', '_').ToLower() + '.log')
        $logPath = Join-Path $OutputDirectory $logFileName
        Ensure-ParentDirectory -Path $logPath
        $logText | Out-File -LiteralPath $logPath -Encoding utf8
    }

    $passed = (-not $timedOut -and $exitCode -eq 0)
    if ($passed) {
        Write-Host "[Validation] passed: $Command ($durationText)"
    } else {
        Write-Host '[Validation] failed'
        Write-Host "Command: $Command"
        Write-Host "ExitCode: $exitCode"
        Write-Host "Duration: $durationText"
        Write-Host "TimedOut: $timedOut"
        Write-Host 'stdout:'
        Write-Host (Get-LogTextOrEmpty -Text $stdout)
        Write-Host 'stderr:'
        Write-Host (Get-LogTextOrEmpty -Text $stderr)
    }

    if ($VerboseLogs -and $passed) {
        if ($stdout) {
            (Get-LogTextOrEmpty -Text $stdout).Split([Environment]::NewLine) | ForEach-Object { Write-Host $_ }
        }
        if ($stderr) {
            (Get-LogTextOrEmpty -Text $stderr).Split([Environment]::NewLine) | ForEach-Object { Write-Host $_ }
        }
    }

    [pscustomobject]@{
        label      = $Label
        command    = $Command
        exitCode   = $exitCode
        durationMs = [int][Math]::Round($duration.TotalMilliseconds)
        timedOut   = $timedOut
        stdout     = $stdout
        stderr     = $stderr
        passed     = $passed
    }
}

$repoRoot = Resolve-RepoRoot
$powerShellExe = Get-PowerShellExecutable
Set-Location -LiteralPath $repoRoot

if ($RunDirectory) {
    $RunDirectory = [System.IO.Path]::GetFullPath($RunDirectory)
    New-Item -ItemType Directory -Path $RunDirectory -Force | Out-Null
    if (-not (Test-Path -LiteralPath $RunDirectory -PathType Container)) {
        throw "Validation run directory was not created: $RunDirectory"
    }
}

$phasePath = Join-Path $repoRoot $Phase
$phaseObject = Get-PhaseObject -Path $phasePath
Assert-PhaseDefinition -Definition $phaseObject

$results = New-Object System.Collections.Generic.List[object]
$script:LastValidationCommand = ''

if (-not $SkipScope) {
    $scopeCommandParts = @(
        (ConvertTo-QuotedCommandArgument -Value $powerShellExe),
        '-NoProfile',
        '-NonInteractive',
        '-File',
        (ConvertTo-QuotedCommandArgument -Value (Join-Path $repoRoot 'scripts/check-scope.ps1')),
        '-Phase',
        (ConvertTo-QuotedCommandArgument -Value $Phase)
    )
    if ($ExcludedFiles.Count -gt 0) {
        $scopeCommandParts += '-ExcludedFiles'
        foreach ($excludedFile in $ExcludedFiles) {
            $scopeCommandParts += (ConvertTo-QuotedCommandArgument -Value $excludedFile)
        }
    }
    $scopeCommand = $scopeCommandParts -join ' '
    $scopeResult = Invoke-LoggedCommand -Command $scopeCommand -Label 'scope' -OutputDirectory $RunDirectory -TimeoutSeconds $ValidationCommandTimeoutSeconds

    if ($RunDirectory) {
        $scopePath = Join-Path $RunDirectory 'scope.json'
        Ensure-ParentDirectory -Path $scopePath
        $scopeResult.stdout | Out-File -LiteralPath $scopePath -Encoding utf8
    }

    if (-not $scopeResult.passed) {
        $scopeSummary = [pscustomobject]@{
            phaseId = $phaseObject.id
            passed = $false
            results = @($scopeResult)
            failed = @($scopeResult)
        }
        Write-ValidationResult -Result $scopeSummary
        exit 1
    }
}

if ($SingleCommand) {
    $results.Add((Invoke-LoggedCommand -Command $SingleCommand -Label 'targeted-validation' -OutputDirectory $RunDirectory -TimeoutSeconds $ValidationCommandTimeoutSeconds))
    $targetedItems = @($results | ForEach-Object { $_ })
    $targetedFailed = @($targetedItems | Where-Object { -not $_.passed })
    $targetedSummary = [pscustomobject]@{
        phaseId = $phaseObject.id
        passed = ($targetedFailed.Count -eq 0)
        results = $targetedItems
        failed = @($targetedFailed)
    }
    Write-ValidationResult -Result $targetedSummary
    if ($targetedFailed.Count -gt 0) { exit 1 }
    exit 0
}

foreach ($command in @($phaseObject.phpTests)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "php-test-$($results.Count + 1)" -OutputDirectory $RunDirectory -TimeoutSeconds $ValidationCommandTimeoutSeconds))
}

foreach ($command in @($phaseObject.jsTests)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "js-test-$($results.Count + 1)" -OutputDirectory $RunDirectory -TimeoutSeconds $ValidationCommandTimeoutSeconds))
}

foreach ($command in @($phaseObject.phpLint)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "php-lint-$($results.Count + 1)" -OutputDirectory $RunDirectory -TimeoutSeconds $ValidationCommandTimeoutSeconds))
}

foreach ($command in @($phaseObject.jsLint)) {
    $results.Add((Invoke-LoggedCommand -Command $command -Label "js-lint-$($results.Count + 1)" -OutputDirectory $RunDirectory -TimeoutSeconds $ValidationCommandTimeoutSeconds))
}

$resultItems = @($results | ForEach-Object { $_ })
$failed = @($resultItems | Where-Object { -not $_.passed })
$summary = [pscustomobject]@{
    phaseId  = $phaseObject.id
    passed   = ($failed.Count -eq 0)
    results  = $resultItems
    failed   = @($failed)
}

Write-ValidationResult -Result $summary

if ($failed.Count -gt 0) {
    exit 1
}
