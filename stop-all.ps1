$ErrorActionPreference = 'Stop'

function Stop-PortProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "$Name is not running on port $Port."
    return
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    if ($processId -gt 0) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      Write-Host "$Name stopped on port $Port (PID $processId)."
    }
  }
}

Stop-PortProcess -Name 'Frontend' -Port 1002
Stop-PortProcess -Name 'Backend' -Port 3002
Stop-PortProcess -Name 'MongoDB' -Port 27017

Write-Host 'Stop sequence completed.'
