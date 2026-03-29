import urllib.request
url = 'http://localhost:8000/media/profile_pictures/ChatGPT_Image_Feb_20_2026_11_25_48_AM.png'
try:
    with urllib.request.urlopen(url, timeout=10) as r:
        print('STATUS', r.status)
        print('CONTENT_TYPE', r.headers.get('Content-Type'))
        print('CONTENT_LEN', r.headers.get('Content-Length'))
except Exception as e:
    print('ERR', e)
