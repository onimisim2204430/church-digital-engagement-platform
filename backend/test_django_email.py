"""
Django Email Configuration Test
Tests Django's email configuration as loaded from settings.py
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail

def test_django_email():
    """Test Django email configuration"""
    
    print("\n" + "="*80)
    print("DJANGO EMAIL CONFIGURATION TEST")
    print("="*80 + "\n")
    
    # Display configuration
    print("[CONFIGURATION]")
    config_items = [
        ('EMAIL_BACKEND', settings.EMAIL_BACKEND),
        ('EMAIL_HOST', getattr(settings, 'EMAIL_HOST', 'NOT SET')),
        ('EMAIL_PORT', getattr(settings, 'EMAIL_PORT', 'NOT SET')),
        ('EMAIL_USE_TLS', getattr(settings, 'EMAIL_USE_TLS', 'NOT SET')),
        ('EMAIL_HOST_USER', getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')),
        ('EMAIL_HOST_PASSWORD', '***' + str(getattr(settings, 'EMAIL_HOST_PASSWORD', ''))[-4:] if getattr(settings, 'EMAIL_HOST_PASSWORD', '') else 'NOT SET'),
        ('DEFAULT_FROM_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', 'NOT SET')),
    ]
    
    for key, value in config_items:
        print(f"  {key:25} {value}")
    
    print("\n" + "="*80 + "\n")
    
    # Check backend type
    if 'console' in settings.EMAIL_BACKEND.lower():
        print("[WARNING] EMAIL_BACKEND is set to console backend")
        print("Emails will be printed to terminal, NOT actually sent")
        print("\nTo fix:")
        print("1. Set EMAIL_BACKEND environment variable to:")
        print("   django.core.mail.backends.smtp.EmailBackend")
        print("2. Or update settings.py directly")
        print("\n" + "="*80 + "\n")
        return False
    
    # Validate SMTP configuration
    required_fields = ['EMAIL_HOST', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD']
    missing_fields = []
    
    for field in required_fields:
        value = getattr(settings, field, None)
        if not value or value == 'NOT SET':
            missing_fields.append(field)
    
    if missing_fields:
        print("[ERROR] Missing required fields:")
        for field in missing_fields:
            print(f"  - {field}")
        print("\n" + "="*80 + "\n")
        return False
    
    # Send test email
    print("[TEST] Sending test email via Django...")
    recipient = input("Enter recipient email address: ")
    
    try:
        result = send_mail(
            subject='Django Email Test - Church Platform',
            message='This email was sent using Django email configuration.\n\n'
                    'If you receive this, Django is correctly configured to send emails.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            html_message='<html><body>'
                        '<h2>Django Email Test - Success</h2>'
                        '<p>If you receive this, Django is <strong>correctly configured</strong> to send emails.</p>'
                        '<p>Your email verification system should work when you click the button.</p>'
                        '</body></html>',
            fail_silently=False,
        )
        
        print(f"\n[SUCCESS] Django send_mail() returned: {result}")
        print(f"Check inbox: {recipient}")
        print("\n[CONCLUSION]")
        print("Django email is configured correctly.")
        print("Email verification button should work now.")
        print("\n" + "="*80 + "\n")
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Failed to send email via Django")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {e}")
        print("\n[TROUBLESHOOTING]")
        print("1. Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are correct")
        print("2. Check that EMAIL_BACKEND is set to smtp.EmailBackend")
        print("3. Ensure environment variables are loaded correctly")
        print("\n" + "="*80 + "\n")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    try:
        test_django_email()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
