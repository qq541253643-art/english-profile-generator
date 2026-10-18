Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repository = 'qq541253643-art/english-profile-generator'
$installRoot = Join-Path $env:LOCALAPPDATA 'EnglishProfileGenerator'
$appRoot = Join-Path $installRoot 'app'
$nodeExe = Join-Path $installRoot 'runtime\node\node.exe'
$serverScript = Join-Path $appRoot 'scripts\local-server.mjs'
$packageFile = Join-Path $appRoot 'package.json'
$stateFile = Join-Path $installRoot 'server-state.json'
$logRoot = Join-Path $installRoot 'logs'
$updateStatusFile = Join-Path $installRoot 'update-status.txt'

function Invoke-LocalCleanup {
  New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
  foreach ($logFile in Get-ChildItem $logRoot -File -ErrorAction SilentlyContinue) {
    if ($logFile.Length -gt 1MB) {
      $tail = Get-Content $logFile.FullName -Tail 400 -ErrorAction SilentlyContinue
      $tail | Set-Content $logFile.FullName -Encoding UTF8
    }
  }

  Get-ChildItem $env:TEMP -Directory -Filter 'EnglishProfileGenerator-*' -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

  $backupRoot = Join-Path $installRoot 'app.backup'
  if ((Test-Path $appRoot) -and (Test-Path $backupRoot)) {
    $backup = Get-Item $backupRoot
    if ($backup.LastWriteTime -lt (Get-Date).AddDays(-1)) {
      Remove-Item $backupRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Test-AppServer {
  param([string]$Url)
  try {
    $health = Invoke-RestMethod -UseBasicParsing -Uri "$Url/__health" -TimeoutSec 2
    return $health.app -eq 'english-profile-generator'
  }
  catch {
    return $false
  }
}

function Open-DefaultBrowser {
  param([string]$Url)
  Start-Process $Url
}

function Update-AppIfNeeded {
  if (-not (Test-Path $packageFile)) { return $false }
  try {
    $currentPackage = Get-Content $packageFile -Raw | ConvertFrom-Json
    $currentVersion = [version]$currentPackage.version
    $latestRelease = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$repository/releases/latest" `
      -Headers @{ 'User-Agent' = 'EnglishProfileGenerator-Launcher' } -TimeoutSec 4
    $latestTag = [string]$latestRelease.tag_name
    if ($latestTag -notmatch '^v\d+\.\d+\.\d+$') { return $false }
    $latestVersion = [version]$latestTag.TrimStart('v')
    if ($latestVersion -le $currentVersion) {
      "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n已是最新版本：v$currentVersion" |
        Set-Content $updateStatusFile -Encoding UTF8
      return $false
    }

    (New-Object -ComObject WScript.Shell).Popup(
      "发现新版本 $latestTag，正在自动更新。更新完成后会自动打开面板。",
      4,
      '英文账号资料生成器',
      64
    ) | Out-Null

    New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
    $updateScript = Join-Path $env:TEMP "EnglishProfileGenerator-$latestTag-install.ps1"
    Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$repository/$latestTag/install.ps1" `
      -OutFile $updateScript -Headers @{ 'User-Agent' = 'EnglishProfileGenerator-Launcher' }
    $updateText = [IO.File]::ReadAllText($updateScript, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
    [IO.File]::WriteAllText($updateScript, $updateText, (New-Object Text.UTF8Encoding($true)))
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $installCommand = "& '" + $updateScript.Replace("'", "''") + "'"
    $encodedInstallCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($installCommand))
    $previousSkipLaunch = $env:EPG_SKIP_AUTO_LAUNCH
    $env:EPG_SKIP_AUTO_LAUNCH = '1'
    try {
      $updateProcess = Start-Process -FilePath $powerShell -ArgumentList @(
        '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', $encodedInstallCommand
      ) -Wait -PassThru
    }
    finally {
      $env:EPG_SKIP_AUTO_LAUNCH = $previousSkipLaunch
    }
    Remove-Item $updateScript -Force -ErrorAction SilentlyContinue
    if ($updateProcess.ExitCode -ne 0) { throw "自动更新退出码：$($updateProcess.ExitCode)" }
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n已自动更新：v$currentVersion -> $latestTag" |
      Set-Content $updateStatusFile -Encoding UTF8
    return $true
  }
  catch {
    New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
    "$(Get-Date -Format o) $($_.Exception.Message)" | Out-File (Join-Path $logRoot 'update.err.log') -Append -Encoding utf8
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n更新检查失败，已继续使用本地版本：$($_.Exception.Message)" |
      Set-Content $updateStatusFile -Encoding UTF8
    return $false
  }
}

try {
  Invoke-LocalCleanup
  if (-not (Test-Path $nodeExe)) { throw '本地运行组件缺失，请重新执行一键安装命令。' }
  if (-not (Test-Path $serverScript)) { throw '应用文件缺失，请重新执行一键安装命令。' }
  Update-AppIfNeeded | Out-Null

  if (Test-Path $stateFile) {
    try {
      $state = Get-Content $stateFile -Raw | ConvertFrom-Json
      if ($state.app -eq 'english-profile-generator' -and (Test-AppServer -Url $state.url)) {
        Open-DefaultBrowser -Url $state.url
        exit 0
      }
    }
    catch {
      # Stale state is replaced when a new local server starts.
    }
    Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
  }

  New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
  $stdoutLog = Join-Path $logRoot 'server.out.log'
  $stderrLog = Join-Path $logRoot 'server.err.log'
  $arguments = @(
    "`"$serverScript`"",
    '--host', '0.0.0.0',
    '--port', '0',
    '--state-file', "`"$stateFile`""
  )

  $serverProcess = Start-Process -FilePath $nodeExe -ArgumentList $arguments -WorkingDirectory $appRoot `
    -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru

  $readyUrl = $null
  for ($attempt = 0; $attempt -lt 75; $attempt++) {
    Start-Sleep -Milliseconds 200
    if ($serverProcess.HasExited) { break }
    if (Test-Path $stateFile) {
      try {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json
        if ($state.app -eq 'english-profile-generator' -and (Test-AppServer -Url $state.url)) {
          $readyUrl = $state.url
          break
        }
      }
      catch {
        # The state file can be observed between write and replace; retry briefly.
      }
    }
  }

  if (-not $readyUrl) {
    $details = if (Test-Path $stderrLog) { (Get-Content $stderrLog -Tail 8) -join "`n" } else { '未生成错误日志。' }
    throw "本地面板启动超时。`n$details"
  }

  Open-DefaultBrowser -Url $readyUrl
}
catch {
  $message = "英文账号资料生成器无法启动。`n`n$($_.Exception.Message)"
  (New-Object -ComObject WScript.Shell).Popup($message, 0, '启动失败', 16) | Out-Null
  exit 1
}
