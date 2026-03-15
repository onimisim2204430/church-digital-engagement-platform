# Test Scripts Documentation

Complete catalog of test_*.py files. Use this to understand what each test validates before recreation.

**Total Test Files:** 32

---

## PAYMENT & WITHDRAWAL TESTS (11 files)

### test_complete_withdrawal_flow.py
**Purpose:** End-to-end withdrawal flow validation from form to completion

**Tests:**
- Bank account creation with recipient code generation
- Automatic withdrawal approval when account verified (is_verified=True)
- Payout engine processing simulation
- OTP finalization and confirmation flow
- Webhook handling for transfer completion
- Full status transitions: pending → approved → processing → completed

**What to Test in Future:**
1. Bank account creation endpoint returns recipient code
2. Withdrawal auto-approves if is_verified=True
3. Celery task dequeues and initiates Paystack transfer
4. OTP endpoint accepts code and confirms with Paystack
5. Status updates correctly through full cycle

---

### test_paystack_resolve.py
**Purpose:** Account resolution debugging via Paystack `/bank/resolve` API

**Tests:**
- Test multiple bank accounts (UBA 033, Zenith 057, FCMB 001, etc.)
- Account holder name resolution
- Paystack test mode behavior
- Rate limits and daily limits

**What to Test in Future:**
1. Account resolution returns correct account holder name
2. Test mode limitations with different banks (FCMB unlimited, others 3/day)
3. Proper error handling for invalid accounts

---

### test_payment_flow.py
**Purpose:** Complete payment initialization and processing flow

**Tests:**
- POST /payments/initialize/ with email and amount
- Paystack reference generation
- Payment status checking
- Payment completion handling
- Fund transfer to business account

**What to Test in Future:**
1. Payment initialization returns access_code and authorization_url
2. Fund transfer succeeds via Paystack
3. Payment status queryable by reference
4. Webhook updates payment status to completed

---

### test_real_paystack_payment.py
**Purpose:** Real Paystack API integration testing (NOT mocked)

**Tests:**
- Actual Paystack payment initialization
- Real transaction processing
- Live bank transfer simulation (test mode)
- Real webhook callbacks

**What to Test in Future:**
1. Real Paystack secrets configured
2. Payment flow works end-to-end
3. Actual bank transfers succeed in test mode

---

### test_real_otp.py
**Purpose:** Real OTP delivery and confirmation with Paystack

**Tests:**
- OTP delivery via email/SMS
- OTP code confirmation with Paystack API
- Transfer completion after OTP confirmation
- Status updates

**What to Test in Future:**
1. OTP sent to user email
2. OTP validation succeeds with Paystack
3. Withdrawal completes after OTP

---

### test_otp_direct.py
**Purpose:** Direct OTP endpoint testing

**Tests:**
- POST /finalize-otp/ accepts OTP value
- OTP validation against Paystack
- Withdrawal status updates to completed
- Error handling for invalid OTP

**What to Test in Future:**
1. OTP endpoint validates correctly
2. Status changes to completed after valid OTP
3. Invalid OTP returns error

---

### test_admin_payments.py
**Purpose:** Admin payment management endpoints

**Tests:**
- Admin can view all payments
- Admin can approve/reject pending payments
- Payment reconciliation endpoints
- Admin-only access control

**What to Test in Future:**
1. GET /admin/payments/ returns all payments
2. POST /admin/payments/approve/ works
3. Non-admin users cannot access

---

### test_init_direct.py
**Purpose:** Direct payment initialization endpoint testing

**Tests:**
- POST /payments/initialize/ with various amounts
- Response format validation (access_code, authorization_url)
- Paystack reference generation
- Input validation (email, amount)

**What to Test in Future:**
1. Valid initialization succeeds
2. Invalid inputs return proper errors
3. Reference generated consistently

---

### test_failsafe.py
**Purpose:** Error handling and fallback flow validation

**Tests:**
- Invalid user handling
- Failed Paystack responses
- Network timeout recovery
- Graceful degradation
- Fallback mechanisms

**What to Test in Future:**
1. System handles invalid users gracefully
2. Timeout recovery works
3. Fallback paths function correctly
4. No data corrupted on failure

---

### test_bank_account_endpoint.py
**Purpose:** Bank account API endpoint validation

**Tests:**
- POST /withdrawals/bank-accounts/ validation
- Account resolution via Paystack API
- Recipient code creation without bank_name parameter
- Error responses for invalid accounts
- 10-digit account number validation
- 3-digit bank code validation

