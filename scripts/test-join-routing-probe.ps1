param([string]$Source)
$ErrorActionPreference = 'Stop'
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($Source, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Repair script syntax is invalid.' }
$function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-LocalProxy' }, $true)
# Load only the trusted probe function. Never execute the helper's repair entry.
Invoke-Expression $function.Extent.Text
foreach ($address in @('127.0.0.1', '::1')) {
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse($address), 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    try { if (-not (Test-LocalProxy $address $port)) { throw "Active local proxy missed: $address" } }
    finally { $listener.Stop() }
    if (Test-LocalProxy $address $port) { throw "Closed local proxy reported active: $address" }
}
Write-Output 'PASS: Windows PowerShell probe recognizes active/closed IPv4 and IPv6 listeners on ephemeral test ports.'
