param([switch]$Preview, [string]$PreviewFile)
$ErrorActionPreference = 'Stop'

function Get-RepairPlan([string]$Text, [string[]]$InactiveAddresses) {
    $removed = New-Object 'System.Collections.Generic.List[string]'
    $output = [regex]::Replace($Text, '[^\r\n]*(?:\r\n|\r|\n|$)', {
        param($match)
        $line = $match.Value
        $hash = $line.IndexOf('#')
        if ($hash -lt 0 -or $line.Substring($hash) -notmatch '\bfleasion\b') { return $line }
        $content = $line.Substring(0, $hash)
        $tokens = @($content.Trim() -split '\s+')
        if ($tokens.Count -lt 2 -or $tokens[0] -notin $InactiveAddresses) { return $line }
        $keep = New-Object 'System.Collections.Generic.List[string]'
        $changed = $false
        foreach ($hostName in $tokens[1..($tokens.Count - 1)]) {
            $name = $hostName.TrimEnd('.').ToLowerInvariant()
            if ($name -eq 'roblox.com' -or $name.EndsWith('.roblox.com')) { $removed.Add($name); $changed = $true }
            else { $keep.Add($hostName) }
        }
        if (-not $changed) { return $line }
        if (-not $keep.Count) { return '' }
        $ending = [regex]::Match($line, '(?:\r\n|\r|\n)$').Value
        $indent = [regex]::Match($content, '^\s*').Value
        return $indent + $tokens[0] + "`t" + ($keep -join ' ') + ' ' + $line.Substring($hash).TrimEnd("`r", "`n") + $ending
    })
    return @{ Text = $output; RemovedDomains = @($removed | Select-Object -Unique); Changed = ($output -cne $Text) }
}

# Preview is read-only and used by regression tests. Repair mode accepts no
# caller-selected system-file or output-file path.
if ($Preview) {
    if (-not $PreviewFile) { throw 'Choose a fixture file for preview.' }
    $text = [IO.File]::ReadAllText([IO.Path]::GetFullPath($PreviewFile))
    Get-RepairPlan $text @('127.0.0.1', '::1') | ConvertTo-Json -Compress
    exit 0
}

function Test-LocalProxy([string]$Address, [int]$Port = 443) {
    $family = if ($Address -eq '::1') { [Net.Sockets.AddressFamily]::InterNetworkV6 } else { [Net.Sockets.AddressFamily]::InterNetwork }
    $client = New-Object Net.Sockets.TcpClient($family)
    try { $task = $client.ConnectAsync($Address, $Port); return ($task.Wait(1200) -and $client.Connected) }
    catch { return $false }
    finally { $client.Dispose() }
}

try {
    $systemDirectory = [Environment]::SystemDirectory
    $hosts = [IO.Path]::GetFullPath((Join-Path $systemDirectory 'drivers\etc\hosts'))
    if (-not $hosts.StartsWith($systemDirectory + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected hosts path.' }
    if ((Get-Item -LiteralPath $hosts).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'The hosts file is redirected.' }
    $inactive = @(@('127.0.0.1', '::1') | Where-Object { -not (Test-LocalProxy $_) })
    if (-not $inactive.Count) { exit 23 }
    $stream = [IO.File]::Open($hosts, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::Read)
    try {
        $original = New-Object byte[] $stream.Length
        if ($stream.Read($original, 0, $original.Length) -ne $original.Length) { throw 'Could not read the complete hosts file.' }
        $encoding = New-Object Text.UTF8Encoding($false)
        $offset = 0
        if ($original.Length -ge 2 -and $original[0] -eq 255 -and $original[1] -eq 254) { $encoding = New-Object Text.UnicodeEncoding($false, $true); $offset = 2 }
        elseif ($original.Length -ge 2 -and $original[0] -eq 254 -and $original[1] -eq 255) { $encoding = New-Object Text.UnicodeEncoding($true, $true); $offset = 2 }
        elseif ($original.Length -ge 3 -and $original[0] -eq 239 -and $original[1] -eq 187 -and $original[2] -eq 191) { $encoding = New-Object Text.UTF8Encoding($true); $offset = 3 }
        if ($offset -eq 0) {
            # Preserve legacy single-byte comments as well as BOM-less UTF-8.
            try { $text = (New-Object Text.UTF8Encoding($false, $true)).GetString($original) }
            catch [Text.DecoderFallbackException] { $encoding = [Text.Encoding]::GetEncoding(28591); $text = $encoding.GetString($original) }
        } else { $text = $encoding.GetString($original, $offset, $original.Length - $offset) }
        $plan = Get-RepairPlan $text $inactive
        if (-not $plan.Changed) { exit 0 }
        $backup = $hosts + '.seal-backup-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N')
        [IO.File]::WriteAllBytes($backup, $original)
        $bytes = [byte[]]($encoding.GetPreamble() + $encoding.GetBytes($plan.Text))
        try { $stream.Position = 0; $stream.SetLength(0); $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) }
        catch { $stream.Position = 0; $stream.SetLength(0); $stream.Write($original, 0, $original.Length); $stream.Flush($true); throw }
    } finally { $stream.Dispose() }
    & (Join-Path $systemDirectory 'ipconfig.exe') /flushdns | Out-Null
    exit 0
} catch { Write-Error 'The protected hosts file could not be repaired. Any available backup was retained.'; exit 1 }
