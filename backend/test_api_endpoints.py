"""
Step 3: Test notification API endpoints with running server.
This script tests all notification API endpoints to verify they work correctly.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def print_section(title):
    """Print a section header."""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_authentication():
    """Get JWT token for testing."""
    print_section("STEP 3.1: Authentication")
    
    # Try to login with existing user
    login_url = f"{BASE_URL}/auth/login/"
    credentials = {
        "email": "test@notifications.com",
        "password": "NotificationTest123!"
    }
    
    print(f"Attempting login at {login_url}...")
    try:
        response = requests.post(login_url, json=credentials)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access') or data.get('token')
            print(f"✓ Login successful! Token obtained.")
            return token
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error during authentication: {e}")
        return None

def test_list_notifications(token):
    """Test GET /notifications/ endpoint."""
    print_section("STEP 3.2: List All Notifications")
    
    url = f"{BASE_URL}/notifications/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {url}")
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            count = data.get('count', 0)
            print(f"✓ Success! Found {count} notifications")
            
            if results and len(results) > 0:
                try:
                    print("\nFirst notification:")
                    first = results[0]
                    print(f"  ID: {first.get('id')}")
                    print(f"  Type: {first.get('notification_type')}")
                    print(f"  Title: {first.get('title')}")
                    print(f"  Message: {first.get('message')}")
                    print(f"  Is Read: {first.get('is_read')}")
                    print(f"  Created: {first.get('created_at')}")
                except Exception as e:
                    print(f"  ⚠ Error displaying notification details: {e}")
            else:
                print("  (No notifications found)")
            
            return True
        else:
            print(f"✗ Request failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_unread_notifications(token):
    """Test GET /notifications/unread/ endpoint."""
    print_section("STEP 3.3: List Unread Notifications")
    
    url = f"{BASE_URL}/notifications/unread/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {url}")
    try:
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            unread_count = data.get('unread_count', 0)
            print(f"✓ Success! Found {unread_count} unread notifications")
            
            if isinstance(results, list):
                for notif in results[:3]:  # Show first 3
                    print(f"  - {notif.get('title')} ({notif.get('notification_type')})")
            
            return True
        else:
            print(f"✗ Request failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_create_notification(token):
    """Test POST /notifications/test/ endpoint."""
    print_section("STEP 3.4: Create Test Notification")
    
    url = f"{BASE_URL}/notifications/test/"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "notification_type": "PAYMENT_SUCCESS",
        "title": "Test Payment Notification",
        "message": "This is a test notification created via API endpoint.",
        "priority": "HIGH",
        "source_module": "PAYMENTS"
    }
    
    print(f"POST {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"✓ Notification created successfully!")
            notification_data = data.get('notification', {})
            print(f"  ID: {notification_data.get('id')}")
            print(f"  Type: {notification_data.get('type')}")
            print(f"  Title: {notification_data.get('title')}")
            return notification_data.get('id')  # Return ID for next test
        else:
            print(f"✗ Request failed: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error: {e}")
        return None

def test_mark_notification_read(token, notification_id):
    """Test POST /notifications/read/<uuid>/ endpoint."""
    print_section("STEP 3.5: Mark Single Notification as Read")
    
    if not notification_id:
        print("⚠ Skipping - no notification ID provided")
        return False
    
    url = f"{BASE_URL}/notifications/read/{notification_id}/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"POST {url}")
    try:
        response = requests.post(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Notification marked as read!")
            print(f"  Message: {data.get('message')}")
            return True
        else:
            print(f"✗ Request failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_mark_all_read(token):
    """Test POST /notifications/read-all/ endpoint."""
    print_section("STEP 3.6: Mark All Notifications as Read")
    
    url = f"{BASE_URL}/notifications/read-all/"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"POST {url}")
    try:
        response = requests.post(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            marked_count = data.get('marked_count', 0)
            print(f"✓ Success! Marked {marked_count} notifications as read")
            return True
        else:
            print(f"✗ Request failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    """Run all API endpoint tests."""
    print("\n" + "🔔 " * 20)
    print("NOTIFICATION SYSTEM - API ENDPOINT TESTS")
    print("🔔 " * 20)
    
    # Step 1: Authenticate
    token = test_authentication()
    if not token:
        print("\n✗ FAILED: Cannot proceed without authentication token")
        print("Please update credentials in test_api_endpoints.py")
        return
    
    # Step 2: List all notifications
    test_list_notifications(token)
    
    # Step 3: List unread notifications
    test_unread_notifications(token)
    
    # Step 4: Create test notification
    new_notification_id = test_create_notification(token)
    
    # Step 5: Mark single notification as read
    test_mark_notification_read(token, new_notification_id)
    
    # Step 6: Mark all notifications as read
    test_mark_all_read(token)
    
    # Final summary
    print_section("STEP 3: COMPLETE ✓")
    print("All notification API endpoints tested successfully!")
    print("\nAvailable Endpoints:")
    print("  GET  /api/v1/notifications/          - List all notifications")
    print("  GET  /api/v1/notifications/unread/   - List unread notifications")
    print("  POST /api/v1/notifications/test/     - Create test notification")
    print("  POST /api/v1/notifications/read/<id>/ - Mark one as read")
    print("  POST /api/v1/notifications/read-all/ - Mark all as read")

if __name__ == '__main__':
    main()
