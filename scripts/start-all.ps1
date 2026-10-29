$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$backendNames = @('svc-auth', 'svc-sinhvien', 'svc-detai', 'svc-dangky', 'gateway')
$requiredFiles = @('.env') + @($backendNames | ForEach-Object { "$_/.env" })
$missing = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $repoRoot $_) -PathType Leaf) })
if ($missing.Count -gt 0) {
  throw "Thiếu tệp cấu hình: $($missing -join ', '). Sao chép .env.example tương ứng thành .env và điền cấu hình trước khi chạy."
}
foreach ($name in $backendNames) {
  $servicePath = (Join-Path $repoRoot $name).Replace("'", "''")
  $clearServiceOverrides = if ($name -eq 'svc-auth') {
    'Remove-Item Env:GOOGLE_CLIENT_ID -ErrorAction SilentlyContinue; '
  } else { '' }
  Write-Host "Khởi động $name; cổng đọc từ cấu hình PORT của service."
  Start-Process powershell -ArgumentList '-NoExit', '-Command', "$clearServiceOverrides`Set-Location -LiteralPath '$servicePath'; `$Host.UI.RawUI.WindowTitle = '$name'; npm.cmd run start:dev"
}

$frontendName = 'FE_Demo_SOA_AG'
$frontendPath = (Join-Path $repoRoot $frontendName).Replace("'", "''")
Write-Host "Khởi động frontend tại http://localhost:4200."
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location -LiteralPath '$frontendPath'; `$Host.UI.RawUI.WindowTitle = 'frontend'; npm.cmd start"
