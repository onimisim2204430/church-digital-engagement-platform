# Check Scripts Documentation

Complete catalog of check_*.py files for database and configuration validation.

**Total Check Files:** 11

---

## Database State Checks

### check_db_state.py
**Purpose:** Complete database state snapshot

**What it shows:**
- Total user count in database
- All bank accounts with verification status
- Recipient codes for each account
- All withdrawal requests with amounts and status
- Overall database health summary

**When to use:**
- Verify database is properly populated
- Check bank accounts are verified
- See pending/completed withdrawals
- General database troubleshooting

**What to verify:**
1. Users exist in database
2. Bank accounts have recipient codes
3. Withdrawals show correct status
4. Account verification flags set

**How to run:**
```bash
python check_db_state.py
```

**Output includes:**
```
[USERS] - Total count and sample users
[BANK ACCOUNTS] - Count, verification status, recipient codes
[WITHDRAWALS] - Reference numbers, amounts, statuses
[SUMMARY] - Overall database state assessment
```

---

### check_users.py
**Purpose:** Complete user inventory and details

**What it shows:**
- All users in database
- User ID, email, name
- Admin status (is_admin)
- User role (ADMIN, MODERATOR, USER, etc.)
- Active status

**When to use:**
- Need to find specific user
- Verify user is in database
- Check user role and permissions
- User administration tasks

**How to run:**
```bash
python check_users.py
```

**Output format:**
```
ID: [uuid]
Email: [user@domain.com]
Name: [First Last]
Is Admin: [True/False]
Role: [ADMIN/MODERATOR/USER]
```

---

### check_paystack_config.py
**Purpose:** Validate Paystack API configuration

**What it shows:**
- Paystack secret key (first 20 chars visible)
- Paystack public key (first 20 chars visible)
- Webhook secret configured

**When to use:**
- Before running any Paystack tests
- Verify configuration is set
- Check if keys are exposed
- Environment validation

**How to run:**
```bash
python check_paystack_config.py
```

**Expected output:**
```
PAYSTACK Configuration:
  SECRET_KEY: [masked first 20 chars]...
  PUBLIC_KEY: [masked first 20 chars]...
  WEBHOOK_SECRET: [masked first 20 chars]...
```

**Verify:**
- All keys are configured (NOT "NOT CONFIGURED")
- Keys have appropriate length

---

## Content & Notification Checks

### check_notifs.py
**Purpose:** Check unread notifications for specific user

**What it shows:**
- Total unread notification count
- First 5 unread notifications
- Notification ID, title, message, type
- Notification creation timestamp

**When to use:**
- User says they missed notifications
- Verify notifications created
- Check notification count
- Debug notification delivery

**How to run:**
```bash
python check_notifs.py
```

**Note:** Hardcoded to check joelsam@church.com - modify as needed

---

### check_users_notifs.py
**Purpose:** Notification count and status per user

**What it shows:**
- All users
- Total notification count per user
- Unread notification count per user
- Read notification count

**When to use:**
- Verify notifications distributed
- Check notification delivery
- Identify users missing notifications
- Audit notification creation

**How to run:**
```bash
python check_users_notifs.py
```

**Output format:**
```
User: [email]
- Total: [number]
- Unread: [number]
- Read: [number]
```

---

## Content Validation Checks

### check_drafts.py
**Purpose:** Validate saved drafts in database

**What it shows:**
- Total draft count
- Each draft ID, title, user
- Last autosave timestamp
- Draft content information

**When to use:**
- Verify auto-save is working
- Check draft content stored
- Troubleshoot draft issues
- Debug form submission

**How to run:**
```bash
python check_drafts.py
```

**Verifies:**
1. Drafts auto-saved correctly
2. Content preserved
3. Last save timestamp accurate

---

### check_all_drafts.py
**Purpose:** List all drafts across all users

**What it shows:**
- Complete draft inventory
- Draft author
- Title and content snippet
- Status and timestamps

**When to use:**
- Find specific draft
- Verify draft creation
- Check all users' drafts
- Content recovery

**How to run:**
```bash
python check_all_drafts.py
```

---

### check_content_types.py
**Purpose:** List all PostContentType records

**What it shows:**
- Content type ID
- Slug (system identifier)
- Name (display name)
- Type (system vs custom)
- Status (enabled/disabled)
- Sort order