**What to Test in Future:**
1. Endpoint validates format (10 digits, 3 digits)
2. Paystack resolution called
3. Account holder name auto-resolved
4. Recipient code created or mock code in test mode

---

### test_fcmb_account.py
**Purpose:** FCMB test account verification in Paystack test mode

**Tests:**
- Account resolution for FCMB (code 001)
- Account 0000000000 resolves as "TEST ACCOUNT 0000000000"
- Recipient code creation for test bank
- Handling of test mode (unlimited resolves, no rates limits)

**What to Test in Future:**
1. FCMB account resolution works in test mode
2. No daily rate limit for FCMB
3. Account name resolves correctly

---

## NOTIFICATION TESTS (5 files)

### test_api_endpoints.py
**Purpose:** Complete notification API endpoint validation

**Tests:**
- GET /notifications/ - list all notifications with pagination
- GET /notifications/unread/ - filter unread only
- POST /notifications/test/ - create test notification
- POST /notifications/read/<uuid>/ - mark single as read
- POST /notifications/read-all/ - mark all as read
- JWT authentication flow

**What to Test in Future:**
1. Authentication returns valid JWT token
2. List endpoint returns all notifications
3. Unread endpoint filters correctly
4. Mark read updates is_read field
5. Pagination works correctly
6. Invalid UUID returns 404
7. Proper authentication required

---

### test_notif_api.py
**Purpose:** Notification API response format validation

**Tests:**
- Response schema matches specification
- All required fields present (id, title, message, type, created_at, is_read)
- Timestamp formatting correct (ISO 8601)
- Status codes correct (200, 201, 404, etc.)

**What to Test in Future:**
1. All response fields present
2. Data types correct
3. Timestamps formatted properly

---

### test_api_format.py
**Purpose:** API response format consistency across endpoints

**Tests:**
- Status codes are correct
- Error messages formatted properly
- Data serialization format consistent
- JSON structure validation

**What to Test in Future:**
1. All endpoints use consistent error format
2. Status codes follow REST conventions
3. JSON format consistent

---

### test_notifications_manual.py
**Purpose:** Manual notification system testing

**Tests:**
- Notification creation
- Notification delivery to user
- Email/SMS sending integration
- Notification status

**What to Test in Future:**
1. Create notification works
2. Delivered to correct user
3. Email sent if configured

---

### test_withdrawal_notifications.py
**Purpose:** Withdrawal-specific notification flows

**Tests:**
- Withdrawal success notifications
- Withdrawal failure notifications
- OTP delivery notifications
- Admin alert notifications
- Email template rendering

**What to Test in Future:**
1. Success notifications sent on completion
2. Failure notifications on errors
3. OTP sent before transfer
4. Admin alerted on large amounts

---

## SERIES TESTS (3 files)

### test_series_flow.py
**Purpose:** Complete series publishing flow

**Tests:**
- Series creation with name, description
- Content assignment to series
- Auto-publishing settings applied
- Status transitions
- Series list querying

**What to Test in Future:**
1. Create series endpoint works
2. Content assigned to series
3. Auto-publish triggers correctly
4. Status updates through lifecycle

---

### test_series_api.py
**Purpose:** Series API endpoint validation

**Tests:**
- GET /series/ - list all series with pagination
- POST /series/ - create new series
- PUT /series/<id>/ - update series
- DELETE /series/<id>/ - delete series
- Filtering and sorting

**What to Test in Future:**
1. CRUD operations work
2. Pagination implemented
3. Proper validation on create/update
4. Access control enforced

---

### test_post_series_complete.py & test_post_series.py
**Purpose:** Series content creation flow

**Tests:**
- Create post in series
- Auto-publish settings applied
- Series status update
- Content type assignment
- Status transitions

**What to Test in Future:**
1. Post creation in series works
2. Auto-publish triggered
3. Series marked as having content

---

## EMAIL & COMMUNICATION TESTS (3 files)

### test_email_config.py
**Purpose:** Email provider configuration validation

**Tests:**
- Gmail SMTP connection
- Connection pooling
- Provider fallback mechanism
- Credentials validation
- Timeout handling

**What to Test in Future:**
1. SMTP connection succeeds
2. Credentials passed correctly
3. Fallback provider works if primary fails

---

### test_email_verification.py
**Purpose:** Email verification flow

