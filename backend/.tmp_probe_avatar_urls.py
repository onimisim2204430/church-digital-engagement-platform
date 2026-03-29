import django
import urllib.request


django.setup()

from apps.users.models import User

emails = ['www.heavresearcher.247@gmail.com', 'adebayoadenirangideon@gmail.com']
for email in emails:
    u = User.objects.filter(email__iexact=email).first()
    print('\n===', email, '===')
    if not u:
        print('NOT_FOUND')
        continue
    print('google_id?', bool(u.google_id), 'profile_file?', bool(u.profile_picture))
    print('google_url=', (u.google_profile_picture_url or '')[:220])
    if u.google_profile_picture_url:
        try:
            req = urllib.request.Request(u.google_profile_picture_url, method='GET')
            with urllib.request.urlopen(req, timeout=10) as r:
                print('google_url_status=', r.status, 'content_type=', r.headers.get('Content-Type'))
        except Exception as e:
            print('google_url_fetch_error=', str(e)[:220])
