"""
Save as:
  apps/payouts/management/commands/test_withdrawal_otp.py

Run:
  python manage.py test_withdrawal_otp
  python manage.py test_withdrawal_otp --amount 500
"""

import time
import requests
import json
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

from apps.payouts.models import BankAccount, WithdrawalRequest, PayoutTransaction
from apps.payouts.services.payout_engine import PayoutEngine
from apps.users.models import UserRole

User = get_user_model()

PAYSTACK_BASE = "https://api.paystack.co"


class Command(BaseCommand):
    help = "Synchronous Paystack withdrawal test with OTP — full debug output."

    def add_arguments(self, parser):
        parser.add_argument("--amount", type=float, default=1000.0)

    # ------------------------------------------------------------------ helpers
    def _headers(self, secret):
        return {
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
        }

    def _dump(self, label, data):
        """Print a clearly labelled JSON block so nothing is hidden."""
        self.stdout.write(f"\n{'─'*60}")
        self.stdout.write(self.style.WARNING(f"  {label}"))
        self.stdout.write(f"{'─'*60}")
        self.stdout.write(json.dumps(data, indent=2, default=str))
        self.stdout.write(f"{'─'*60}\n")

    # ------------------------------------------------------------------ handle
    def handle(self, *args, **options):

        # ── 0. Validate key ───────────────────────────────────────────────────
        secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
        if not secret:
            self.stdout.write(self.style.ERROR("PAYSTACK_SECRET_KEY not set in .env / settings."))
            return

        mode = "TEST" if secret.startswith("sk_test_") else "LIVE ⚠"
        self.stdout.write(self.style.SUCCESS(f"\nPaystack mode : {mode}"))
        self.stdout.write(f"Key prefix    : {secret[:12]}...{secret[-4:]}\n")

        amount = Decimal(str(options["amount"]))
        headers = self._headers(secret)

        # ── 1. User ───────────────────────────────────────────────────────────
        user, created = User.objects.get_or_create(
            email="withdraw-test@example.com",
            defaults={
                "first_name": "Withdraw",
                "last_name": "Test",
                "role": UserRole.MEMBER,
                "is_active": True,
            },
        )
        self.stdout.write(f"User  : {user.email}  ({'new' if created else 'existing'})")

        # ── 2. Bank account ───────────────────────────────────────────────────
        bank_account, created = BankAccount.objects.get_or_create(
            user=user,
            account_number="0000000000",
            bank_code="057",   # Zenith — change if needed
            defaults={
                "account_name": "Test User",
                "bank_name": "Zenith Bank",
                "is_verified": True,
            },
        )
        self.stdout.write(f"Bank  : {bank_account}  ({'new' if created else 'existing'})")
        self.stdout.write(
            f"  recipient_code on file: {bank_account.recipient_code or 'none — will be created'}"
        )

        # ── 3. WithdrawalRequest ──────────────────────────────────────────────
        withdrawal = WithdrawalRequest.objects.create(
            user=user,
            bank_account=bank_account,
            amount=amount,
            currency="NGN",
            status="approved",
        )
        self.stdout.write(self.style.SUCCESS(
            f"\nWithdrawal : {withdrawal.reference}  (ID: {withdrawal.id})"
        ))
        self.stdout.write(f"Amount     : {withdrawal.amount} NGN")

        # ── 4. Run engine synchronously ───────────────────────────────────────
        self.stdout.write(self.style.WARNING(
            "\nRunning PayoutEngine.process_withdrawal() synchronously…"
        ))
        engine = PayoutEngine()
        result = engine.process_withdrawal(withdrawal)
        self._dump("Engine result", result)

        withdrawal.refresh_from_db()
        self.stdout.write(f"DB status after engine : {withdrawal.status}")

        # ── 5. Detect OTP requirement ─────────────────────────────────────────
        otp_needed = (
            withdrawal.status == "otp_required"
            or result.get("otp_required")
        )

        if not otp_needed:
            # Transfer either completed without OTP or failed — show result and exit
            self._show_final(withdrawal)
            return

        # ── 6. Get transfer_code from PayoutTransaction ───────────────────────
        try:
            tx = PayoutTransaction.objects.get(withdrawal=withdrawal)
        except PayoutTransaction.DoesNotExist:
            self.stdout.write(self.style.ERROR(
                "OTP required but NO PayoutTransaction record found. "
                "Check payout_engine.py — it must create the transaction BEFORE returning otp_required."
            ))
            return

        transfer_code = tx.paystack_transfer_code
        if not transfer_code:
            self.stdout.write(self.style.ERROR(
                "PayoutTransaction exists but paystack_transfer_code is empty. "
                "Engine must save the transfer_code from Paystack's initiate response."
            ))
            self._dump("PayoutTransaction payload", tx.response_payload or {})
            return

        self.stdout.write(self.style.SUCCESS(f"\nTransfer code : {transfer_code}"))
        self.stdout.write(self.style.WARNING(
            "Paystack sent you an OTP (email or SMS). Enter it below."
        ))

        # ── 7. OTP input ──────────────────────────────────────────────────────
        otp = input("\n>>> Enter OTP from Paystack: ").strip()
        if not otp:
            self.stdout.write(self.style.ERROR("Empty OTP — aborting."))
            return

        # ── 8. Call Paystack finalize_transfer ────────────────────────────────
        self.stdout.write(self.style.WARNING("\nSending OTP to Paystack finalize endpoint…"))
        finalize_url = f"{PAYSTACK_BASE}/transfer/finalize_transfer"
        finalize_payload = {"transfer_code": transfer_code, "otp": otp}

        try:
            resp = requests.post(
                finalize_url, json=finalize_payload, headers=headers, timeout=20
            )
            try:
                finalize_data = resp.json()
            except ValueError:
                finalize_data = {
                    "status": False,
                    "message": "Non-JSON response from Paystack",
                    "raw": resp.text[:500],
                }
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Network error during finalize: {e}"))
            return

        self._dump(f"Paystack finalize response  (HTTP {resp.status_code})", finalize_data)

        # Save finalize payload regardless of outcome
        tx.response_payload = tx.response_payload or {}
        tx.response_payload["finalize_response"] = finalize_data
        tx.save(update_fields=["response_payload"])

        if not finalize_data.get("status"):
            msg = finalize_data.get("message", "Paystack rejected OTP — see dump above.")
            withdrawal.status = "failed"
            withdrawal.failure_reason = f"Finalize failed: {msg}"
            withdrawal.processed_at = timezone.now()
            withdrawal.save(update_fields=["status", "failure_reason", "processed_at", "updated_at"])
            self.stdout.write(self.style.ERROR(f"\nFinalize failed: {msg}"))
            return

        self.stdout.write(self.style.SUCCESS("OTP accepted by Paystack. Polling for final status…"))

        # ── 9. Poll verify endpoint (up to 60 s) ─────────────────────────────
        verify_url = f"{PAYSTACK_BASE}/transfer/verify/{withdrawal.reference}"
        max_wait   = 60
        poll_secs  = 3
        elapsed    = 0
        final_ps_status = None
        last_verify_data = {}

        while elapsed < max_wait:
            time.sleep(poll_secs)
            elapsed += poll_secs

            try:
                vresp = requests.get(verify_url, headers=headers, timeout=10)
                try:
                    vdata = vresp.json()
                except ValueError:
                    vdata = {"status": False, "message": "Non-JSON verify response"}
            except requests.RequestException as e:
                vdata = {"status": False, "message": str(e)}

            last_verify_data = vdata
            ps_status = vdata.get("data", {}).get("status", "unknown")
            self.stdout.write(f"  [{elapsed:>3}s] Paystack transfer status: {ps_status}")

            if ps_status in ("success", "failed", "reversed"):
                final_ps_status = ps_status
                break

        # Save verify dump
        tx.response_payload = tx.response_payload or {}
        tx.response_payload["verify_response"] = last_verify_data
        tx.save(update_fields=["response_payload"])

        self._dump("Paystack verify (final snapshot)", last_verify_data)

        # ── 10. Update local DB ───────────────────────────────────────────────
        if final_ps_status == "success":
            withdrawal.status = "completed"
            withdrawal.processed_at = timezone.now()
            withdrawal.failure_reason = ""
            withdrawal.save(update_fields=["status", "processed_at", "failure_reason", "updated_at"])
            tx.status = "success"
            tx.save(update_fields=["status"])
            self.stdout.write(self.style.SUCCESS("\n✓ Withdrawal COMPLETED — check your Paystack dashboard."))
            self.stdout.write(f"  Local transaction ID : {tx.id}")
            self.stdout.write(f"  Transfer code        : {tx.paystack_transfer_code}")
            self.stdout.write(f"  Reference            : {withdrawal.reference}")
            self.stdout.write("  Dashboard → https://dashboard.paystack.com/#/transfers\n")

        elif final_ps_status in ("failed", "reversed"):
            reason = last_verify_data.get("data", {}).get("reason", "See verify dump above.")
            withdrawal.status = "failed"
            withdrawal.failure_reason = f"Paystack: {reason}"
            withdrawal.processed_at = timezone.now()
            withdrawal.save(update_fields=["status", "failure_reason", "processed_at", "updated_at"])
            tx.status = "failed"
            tx.save(update_fields=["status"])
            self.stdout.write(self.style.ERROR(f"\n✗ Transfer {final_ps_status}: {reason}"))

        else:
            # Still pending after 60 s — Paystack sometimes takes longer
            withdrawal.status = "processing"
            withdrawal.save(update_fields=["status", "updated_at"])
            self.stdout.write(self.style.WARNING(
                "\n⚠ Verify timed out (60 s). Transfer is still pending on Paystack side.\n"
                "  This is normal for some banks — check the Paystack dashboard in a few minutes.\n"
                "  Your webhook handler will update the DB when Paystack sends the callback."
            ))

        self._show_final(withdrawal)

    # ------------------------------------------------------------------ utils
    def _show_final(self, withdrawal):
        withdrawal.refresh_from_db()
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  FINAL LOCAL STATUS : {withdrawal.status.upper()}")
        self.stdout.write(f"{'='*60}\n")