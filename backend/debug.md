# Debug Scripts Documentation

Complete catalog of debug_*.py files. Use for troubleshooting and understanding system behavior.

**Total Debug Files:** 7

---

## Core Debugging Scripts

### debug_api.py
**Purpose:** Simple API endpoint testing and response validation

**What it does:**
- Tests payment initialization API: POST /payments/initialize/
- Validates response format
- Displays endpoint behavior

**When to use:**
- Quick validation that payment endpoint works
- Check API response structure
- Basic connectivity test

**How to run:**
```bash
python debug_api.py
```

---

### debug_withdrawals.py
**Purpose:** Withdrawal failure analysis and diagnosis

**What it does:**
- Generates failed withdrawals report
- Shows detailed failure information
- Lists failures from last N days (default: 1)
- Displays amount, bank account, error messages
- Shows status and timestamps

**When to use:**
- Troubleshoot failing withdrawals
- See what went wrong in past attempts
- Analyze patterns in failures
- Check Paystack error responses

**How to run:**
```bash
python debug_withdrawals.py
```

---

### debug_otp_flow.py
**Purpose:** OTP withdrawal flow debugging and validation

**What it does:**
1. Checks Paystack configuration
2. Validates Paystack secret key
3. Tests with specific withdrawal records
4. Simulates OTP flow steps
5. Validates account resolution
6. Tests recipient code creation
7. Checks OTP sending capability

**When to use:**
- OTP not sending
- Need to validate Paystack configuration
- Testing withdrawal flow step-by-step
- Debugging specific withdrawal record

**How to run:**
```bash
python manage.py shell < debug_otp_flow.py
```

**What to verify:**
1. Paystack secret key configured
2. User has valid bank account
3. Account verified and resolved
4. Recipient code created or mock code used
5. Transfer initiates successfully

---

### debug_json_serialization.py
**Purpose:** JSON serialization for webhook signature verification

**What it does:**
- Tests different JSON encoding methods
- Validates HMAC signature generation
- Compares signature methods
- Checks consistency for webhook verification

**When to use:**
- Webhook signatures not validating
- Debugging signature mismatch errors
- Verifying JSON serialization consistency
- Testing webhook payload encoding

**How to run:**
```bash
python debug_json_serialization.py
```

**Key validation:**
1. JSON encoding consistent
2. HMAC signature matches expected
3. Sort keys affect signature
4. Proper webhook secret used

---

### debug_victoria.py
**Purpose:** Specific user debugging and permission analysis

**What it does:**
- Loads Victoria's user record (victoriafidelis@church.com)
- Shows user role and status
- Displays cached permissions
- Shows ModeratorPermission record
- Compares Redis cache vs database

**When to use:**
- User having permission issues
- Need to verify specific user record
- Permission cache problems
- User role verification

**How to run:**
```bash
python debug_victoria.py
```

**Shows:**
- User ID, email, role
- Is_active status
- Database permissions count
- Redis cached permissions
- ModeratorPermission sub_role_label

---

### debug_login_gate.py
**Purpose:** Admin/Moderator login gate verification

**What it does:**
- Lists all admin/moderator users in database
- Tests login gate access control
- Shows expected behavior per role
- Validates permission caching
- Checks admin_auth_views.py file on disk

**When to use:**
- Login gate not working
- Admin/moderator can't access admin endpoints
- Need to verify role-based access
- Permission system debugging

**How to run:**
```bash
python debug_login_gate.py
```

**Verifies:**
1. All admin/moderator users listed
2. Each user role checked
3. Expected gate behavior (PASS/BLOCKED)
4. Permissions cached correctly
5. File configuration matches

---

### debug_urls.py
**Purpose:** URL routing and endpoint debugging

**What it does:**
- Tests URL routing configuration
- Validates endpoint patterns
- Checks path resolution
- Tests parameter handling
- Shows routing issues

**When to use:**
- Endpoint not found (404)
- URL parameter not matching
- Routing configuration validation
- API path debugging

**How to run:**
```bash
python debug_urls.py
```

---

## Debugging Workflow

### For Withdrawal Issues:
1. Run `debug_withdrawals.py` - See what failed
2. Run `debug_otp_flow.py` - Debug OTP sending
3. Check `check_db_state.py` - Verify database state
4. Check `check_paystack_config.py` - Verify configuration

### For Payment Issues:
1. Run `debug_api.py` - Test endpoint
2. Check `check_db_state.py` - Verify data
3. Run `test_payment_flow.py` - Full flow test

### For Permission Issues:
1. Run `debug_victoria.py` (or user name) - Check user
2. Run `debug_login_gate.py` - Check gate
3. Verify role in database

### For API Issues:
1. Run `debug_api.py` - Test endpoint
2. Run `debug_urls.py` - Check routing
3. Check `check_api_response.py` - Validate format

---

## Common Issues & Solutions

**OTP not sending:**
- Run debug_otp_flow.py to validate Paystack config
- Check Paystack keys configured
- Verify account is resolved correctly
- Check recipient code created

**Webhook signature mismatch:**
- Run debug_json_serialization.py
- Verify webhook secret in environment
- Check JSON encoding consistency
- Test HMAC generation

**User permission denied:**
- Run debug_victoria.py for that user
- Check role in database
- Verify permission cache
- Run debug_login_gate.py to test gate

**API not responding:**
- Run debug_api.py for quick test
- Run debug_urls.py for routing
- Check logs in database

---

## Debug Output Understanding

### debug_otp_flow.py Output:
```
[1] CHECKING PAYSTACK CONFIGURATION
[2] CHECKING DATABASE STATE
[3] TESTING WITHDRAWAL FLOW
[4] TESTING PAYSTACK INTEGRATION
```

Each section shows:
- Configuration validation
- User and account checks
- Transfer simulation
- OTP readiness

### debug_withdrawals.py Output:
Shows table with:
- Reference number
- Amount and currency
- Bank account used
- Error message
- Timestamp
- Current status

### debug_login_gate.py Output:
Shows table with:
- Email
- Role (ADMIN/MODERATOR)
- Expected result (PASS ✓ or BLOCKED ✗)
- Permissions count

---

## Quick Commands Reference

```bash
# Test API response
python debug_api.py

# Analyze withdrawal failures
python debug_withdrawals.py

# Debug OTP sending
python manage.py shell < debug_otp_flow.py

# Check JSON serialization
python debug_json_serialization.py

# Verify user permissions
python debug_victoria.py

# Test login gate
python debug_login_gate.py

# Check URL routing
python debug_urls.py
```
