$ErrorActionPreference = 'Stop'

$updateDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $updateDir

$packagePath = Join-Path $repo 'package.json'
$pagePath = Join-Path $repo 'src\pages\selected.astro'
$newPagePath = Join-Path $updateDir 'selected.astro.new'
$sourceImagePath = Join-Path $updateDir 'selected-header-trees.jpg'
$targetImagePath = Join-Path $repo 'src\assets\selected-header-trees.jpg'

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "This update folder must sit directly inside the Alexei repository root."
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

$currentPage = [System.IO.File]::ReadAllText($pagePath)
$alreadyApplied = $currentPage.Contains("selected-header-trees.jpg")

if (-not $alreadyApplied) {
  $expectedPageHash = 'bd68d964b739344b694c77b1bdc01d7e8b3428b4b9a8146b438ab2711d5c3cad'
  $actualPageHash = Get-NormalizedTextHash $pagePath

  if ($actualPageHash -ne $expectedPageHash) {
    throw @"
src/pages/selected.astro differs from the current main-branch version this update was built against.
Nothing was changed. Run:

git diff -- src/pages/selected.astro

and paste the result back into ChatGPT.
"@
  }
}

if (Test-Path -LiteralPath $targetImagePath) {
  $sourceHash = Get-FileHashLower $sourceImagePath
  $targetHash = Get-FileHashLower $targetImagePath

  if ($sourceHash -ne $targetHash) {
    throw "src/assets/selected-header-trees.jpg already exists but is not the chosen original photograph. Nothing was changed."
  }
}

if (-not $alreadyApplied) {
  Copy-Item -LiteralPath $newPagePath -Destination $pagePath -Force
}

if (-not (Test-Path -LiteralPath $targetImagePath)) {
  Copy-Item -LiteralPath $sourceImagePath -Destination $targetImagePath
}

Write-Host ""
Write-Host "Selected Works header update applied." -ForegroundColor Green
Write-Host "The bundled image is the untouched original 2048 x 1536 JPEG." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Changed:"
Write-Host "  src/pages/selected.astro"
Write-Host "  src/assets/selected-header-trees.jpg"
