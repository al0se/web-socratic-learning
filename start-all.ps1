$ErrorActionPreference = 'Stop'

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Wait-PortListening {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }
    Start-Sleep -Seconds 1
  }

  return $false
}

function Start-ServiceProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  if (Test-PortListening -Port $Port) {
    Write-Host "$Name is already running on port $Port."
    return
  }

  $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
  $escapedDirectory = $WorkingDirectory.Replace("'", "''")
  $launchCommand = "Set-Location '$escapedDirectory'; $Command"

  Start-Process `
    -FilePath $powershellPath `
    -ArgumentList '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $launchCommand `
    -WindowStyle Hidden | Out-Null

  if (-not (Wait-PortListening -Port $Port)) {
    throw "$Name failed to start on port $Port within the timeout."
  }

  Write-Host "$Name started on port $Port."
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-ServiceProcess `
  -Name 'MongoDB' `
  -WorkingDirectory (Join-Path $root '.local-mongo') `
  -Command 'pnpm start' `
  -Port 27017

Start-ServiceProcess `
  -Name 'Backend' `
  -WorkingDirectory (Join-Path $root 'service') `
  -Command 'pnpm start' `
  -Port 3002

Start-ServiceProcess `
  -Name 'Frontend' `
  -WorkingDirectory $root `
  -Command 'pnpm dev' `
  -Port 1002

Write-Host 'All services are running.'
