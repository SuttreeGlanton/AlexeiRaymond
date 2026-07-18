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
$expectedCurrentHash = 'fefe9ad6cc0e94e57a96719dd242b94524e2db9ff8e5f8a7f19a57aeef30bba5'
$expectedUpdatedHash = '2e541d6439b686fd1ed76e44457cfa9e57e481fd4719698ea429a5445158993c'

if ($actualHash -eq $expectedUpdatedHash) {
  Write-Host "Selected Works header refinement is already applied." -ForegroundColor Yellow
  exit 0
}

if ($actualHash -ne $expectedCurrentHash) {
  throw @"
src/pages/selected.astro differs from the current preview version.
Nothing was changed. Run:

git diff -- src/pages/selected.astro

and paste the result back into ChatGPT.
"@
}

Copy-Item -LiteralPath $newPagePath -Destination $pagePath -Force

Write-Host ""
Write-Host "Selected Works header refined." -ForegroundColor Green
Write-Host "The flashlight is now genuinely compact." -ForegroundColor DarkGray
Write-Host "The image, reveal, scrim, and copy now use the homepage layer order." -ForegroundColor DarkGray
Write-Host "The bottom now melts into the page instead of ending on a hard edge." -ForegroundColor DarkGray
