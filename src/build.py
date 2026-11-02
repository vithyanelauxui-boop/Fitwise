import pathlib
d=pathlib.Path(__file__).parent
css=(d/'style.css').read_text(); shell=(d/'shell.html').read_text()
import re,json
logos={}
for f in sorted((d.parent/'assets'/'logos').glob('*.svg')):
    m=re.search(r' d="([^"]+)"',f.read_text())
    if m: logos[f.stem]=m.group(1)
js='const LOGO='+json.dumps(logos)+';\n'+''.join((d/f).read_text()+'\n' for f in ['icons.js','data.js','app.js'])
html=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg">
<meta name="author" content="Vithyanela K">
<title>Vrom: parts that fit</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400..700&family=Noto+Sans+Tamil:wght@400..700&display=swap">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<script type="text/template" id="shell">
{shell}
</script>
<script src="assets/fw-track.js"></script>
<script src="assets/map/coimbatore.js"></script>
<script>
{js}
</script>
</body>
</html>'''
(d.parent/'prototype.html').write_text(html)
print(len(html))
