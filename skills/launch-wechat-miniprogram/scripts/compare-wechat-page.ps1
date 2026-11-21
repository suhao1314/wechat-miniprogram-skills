<#
.SYNOPSIS
Captures a WeChat DevTools simulator page and compares it with an already-approved baseline.

.DESCRIPTION
The script deliberately never creates or replaces a baseline. It uses the existing
wechat-page-qa probe, which captures only the DevTools simulator, then calls the
local Pixelmatch runner. Put disposable captures under the workspace 99-temp area.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$ClientName,
  [Parameter(Mandatory=$true)][string]$ProjectPath,
  [Parameter(Mandatory=$true)][ValidatePattern('^/?[a-zA-Z0-9_/-]+$')][string]$Page,
  [Parameter(Mandatory=$true)][string]$Selector,
  [Parameter(Mandatory=$true)][string]$BaselinePath,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [ValidateRange(0,1)][double]$Threshold = 0.1,
  [ValidateRange(0,[int]::MaxValue)][int]$MaximumChangedPixels = 0,
  [ValidateRange(0,1)][double]$MaximumChangedRatio = 0.005,
  [string]$MaskPath,
  [switch]$IncludeAntiAlias,
  [string]$CliPath,
  [switch]$OpenIfConfirmedAbsent,
  [switch]$Approved
)

$ErrorActionPreference = 'Stop'
if (-not $Approved) { throw 'User approval is required before controlling DevTools.' }
if (-not [IO.Path]::IsPathRooted($OutputDirectory)) { throw 'OutputDirectory must be absolute.' }
if (-not [IO.Path]::IsPathRooted($BaselinePath)) { throw 'BaselinePath must be absolute.' }

$taskBaseline = (Resolve-Path -LiteralPath $BaselinePath -ErrorAction Stop).Path
if (-not (Test-Path -LiteralPath $taskBaseline -PathType Leaf)) { throw 'Baseline image is not a file.' }
$taskProbe = Join-Path $PSScriptRoot '..\..\wechat-page-qa\scripts\probe-page.ps1'
$taskProbe = (Resolve-Path -LiteralPath $taskProbe -ErrorAction Stop).Path
$taskComparator = Join-Path $PSScriptRoot '..\tools\visual-regression\compare-images.mjs'
$taskComparator = (Resolve-Path -LiteralPath $taskComparator -ErrorAction Stop).Path
$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskRunDirectory = Join-Path $OutputDirectory ('run-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $taskRunDirectory -ErrorAction Stop | Out-Null

$taskProbeParameters = @{
  ClientName = $ClientName
  ProjectPath = $ProjectPath
  Page = $Page
  Selector = $Selector
  OutputDirectory = $taskRunDirectory
  Approved = $true
}
if ($CliPath) { $taskProbeParameters.CliPath = $CliPath }
if ($OpenIfConfirmedAbsent) { $taskProbeParameters.OpenIfConfirmedAbsent = $true }
# The probe reports progress with Write-Host. Keep this wrapper's success stream
# machine-readable, while retaining the probe's failures as terminating errors.
$taskProbeResult = & $taskProbe @taskProbeParameters 6>$null
if (-not $taskProbeResult.screenshot) { throw 'Simulator probe did not report a screenshot.' }
$taskCurrent = (Resolve-Path -LiteralPath ([string]$taskProbeResult.screenshot) -ErrorAction Stop).Path
$taskDifference = Join-Path $taskRunDirectory 'difference.png'
$taskReport = Join-Path $taskRunDirectory 'visual-regression.json'

$taskComparatorArguments = @('--baseline', $taskBaseline, '--actual', $taskCurrent, '--diff', $taskDifference, '--report', $taskReport, '--threshold', $Threshold, '--max-diff-pixels', $MaximumChangedPixels, '--max-diff-ratio', $MaximumChangedRatio)
if ($MaskPath) {
  if (-not [IO.Path]::IsPathRooted($MaskPath)) { throw 'MaskPath must be absolute.' }
  $taskMask = (Resolve-Path -LiteralPath $MaskPath -ErrorAction Stop).Path
  $taskComparatorArguments += @('--mask', $taskMask)
}
if ($IncludeAntiAlias) { $taskComparatorArguments += '--include-aa' }
$taskComparatorOutput = & $taskNode $taskComparator @taskComparatorArguments
$taskComparatorExitCode = $LASTEXITCODE
if ($taskComparatorExitCode -notin @(0, 1, 3)) { throw 'Pixelmatch comparison failed.' }
if (-not (Test-Path -LiteralPath $taskReport -PathType Leaf)) { throw 'Pixelmatch did not produce a report.' }
$taskComparison = Get-Content -LiteralPath $taskReport -Raw | ConvertFrom-Json
if ($taskComparatorExitCode -eq 3) {
  [pscustomobject]@{
    route = $taskProbeResult.route
    baseline = $taskBaseline
    current = $taskCurrent
    difference = $null
    report = $taskReport
    environmentMismatch = $true
    baselineDimensions = $taskComparison.baseline
    currentDimensions = $taskComparison.actual
    passed = $false
    captureSource = $taskProbeResult.captureSource
    consoleErrorTextPresent = $taskProbeResult.consoleErrorTextPresent
    visualReviewed = $false
    baselineUpdated = $false
  }
  return
}
[pscustomobject]@{
  route = $taskProbeResult.route
  baseline = $taskBaseline
  current = $taskCurrent
  difference = $taskDifference
  report = $taskReport
  width = $taskComparison.dimensions.width
  height = $taskComparison.dimensions.height
  changedPixels = $taskComparison.diffPixels
  changedRatio = $taskComparison.diffRatio
  maximumChangedPixels = $MaximumChangedPixels
  maximumChangedRatio = $MaximumChangedRatio
  passed = ($taskComparatorExitCode -eq 0)
  captureSource = $taskProbeResult.captureSource
  consoleErrorTextPresent = $taskProbeResult.consoleErrorTextPresent
  visualReviewed = $false
  baselineUpdated = $false
}
