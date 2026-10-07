$services = @(
  @{ Name = 'svc-auth'; Port = 3004 },
  @{ Name = 'svc-sinhvien'; Port = 3001 },
  @{ Name = 'svc-detai'; Port = 3002 },
  @{ Name = 'svc-dangky'; Port = 3003 }
)

foreach ($service in $services) {
  $path = Join-Path (Get-Location) $service.Name
  Write-Host "Starting $($service.Name) on port $($service.Port)"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$path'; npm.cmd run start:dev"
}

$gatewayPath = Join-Path (Get-Location) 'gateway'
Write-Host "Starting gateway on port 3000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$gatewayPath'; npm.cmd run start:dev"
