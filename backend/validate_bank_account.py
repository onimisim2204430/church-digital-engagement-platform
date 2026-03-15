#!/usr/bin/env python
"""
Validate bank codes and account numbers with Paystack API.
Run from backend directory: python validate_bank_account.py
"""
import os
import sys
import django
import requests
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from apps.payouts.models import BankAccount


def get_paystack_banks():
    """Fetch list of valid banks from Paystack"""
    print("\n" + "="*80)
    print("FETCHING VALID BANKS FROM PAYSTACK")
    print("="*80 + "\n")
    
    secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
    if not secret_key:
        print("❌ PAYSTACK_SECRET_KEY not configured in .env")
        return None
    
    try:
        response = requests.get(
            'https://api.paystack.co/bank',
            headers={'Authorization': f'Bearer {secret_key}'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status'):
                banks = data.get('data', [])
                print(f"✓ Retrieved {len(banks)} banks from Paystack\n")
                return banks
            else:
                print(f"❌ Paystack returned error: {data.get('message')}")
                return None
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return None
    except requests.exceptions.Timeout:
        print("❌ Timeout connecting to Paystack API (SSL handshake issue?)")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def validate_account_with_paystack(account_number, bank_code):
    """Validate account number and bank code combination"""
    print("\n" + "="*80)
    print("VALIDATING ACCOUNT WITH PAYSTACK")
    print("="*80 + "\n")
    
    secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
    if not secret_key:
        print("❌ PAYSTACK_SECRET_KEY not configured")
        return None
    
    print(f"Account: {account_number[-4:]}... (last 4 digits)")
    print(f"Bank Code: {bank_code}\n")
    
    try:
        response = requests.get(
            'https://api.paystack.co/bank/resolve',
            params={'account_number': account_number, 'bank_code': bank_code},
            headers={'Authorization': f'Bearer {secret_key}'},
            timeout=10
        )
        
        data = response.json()
        
        if response.status_code == 200 and data.get('status'):
            account_name = data.get('data', {}).get('account_name', 'Unknown')
            print(f"✓ VALID")
            print(f"  Account Name: {account_name}")
            return True
        else:
            message = data.get('message', 'Invalid account')
            print(f"❌ INVALID")
            print(f"  Error: {message}")
            return False
    except requests.exceptions.Timeout:
        print("❌ Timeout (SSL handshake issue)")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def show_accounts_requiring_validation():
    """Show all bank accounts and their validation status"""
    print("\n" + "="*80)
    print("ACCOUNTS IN SYSTEM REQUIRING VALIDATION")
    print("="*80 + "\n")
    
    accounts = BankAccount.objects.all()
    
    if not accounts.exists():
        print("No accounts found")
        return
    
    for i, acc in enumerate(accounts, 1):
        print(f"\n[{i}] {acc.account_name}")
        print(f"    Account: {acc.account_number[-4:]}...")
        print(f"    Bank Code: {acc.bank_code}")
        print(f"    Created: {acc.created_at.strftime('%Y-%m-%d')}")
        
        # Check if validation would help
        if not acc.recipient_code:
            print(f"    ⚠️  No recipient code - needs validation/creation")
            print(f"    → Would you like to validate this? (Run manual test above)")


def show_top_banks():
    """Display the most commonly used Nigerian banks"""
    print("\n" + "="*80)
    print("COMMON NIGERIAN BANKS (Test Bank Codes)")
    print("="*80 + "\n")
    
    banks = {
        '011': 'First Bank Nigeria',
        '033': 'United Bank for Africa (UBA)',
        '044': 'Access Bank',
        '050': 'Ecobank Nigeria',
        '057': 'Zenith Bank',
        '058': 'Guaranty Trust Bank (GTBank)',
        '070': 'Fidelity Bank',
        '101': 'Providus Bank',
        '102': 'Wema Bank',
        '103': 'Jaiz Bank',
        '104': 'Stanbic IBTC Bank',
        '105': 'Rand Merchant Bank',
        '106': 'Standard Chartered Bank',
        '107': 'FCMB Group',
        '108': 'Safaricom Bank',
        '109': 'Union Bank of Nigeria',
        '110': 'Co-operative Bank',
        '111': 'Sterling Bank',
        '999991': 'Baobab Microfinance Bank',
    }
    
    for code, name in sorted(banks.items()):
        print(f"{code}: {name}")


if __name__ == '__main__':
    print("\n🏦 PAYSTACK BANK & ACCOUNT VALIDATOR\n")
    
    # Get banks from Paystack
    banks = get_paystack_banks()
    
    if banks:
        print("Sample Banks from Paystack:")
        for bank in banks[:10]:
            print(f"  • {bank.get('code')}: {bank.get('name')}")
        print(f"  ... and {len(banks)-10} more")
    else:
        print("Could not fetch banks from Paystack (see error above)")
        show_top_banks()
    
    # Show accounts in system
    show_accounts_requiring_validation()
    
    # Manual validation example
    print("\n" + "="*80)
    print("MANUAL VALIDATION EXAMPLE")
    print("="*80)
    print("""
To validate a specific account before making a withdrawal, run in the shell:

$ python manage.py shell
>>> from apps.payouts.services import PaystackService
>>> ps = PaystackService()
>>> result = ps.create_transfer_recipient(
...     name="Adebayo Gideon",
...     account_number="0000000001",  # Use the actual test account
...     bank_code="058",              # GTBank for test
...     currency="NGN"
... )
>>> print(result)

If this fails with "Cannot resolve account":
- The account number doesn't exist at that bank
- Or the bank code doesn't match the account

Solution: 
1. Verify the account number is correct (NUBAN = 10 digits)
2. Verify the bank code is correct (call Paystack API or use list above)
3. Use a different test account
""")
