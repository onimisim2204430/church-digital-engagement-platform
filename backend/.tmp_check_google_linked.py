import django

django.setup()

from apps.users.models import User
qs = User.objects.filter(google_id__isnull=False).exclude(google_id='').order_by('-date_joined')[:10]
print('GOOGLE_LINKED_COUNT', qs.count())
for u in qs:
    print('USER', u.email, 'GOOGLE_PIC', bool((u.google_profile_picture_url or '').strip()), 'PROFILE_FILE', bool(u.profile_picture))