**Tests:**
- Verification email delivery
- Verification link token generation
- Token validation
- Email status update after verification
- Token expiration

**What to Test in Future:**
1. Verification email sent
2. Token validates correctly
3. User marked verified after successful verification
4. Expired tokens rejected

---

### test_smtp_direct.py
**Purpose:** Raw SMTP connection testing

**Tests:**
- Direct SMTP connection
- Message delivery
- Provider response handling
- Authentication

**What to Test in Future:**
1. SMTP server connection succeeds
2. Email sent successfully
3. Proper error handling on failure

---

## BUDGET & FINANCIAL TESTS (2 files)

### test_budget_api.py & test_budget_api_with_auth.py
**Purpose:** Budget allocation API and enforcement

**Tests:**
- Budget allocation creation
- Budget limit enforcement
- Financial reporting endpoints
- Budget tracking
- Public vs authenticated access

**What to Test in Future:**
1. Create budget allocation works
2. System prevents exceeding budget
3. Reports show accurate totals
4. Access control enforced

---

## CONTENT & DRAFT TESTS (2 files)

### test_daily_word_fix.py
**Purpose:** Daily word/devotional content creation

**Tests:**
- Post creation with devotional content type
- Author assignment
- Content type validation
- Status transitions

**What to Test in Future:**
1. Devotional content type exists
2. Post created with correct type
3. Status transitions work

---

### test_complete_flow.py
**Purpose:** Integrated multi-endpoint API flow

**Tests:**
- Multiple endpoint interactions
- Cross-module data consistency
- Request/response validation
- Transaction handling

**What to Test in Future:**
1. Endpoints work together correctly
2. Data consistency across modules
3. Transactions commit/rollback properly

---

## FILTERING & VISIBILITY TESTS (2 files)

### test_filtering.py
**Purpose:** Query parameter filtering validation

**Tests:**
- Date range filtering
- Status filtering
- Search functionality
- Pagination
- Sort order

**What to Test in Future:**
1. Filters applied correctly
2. Date ranges work
3. Search returns correct results
4. Pagination works

---

### test_reply_visibility.py
**Purpose:** Comment/reply visibility rules

**Tests:**
- Only author can see own private replies
- Public replies visible to all
- Admin override permissions
- Privacy enforcement

**What to Test in Future:**
1. Private replies hidden from others
2. Public replies visible
3. Admin can see all

---

## SECURITY & AUDITING TESTS (2 files)

### test_django_email.py
**Purpose:** Django email configuration validation

**Tests:**
- Email backend configuration
- SMTP host and port
- TLS/SSL settings
- Credentials handling
- Default sender validation

**What to Test in Future:**
1. Configuration loaded correctly
2. SMTP connection works
3. Credentials secure

---

### test_webhook_security.py
**Purpose:** Webhook signature verification and security

**Tests:**
- HMAC signature generation with webhook secret
- Signature validation against Paystack format
- Replay attack prevention
- Webhook payload structure validation
- Duplicate webhook handling
- Timestamp validation

**What to Test in Future:**
1. Signature verification works
2. Invalid signatures rejected
3. Replay attacks prevented
4. Timestamps validated

---

### test_intent_and_audit.py
**Purpose:** Audit log and intent tracking

**Tests:**
- Audit trail creation for actions
- Intent logging
- Audit queryable by date/user/action
- Proper data capture

**What to Test in Future:**
1. Audit entries created
2. Correct user/action logged
3. Timestamps accurate
4. Query functionality works

---

## Test Execution Order (For Recreation)

1. **Foundation:** Create test data first
2. **Basic:** test_api_endpoints.py, test_bank_account_endpoint.py
3. **Payment:** test_payment_flow.py, test_complete_withdrawal_flow.py
4. **Security:** test_webhook_security.py, test_email_verification.py
5. **Advanced:** test_series_flow.py, test_budget_api.py
6. **Integration:** test_complete_flow.py, test_real_paystack_payment.py

---

## Critical Tests (Must Implement First)
- test_complete_withdrawal_flow.py
- test_real_paystack_payment.py
- test_api_endpoints.py
- test_bank_account_endpoint.py
- test_webhook_security.py
- test_email_verification.py

## Test Coverage Summary
- **API/Endpoints:** 15 tests
- **Payment/Withdrawal:** 11 tests
- **Email:** 3 tests
- **Series/Content:** 3 tests
- **Notifications:** 5 tests
- **Budget:** 2 tests
- **Security/Audit:** 2 tests
