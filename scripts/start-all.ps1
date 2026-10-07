$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$names = @('svc-auth', 'svc-sinhvien', 'svc-detai', 'svc-dangky', 'gateway')
$requiredFiles = @('.env') + @($names | ForEach-Object { "$_/.env" })
$missing = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $repoRoot $_) -PathType Leaf) })
if ($missing.Count -gt 0) {
  throw "Thiếu tệp cấu hình: $($missing -join ', '). Sao chép .env.example tương ứng thành .env và điền cấu hình trước khi chạy."
}
foreach ($name in $names) {
  $servicePath = (Join-Path $repoRoot $name).Replace("'", "''")
  Write-Host "Khởi động $name; cổng đọc từ cấu hình PORT của service."
  Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoExit', '-Command', "Set-Location -LiteralPath '$servicePath'; npm.cmd run start:dev"
}
