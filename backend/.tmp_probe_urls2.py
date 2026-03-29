import urllib.request
import urllib.error
urls = [
    'http://localhost:8000/api/v1/auth/register/',
    'http://localhost:8000/api/v1/auth/login/',
    'http://localhost:8000/api/v1/auth/google/',
    'http://localhost:8000/api/v1/users/',
    'http://localhost:8000/api/v1/users/auth/google/',
    'http://localhost:8000/api/v1/docs/',
]
for u in urls:
    try:
        r = urllib.request.urlopen(u, timeout=5)
        print(u, '->', r.status)
    except urllib.error.HTTPError as e:
        print(u, '->', e.code)
    except Exception as e:
        print(u, '-> ERR', e)
