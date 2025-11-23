# Force EC2 Update and Restart Waha
$EC2_IP = "43.205.192.171"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Force Update EC2 & Restart Waha" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# The service will auto-pull on restart, but files might conflict
# Let's create a command to run on EC2
Write-Host "Commands to run on EC2:" -ForegroundColor Yellow
Write-Host ""
Write-Host "sudo docker stop waha" -ForegroundColor Cyan
Write-Host "sudo docker rm waha" -ForegroundColor Cyan
Write-Host "sudo docker run -d --name waha --restart unless-stopped -p 3000:3000 -v ~/waha-data:/app/.sessions -e WHATSAPP_HOOK_URL=http://localhost:8080/api/waha/webhook -e WHATSAPP_API_KEY=your-secret-key -e WHATSAPP_API_KEY_IN=header devlikeapro/waha:latest" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing if we can restart via deployment script..." -ForegroundColor Yellow

# Try deployment
try {
    & ".\deploy-to-ec2.ps1" -Message "Force update with Waha restart endpoint"
    Write-Host "`n✅ Deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "`n⚠️  Deployment had issues" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nNow testing Waha restart endpoint..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

try {
    $response = Invoke-RestMethod -Uri "http://${EC2_IP}:8080/api/admin/restart-waha" -Method POST -ContentType "application/json" -Body "{}" -TimeoutSec 60
    Write-Host "`n✅ WAHA RESTARTED!" -ForegroundColor Green
    Write-Host $response.message -ForegroundColor White
} catch {
    Write-Host "`n⚠️  Could not restart via API" -ForegroundColor Yellow
    Write-Host "You may need to restart Waha manually on EC2" -ForegroundColor White
}

Write-Host "`nWaha should now accept API key: your-secret-key`n" -ForegroundColor Cyan
