# Quick Fix Script for M1A Backend Connectivity
# Run this in PowerShell to check and fix backend connectivity

Write-Host "🔍 Checking M1A Backend Status..." -ForegroundColor Cyan

# Check if backend is running
Write-Host "`n1. Checking if backend is running on port 8001..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr :8001
if ($portCheck) {
    Write-Host "✅ Backend is running on port 8001" -ForegroundColor Green
    $portCheck | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "❌ Backend is NOT running on port 8001" -ForegroundColor Red
    Write-Host "   Starting backend..." -ForegroundColor Yellow
    
    # Start backend
    $backendPath = Join-Path $PSScriptRoot "autoposter-backend"
    if (Test-Path $backendPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python start_backend.py"
        Write-Host "   ✅ Backend starting in new window..." -ForegroundColor Green
        Write-Host "   ⏳ Wait 10 seconds for backend to start, then test: http://localhost:8001/api/health" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Backend directory not found at: $backendPath" -ForegroundColor Red
    }
}

# Get IP address
Write-Host "`n2. Finding your IP address..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress
if ($ipAddress) {
    Write-Host "✅ Your IP address: $ipAddress" -ForegroundColor Green
    Write-Host "   Update this in code if different from 192.168.1.111" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Could not detect IP address automatically" -ForegroundColor Yellow
    Write-Host "   Run 'ipconfig' to find your IP manually" -ForegroundColor Yellow
}

# Check firewall
Write-Host "`n3. Checking firewall rules for port 8001..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "M1A Backend API" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "✅ Firewall rule exists for port 8001" -ForegroundColor Green
} else {
    Write-Host "⚠️  No firewall rule found for port 8001" -ForegroundColor Yellow
    Write-Host "   Creating firewall rule..." -ForegroundColor Yellow
    try {
        New-NetFirewallRule -DisplayName "M1A Backend API" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow -ErrorAction Stop | Out-Null
        Write-Host "   ✅ Firewall rule created!" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to create firewall rule. Run PowerShell as Administrator." -ForegroundColor Red
        Write-Host "   Or manually allow port 8001 in Windows Firewall" -ForegroundColor Yellow
    }
}

# Test backend connectivity
Write-Host "`n4. Testing backend connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is accessible at localhost:8001" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend is NOT accessible at localhost:8001" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure backend is running!" -ForegroundColor Yellow
}

# Test from network IP
if ($ipAddress) {
    Write-Host "`n5. Testing backend from network IP ($ipAddress)..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://$ipAddress:8001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Backend is accessible from network at $ipAddress:8001" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Backend may not be accessible from network" -ForegroundColor Yellow
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        Write-Host "   This is OK if testing from same computer" -ForegroundColor Yellow
        Write-Host "   For physical devices, ensure firewall allows port 8001" -ForegroundColor Yellow
    }
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. If backend is running, test from your device: http://$ipAddress:8001/api/health" -ForegroundColor White
Write-Host "2. If backend is not running, start it: cd autoposter-backend && python start_backend.py" -ForegroundColor White
Write-Host "3. Configure Firebase (see SETUP_FIREBASE.md)" -ForegroundColor White
Write-Host "4. Configure Stripe (see SETUP_STRIPE.md)" -ForegroundColor White

Write-Host "`n✅ Check complete!" -ForegroundColor Green

