import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User, ModeratorPermission
from apps.users.utils.permissions_cache import set_cached_permissions
from apps.users.permission_codes import SUB_ROLE_TEMPLATES

EMAIL = 'Adebayotitilopegrace@gmail.com'
TEMPLATE_KEY = 'community'
template = SUB_ROLE_TEMPLATES[TEMPLATE_KEY]

try:
    user = User.objects.get(email__iexact=EMAIL)
except User.DoesNotExist:
    print(f"ERROR: User '{EMAIL}' not found.")
    exit(1)

print(f"Before: role={user.role}")

# 1. Demote role
user.role = 'MODERATOR'
user.save(update_fields=['role'])
print(f"After:  role={user.role}  ✓ demoted")

# 2. Create / update ModeratorPermission row
codes = template['codes']
mp, created = ModeratorPermission.objects.update_or_create(
    user=user,
    defaults={
        'permissions': codes,
        'sub_role_label': template['label'],
    }
)
action = 'created' if created else 'updated'
print(f"ModeratorPermission {action}: {codes}")
print(f"sub_role_label: {mp.sub_role_label}")

# 3. Bust Redis cache so next API call reflects new perms
set_cached_permissions(str(user.id), codes)
print(f"Redis cache updated with {len(codes)} permissions")

print("\n=== DONE ===")
print(f"  User  : {user.email}")
print(f"  Role  : {user.role}")
print(f"  Perms : {codes}")
print(f"\nAsk {EMAIL} to log out and log back in so their JWT is refreshed.")
