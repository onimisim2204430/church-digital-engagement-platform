"""
Email Configuration Diagnostic and Test Script
Verifies Gmail SMTP configuration and sends a test email
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
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

def print_section(title):
    """Print a section header."""
    print(f"\n{Fore.CYAN}{'='*80}")
    print(f"{Fore.CYAN}{title}")
    print(f"{Fore.CYAN}{'='*80}\n")

def print_config():
    """Display current email configuration."""
    print_section("CURRENT EMAIL CONFIGURATION")
    
    config_items = [
        ('DEBUG', settings.DEBUG),
        ('EMAIL_BACKEND', settings.EMAIL_BACKEND),
        ('EMAIL_HOST', getattr(settings, 'EMAIL_HOST', 'Not set')),
        ('EMAIL_PORT', getattr(settings, 'EMAIL_PORT', 'Not set')),
        ('EMAIL_USE_TLS', getattr(settings, 'EMAIL_USE_TLS', 'Not set')),
        ('EMAIL_HOST_USER', getattr(settings, 'EMAIL_HOST_USER', 'Not set')),
        ('EMAIL_HOST_PASSWORD', '***' + str(getattr(settings, 'EMAIL_HOST_PASSWORD', ''))[-4:] if getattr(settings, 'EMAIL_HOST_PASSWORD', '') else 'Not set'),
        ('DEFAULT_FROM_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', 'Not set')),
    ]
    
    for key, value in config_items:
        status_color = Fore.GREEN if value and value != 'Not set' else Fore.RED
        print(f"{Fore.YELLOW}{key:25} {status_color}{value}")

def validate_config():
    """Validate email configuration completeness."""
    print_section("CONFIGURATION VALIDATION")
    
    # Check if using console backend
    if 'console' in settings.EMAIL_BACKEND.lower():
        print(f"{Fore.YELLOW}[WARNING] Using console backend - emails will print to terminal, not send")
        print(f"{Fore.YELLOW}          This is for DEVELOPMENT only")
        return False
    
    # Check required fields for SMTP
    required_fields = {
        'EMAIL_HOST': getattr(settings, 'EMAIL_HOST', None),
        'EMAIL_PORT': getattr(settings, 'EMAIL_PORT', None),
        'EMAIL_HOST_USER': getattr(settings, 'EMAIL_HOST_USER', None),
        'EMAIL_HOST_PASSWORD': getattr(settings, 'EMAIL_HOST_PASSWORD', None),
        'DEFAULT_FROM_EMAIL': getattr(settings, 'DEFAULT_FROM_EMAIL', None),
    }
    
    all_valid = True
    for field, value in required_fields.items():
        if not value or value == 'Not set':
            print(f"{Fore.RED}[MISSING] {field}")
            all_valid = False
        else:
            print(f"{Fore.GREEN}[OK] {field}")
    
    return all_valid

def send_test_email(recipient):
    """Send a test email."""
    print_section("SENDING TEST EMAIL")
    
    try:
        print(f"Sending test email to {Fore.CYAN}{recipient}{Style.RESET_ALL}...")
        
        send_mail(
            subject='Church Platform - Email Configuration Test',
            message='This is a test email from your Church Digital Engagement Platform.\n\n'
                    'If you receive this email, your email configuration is working correctly.\n\n'
                    'Email verification system is now PRODUCTION READY.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        
        print(f"\n{Fore.GREEN}[SUCCESS] Test email sent successfully")
        print(f"{Fore.GREEN}Check {recipient} inbox (including spam folder)")
        return True
        
    except Exception as e:
        print(f"\n{Fore.RED}[ERROR] Failed to send test email")
        print(f"{Fore.RED}Error: {str(e)}")
        print(f"\n{Fore.YELLOW}Common Issues:")
        print(f"{Fore.YELLOW}  1. Invalid Gmail App Password (use 16-char app password, not login password)")
        print(f"{Fore.YELLOW}  2. 2-Step Verification not enabled on Gmail account")
        print(f"{Fore.YELLOW}  3. Less secure app access disabled")
        print(f"{Fore.YELLOW}  4. Incorrect email/password environment variables")
        print(f"{Fore.YELLOW}  5. Network/firewall blocking SMTP connection")
        return False

def main():
    """Run email configuration diagnostic and test."""
    print(f"\n{Fore.GREEN}{Style.BRIGHT}CHURCH PLATFORM - EMAIL CONFIGURATION TEST")
    
    # Display configuration
    print_config()
    
    # Validate configuration
    is_valid = validate_config()
    
    if not is_valid:
        print(f"\n{Fore.RED}[ERROR] Email configuration incomplete")
        print(f"\n{Fore.YELLOW}To configure Gmail SMTP:")
        print(f"{Fore.YELLOW}  1. Create Gmail App Password:")
        print(f"{Fore.YELLOW}     https://myaccount.google.com/apppasswords")
        print(f"{Fore.YELLOW}  2. Set environment variables:")
        print(f"{Fore.CYAN}     $env:EMAIL_HOST_USER = 'your-email@gmail.com'")
        print(f"{Fore.CYAN}     $env:EMAIL_HOST_PASSWORD = 'your-16-char-app-password'")
        print(f"{Fore.CYAN}     $env:EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'")
        print(f"{Fore.YELLOW}  3. Restart Django server")
        print(f"{Fore.YELLOW}  4. Run this script again")
        return
    
    # Ask for test email recipient
    print_section("TEST EMAIL SEND")
    recipient = input(f"{Fore.YELLOW}Enter your email address to receive test email: {Fore.CYAN}")
    
    if not recipient or '@' not in recipient:
        print(f"{Fore.RED}Invalid email address")
        return
    
    # Send test email
    success = send_test_email(recipient)
    
    if success:
        print_section("PRODUCTION READINESS STATUS")
        print(f"{Fore.GREEN}[READY] Email verification system is PRODUCTION READY")
        print(f"{Fore.GREEN}        Users will receive REAL emails with verification links")
        print(f"{Fore.GREEN}        Email delivery configured through Gmail SMTP")
    else:
        print_section("PRODUCTION READINESS STATUS")
        print(f"{Fore.RED}[NOT READY] Email configuration needs fixing")
        print(f"{Fore.YELLOW}            Complete Gmail App Password setup and try again")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Fore.YELLOW}Test cancelled by user")
    except Exception as e:
        print(f"\n{Fore.RED}[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
