$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
# Package chung phải được build trước các service dùng file:../shared/database.
foreach ($name in @('shared/database', 'gateway', 'svc-auth', 'svc-sinhvien', 'svc-detai', 'svc-dangky')) {
  Write-Host "Cài đặt phụ thuộc: $name"
  Push-Location (Join-Path $repoRoot $name)
  try {
    npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "Cài đặt thất bại: $name" }
  } finally { Pop-Location }
}
