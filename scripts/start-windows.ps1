$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ImageName = "prelegal"
$ContainerName = "prelegal"

docker build -t $ImageName .

docker rm -f $ContainerName 2>$null | Out-Null

$dockerArgs = @("run", "-d", "--name", $ContainerName, "-p", "8000:8000")
if (Test-Path ".env") {
    $dockerArgs += @("--env-file", ".env")
}
$dockerArgs += $ImageName

docker @dockerArgs

Write-Host "Prelegal is running at http://localhost:8000"
