import urllib.request
import urllib.error
import json
u = 'http://localhost:8000/api/v1/auth/google/'
data = json.dumps({'id_token':'dummy'}).encode('utf-8')
req = urllib.request.Request(u, data=data, headers={'Content-Type':'application/json'}, method='POST')
try:
    r = urllib.request.urlopen(req, timeout=8)
    print('STATUS', r.status)
    print(r.read().decode())
except urllib.error.HTTPError as e:
    print('STATUS', e.code)
    try:
        print(e.read().decode())
    except Exception as ex:
        print('NO BODY', ex)
except Exception as e:
    print('ERR', e)
