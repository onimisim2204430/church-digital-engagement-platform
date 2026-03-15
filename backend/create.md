# Create & Setup Scripts Documentation

Complete catalog of create_*.py and related setup files for test data and configuration.

**Total Create/Setup Files:** 3

---

## Test Data Creation

### create_test_draft.py
**Purpose:** Create test draft with content for testing drafting features

**What it does:**
1. Finds or creates test user (joelsam@church.com)
2. Gets or creates Series PostContentType
3. Creates draft with:
   - Title: "Test Draft"
   - Content: HTML formatted
   - Content type: Series
   - Author: Test user
   - Status: Draft

**Key capabilities:**
- Auto-creates content type if missing
- Handles user not found gracefully
- Creates draft with proper formatting
- Sets timestamps automatically

**When to use:**
- Testing draft auto-save
- Testing draft creation form
- Testing content editor
- Setting up draft data for testing

**How to run:**
```bash
python manage.py shell < create_test_draft.py
```

**What gets created:**
```
✅ Found user: joelsam@church.com (ID: [uuid])
✅ Found Series PostContentType (ID: [uuid])
✅ Created Draft:
    - ID: [uuid]
    - Title: "Test Draft"
    - Status: draft
    - Type: Series
    - Author: joelsam@church.com
```

**Verify after:**
1. Run `check_drafts.py` - See created draft
2. Check draft appears in UI
3. Verify content preserved

---

### create_withdrawal_templates.py
**Purpose:** Create email templates for withdrawal notifications

**What it does:**
Creates withdrawal-related email templates with:
1. **withdrawal_initiated** - Notification when request submitted
   - Shows reference number
   - Shows status waiting for approval
   - Displays account details

2. **withdrawal_approved** - Notification when admin approves
   - Shows approval timestamp
   - Processing information
   - Expected timeline

3. **withdrawal_completed** - Success notification
   - Shows transfer completed
   - Amount transferred and fees
   - Transaction reference
   - Recipient account

4. **withdrawal_failed** - Failure notification
   - Shows failure reason
   - Error details
   - Retry instructions

**Template variables available:**
```
{{ user_first_name }}          - User's first name
{{ withdrawal_reference }}      - Withdrawal reference number
{{ withdrawal_amount }}         - Amount in NGN
{{ bank_name }}                - Bank name
{{ account_number }}           - Bank account (masked)
{{ account_holder }}           - Account holder name
{{ approval_timestamp }}       - When approved
{{ completion_timestamp }}     - When completed
{{ transaction_reference }}    - Paystack reference
{{ failure_reason }}           - Error message
{{ support_email }}            - Support contact
```

**When to use:**
- Setting up notification system
- Before testing withdrawal flow
- Customizing email templates
- Email configuration setup

**How to run:**
```bash
python manage.py shell < create_withdrawal_templates.py
```

**What gets created:**
```
✅ Created withdrawal_initiated template
✅ Created withdrawal_approved template
✅ Created withdrawal_completed template
✅ Created withdrawal_failed template
```

**Verify after:**
1. Check EmailTemplate table in database
2. Templates appear in admin panel
3. Use in withdrawal notifications

---

### create_series_content_type.py
**Purpose:** Create or verify Series PostContentType exists

**What it does:**
1. Checks if Series content type exists
2. Creates it if missing with:
   - Slug: 'series'
   - Name: 'Series'
   - is_system: True
   - Sort order: appropriate position
3. Handles existing type gracefully

**Key settings:**
- System type (not user-created)
- Enabled by default
- Appears in content creation UI
- Used for series content organization

**When to use:**
- Initial setup
- Before creating series
- Ensuring required types exist
- Schema validation

**How to run:**
```bash
python manage.py shell < create_series_content_type.py
```

**What gets created:**
```
✅ Series content type created/verified
   - ID: [uuid]
   - Slug: series
   - Name: Series
   - System: Yes
   - Enabled: Yes
```

**Verify after:**
1. Run `check_content_types.py` - Should show Series
2. Try creating new series
3. Series appears in content type dropdown

---

## Setup Workflow (In Order)

