import re
import subprocess
import os

with open('pixabay_bgm.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

matches = re.findall(r'https://cdn\.pixabay\.com/download/audio/[^\s"\'<>]+', html)
if not matches:
    matches = re.findall(r'https://cdn\.pixabay\.com/audio/[^\s"\'<>]+\.mp3[^\s"\'<>]*', html)

print('Matches:', matches)
if matches:
    audio_url = matches[0]
    out_path = r'public\audio\bgm.mp3'
    print('Downloading bgm.mp3 with curl.exe from:', audio_url)
    cmd = f'curl.exe -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -e "https://pixabay.com/" "{audio_url}" -o "{out_path}"'
    subprocess.run(cmd, shell=True)
    if os.path.exists(out_path):
        print('Successfully downloaded bgm.mp3! File size:', os.path.getsize(out_path))
