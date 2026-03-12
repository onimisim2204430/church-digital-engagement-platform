import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import authenticate
from apps.users.models import User, UserRole
from apps.users.utils.permissions_cache import get_cached_permissions

print("=" * 60)
print("ALL ADMIN/MODERATOR USERS IN DB")
print("=" * 60)

users = User.objects.filter(role__in=['ADMIN', 'MODERATOR']).order_by('role', 'email')
for u in users:
    perms = get_cached_permissions(str(u.id))
    print(f"\n  Email  : {u.email}")
    print(f"  Role   : {u.role}")
    print(f"  Active : {u.is_active}")
    print(f"  Perms  : {len(perms)} codes → {perms}")

print("\n" + "=" * 60)
print("SIMULATING admin-auth/login/ GATE CHECK")
print("=" * 60)
ALLOWED_ROLES = (UserRole.ADMIN, UserRole.MODERATOR)
for u in users:
    gate = "PASS ✓" if u.role in ALLOWED_ROLES else "BLOCKED ✗ (gets 403)"
    print(f"  {u.email:<40} role={u.role:<12} → {gate}")

print("\n" + "=" * 60)
print("CHECKING admin_auth_views.py FILE ON DISK")
print("=" * 60)
import pathlib
path = pathlib.Path(__file__).parent / 'apps/users/admin_auth_views.py'
content = path.read_text()
# Show the role-check block
start = content.find('# Only ADMIN')
if start == -1:
    start = content.find('user.role != UserRole.ADMIN')
    print("  BUG STILL IN FILE: still rejects MODERATOR!")
    print("  Context:", content[max(0,start-30):start+80])
else:
    print("  FIX IS IN FILE: allows ADMIN and MODERATOR ✓")
    print("  Context:", content[start:start+120])
