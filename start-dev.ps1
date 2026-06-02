# Script para iniciar el servidor y cliente en modo desarrollo en la misma ventana
Write-Host "Iniciando servidor (backend) y cliente (frontend)..." -ForegroundColor Green

# Iniciar servidor en background
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\server
    npm run dev
}

# Iniciar cliente en background
$clientJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\inventario-crud
    npm run dev
}

Write-Host "`n[SERVER] Job ID: $($serverJob.Id)" -ForegroundColor Yellow
Write-Host "[CLIENT] Job ID: $($clientJob.Id)" -ForegroundColor Cyan
Write-Host "`nPresiona Ctrl+C para detener ambos servicios." -ForegroundColor Red
Write-Host "Mostrando salida combinada...`n" -ForegroundColor White

# Mostrar salida de ambos jobs
try {
    while ($true) {
        # Recibir y mostrar salida del servidor
        $serverOutput = Receive-Job -Job $serverJob
        if ($serverOutput) {
            $serverOutput | ForEach-Object { Write-Host "[SERVER] $_" -ForegroundColor Yellow }
        }
        
        # Recibir y mostrar salida del cliente
        $clientOutput = Receive-Job -Job $clientJob
        if ($clientOutput) {
            $clientOutput | ForEach-Object { Write-Host "[CLIENT] $_" -ForegroundColor Cyan }
        }
        
        # Verificar si algún job falló
        if ($serverJob.State -eq 'Failed' -or $clientJob.State -eq 'Failed') {
            Write-Host "`nAlgún servicio falló. Deteniendo..." -ForegroundColor Red
            break
        }
        
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`nDeteniendo servicios..." -ForegroundColor Red
    Stop-Job -Job $serverJob, $clientJob
    Remove-Job -Job $serverJob, $clientJob
    Write-Host "Servicios detenidos." -ForegroundColor Green
}
