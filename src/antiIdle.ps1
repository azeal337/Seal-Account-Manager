# Anti-AFK mode: real click pulse for every open Roblox session.
# At the configured interval this briefly focuses each Roblox window, clicks near its
# center, and then restores the cursor and previously focused window.

param([string]$SettingsPath = '')
$ErrorActionPreference = 'Continue'

function Get-SealIntervalSeconds {
    try {
        $value = (Get-Content -LiteralPath $SettingsPath -Raw -ErrorAction Stop | ConvertFrom-Json).intervalSeconds
        if ($null -ne $value -and $value -ge 1 -and $value -le 86400 -and [math]::Floor($value) -eq $value) { return [int]$value }
    } catch {}
    return 240
}

function Test-SealPulseDue([double]$ElapsedSeconds, [int]$IntervalSeconds) {
    return $ElapsedSeconds -ge $IntervalSeconds
}

function Test-RobloxProcessRunning {
    try {
        return @((Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue)).Count -gt 0
    } catch {
        return $false
    }
}

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class SealIdleClicker {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lp);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }

    public const int SW_RESTORE = 9;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
}
"@ -Language CSharp

function Get-RobloxWindows {
    $windows = [System.Collections.Generic.List[IntPtr]]::new()

    [SealIdleClicker]::EnumWindows({
        param($windowHandle, $unused)

        if (-not [SealIdleClicker]::IsWindowVisible($windowHandle)) { return $true }

        [uint32]$processId = 0
        [SealIdleClicker]::GetWindowThreadProcessId($windowHandle, [ref]$processId) | Out-Null

        $processName = ''
        try {
            if ($processId -gt 0) {
                $processName = (Get-Process -Id $processId -ErrorAction Stop).ProcessName
            }
        } catch {}

        if ($processName -eq 'RobloxPlayerBeta') {
            $windows.Add($windowHandle)
        }

        return $true
    }, [IntPtr]::Zero) | Out-Null

    return $windows
}

function Send-LeftClickToWindow {
    param([IntPtr]$WindowHandle)

    $rectangle = New-Object SealIdleClicker+RECT
    if (-not [SealIdleClicker]::GetWindowRect($WindowHandle, [ref]$rectangle)) {
        return $false
    }

    $width = $rectangle.Right - $rectangle.Left
    $height = $rectangle.Bottom - $rectangle.Top
    if ($width -le 0 -or $height -le 0) {
        return $false
    }

    $clickX = [int]($rectangle.Left + ($width / 2))
    $clickY = [int]($rectangle.Top + ($height / 2))
    $oldPoint = New-Object SealIdleClicker+POINT
    [SealIdleClicker]::GetCursorPos([ref]$oldPoint) | Out-Null

    [SealIdleClicker]::SetCursorPos($clickX, $clickY) | Out-Null
    Start-Sleep -Milliseconds 35
    [SealIdleClicker]::mouse_event([SealIdleClicker]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 45
    [SealIdleClicker]::mouse_event([SealIdleClicker]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 35
    [SealIdleClicker]::SetCursorPos($oldPoint.X, $oldPoint.Y) | Out-Null

    return $true
}

function Invoke-RobloxClickPulse {
    if (-not (Test-RobloxProcessRunning)) {
        exit 0
    }

    $windows = @(Get-RobloxWindows)
    if ($windows.Count -eq 0) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - Anti-AFK: no Roblox windows found"
        return
    }

    $previousWindow = [SealIdleClicker]::GetForegroundWindow()
    $clicked = 0

    foreach ($windowHandle in $windows) {
        try {
            if ([SealIdleClicker]::IsIconic($windowHandle)) {
                [SealIdleClicker]::ShowWindowAsync($windowHandle, [SealIdleClicker]::SW_RESTORE) | Out-Null
                Start-Sleep -Milliseconds 200
            }

            [SealIdleClicker]::SetForegroundWindow($windowHandle) | Out-Null
            Start-Sleep -Milliseconds 180
            if (Send-LeftClickToWindow $windowHandle) {
                $clicked++
            }
            Start-Sleep -Milliseconds 100
        } catch {
            Write-Host "$(Get-Date -Format 'HH:mm:ss') - Anti-AFK: one window failed: $($_.Exception.Message)"
        }
    }

    if ($previousWindow -ne [IntPtr]::Zero) {
        [SealIdleClicker]::SetForegroundWindow($previousWindow) | Out-Null
    }

    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Anti-AFK: pulsed $clicked/$($windows.Count) Roblox window(s)"
}

if (-not (Test-RobloxProcessRunning)) {
    exit 0
}

$pulseClock = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-RobloxClickPulse
while ($true) {
    Start-Sleep -Seconds 1
    if (-not (Test-RobloxProcessRunning)) {
        exit 0
    }
    # Re-read so edits take effect without stopping the helper or clicking again
    # just because the user saved. Measure start-to-start so per-window click
    # duration does not add extra delay to every requested interval.
    if (Test-SealPulseDue $pulseClock.Elapsed.TotalSeconds (Get-SealIntervalSeconds)) {
        $pulseClock.Restart()
        Invoke-RobloxClickPulse
    }
}
