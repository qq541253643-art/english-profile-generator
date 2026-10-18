Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$appVersion = '1.2.6'
$repository = 'qq541253643-art/english-profile-generator'
$installRoot = Join-Path $env:LOCALAPPDATA 'EnglishProfileGenerator'
$appRoot = Join-Path $installRoot 'app'
$runtimeRoot = Join-Path $installRoot 'runtime'
$nodeRoot = Join-Path $runtimeRoot 'node'
$nodeExe = Join-Path $nodeRoot 'node.exe'
$stateFile = Join-Path $installRoot 'server-state.json'
$temporaryRoot = Join-Path $env:TEMP "EnglishProfileGenerator-$([guid]::NewGuid().ToString('N'))"

function Remove-StaleInstallerFiles {
  Get-ChildItem $env:TEMP -Directory -Filter 'EnglishProfileGenerator-*' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -ne $temporaryRoot -and $_.LastWriteTime -lt (Get-Date).AddDays(-1) } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-Download {
  param([string]$Uri, [string]$OutFile)
  Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $OutFile -Headers @{ 'User-Agent' = 'EnglishProfileGenerator-Installer' }
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

function Stop-InstalledServer {
  if (-not (Test-Path $stateFile)) { return }
  try {
    $state = Get-Content $stateFile -Raw | ConvertFrom-Json
    if ($state.app -eq 'english-profile-generator' -and (Test-AppServer -Url $state.url)) {
      Stop-Process -Id ([int]$state.pid) -Force -ErrorAction Stop
      Start-Sleep -Milliseconds 400
    }
  }
  catch {
    Write-Host '未发现需要关闭的旧版服务，继续安装。' -ForegroundColor DarkGray
  }
  Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
}

function Install-PortableNode {
  if (Test-Path $nodeExe) {
    try {
      $installedVersion = (& $nodeExe --version).TrimStart('v')
      $installedMajor = [int]($installedVersion.Split('.')[0])
      if ($installedMajor -ge 22) {
        Write-Host "复用本地 Node.js v$installedVersion" -ForegroundColor DarkGray
        return
      }
    }
    catch {
      Write-Host '现有本地运行组件无效，将自动替换。' -ForegroundColor Yellow
    }
  }

  Write-Step '下载免安装版 Node.js LTS（无需管理员权限）'
  $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') {
    'win-arm64'
  }
  elseif ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'AMD64') {
    'win-x64'
  }
  else {
    throw '当前仅支持 Windows 10/11 的 x64 或 ARM64 系统。'
  }

  $releases = Invoke-RestMethod -UseBasicParsing -Uri 'https://nodejs.org/dist/index.json' -Headers @{ 'User-Agent' = 'EnglishProfileGenerator-Installer' }
  $archiveKind = "$architecture-zip"
  $release = $releases | Where-Object { $_.lts -and $_.files -contains $archiveKind } | Select-Object -First 1
  if (-not $release) { throw "未找到适用于 $architecture 的 Node.js LTS。" }

  $archiveName = "node-$($release.version)-$architecture.zip"
  $archivePath = Join-Path $temporaryRoot $archiveName
  $extractRoot = Join-Path $temporaryRoot 'node'
  Invoke-Download -Uri "https://nodejs.org/dist/$($release.version)/$archiveName" -OutFile $archivePath
  Expand-Archive -Path $archivePath -DestinationPath $extractRoot -Force
  $extractedNode = Get-ChildItem $extractRoot -Directory | Select-Object -First 1
  if (-not $extractedNode -or -not (Test-Path (Join-Path $extractedNode.FullName 'node.exe'))) {
    throw 'Node.js 运行组件解压失败。'
  }

  New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
  $stagedNode = Join-Path $runtimeRoot 'node.new'
  Remove-Item $stagedNode -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item $extractedNode.FullName $stagedNode
  Remove-Item $nodeRoot -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item $stagedNode $nodeRoot
}