**When to use:**
- Verify content types exist
- Check system types created
- Validate custom types
- Sort order issues

**How to run:**
```bash
python check_content_types.py
```

**Expected types:**
- Series
- Devotional
- Sermon
- Blog
- Event
- etc.

**Output format:**
```
ID          | Slug              | Name                | Type      | Status    | Order
[uuid]      | [slug]            | [Display Name]      | System    | Enabled   | [#]
```

---

### check_series.py
**Purpose:** Series records and configuration

**What it shows:**
- All series in database
- Series name and description
- Series status
- Content count per series
- Author information
- Created/updated timestamps

**When to use:**
- Verify series created
- Check content in series
- Series configuration validation
- Content organization check

**How to run:**
```bash
python check_series.py
```

**Output includes:**
- Series ID
- Title
- Author email
- Content count
- Status (active/archived)

---

## API & Format Checks

### check_api_response.py
**Purpose:** API endpoint response validation

**What it does:**
- Tests sample API endpoints
- Validates response format
- Checks status codes
- Verifies data structure

**When to use:**
- API debugging
- Response format validation
- Endpoint availability check

**How to run:**
```bash
python check_api_response.py
```

---

### check_test_user.py
**Purpose:** Validate test user data

**What it shows:**
- Test user record from database
- User fields and values
- Role and permissions
- Active status

**When to use:**
- Verify test user exists
- Check test data setup
- Validate test environment
- Permission testing

**How to run:**
```bash
python check_test_user.py
```

---

## Batch Checking Workflow

### Pre-Deployment Check:
```bash
# Run all checks in order
python check_users.py
python check_paystack_config.py
python check_content_types.py
python check_db_state.py
python check_series.py
```

### Troubleshooting Check:
```bash
# For withdrawal issues
python check_db_state.py
python check_paystack_config.py

# For notification issues
python check_notifs.py
python check_users_notifs.py

# For content issues
python check_content_types.py
python check_drafts.py
python check_series.py
```

### Daily Validation:
```bash
# Quick health check
python check_db_state.py
python check_paystack_config.py
python check_users.py
```

---

## Understanding Check Output

### check_db_state.py Output:
```
DATABASE STATE CHECK
====================

[USERS]
Total users: N
- user1@email.com
- user2@email.com

[BANK ACCOUNTS]
Total accounts: N
- Account: xxxxxxxxxx (UBA)
  Status: ✓ verified
  Recipient: RCP_xxxxx

[WITHDRAWALS]
Total: N
- Reference: WD_2024_001
  Amount: 50,000.00 NGN
  Status: completed

[SUMMARY]
✓ Database healthy
  - N users
  - N accounts ready
  - N withdrawals processed
```

### check_content_types.py Output:
```
📊 ALL CONTENT TYPES IN DATABASE
Total: N content types

ID          Slug              Name                Type      Status    Order
[uuid]      series            Series              System    Enabled   1
[uuid]      devotional        Devotional          System    Enabled   2
[uuid]      sermon            Sermon              System    Enabled   3
```

---

## Quick Validation Commands

```bash
# Full check
python check_db_state.py

# Configuration only
python check_paystack_config.py

# User verification
python check_users.py

# Content types
python check_content_types.py

# Notifications
python check_notifs.py

# Drafts
python check_drafts.py

# Series
python check_series.py
```

---

## Common Check Scenarios

**Before Withdrawal Testing:**
1. `python check_db_state.py` - Verify accounts exist
2. `python check_paystack_config.py` - Verify config
3. `python check_users.py` - Verify test user

**Before Content Testing:**
1. `python check_content_types.py` - Content types exist
2. `python check_drafts.py` - Drafts work
3. `python check_series.py` - Series created

**Before Deployment:**
1. `python check_users.py` - Users exist
2. `python check_paystack_config.py` - Config set
3. `python check_db_state.py` - Overall health
4. `python check_content_types.py` - Types created

---

## Troubleshooting with Checks

**"Bank account not found":**
- Run `check_db_state.py` - See what accounts exist
- Check account numbers and codes

**"Paystack error":**
- Run `check_paystack_config.py` - Verify keys
- Check environment variables set

**"Notification not sent":**
- Run `check_notifs.py` - Check if created
- Run `check_users_notifs.py` - Check distribution

**"Content type not available":**
- Run `check_content_types.py` - See all types
- Verify type slug/name correct
