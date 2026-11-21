$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $projectRoot 'src'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'

if (-not (Test-Path -LiteralPath $vswhere)) {
  throw 'Visual Studio with the Desktop development with C++ workload is required to build Seal native helpers.'
}

$installation = (& $vswhere -all -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1)
if (-not $installation) {
  throw 'Visual Studio C++ build tools were not found.'
}

$devCmd = Join-Path $installation 'Common7\Tools\VsDevCmd.bat'
$environmentLines = & $env:ComSpec /d /s /c "`"$devCmd`" -no_logo -arch=x64 -host_arch=x64 >nul && set"
if ($LASTEXITCODE -ne 0) {
  throw 'Visual Studio build environment could not be initialized.'
}

foreach ($line in $environmentLines) {
  $separator = $line.IndexOf('=')
  if ($separator -le 0) { continue }
  $name = $line.Substring(0, $separator)
  $value = $line.Substring($separator + 1)
  Set-Item -Path "Env:$name" -Value $value
}

$compiler = (Get-Command cl.exe -ErrorAction Stop).Source
$tempDir = Join-Path $env:TEMP "seal-native-build-$PID"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
  $helpers = @('SealMutexHolder', 'SealProcessSleeper')
  foreach ($helper in $helpers) {
    $source = Join-Path $sourceDir "$helper.cpp"
    $output = Join-Path $sourceDir "$helper.exe"
    $object = Join-Path $tempDir "$helper.obj"
    & $compiler /nologo /O2 /MT /EHsc /std:c++17 /DUNICODE /D_UNICODE "/Fo$object" "/Fe$output" $source /link /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup /OPT:REF /OPT:ICF
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $output)) {
      throw "$helper failed to compile."
    }
  }
} finally {
  if ($tempDir.StartsWith([IO.Path]::GetTempPath(), [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Output 'Seal native helpers built successfully.'
