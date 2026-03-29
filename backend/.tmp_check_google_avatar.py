import django

django.setup()

from apps.users.models import User
u = User.objects.filter(email__iexact='adebayoadenirangideon@gmail.com').first()
if not u:
    print('USER_NOT_FOUND')
else:
    print('EMAIL', u.email)
    print('HAS_PROFILE_PICTURE_FILE', bool(u.profile_picture))
    print('GOOGLE_ID_SET', bool(u.google_id))
    print('GOOGLE_PICTURE_SET', bool((u.google_profile_picture_url or '').strip()))
    print('GOOGLE_PICTURE_URL', (u.google_profile_picture_url or '')[:140])
