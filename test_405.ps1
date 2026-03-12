# 405 Method Not Allowed - cURL Test Script
# Run this from the project root directory

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "405 DIAGNOSTIC: CURL TESTS" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:8000"
$loginUrl = "$baseUrl/api/v1/auth/login/"
$testUrl1 = "$baseUrl/api/v1/auth/verify-email/initiate/"
$testUrl2 = "$baseUrl/api/v1/auth/verify-email/initiate"
$testUrl3 = "$baseUrl/api/test-verify/"

# Prompt for credentials
Write-Host "Enter test user credentials:" -ForegroundColor Yellow
$email = Read-Host "Email"
$password = Read-Host "Password" -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Login and get token
Write-Host "`nTEST 0: Getting authentication token..." -ForegroundColor Cyan
$loginBody = @{
    email = $email
    password = $passwordText
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access
    Write-Host "[SUCCESS] Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

# TEST 1: Main endpoint with trailing slash - POST
Write-Host "`nTEST 1: POST to /verify-email/initiate/ (with trailing slash)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $testUrl1 -Method Post -Headers $headers -ContentType "application/json"
    Write-Host "[SUCCESS] Status: 200 OK" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "[FAIL] Status: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

# TEST 2: Main endpoint without trailing slash - POST
Write-Host "`nTEST 2: POST to /verify-email/initiate (no trailing slash)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $testUrl2 -Method Post -Headers $headers -ContentType "application/json"
    Write-Host "[SUCCESS] Status: 200 OK" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "[FAIL] Status: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

# TEST 3: Test endpoint - POST
Write-Host "`nTEST 3: POST to /api/test-verify/ (minimal test endpoint)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $testUrl3 -Method Post -Headers $headers -ContentType "application/json"
    Write-Host "[SUCCESS] Status: 200 OK" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "[FAIL] Status: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

# TEST 4: Main endpoint with trailing slash - GET (should fail with 405)
Write-Host "`nTEST 4: GET to /verify-email/initiate/ (should return 405)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $testUrl1 -Method Get -Headers $headers
    Write-Host "[UNEXPECTED] Status: 200 OK - GET should not be allowed!" -ForegroundColor Yellow
    Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 405) {
        Write-Host "[SUCCESS] Status: 405 Method Not Allowed (correct behavior)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Status: $statusCode (expected 405)" -ForegroundColor Red
    }
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "`nDIAGNOSTICS COMPLETE" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

Write-Host "`nINTERPRETATION:" -ForegroundColor Yellow
Write-Host "  - If TEST 1 succeeds (200) -> Routing is correct" -ForegroundColor White
Write-Host "  - If TEST 1 fails (405) -> Method mapping issue in view" -ForegroundColor White
Write-Host "  - If TEST 2 fails (301/302) -> APPEND_SLASH redirecting POST to GET" -ForegroundColor White
Write-Host "  - If TEST 3 succeeds but TEST 1 fails -> Main view configuration issue" -ForegroundColor White
Write-Host "  - If TEST 4 succeeds (405) -> GET rejection working correctly" -ForegroundColor White
