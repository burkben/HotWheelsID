# run_ghidra.ps1
# Headless Ghidra import + decompile of the MPID crypto glue in libnative-lib.so (arm64).
# Writes Ghidra's C pseudocode for the relevant functions to tools\mpid_decompiled.c
#
# Uses a Java GhidraScript (Ghidra 11.3+/12.x dropped Jython; .py needs PyGhidra).
#
# Usage:
#   pwsh run_ghidra.ps1
#   pwsh run_ghidra.ps1 -GhidraDir 'c:/ghidra'

param([string]$GhidraDir = $env:GHIDRA_INSTALL_DIR)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = Split-Path $here -Parent
$so   = Join-Path $repo 'hwid_apk_src\resources\lib\arm64-v8a\libnative-lib.so'
$javaScript = Join-Path $here 'ghidra_decompile.java'
$outC = Join-Path $here 'mpid_decompiled.c'

if (-not (Test-Path $so)) { throw "native lib not found: $so" }

function Find-Headless([string]$dir) {
    if ($dir -and (Test-Path $dir)) {
        $h = Get-ChildItem -Path $dir -Recurse -Filter 'analyzeHeadless.bat' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($h) { return $h.FullName }
    }
    return $null
}

$headless = Find-Headless $GhidraDir
if (-not $headless) {
    foreach ($root in @($env:USERPROFILE, 'C:\', 'C:\Program Files', 'C:\Program Files (x86)')) {
        if (-not (Test-Path $root)) { continue }
        $cands = Get-ChildItem -Path $root -Directory -Filter 'ghidra*' -ErrorAction SilentlyContinue
        foreach ($c in $cands) { $h = Find-Headless $c.FullName; if ($h) { $headless = $h; break } }
        if ($headless) { break }
    }
}
if (-not $headless) {
    throw "Could not find analyzeHeadless.bat. Re-run with: pwsh tools\run_ghidra.ps1 -GhidraDir 'C:\path\to\ghidra'"
}
Write-Host "Using Ghidra headless: $headless"

# ---- post-script is a committed file: tools\ghidra_decompile.java ----
if (-not (Test-Path $javaScript)) { throw "post-script not found: $javaScript" }

# ---- run headless (clean temp project first to allow re-import) ----
$proj = Join-Path $env:TEMP 'mpid_ghidra'
if (Test-Path $proj) { Remove-Item $proj -Recurse -Force }
New-Item -ItemType Directory -Force -Path $proj | Out-Null
if (Test-Path $outC) { Remove-Item $outC -Force }

Write-Host "Running Ghidra headless (import + auto-analysis + decompile). A few minutes..."
& $headless $proj mpidproj -import $so -overwrite -scriptPath $here -postScript ghidra_decompile.java $outC -deleteProject

Write-Host ""
if (Test-Path $outC) {
    Write-Host "Done -> $outC ($((Get-Item $outC).Length) bytes)"
} else {
    Write-Warning "Output file not produced. Scroll up for the Ghidra log / errors."
}
