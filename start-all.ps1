$ErrorActionPreference = 'Stop'

function Resolve-PnpmLaunchCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PnpmArgs
  )

  $pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($pnpmCommand) {
    return "pnpm $PnpmArgs"
  }

  $condaExe = $env:CONDA_EXE
  if (-not $condaExe) {
    $condaExeCommand = Get-Command conda.exe -ErrorAction SilentlyContinue
    if ($condaExeCommand) {
      $condaExe = $condaExeCommand.Source
    }
  }

  if ($condaExe) {
    $escapedCondaExe = $condaExe.Replace("'", "''")
    return "& '$escapedCondaExe' run --no-capture-output -n soc pnpm $PnpmArgs"
  }

  throw 'Unable to find pnpm or conda.exe. Install pnpm into the default shell PATH, or set CONDA_EXE so services can be launched via `conda run -n soc`.'
}

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
    [int]$Port,
    [int]$TimeoutSeconds = 30
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

  if (-not (Wait-PortListening -Port $Port -TimeoutSeconds $TimeoutSeconds)) {
    throw "$Name failed to start on port $Port within the timeout."
  }

  Write-Host "$Name started on port $Port."
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-ServiceProcess `
  -Name 'MongoDB' `
  -WorkingDirectory (Join-Path $root '.local-mongo') `
  -Command (Resolve-PnpmLaunchCommand -PnpmArgs 'start') `
  -Port 27017 `
  -TimeoutSeconds 120

Start-ServiceProcess `
  -Name 'Backend' `
  -WorkingDirectory (Join-Path $root 'service') `
  -Command (Resolve-PnpmLaunchCommand -PnpmArgs 'start') `
  -Port 3002 `
  -TimeoutSeconds 60

Start-ServiceProcess `
  -Name 'Frontend' `
  -WorkingDirectory $root `
  -Command (Resolve-PnpmLaunchCommand -PnpmArgs 'dev') `
  -Port 1002 `
  -TimeoutSeconds 60

Write-Host 'All services are running.'
