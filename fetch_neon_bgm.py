import urllib.request
import http.cookiejar
import re
import os

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders = [
    ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'),
    ('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'),
    ('Accept-Language', 'en-US,en;q=0.5')
]

url = 'https://pixabay.com/music/video-games-neon-arcade-runner-431354/'
out_path = r'public\audio\bgm.mp3'

try:
    with opener.open(url) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'https://cdn\.pixabay\.com/download/audio/[^\s"\'<>]+', html)
        if not matches:
            matches = re.findall(r'https://cdn\.pixabay\.com/audio/[^\s"\'<>]+\.mp3[^\s"\'<>]*', html)
        print('Matches:', matches)
        if matches:
            audio_url = matches[0]
            with opener.open(audio_url) as a_resp, open(out_path, 'wb') as f:
                f.write(a_resp.read())
            print('Successfully saved bgm.mp3! File size:', os.path.getsize(out_path))
except Exception as e:
    print('Error:', e)
