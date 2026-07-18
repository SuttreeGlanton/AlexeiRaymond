$ErrorActionPreference = 'Stop'

$updateDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $updateDir

$packagePath = Join-Path $repo 'package.json'
$pagePath = Join-Path $repo 'src\pages\selected.astro'
$newPagePath = Join-Path $updateDir 'selected.astro.new'

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "Place this update folder directly inside C:\Users\talut\Desktop\Alexei."
}

foreach ($requiredPath in @($pagePath, $newPagePath)) {
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

$actualHash = Get-NormalizedTextHash $pagePath
$expectedCurrentHash = 'a685b4c0ff6cef7a06a9972d0f61db7aa4c6ab6ae7c5e4cf71007767494cc9f1'
$expectedUpdatedHash = 'fefe9ad6cc0e94e57a96719dd242b94524e2db9ff8e5f8a7f19a57aeef30bba5'

if ($actualHash -eq $expectedUpdatedHash) {
  Write-Host "Flashlight refinement is already applied." -ForegroundColor Yellow
  exit 0
}

if ($actualHash -ne $expectedCurrentHash) {
  throw @"
src/pages/selected.astro differs from the current city-header preview version.
Nothing was changed. Run:

git diff -- src/pages/selected.astro

and paste the result back into ChatGPT.
"@
}

Copy-Item -LiteralPath $newPagePath -Destination $pagePath -Force

Write-Host ""
Write-Host "Selected Works flashlight refined." -ForegroundColor Green
Write-Host "The reveal is smaller without reducing its color strength." -ForegroundColor DarkGray
Write-Host "The intro sentence now stays bright and legible over the revealed image." -ForegroundColor DarkGray
