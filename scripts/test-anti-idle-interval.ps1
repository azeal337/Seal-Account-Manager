$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '../src/antiIdle.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw $parseErrors[0] }
# Load only the pure configuration/timer functions. Never run mouse automation.
foreach ($name in @('Get-SealIntervalSeconds', 'Test-SealPulseDue')) {
    $functionAst = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
    Invoke-Expression $functionAst.Extent.Text
}
$SettingsPath = [System.IO.Path]::GetTempFileName()
try {
    foreach ($seconds in @(980, 1140)) {
        Set-Content -LiteralPath $SettingsPath -Value ('{"intervalSeconds":' + $seconds + '}')
        if ((Get-SealIntervalSeconds) -ne $seconds) { throw 'Interval read failed' }
        if (Test-SealPulseDue ($seconds - 0.1) (Get-SealIntervalSeconds)) { throw 'Pulse fired early' }
        if (-not (Test-SealPulseDue $seconds (Get-SealIntervalSeconds))) { throw 'Pulse did not fire at boundary' }
    }
    Set-Content -LiteralPath $SettingsPath -Value '{"intervalSeconds":0}'
    if ((Get-SealIntervalSeconds) -ne 240) { throw 'Invalid interval fallback failed' }
    Set-Content -LiteralPath $SettingsPath -Value 'invalid json'
    if ((Get-SealIntervalSeconds) -ne 240) { throw 'Unreadable settings fallback failed' }
    Write-Output 'PASS: actual helper configuration reload, 980/1140-second scheduling boundaries and invalid-file fallback. No clicks executed.'
} finally { Remove-Item -LiteralPath $SettingsPath -Force }
