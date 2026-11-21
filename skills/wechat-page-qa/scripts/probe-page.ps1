param(
  [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$ClientName,
  [Parameter(Mandatory=$true)][string]$ProjectPath,
  [Parameter(Mandatory=$true)][ValidatePattern('^/?[a-zA-Z0-9_/-]+$')][string]$Page,
  [Parameter(Mandatory=$true)][string]$Selector,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [string]$CliPath,
  [switch]$OpenIfConfirmedAbsent,
  [switch]$Approved
)
$ErrorActionPreference = 'Stop'
if (-not $Approved) { throw 'User approval is required before controlling DevTools.' }
if (-not $CliPath) { $CliPath = (Get-Command wechatide -ErrorAction Stop).Source }
$taskCli = (Resolve-Path -LiteralPath $CliPath).Path
$taskProject = (Resolve-Path -LiteralPath $ProjectPath).Path
if (-not [IO.Path]::IsPathRooted($OutputDirectory)) { throw 'Screenshot directory must be absolute.' }
$taskPage = $Page.TrimStart('/')
$taskSkill = Join-Path (Split-Path $taskCli) 'resources/app.asar.unpacked/wechatide-skill/SKILL.md'
if (-not (Test-Path -LiteralPath $taskSkill)) { throw 'Official bundled skill not found; inspect installation instead of guessing parameters.' }
$taskSkillText = Get-Content -LiteralPath $taskSkill -Raw
$taskVersion = [regex]::Match($taskSkillText,'(?m)^version:\s*([^\r\n]+)').Groups[1].Value.Trim().Trim('"',"'")
if (-not $taskVersion) { throw 'Cannot determine current official skill version.' }
function Invoke-IdeTool([string]$Tool,[string[]]$Options) {
  Write-Host ('[probe] ' + $Tool)
  $taskArgs = @('-c',$ClientName,$Tool) + $Options
  $taskRaw = (& $taskCli @taskArgs 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0) { throw ($Tool + ': CLI process failed; inspect locally without disclosing login credentials.') }
  $taskMatch = [regex]::Match($taskRaw,'(?s)\{.*\}\s*$')
  if (-not $taskMatch.Success) { throw ($Tool + ': no structured JSON response.') }
  $taskResponse = $taskMatch.Value | ConvertFrom-Json
  if ($taskResponse.ok -ne $true) { throw ($Tool + ': ' + $taskResponse.message) }
  if ($taskResponse.result.success -eq $false) { throw ($Tool + ': unsuccessful tool result.') }
  return $taskResponse.result
}
function Read-Route {
  try {
    $taskState = Invoke-IdeTool 'automation_runtime_info' @('--project',$taskProject,'--action','currentPage')
    return [string]$taskState.currentPage.path
  } catch { Write-Host '[probe] Current page not ready; do not treat this as a successful navigation.'; return '' }
}
$taskStatus = Invoke-IdeTool 'check_wechatide_status' @('--skill-version',$taskVersion)
if ($taskStatus.success -ne $true -or $taskStatus.loginExpired -ne $false) { throw 'IDE login is not ready.' }
if ($taskStatus.versionRelation -notin @('equal','agent_ahead')) { throw 'Official skill version gate is not satisfied.' }
if ($taskStatus.cliTokenRequired -eq $true -or $taskStatus.tokenRequired -eq $true) { throw 'CLI token required; obtain through the approved official flow. Do not read local secrets.' }
# Never print taskStatus: it contains login user identity.
$taskStatus = $null
$taskRoute = Read-Route
if (-not $taskRoute -and -not $OpenIfConfirmedAbsent) {
  $taskConsole = Invoke-IdeTool 'get_simulator_console' @('--project',$taskProject,'--command','grep -i error')
  Write-Host ('[probe] Console error query returned ' + ([string]$taskConsole).Length + ' characters; inspect and redact evidence separately.')
  throw 'Runtime unavailable; this does NOT prove the window is closed. No window was opened. Confirm existing window and inspect console before retrying.'
}
if (-not $taskRoute -and $OpenIfConfirmedAbsent) {
  # This switch is allowed only after the caller has independently confirmed absence.
  $null = Invoke-IdeTool 'open_project_window' @('--project',$taskProject,'--window-mode','fullMode')
}
if ($taskRoute.TrimStart('/') -ne $taskPage) {
  $null = Invoke-IdeTool 'simulator_open_page' @('--project',$taskProject,'--page',$taskPage)
  $taskRoute = Read-Route
  if ($taskRoute.TrimStart('/') -ne $taskPage) {
    $null = Invoke-IdeTool 'automation_evaluate' @('--project',$taskProject,'--fn-source','function(){return {routes:getCurrentPages().map(function(p){return p.route})}}')
    # One bounded recovery only. No cache clearing, quit or security changes.
    $null = Invoke-IdeTool 'simulator_refresh' @('--project',$taskProject)
    $null = Invoke-IdeTool 'automation_navigate' @('--project',$taskProject,'--action','reLaunch','--url',('/'+$taskPage))
    $taskRoute = Read-Route
  }
}
if ($taskRoute.TrimStart('/') -ne $taskPage) {
  $null = Invoke-IdeTool 'get_simulator_console' @('--project',$taskProject,'--command','grep -i error')
  throw 'Target route not established; screenshot is not accepted. Inspect console or ask user; do not open another window.'
}
$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
$taskImagePath = Join-Path $OutputDirectory ('page-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.jpg')
if (Test-Path -LiteralPath $taskImagePath) { throw 'Screenshot path already exists.' }
try {
  $taskImage = Invoke-IdeTool 'simulator_screenshot' @('--project',$taskProject,'--wait-for-selector',$Selector,'--path',$taskImagePath)
} catch {
  $taskCaptureError = $_
  try { $null = Invoke-IdeTool 'get_simulator_console' @('--project',$taskProject,'--command','grep -i error') } catch { Write-Host '[probe] Console unavailable; ask user to inspect the DevTools error view.' }
  throw $taskCaptureError
}
if (-not (Test-Path -LiteralPath $taskImagePath)) { throw 'Screenshot file was not produced.' }
$taskFinalRoute = Read-Route
if ($taskFinalRoute.TrimStart('/') -ne $taskPage) { throw 'Route changed during screenshot; inspect manually before accepting.' }
$taskConsole = Invoke-IdeTool 'get_simulator_console' @('--project',$taskProject,'--command','grep -i error')
[pscustomobject]@{ connected=$true; route=$taskFinalRoute; screenshot=$taskImagePath; captureSource='simulator_screenshot'; desktopCaptured=$false; width=$taskImage.imageWidth; height=$taskImage.imageHeight; consoleQuerySucceeded=$true; consoleErrorTextPresent=([bool]([string]$taskConsole)); visualReviewed=$false; interactionsTested=$false; businessVerified=$false }
