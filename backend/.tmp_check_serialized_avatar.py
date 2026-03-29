import django

django.setup()

from apps.users.models import User
from apps.users.serializers import UserSerializer

u = User.objects.filter(email__iexact='adebayoadenirangideon@gmail.com').first()
if not u:
    print('USER_NOT_FOUND')
else:
    data = UserSerializer(u).data
    print('EMAIL', u.email)
    print('PROFILE_PICTURE_SERIALIZED', data.get('profile_picture'))
    print('HAS_LOCAL_PROFILE_FIELD', bool(u.profile_picture))
    print('HAS_GOOGLE_PICTURE', bool((u.google_profile_picture_url or '').strip()))
    print('GOOGLE_PICTURE_URL', (u.google_profile_picture_url or '')[:160])
