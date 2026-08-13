import re

with open('pixabay_bgm.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

urls = re.findall(r'https://[^\s"\'<>]+\.mp3[^\s"\'<>]*', html)
print('Found MP3 URLs in HTML:', urls)

if not urls:
    urls = re.findall(r'https://cdn\.pixabay\.com/audio/[^\s"\'<>]+', html)
    print('Found Audio CDN URLs in HTML:', urls)
