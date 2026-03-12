import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.users.utils.permissions_cache import get_cached_permissions

matches = list(User.objects.filter(email__iexact='Adebayotitilopegrace@gmail.com'))
if not matches:
    print("USER NOT FOUND")
else:
    for u in matches:
        print("=== USER ===")
        print("ID:   ", u.id)
        print("Email:", u.email)
        print("Role: ", u.role)
        print("Active:", u.is_active)
        try:
            from apps.users.models import ModeratorPermission
            mp = ModeratorPermission.objects.get(user=u)
            print("DB permissions:", mp.permissions)
            print("sub_role_label:", repr(mp.sub_role_label))
            print("updated_at:", mp.updated_at)
        except Exception as e:
            print("ModeratorPermission row:", e)
        cached = get_cached_permissions(str(u.id))
        print("Redis cached perms:", cached)
        print("Permission count:", len(cached))
