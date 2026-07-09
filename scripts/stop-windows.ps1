$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$ContainerName = "prelegal"

docker rm -f $ContainerName 2>$null | Out-Null

Write-Host "Prelegal stopped."