function New-AppIcon {
  param([string]$Path)
  Add-Type -AssemblyName System.Drawing
  if (-not ('EnglishProfileGenerator.NativeIconMethods' -as [type])) {
    Add-Type -TypeDefinition @'
namespace EnglishProfileGenerator {
  using System;
  using System.Runtime.InteropServices;
  public static class NativeIconMethods {
    [DllImport("user32.dll")]
    public static extern bool DestroyIcon(IntPtr handle);
  }
}
'@
  }

  $bitmap = New-Object System.Drawing.Bitmap 256, 256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $shapePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $background = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(16, 40, 36))
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font 'Segoe UI', 82, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $iconHandle = [IntPtr]::Zero
  $icon = $null
  $stream = $null
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $shapePath.AddArc(8, 8, 62, 62, 180, 90)
    $shapePath.AddArc(186, 8, 62, 62, 270, 90)
    $shapePath.AddArc(186, 186, 62, 62, 0, 90)
    $shapePath.AddArc(8, 186, 62, 62, 90, 90)
    $shapePath.CloseFigure()
    $graphics.FillPath($background, $shapePath)
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString('EP', $font, $textBrush, [System.Drawing.RectangleF]::new(0, 2, 256, 244), $format)

    $iconHandle = $bitmap.GetHicon()
    $icon = ([System.Drawing.Icon]::FromHandle($iconHandle)).Clone()
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Create)
    $icon.Save($stream)
  }
  finally {
    if ($stream) { $stream.Dispose() }
    if ($icon) { $icon.Dispose() }
    if ($iconHandle -ne [IntPtr]::Zero) { [EnglishProfileGenerator.NativeIconMethods]::DestroyIcon($iconHandle) | Out-Null }
    $format.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
    $background.Dispose()
    $shapePath.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function New-DesktopShortcut {
  $desktop = [Environment]::GetFolderPath('Desktop')
  if (-not $desktop) { throw '无法确定 Windows 桌面路径。' }
  $shortcutPath = Join-Path $desktop '英文账号资料生成器.lnk'
  $launcher = Join-Path $appRoot 'windows\launcher.vbs'
  $icon = Join-Path $appRoot 'windows\app.ico'
  New-AppIcon -Path $icon
  $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
  $shell = New-Object -ComObject WScript.Shell
  Remove-Item $shortcutPath -Force -ErrorAction SilentlyContinue
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $wscript
  $shortcut.Arguments = "//B //NoLogo `"$launcher`""
  $shortcut.WorkingDirectory = $appRoot
  $shortcut.Description = '启动英文账号资料生成器本地面板'
  $shortcut.IconLocation = "$icon,0"
  $shortcut.WindowStyle = 7
  $shortcut.Save()
  $iconRefresh = Join-Path $env:SystemRoot 'System32\ie4uinit.exe'
  if (Test-Path $iconRefresh) { Start-Process $iconRefresh -ArgumentList '-show' -WindowStyle Hidden -Wait }
  return $shortcutPath
}

try {
  if ($env:OS -ne 'Windows_NT') { throw '此安装器仅支持 Windows 10/11。' }
  Remove-StaleInstallerFiles
  New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $installRoot -Force | Out-Null

  Install-PortableNode

  Write-Step "下载并校验英文账号资料生成器 v$appVersion"
  $assetName = "english-profile-generator-windows-v$appVersion.zip"
  $releaseBase = "https://github.com/$repository/releases/download/v$appVersion"
  $sourceArchive = Join-Path $temporaryRoot $assetName
  $checksumPath = Join-Path $temporaryRoot "$assetName.sha256"
  $sourceContainer = Join-Path $temporaryRoot 'source'
  Invoke-Download -Uri "$releaseBase/$assetName" -OutFile $sourceArchive
  Invoke-Download -Uri "$releaseBase/$assetName.sha256" -OutFile $checksumPath
  $checksumText = [IO.File]::ReadAllText($checksumPath, [Text.Encoding]::UTF8)
  $expectedHash = (($checksumText.Trim() -split '\s+')[0]).ToUpperInvariant()
  if ($expectedHash -notmatch '^[A-F0-9]{64}$') { throw 'Release 校验文件格式无效。' }
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceArchive).Hash
  if ($actualHash -ne $expectedHash) { throw '应用包 SHA-256 校验失败，已停止安装。' }
  Expand-Archive -Path $sourceArchive -DestinationPath $sourceContainer -Force
  $sourceRoot = Get-ChildItem $sourceContainer -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } | Select-Object -First 1
  if (-not $sourceRoot) { throw '应用包解压失败。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'dist\index.html'))) { throw '应用包缺少网页构建产物。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'scripts\avatar-proxy.mjs'))) { throw '应用包缺少头像下载代理。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'scripts\synthetic-people-proxy.mjs'))) { throw '应用包缺少高清合成人像代理。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'scripts\image-codecs.mjs'))) { throw '应用包缺少旧版手机图片兼容组件。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'node_modules\@jsquash\avif\codec\dec\avif_dec.wasm'))) { throw '应用包缺少 AVIF 解码组件。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'node_modules\@jsquash\jpeg\codec\enc\mozjpeg_enc.wasm'))) { throw '应用包缺少 JPEG 编码组件。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'scripts\local-server.mjs'))) { throw '应用包缺少本地服务组件。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'windows\launcher.ps1'))) { throw '应用包缺少 Windows 启动器。' }
  if (-not (Test-Path (Join-Path $sourceRoot.FullName 'windows\launcher.vbs'))) { throw '应用包缺少无窗口启动器。' }

  Write-Step '安装应用并创建桌面快捷方式'
  Stop-InstalledServer
  $backupRoot = Join-Path $installRoot 'app.backup'
  Remove-Item $backupRoot -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path $appRoot) { Move-Item $appRoot $backupRoot }
  try {
    Move-Item $sourceRoot.FullName $appRoot
  }
  catch {
    if ((Test-Path $backupRoot) -and -not (Test-Path $appRoot)) { Move-Item $backupRoot $appRoot }
    throw
  }
  Remove-Item $backupRoot -Recurse -Force -ErrorAction SilentlyContinue

  $shortcutPath = New-DesktopShortcut
  Write-Host "`n安装完成：$appRoot" -ForegroundColor Green
  Write-Host "桌面快捷方式：$shortcutPath" -ForegroundColor Green
  Write-Host '以后双击快捷方式即可使用；启动时会自动检查并安装最新正式版本。' -ForegroundColor Green

  if ($env:EPG_SKIP_AUTO_LAUNCH -ne '1') {
    $launcher = Join-Path $appRoot 'windows\launcher.vbs'
    Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\wscript.exe') `
      -ArgumentList "//B //NoLogo `"$launcher`"" -WindowStyle Hidden
  }
}
catch {
  Write-Host "`n安装失败：$($_.Exception.Message)" -ForegroundColor Red
  throw
}
finally {
  Remove-Item $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
}
