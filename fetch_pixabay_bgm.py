import urllib.request
import re
import os

url = 'https://pixabay.com/music/video-games-neon-arcade-runner-431354/'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://pixabay.com/'
}

req = urllib.request.Request(url, headers=headers)
out_dir = r'C:\Users\HomePC\.gemini\antigravity\scratch\subway-runner-3d\public\audio'

try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        mp3_matches = re.findall(r'https://cdn\.pixabay\.com/download/audio/[^\s"\'<>]+', html)
        if not mp3_matches:
            mp3_matches = re.findall(r'https://cdn\.pixabay\.com/audio/[^\s"\'<>]+\.mp3[^\s"\'<>]*', html)
        
        print('Found MP3 links:', mp3_matches)
        if mp3_matches:
            audio_url = mp3_matches[0]
            print('Downloading bgm.mp3 from', audio_url)
            audio_req = urllib.request.Request(audio_url, headers={
                'User-Agent': headers['User-Agent'],
                'Referer': url
            })
            with urllib.request.urlopen(audio_req) as a_resp, open(os.path.join(out_dir, 'bgm.mp3'), 'wb') as f:
                f.write(a_resp.read())
            print('Successfully saved bgm.mp3! File size:', os.path.getsize(os.path.join(out_dir, 'bgm.mp3')))
        else:
            print('No MP3 links found.')
except Exception as e:
    print('Error:', e)
