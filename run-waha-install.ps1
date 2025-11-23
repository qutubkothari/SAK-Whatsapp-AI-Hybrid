# Run Waha Installation on EC2
$EC2_IP = "43.205.192.171"
$EC2_USER = "ubuntu"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   INSTALLING WAHA ON EC2" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Create a PowerShell script to run via SSH
$commands = @"
cd /home/ubuntu/whatsapp-ai
chmod +x install-waha.sh
sudo bash install-waha.sh
"@

Write-Host "Running Waha installation script on EC2...`n" -ForegroundColor Cyan

# Since direct SSH doesn't work, let's create a deployment command
Write-Host "Manual Steps Required:" -ForegroundColor Yellow
Write-Host "1. Connect to EC2 via AWS Console or your SSH client" -ForegroundColor White
Write-Host "2. Run these commands:" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "   cd /home/ubuntu/whatsapp-ai" -ForegroundColor Cyan
Write-Host "   chmod +x install-waha.sh" -ForegroundColor Cyan
Write-Host "   sudo bash install-waha.sh" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "OR use AWS Systems Manager Session Manager" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White

# Try to verify if we can reach the server
Write-Host "Checking if EC2 server is reachable...`n" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://${EC2_IP}:8080/health" -TimeoutSec 5
    Write-Host "✅ EC2 Server is online" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor White
} catch {
    Write-Host "❌ Cannot reach EC2 server" -ForegroundColor Red
}
