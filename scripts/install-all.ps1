# Cài đặt tất cả service
Get-ChildItem -Path . -Directory | Where-Object { $_.Name -match '^svc-|^gateway$' } | ForEach-Object {
  Write-Host "Installing dependencies for $($_.Name)"
  Push-Location $_.FullName
  npm.cmd install
  Pop-Location
}
