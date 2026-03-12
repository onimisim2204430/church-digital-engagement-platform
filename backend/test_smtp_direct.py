"""
Direct SMTP Test - Bypasses Django settings to test raw SMTP connection
Run this to verify your Gmail SMTP credentials work at the network level
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def test_smtp_connection():
    """Test SMTP connection directly without Django"""
    
    # SMTP Configuration
    SMTP_HOST = 'smtp.gmail.com'
    SMTP_PORT = 587
    SMTP_USER = 'www.heavresearcher.247@gmail.com'
    SMTP_PASSWORD = 'rmcepvmmdrbdtprl'  # Your app password
    
    print("\n" + "="*80)
    print("DIRECT SMTP CONNECTION TEST")
    print("="*80)
    print(f"Host: {SMTP_HOST}")
    print(f"Port: {SMTP_PORT}")
    print(f"User: {SMTP_USER}")
    print(f"Password: {'*' * 12}{SMTP_PASSWORD[-4:]}")
    print("="*80 + "\n")
    
    try:
        print("[1/5] Creating SMTP connection...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        print("[SUCCESS] SMTP connection created")
        
        print("[2/5] Starting TLS encryption...")
        server.starttls()
        print("[SUCCESS] TLS encryption started")
        
        print("[3/5] Logging in to Gmail...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print("[SUCCESS] Authentication successful")
        
        print("[4/5] Preparing test email...")
        recipient = input("Enter recipient email address: ")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Direct SMTP Test - Church Platform'
        msg['From'] = f'Church Digital Platform <{SMTP_USER}>'
        msg['To'] = recipient
        
        # Email body
        text = """
This is a direct SMTP test email.

If you receive this, your Gmail SMTP credentials are working correctly.

The issue is with Django's email configuration, not your SMTP credentials.

Test Details:
- Host: smtp.gmail.com
- Port: 587
- TLS: Enabled
- Authentication: Successful
"""
        
        html = """
<html>
<body>
<h2>Direct SMTP Test - Success</h2>
<p>If you receive this, your Gmail SMTP credentials are <strong>working correctly</strong>.</p>
<p>The issue is with Django's email configuration, not your SMTP credentials.</p>
<h3>Test Details:</h3>
<ul>
<li>Host: smtp.gmail.com</li>
<li>Port: 587</li>
<li>TLS: Enabled</li>
<li>Authentication: Successful</li>
</ul>
</body>
</html>
"""
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        print("[5/5] Sending email...")
        server.send_message(msg)
        print("[SUCCESS] Email sent successfully")
        
        print("\n" + "="*80)
        print("[RESULT] SMTP TEST PASSED")
        print(f"Check inbox: {recipient}")
        print("="*80 + "\n")
        
        server.quit()
        print("[CLEANUP] SMTP connection closed")
        
        print("\n[CONCLUSION]")
        print("Your Gmail SMTP credentials are working.")
        print("The problem is Django is not using these credentials.")
        print("Check Django settings.py EMAIL_BACKEND configuration.")
        
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n[ERROR] Authentication failed")
        print(f"Error: {e}")
        print("\n[TROUBLESHOOTING]")
        print("1. Verify your Gmail App Password is correct (16 characters)")
        print("2. Ensure 2-Step Verification is enabled on your Google Account")
        print("3. Try generating a new App Password")
        return False
        
    except smtplib.SMTPException as e:
        print(f"\n[ERROR] SMTP error occurred")
        print(f"Error: {e}")
        print("\n[TROUBLESHOOTING]")
        print("1. Check your internet connection")
        print("2. Verify firewall allows outbound connections on port 587")
        print("3. Try using port 465 with SSL instead of TLS")
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected error")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("\nDirect SMTP Connection Test")
    print("This bypasses Django to test your SMTP credentials\n")
    
    try:
        test_smtp_connection()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
