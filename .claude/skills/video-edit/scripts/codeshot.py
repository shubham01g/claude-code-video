"""Render a real file excerpt as an editor-style PNG (dark, tab bar, line numbers).

usage: codeshot.py OUT.png FILE START END [--title NAME] [--hi 3,4] [--width 1000] [--wrap 58]
"""
import argparse, html, re, subprocess, sys, tempfile, textwrap
from pathlib import Path

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

ap = argparse.ArgumentParser()
ap.add_argument("out"); ap.add_argument("file"); ap.add_argument("start", type=int); ap.add_argument("end", type=int)
ap.add_argument("--title"); ap.add_argument("--hi", default=""); ap.add_argument("--width", type=int, default=1000)
ap.add_argument("--wrap", type=int, default=56); ap.add_argument("--font", type=int, default=24)
a = ap.parse_args()

src = Path(a.file).read_text(encoding="utf-8").splitlines()
lines = src[a.start - 1:a.end]
hi = {int(x) for x in a.hi.split(",") if x}
ext = Path(a.file).suffix.lower()
KW = r"\b(const|export|import|from|return|function|type|interface|let|if|else|await|async|def|for|in|new)\b"


def color(s: str) -> str:
    e = html.escape(s)
    if ext == ".md":
        if re.match(r"^\s*#", s):
            return f'<span style="color:#F97316;font-weight:700">{e}</span>'
        e = re.sub(r"\*\*(.+?)\*\*", r'<b style="color:#FDE68A">**\1**</b>', e)
        e = re.sub(r"`([^`]+)`", r'<span style="color:#86EFAC">`\1`</span>', e)
        e = re.sub(r"^(\s*)([-*]|\d+\.)(\s)", r'\1<span style="color:#F97316">\2</span>\3', e)
        return e
    e = re.sub(r"(&quot;.*?&quot;|&#x27;.*?&#x27;|`[^`]*`)", r'<span style="color:#86EFAC">\1</span>', e)
    e = re.sub(r"(//.*|#\s.*)$", r'<span style="color:#7C7368">\1</span>', e)
    e = re.sub(KW, r'<span style="color:#C084FC">\1</span>', e)
    return e


rows = []
for i, ln in enumerate(lines, start=a.start):
    parts = textwrap.wrap(ln, a.wrap, drop_whitespace=False, replace_whitespace=False) or [""]
    for j, p in enumerate(parts):
        bg = "background:rgba(249,115,22,0.20);" if i in hi else ""
        num = str(i) if j == 0 else ""
        rows.append(f'<div class="r" style="{bg}"><span class="n">{num}</span><span class="c">{color(p)}</span></div>')

title = html.escape(a.title or Path(a.file).name)
lh = int(a.font * 1.5)
height = 64 + len(rows) * lh + 36
page = f"""<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#141312;font-family:'JetBrains Mono',Consolas,monospace;}}
.tab{{height:64px;display:flex;align-items:center;gap:12px;padding:0 24px;background:#1C1A18;border-bottom:1px solid #2A2724}}
.d{{width:14px;height:14px;border-radius:7px}}
.t{{margin-left:12px;color:#E7E2DA;font-size:22px;background:#141312;padding:10px 18px;border-radius:10px 10px 0 0;border-top:2px solid #F97316}}
.body{{padding:18px 0}}
.r{{display:flex;font-size:{a.font}px;line-height:{lh}px;color:#E7E2DA;white-space:pre}}
.n{{width:64px;text-align:right;padding-right:22px;color:#5B554E;flex-shrink:0}}
</style></head><body><div class="tab"><span class="d" style="background:#FF5F57"></span><span class="d" style="background:#FEBC2E"></span>
<span class="d" style="background:#28C840"></span><span class="t">{title}</span></div><div class="body">{''.join(rows)}</div></body></html>"""

tmp = Path(tempfile.gettempdir()) / "codeshot.html"
tmp.write_text(page, encoding="utf-8")
out = str(Path(a.out).resolve())
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                f"--window-size={a.width},{height}", f"--screenshot={out}", tmp.as_uri()],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print(out, a.width, height)
