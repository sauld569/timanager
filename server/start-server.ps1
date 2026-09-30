$processName = "ts-node-dev"
$serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow -PassThru
$serverProcess.Id | Out-File -FilePath ".pidfile"
Write-Host "Servidor iniciado con PID: $($serverProcess.Id)"
Write-Host "Para detener el servidor, ejecuta .\stop-server.ps1"
