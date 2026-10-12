# Wstawia wspólny <head> (head.inc) + meta strony do plików HTML. Uruchom: python3 build.py
import re, glob
BASE = 'https://jokerthedon81.github.io/joker-firma-demo/'
inc = open('head.inc').read().strip()
for f in glob.glob('*.html'):
    s = open(f).read()
    m = re.search(r'<!--META (.*?) \| (.*?)-->', s)
    if not m: continue
    title, desc = m.group(1), m.group(2)
    url = BASE + ('' if f == 'index.html' else f)
    block = f'<!--HEAD-->\n{inc}\n<title>{title}</title>\n<meta name="description" content="{desc}">\n<meta property="og:title" content="{title}">\n<meta property="og:description" content="{desc}">\n<meta property="og:url" content="{url}">\n<link rel="canonical" href="{url}">\n<!--/HEAD-->'
    s = re.sub(r'<!--HEAD-->.*?<!--/HEAD-->', lambda _: block, s, flags=re.S)
    open(f, 'w').write(s); print('head ->', f)
