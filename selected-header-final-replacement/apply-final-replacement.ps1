$ErrorActionPreference = 'Stop'

$updateDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $updateDir

$pagePath = Join-Path $repo 'src\pages\selected.astro'
$replacementPath = Join-Path $updateDir 'selected.astro'
$cityImagePath = Join-Path $repo 'src\assets\selected-header-city.jpg'
$packagePath = Join-Path $repo 'package.json'

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "Place this folder directly inside C:\Users\talut\Desktop\Alexei."
}

if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Missing file: $pagePath"
}

if (-not (Test-Path -LiteralPath $replacementPath)) {
  throw "Missing replacement file: $replacementPath"
}

if (-not (Test-Path -LiteralPath $cityImagePath)) {
  throw "Missing city header image: $cityImagePath"
}

$backupPath = "$pagePath.before-final-header-fix.bak"
Copy-Item -LiteralPath $pagePath -Destination $backupPath -Force
Copy-Item -LiteralPath $replacementPath -Destination $pagePath -Force

Write-Host ""
Write-Host "Selected Works header replaced successfully." -ForegroundColor Green
Write-Host "Backup: src\pages\selected.astro.before-final-header-fix.bak" -ForegroundColor DarkGray
Write-Host "Flashlight outer radius: 145px." -ForegroundColor DarkGray
Write-Host "Homepage-style bottom fade: enabled." -ForegroundColor DarkGray
Write-Host "Subtitle readability layer: enabled." -ForegroundColor DarkGray