### Initial Environment Setup:
```bash
# 1. Create system content types
python manage.py shell < create_series_content_type.py

# 2. Verify types created
python check_content_types.py

# 3. Create email templates
python manage.py shell < create_withdrawal_templates.py

# 4. Create test data
python manage.py shell < create_test_draft.py

# 5. Verify everything
python check_db_state.py
```

### Pre-Testing Setup:
```bash
# Ensure all foundations in place
python manage.py shell < create_series_content_type.py
python manage.py shell < create_withdrawal_templates.py
python manage.py shell < create_test_draft.py

# Then run tests
python test_complete_withdrawal_flow.py
python test_api_endpoints.py
```

---

## Template Customization

### Email Template Format

Each template has:
- **slug:** Unique identifier (use in code)
- **subject:** Email subject line (can have variables)
- **email_type:** TRANSACTIONAL or MARKETING
- **html_body:** HTML email content
- **text_body:** Plain text fallback (optional)

**Variables format:**
```
{{ variable_name }}
```

**Example subject:**
```
Withdrawal Request Initiated - {{ withdrawal_reference }}
```

**Example HTML body:**
```html
<h2>Withdrawal Request Initiated</h2>
<p>Hello {{ user_first_name }},</p>
<p>Your withdrawal of {{ withdrawal_amount }} NGN has been received.</p>
<p>Reference: {{ withdrawal_reference }}</p>
<p>Status: pending_approval</p>
```

---

## Content Type Properties

When creating content types, consider:
- **slug:** Must be lowercase, no spaces (used in URLs)
- **name:** Display name for admin/UI
- **is_system:** True for hardcoded types, False for user-created
- **sort_order:** Order in dropdowns/lists
- **is_enabled:** Whether available for use

**System Content Types (to create):**
1. Series - For sermon series, study groups
2. Devotional - Daily devotionals (Daily Word)
3. Sermon - Individual sermons
4. Blog - Blog posts
5. Event - Church events
6. Announcement - Important announcements

---

## Troubleshooting Setup

**"User not found" error:**
- Run `check_users.py` - Find correct user email
- Update create_test_draft.py with correct email
- Or create user first in Django admin

**"Content type already exists" error:**
- This is OK - script handles gracefully
- Check with `check_content_types.py`
- No duplication created

**"Database connection error":**
- Verify Django settings configured
- Check database is running
- Verify environment variables

**"Template creation failed":**
- Check for slug conflicts
- Verify email_type is valid
- Check HTML syntax

---

## Quick Setup Command

```bash
# Full setup in one call
python manage.py shell << 'EOF'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Execute all three setup scripts
exec(open('create_series_content_type.py').read())
exec(open('create_withdrawal_templates.py').read())
exec(open('create_test_draft.py').read())

print("\n✅ All setup complete!")
EOF
```

---

## Verification Checklist

After running setup scripts, verify:

- [ ] `check_users.py` - Shows test user exists
- [ ] `check_content_types.py` - Shows Series and other types
- [ ] `check_drafts.py` - Shows test draft created
- [ ] `check_db_state.py` - Overall health good
- [ ] Test withdrawal flow - Templates sent in emails

---

## Data Cleanup (If Needed)

If setup needs to be reset:

```bash
# Delete test draft
python manage.py shell << 'EOF'
from apps.content.models import Draft
Draft.objects.filter(draft_title='Test Draft').delete()
EOF

# Delete templates
python manage.py shell << 'EOF'
from apps.email.models import EmailTemplate
EmailTemplate.objects.filter(slug__startswith='withdrawal_').delete()
EOF

# Content types can't be deleted if used
# Just disable: is_enabled = False
```

---

## Next Steps After Setup

Once setup scripts run successfully:

1. **Run checks** to verify everything
2. **Run tests** to validate functionality
3. **Test UI** to ensure forms work
4. **Check notifications** that emails send
5. **Monitor logs** during first transactions

---

## Integration with Test Scripts

These create scripts set up the environment for test scripts:

```
create_series_content_type.py
        ↓
create_withdrawal_templates.py
        ↓
create_test_draft.py
        ↓
check_*.py (verify)
        ↓
test_*.py (test functionality)
```

Without this foundation, tests will fail with:
- Missing content types
- Missing email templates
- Missing test data
- Configuration issues
