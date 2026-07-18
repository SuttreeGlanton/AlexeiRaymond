$ErrorActionPreference = 'Stop'

$updateDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Split-Path -Parent $updateDir
$pagePath = Join-Path $repo 'src\pages\selected.astro'
$packagePath = Join-Path $repo 'package.json'

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "Place this update folder directly inside C:\Users\talut\Desktop\Alexei."
}

if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Missing file: $pagePath"
}

$text = [System.IO.File]::ReadAllText($pagePath)

if (-not $text.Contains("selected-header-city.jpg")) {
  throw "This patch expects the Selected Works city-header preview. The city image import was not found."
}

if (-not $text.Contains(".selected-hero-color-reveal")) {
  throw "The Selected Works flashlight CSS was not found."
}

$original = $text

# Keep the reveal strong, but place it beneath the scrim exactly like the homepage.
$colorHeaderPattern = '(?ms)(^\s{4}\.selected-hero-color-reveal\s*\{\s*)(?:z-index:\s*\d+;\s*)?opacity:\s*0;\s*filter:\s*[^;]+;\s*transition:\s*opacity\s*[^;]+;'
$colorHeaderReplacement = @'
    .selected-hero-color-reveal {
      z-index: 0;
      opacity: 0;
      filter: brightness(1.04) contrast(1.03) saturate(1.12);
      transition: opacity 160ms ease;
'@

$colorMatches = [regex]::Matches($text, $colorHeaderPattern)
if ($colorMatches.Count -ne 1) {
  throw "Could not safely locate the Selected Works color-layer header. Found $($colorMatches.Count) matches."
}
$text = [regex]::Replace($text, $colorHeaderPattern, $colorHeaderReplacement, 1)

# Compact flashlight for the shallow banner. Replace both WebKit and standard masks.
$maskStopsPattern = '(?ms)rgba\(0,\s*0,\s*0,\s*1\)\s+\d+px,\s*rgba\(0,\s*0,\s*0,\s*0\.(?:78|86|88)\)\s+\d+px,\s*rgba\(0,\s*0,\s*0,\s*0\.(?:34|42|44)\)\s+\d+px,\s*rgba\(0,\s*0,\s*0,\s*0\)\s+\d+px'
$maskStopsReplacement = @'
rgba(0, 0, 0, 1) 42px,
        rgba(0, 0, 0, 0.88) 76px,
        rgba(0, 0, 0, 0.44) 116px,
        rgba(0, 0, 0, 0) 165px
'@

$maskMatches = [regex]::Matches($text, $maskStopsPattern)
if ($maskMatches.Count -ne 2) {
  throw "Could not safely locate both flashlight masks. Found $($maskMatches.Count) matches."
}
$text = [regex]::Replace($text, $maskStopsPattern, $maskStopsReplacement)

# Replace the first Selected Works scrim with the homepage's exact graceful bottom melt.
$scrimPattern = '(?ms)^\s{4}\.selected-hero-scrim\s*\{.*?^\s{4}\}'
$scrimMatches = [regex]::Matches($text, $scrimPattern)
if ($scrimMatches.Count -lt 1) {
  throw "Could not locate the Selected Works scrim."
}

$homeScrim = @'
    .selected-hero-scrim {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(
        180deg,
        rgba(10, 10, 10, 0.62) 0%,
        rgba(10, 10, 10, 0.3) 42%,
        rgba(10, 10, 10, 0.55) 78%,
        var(--bg) 100%
      );
      pointer-events: none;
    }
'@

$counter = 0
$text = [regex]::Replace(
  $text,
  $scrimPattern,
  {
    param($match)
    $script:counter++
    if ($script:counter -eq 1) { return $homeScrim }
    return ''
  }
)

# Match homepage layer order: image/reveal at 0, scrim at 1, copy at 2.
$contentPattern = '(?ms)(^\s{4}\.selected-hero-content\s*\{\s*position:\s*relative;\s*z-index:\s*)\d+;'
$contentMatches = [regex]::Matches($text, $contentPattern)
if ($contentMatches.Count -ne 1) {
  throw "Could not safely locate the Selected Works content layer."
}
$text = [regex]::Replace($text, $contentPattern, '${1}2;', 1)

# Keep the subtitle fully legible even while the color passes beneath it.
$introPattern = '(?ms)^\s{4}\.selected-hero \.page-intro\s*\{.*?^\s{4}\}'
$introMatches = [regex]::Matches($text, $introPattern)
if ($introMatches.Count -ne 1) {
  throw "Could not safely locate the Selected Works subtitle rule."
}
$introReplacement = @'
    .selected-hero .page-intro {
      position: relative;
      z-index: 4;
      max-width: 650px;
      margin-top: 16px;
      color: var(--text);
      font-weight: 500;
      text-shadow:
        0 1px 2px rgba(0, 0, 0, 0.98),
        0 3px 16px rgba(0, 0, 0, 0.96),
        0 0 34px rgba(0, 0, 0, 0.88);
    }
'@
$text = [regex]::Replace($text, $introPattern, $introReplacement, 1)

if ($text -eq $original) {
  throw "No changes were produced."
}

# Sanity checks before writing.
if (($text.Split("rgba(0, 0, 0, 1) 42px").Count - 1) -ne 2) {
  throw "Final validation failed: compact mask stops are incomplete."
}
if (($text.Split(".selected-hero-scrim {").Count - 1) -ne 1) {
  throw "Final validation failed: duplicate Selected Works scrim rules remain."
}
if (-not $text.Contains("var(--bg) 100%")) {
  throw "Final validation failed: the bottom fade is missing."
}

[System.IO.File]::WriteAllText(
  $pagePath,
  $text,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host ""
Write-Host "Selected Works header fixed." -ForegroundColor Green
Write-Host "Flashlight outer radius: 165px." -ForegroundColor DarkGray
Write-Host "Homepage-style bottom fade restored." -ForegroundColor DarkGray
Write-Host "Subtitle remains above the reveal and scrim." -ForegroundColor DarkGray
