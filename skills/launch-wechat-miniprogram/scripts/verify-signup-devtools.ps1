param(
  [Parameter(Mandatory=$true)][string]$Project,
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][string]$ClientName,
  [switch]$ResetDemo
)
$ErrorActionPreference='Stop'
# 只操作与随包样板一致的本地项目，防止误点其他工程。
if (!$ResetDemo) { throw "请确认可以重置这个副本的虚构演示记录，再传入 -ResetDemo。" }
$Project = (Resolve-Path -LiteralPath $Project -ErrorAction Stop).Path
$Source = Join-Path $PSScriptRoot '../assets/signup-demo'
foreach ($file in @('app.json','pages/signup/index.js','pages/signup/index.wxml','services/signup-service.js')) {
  if ((Get-FileHash -LiteralPath (Join-Path $Source $file)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $Project $file)).Hash) {
    throw "项目与随包报名样板不一致：$file。请先复制当前版本。"
  }
}
if (Test-Path -LiteralPath $Output) { throw "证据目录已存在，请指定新目录。" }
$Output = (New-Item -ItemType Directory -Path $Output -ErrorAction Stop).FullName
# 仅从当前工程读取官方开发者工具的结构化响应。
function Tool($ToolName,[string[]]$ArgList){
 $out=(& wechatide -c $ClientName $ToolName --project $Project @ArgList 2>&1|Out-String)
 $m=[regex]::Match($out,'(?s)\{.*\}\s*$')
 if(!$m.Success){throw "$ToolName returned no JSON"}
 $j=$m.Value | ConvertFrom-Json
 if(!$j.ok -or $j.result.success -eq $false){throw ("{0}: {1} {2}" -f $ToolName,$j.message,$j.result.message)}
 return $j.result
}
# 对稳定定位点发送真实点击。
function Tap($selector){$null=Tool 'automation_element_action' @('--action','tap','--selector',$selector,'--wait-for-selector',$selector)}
# 只取本演示要求的无敏感状态。
function Get-Observation{
 $x=(Tool automation_page_action @('--action','getData')).data
 return [pscustomobject]@{who=$x.activeUser;note=$x.note;count=$x.bookingCount;status=$x.status}
}
# 等待可见结果，超时即退出并给出最后观测。
function Check($title,$predicate){
 for($i=0;$i -lt 5;$i++){
  $s=Get-Observation
  if(& $predicate $s){Write-Output ("PASS "+$title+" "+($s|ConvertTo-Json -Compress)); return}
  Start-Sleep -Milliseconds 300
 }
 throw ("failed "+$title+" "+($s|ConvertTo-Json -Compress -Depth 4))
}
# 保存模拟器内部截图。
function Capture($name,$sel){$null=Tool simulator_screenshot @('--path',(Join-Path $Output $name),'--wait-for-selector',$sel)}
$n="[data-testid='note']";$submit="[data-testid='submit']"
$null=Tool 'automation_navigate' @('--action','reLaunch','--url','/pages/signup/index')

$route=(Tool automation_runtime_info @('--action','currentPage')).currentPage.path
if ($route.TrimStart('/') -ne 'pages/signup/index') { throw "导入的工程未打开报名页。" }
Tap "[data-testid='reset']"
$null=Tool 'automation_element_action' @('--action','input','--selector',$n,'--value','观星笔记','--wait-for-selector',$n)
Check 'input' {param($s) $s.note -eq '观星笔记'}
$null=Tool 'automation_navigate' @('--action','reLaunch','--url','/pages/signup/index')
Check 'draft after page recreation' {param($s) $s.note -eq '观星笔记' -and $s.count -eq 0}
Tap "[data-testid='user-qiao']"
Check 'other account draft isolated' {param($s) $s.who -eq 'qiao' -and $s.note -eq ''}
Tap "[data-testid='user-lin']"
Tap "[data-testid='simulate-failure']"
Tap $submit
Check 'failed submit preserved input; no new booking' {param($s) $s.note -eq '观星笔记' -and $s.count -eq 0 -and $s.status -match '异常'}
Capture 'signup-failure.jpg' '.status'
Tap $submit
Check 'retry created one booking' {param($s) $s.count -eq 1 -and $s.status -eq '报名成功。'}
Tap $submit
Check 'duplicate kept one booking' {param($s) $s.count -eq 1 -and $s.status -match '无需重复'}
Capture 'signup-duplicate.jpg' '.status'
Tap "[data-testid='ui-cases']"
Capture 'ui-cases.jpg' '.paper'
