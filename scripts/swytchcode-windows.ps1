# Run from the SoulCare repo root after: git checkout cursor/swytchcode-roles-qwen-d271
# Example:  powershell -ExecutionPolicy Bypass -File .\scripts\swytchcode-windows.ps1

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $repo "backend"))) {
    $repo = Get-Location
}

Set-Location $repo
Write-Host "Repo: $repo"

$tooling = Join-Path $repo ".swytchcode\tooling.json"
if (-not (Test-Path $tooling)) {
    Write-Host @"
No .swytchcode\tooling.json here.

You are probably still on main. Run:

  git fetch origin
  git checkout cursor/swytchcode-roles-qwen-d271
  git pull origin cursor/swytchcode-roles-qwen-d271
  Get-ChildItem -Force .swytchcode\tooling.json

Do not run swytchcode init from C:\WINDOWS\System32.
Do not cd to C:\path\to\soulcare — that path is a placeholder.
"@
    exit 1
}

swytchcode --version
swytchcode whoami
swytchcode bootstrap
swytchcode list tooling
swytchcode doctor
Write-Host "Next: swytchcode auth connect slack   (only for providers you have keys for)"
