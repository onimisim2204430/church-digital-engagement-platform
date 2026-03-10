import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import urllib.request, json, urllib.error
from django.contrib.auth import authenticate
from apps.users.models import User, UserRole
from apps.users.utils.permissions_cache import get_cached_permissions

EMAIL = 'Adebayotitilopegrace@gmail.com'
print("=" * 60)
print(f"DEEP TRACE FOR: {EMAIL}")
print("=" * 60)

# 1. Does the user exist?
try:
    u = User.objects.get(email__iexact=EMAIL)
    print(f"\n[1] USER EXISTS: {u.email}")
    print(f"    id         : {u.id}")
    print(f"    role       : {u.role}")
    print(f"    is_active  : {u.is_active}")
    print(f"    is_staff   : {u.is_staff}")
    print(f"    has_usable_pass: {u.has_usable_password()}")
except User.DoesNotExist:
    print("\n[1] USER NOT FOUND IN DB")
    exit(1)

# 2. Check ModeratorPermission row
try:
    from apps.users.models import ModeratorPermission
    mp = ModeratorPermission.objects.get(user=u)
    print(f"\n[2] MODERATOR PERMISSION ROW:")
    print(f"    sub_role_label : {repr(mp.sub_role_label)}")
    print(f"    permissions    : {mp.permissions}")
except Exception as e:
    print(f"\n[2] NO ModeratorPermission ROW: {e}")

# 3. Redis cache
cached = get_cached_permissions(str(u.id))
print(f"\n[3] REDIS CACHED PERMS: {cached}")
print(f"    count: {len(cached)}")

# 4. Simulate the exact authenticate() call Django uses
# Note: we can't test with real password here, but we can test the role gate
print(f"\n[4] ROLE GATE CHECK:")
ALLOWED = (UserRole.ADMIN, UserRole.MODERATOR)
if u.role in ALLOWED:
    print(f"    PASS ✓ — role '{u.role}' is in {ALLOWED}")
else:
    print(f"    BLOCKED ✗ — role '{u.role}' would get 403")

# 5. Now hit the actual HTTP endpoint
print(f"\n[5] LIVE HTTP TEST → POST /api/v1/admin-auth/login/")
print(f"    (using a dummy password to test the gate, not the auth)")
for test_email in [EMAIL, EMAIL.lower()]:
    payload = json.dumps({"email": test_email, "password": "WRONG_PASSWORD_JUST_TESTING_GATE"}).encode()
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/admin-auth/login/",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read())
            print(f"    [{test_email}] → HTTP {resp.status}: {body}")
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        print(f"    [{test_email}] → HTTP {e.code}: {body}")
    except Exception as ex:
        print(f"    [{test_email}] → ERROR: {ex}")

# 6. Check the actual file for the role gate
print(f"\n[6] CHECKING admin_auth_views.py ROLE GATE ON DISK:")
import pathlib
path = pathlib.Path(__file__).parent / 'apps/users/admin_auth_views.py'
content = path.read_text()
if "user.role not in (UserRole.ADMIN, UserRole.MODERATOR)" in content:
    print("    ✓ Fix is present — ADMIN and MODERATOR are both allowed")
elif "user.role != UserRole.ADMIN" in content:
    print("    ✗ OLD BUG STILL PRESENT — only ADMIN allowed, MODERATOR blocked!")
else:
    print("    ? Unexpected content in role gate")
    idx = content.find("role")
    print("    Context:", content[max(0,idx-20):idx+100])

# 7. Check for Python/module caching issues
print(f"\n[7] CHECKING IF DJANGO PROCESS HAS RELOADED THE FILE:")
from apps.users import admin_auth_views
import inspect
src = inspect.getsource(admin_auth_views.AdminLoginView.post)
if "not in (UserRole.ADMIN, UserRole.MODERATOR)" in src:
    print("    ✓ Loaded module has the fix")
elif "!= UserRole.ADMIN" in src:
    print("    ✗ Loaded module still has OLD code — server needs restart!")
else:
    print("    ? Module source:", src[src.find("role"):src.find("role")+120])

print("\n" + "=" * 60)
