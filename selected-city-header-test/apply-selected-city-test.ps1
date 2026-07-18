$ErrorActionPreference = 'Stop'

$updateDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $updateDir

$packagePath = Join-Path $repo 'package.json'
$pagePath = Join-Path $repo 'src\pages\selected.astro'
$newPagePath = Join-Path $updateDir 'selected.astro.new'
$sourceImagePath = Join-Path $updateDir 'selected-header-city.jpg'
$targetImagePath = Join-Path $repo 'src\assets\selected-header-city.jpg'
$oldTreePath = Join-Path $repo 'src\assets\selected-header-trees.jpg'

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "Place this update folder directly inside C:\Users\talut\Desktop\Alexei."
}

foreach ($requiredPath in @($pagePath, $newPagePath, $sourceImagePath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Missing required file: $requiredPath"
  }
}

function Get-NormalizedTextHash([string]$Path) {
  $text = [System.IO.File]::ReadAllText($Path)
  $text = $text.TrimStart([char]0xFEFF)
  $text = $text.Replace("`r`n", "`n").TrimEnd() + "`n"
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  }
  finally {
    $sha.Dispose()
  }
}

function Get-FileHashLower([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$actualPageHash = Get-NormalizedTextHash $pagePath
$expectedOldHash = '9f2956cdb3145a433b8dfc34e5694e8cbdb593b297b26115be32b4dee79e82a4'
$expectedNewHash = 'a685b4c0ff6cef7a06a9972d0f61db7aa4c6ab6ae7c5e4cf71007767494cc9f1'

if ($actualPageHash -ne $expectedOldHash -and $actualPageHash -ne $expectedNewHash) {
  throw @"
src/pages/selected.astro is not the tree-header preview version this update expects.
Nothing was changed. Run:

git diff -- src/pages/selected.astro

and paste the result back into ChatGPT.
"@
}

if (Test-Path -LiteralPath $targetImagePath) {
  $sourceHash = Get-FileHashLower $sourceImagePath
  $targetHash = Get-FileHashLower $targetImagePath

  if ($sourceHash -ne $targetHash) {
    throw "src/assets/selected-header-city.jpg already exists but differs from the uploaded original. Nothing was changed."
  }
}

if ($actualPageHash -eq $expectedOldHash) {
  Copy-Item -LiteralPath $newPagePath -Destination $pagePath -Force
}

if (-not (Test-Path -LiteralPath $targetImagePath)) {
  Copy-Item -LiteralPath $sourceImagePath -Destination $targetImagePath
}

if (Test-Path -LiteralPath $oldTreePath) {
  Remove-Item -LiteralPath $oldTreePath -Force
}

Write-Host ""
Write-Host "City header test applied." -ForegroundColor Green
Write-Host "The original uploaded 2048 x 898 JPEG was copied without image manipulation." -ForegroundColor DarkGray
Write-Host "The desktop flashlight is larger, brighter, and reveals the full-color layer above the dimming scrim." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Changed:"
Write-Host "  src/pages/selected.astro"
Write-Host "  src/assets/selected-header-city.jpg"
Write-Host "Removed:"
Write-Host "  src/assets/selected-header-trees.jpg"
