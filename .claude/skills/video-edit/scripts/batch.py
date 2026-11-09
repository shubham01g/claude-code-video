"""Batch reels: one long recording session -> one project per script, and a script-aware cut.

    split   <batch_dir>   transcribe Instagram/batches/<date>/raw/*, find the spoken "Script N" slates,
                          cut each script's span into Instagram/reels/<slug>/raw/<slug>.mp4 and write
                          Instagram/reels/<slug>/script.json + <batch_dir>/tracker.json
    autocut <reel_dir>    after `ingest`, align the reel transcript to its script lines, keep the LAST
                          clean take of every line (retakes and false starts drop out), cut pauses,
                          write edit/edl.json and print a coverage report

Both are reached through run_pipeline.py (`batch`, `autocut`).
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

from _paths import REPO_ROOT, VENV_PY, ensure_media_tools, find_sources

SCRIPTS_DIR = Path(__file__).resolve().parent
REELS_DIR = REPO_ROOT / "Instagram" / "reels"

# ----------------------------------------------------------------------------- text normalisation

_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen " \
        "sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
_STOP = set("a an the and or but so to of in on at for from with by as is it its it's this that these those i i'm me my we our you your he she they them their be was were are am do does did have has had not no yes if then than when what which who how all every each just one".split())
# words Whisper reliably mishears in this niche -> the script's spelling
_SYNONYMS = {"cloud": "claude", "clawd": "claude", "clod": "claude", "codecs": "codex", "cash": "cache",
             "ok": "okay", "gonna": "going", "wanna": "want", "percent": "percent", "%": "percent"}
_NUM_WORDS = {w: i for i, w in enumerate(_ONES)} | {w: i * 10 for i, w in enumerate(_TENS) if w != "_"}
_NUM_WORDS |= {"to": 2, "too": 2, "for": 4, "won": 1}  # only used for slate numbers


def _int_words(n: int) -> list[str]:
    if n < 20:
        return [_ONES[n]]
    if n < 100:
        return [_TENS[n // 10]] + ([_ONES[n % 10]] if n % 10 else [])
    if n < 1000:
        return [_ONES[n // 100], "hundred"] + (_int_words(n % 100) if n % 100 else [])
    if n < 1_000_000:
        return _int_words(n // 1000) + ["thousand"] + (_int_words(n % 1000) if n % 1000 else [])
    return [str(n)]


def tokens(text: str) -> list[str]:
    """lowercase word tokens; digits -> words, apostrophes dropped, known mishears mapped."""
    text = text.lower().replace("’", "'").replace("%", " percent ")
    text = re.sub(r"(\d),(\d{3})", r"\1\2", text)
    out: list[str] = []
    for raw in re.findall(r"[a-z0-9']+", text):
        w = raw.replace("'", "")
        if not w:
            continue
        if w.isdigit():
            out.extend(_int_words(int(w)))
        else:
            out.append(_SYNONYMS.get(w, w))
    return out


def load_words(transcript: Path) -> list[dict]:
    d = json.loads(transcript.read_text(encoding="utf-8"))
    ws = []
    for w in d["words"]:
        if w.get("type", "word") != "word":
            continue
        toks = tokens(w["text"])
        for i, t in enumerate(toks):  # "36" -> thirty, six share the word's timing
            ws.append({"tok": t, "start": float(w["start"]), "end": float(w["end"]), "text": w["text"], "first": i == 0})
    return ws


# ----------------------------------------------------------------------------- alignment

def best_takes(words: list[dict], line_toks: list[str], min_recall: float | None = None):
    """Every place `line_toks` was spoken. Returns [(recall, i0, i1)] with word indexes, sorted by i0."""
    n = len(line_toks)
    if not n:
        return []
    if min_recall is None:  # long lines get paraphrased ("which files changed" -> "what file changes")
        min_recall = 0.5 if n >= 10 else 0.6
    heads = set(line_toks[:3])
    toks = [w["tok"] for w in words]
    found = []
    for i, t in enumerate(toks):
        if t not in heads:
            continue
        window = toks[i: i + int(n * 1.4) + 3]
        sm = SequenceMatcher(None, line_toks, window, autojunk=False)
        blocks = [b for b in sm.get_matching_blocks() if b.size]
        matched = sum(b.size for b in blocks)
        if not blocks:
            continue
        recall = matched / n
        if recall >= min_recall:
            found.append((recall, i + blocks[0].b, i + blocks[-1].b + blocks[-1].size - 1))
    # Windows starting one word apart are the SAME take seen from different offsets: merge overlapping
    # matches and keep each take's best alignment: highest recall, then the TIGHTEST span (a window that
    # starts on a stray earlier "it" — "tell it what the video is about. It transcribes…" — has the same
    # recall but drags the line back over the previous line's retake), then the earliest start.
    takes: list[tuple] = []
    for c in sorted(found, key=lambda c: c[1]):
        if takes and c[1] <= takes[-1][2]:
            best = takes[-1]
            if (c[0], -(c[2] - c[1]), -c[1]) > (best[0], -(best[2] - best[1]), -best[1]):
                takes[-1] = c
        else:
            takes.append(c)
    return takes


def choose_last_takes(words: list[dict], lines: list[str]):
    """Walk the script backwards: each line takes its LAST good take that ends before the next line's take."""
    chosen: list[tuple | None] = [None] * len(lines)
    limit = len(words)
    for k in range(len(lines) - 1, -1, -1):
        cands = [c for c in best_takes(words, tokens(lines[k])) if c[2] < limit]
        if not cands:
            continue
        top = max(c[0] for c in cands)
        good = [c for c in cands if c[0] >= top - 0.15]   # near-best recall, then the latest start wins
        c = max(good, key=lambda c: c[1])
        chosen[k] = c
        limit = c[1]
    return chosen


# ----------------------------------------------------------------------------- split

_SLATE_WORD = {"script", "scripts", "skript", "scrip", "crypt"}


def find_slates(words: list[dict]) -> list[dict]:
    out = []
    for i, w in enumerate(words[:-1]):
        if w["tok"] not in _SLATE_WORD:
            continue
        j = i + 1
        if words[j]["tok"] == "number" and j + 1 < len(words):
            j += 1
        t = words[j]["tok"]
        n = _NUM_WORDS.get(t)
        if n is None:
            continue
        # "fifteen" / "twenty one" style: teen words are single tokens; tens may take a ones word after
        if n >= 20 and j + 1 < len(words) and words[j + 1]["tok"] in _ONES[1:10]:
            n += _ONES.index(words[j + 1]["tok"])
            j += 1
        if 1 <= n <= 60:
            out.append({"n": n, "start": w["start"], "end": words[j]["end"], "i": i, "j": j})
    return out


def _ffmpeg_cut(src: Path, start: float, end: float, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0.0, start):.3f}", "-to", f"{end:.3f}", "-i", str(src),
           "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)]
    subprocess.run(cmd, check=True)


def split_batch(batch_dir: Path, model: str = "small.en") -> None:
    ensure_media_tools()
    batch_dir = batch_dir.resolve()
    spec = json.loads((batch_dir / "scripts.json").read_text(encoding="utf-8"))
    scripts = {s["n"]: s for s in spec["scripts"]}
    sources = find_sources(batch_dir / "raw")
    if not sources:
        sys.exit(f"no recordings in {batch_dir / 'raw'}")
    edit = batch_dir / "edit"
    tracker_path = batch_dir / "tracker.json"
    tracker = json.loads(tracker_path.read_text(encoding="utf-8")) if tracker_path.exists() else {"reels": {}}

    # 1. transcribe every session file, collect slates in recording order
    timeline = []  # (src, words, slates)
    for src in sources:
        print(f"[transcribe] {src.name}")
        subprocess.run([str(VENV_PY), str(SCRIPTS_DIR / "transcribe_local.py"), str(src), "--edit-dir", str(edit),
                        "--model", model], check=True, cwd=SCRIPTS_DIR)
        words = load_words(edit / "transcripts" / f"{src.stem}.json")
        timeline.append((src, words, find_slates(words)))

    # 2. per script: the LAST slate N (a re-said slate = a full restart), span to the next different slate
    spans = {}
    for src, words, slates in timeline:
        dur = words[-1]["end"] + 1.0 if words else 0
        for k, s in enumerate(slates):
            nxt = next((t for t in slates[k + 1:] if t["n"] != s["n"]), None)
            spans[s["n"]] = {"src": src, "words": words, "start": s["end"] + 0.15,
                             "end": (nxt["start"] - 0.15) if nxt else dur, "how": "slate"}

    # 3. fallback for scripts without a slate: find the hook line itself
    for n, s in scripts.items():
        if n in spans:
            continue
        for src, words, slates in timeline:
            takes = best_takes(words, tokens(s["lines"][0]), min_recall=0.7)
            if takes:
                i0 = takes[0][1]
                t0 = words[i0]["start"]
                nxt = next((x for x in slates if x["start"] > t0), None)
                spans[n] = {"src": src, "words": words, "start": t0 - 0.4,
                            "end": (nxt["start"] - 0.15) if nxt else words[-1]["end"] + 1.0, "how": "hook-match"}
                break

    # 4. cut + validate
    print(f"\n{'#':>3}  {'slug':<26} {'how':<10} {'span':>15}  coverage")
    for n in sorted(scripts):
        s = scripts[n]
        slug = s["slug"]
        if n not in spans:
            print(f"{n:>3}  {slug:<26} MISSING — no slate and no hook match")
            tracker["reels"][slug] = {"n": n, "status": "missing"}
            continue
        sp = spans[n]
        in_span = [w["tok"] for w in sp["words"] if sp["start"] <= w["start"] <= sp["end"]]
        want = tokens(" ".join(s["lines"]))
        sm = SequenceMatcher(None, want, in_span, autojunk=False)
        cov = sum(b.size for b in sm.get_matching_blocks()) / max(1, len(want))
        dst = REELS_DIR / slug / "raw" / f"{slug}.mp4"
        _ffmpeg_cut(sp["src"], sp["start"], sp["end"], dst)
        (REELS_DIR / slug / "script.json").write_text(json.dumps({"batch": spec["batch"], **s}, indent=2), encoding="utf-8")
        flag = "OK " if cov >= 0.9 else "LOW"
        print(f"{n:>3}  {slug:<26} {sp['how']:<10} {sp['start']:7.1f}-{sp['end']:7.1f}  {flag} {cov:.0%}")
        tracker["reels"][slug] = {"n": n, "status": "raw", "coverage": round(cov, 3), "how": sp["how"],
                                  "source": sp["src"].name, "span": [round(sp["start"], 2), round(sp["end"], 2)]}
    tracker_path.write_text(json.dumps(tracker, indent=2), encoding="utf-8")
    print(f"\ntracker -> {tracker_path}")


# ----------------------------------------------------------------------------- autocut

HEAD_PAD, TAIL_PAD, LAST_TAIL = 0.06, 0.10, 0.25
SPLIT_GAP = 0.35  # a pause longer than this BETWEEN lines gets cut out (a layout switch hides that cut)
INLINE_GAP = 0.70  # inside a line only longer pauses are cut: every cut jumps his face (2026-11-06: "glitchy")


SIL_DB, SIL_MIN, SIL_GAP = -50, 0.12, 0.80   # real-audio check: gated room ≈ -85 dB, his speech ≈ -37 dB RMS
SIL_HEAD, SIL_TAIL = 0.08, 0.12


def _silences(src: Path) -> list[tuple[float, float]]:
    """Silent stretches in the clip's audio (blips < 80 ms between two silences are merged)."""
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-vn", "-af",
                          f"silencedetect=n={SIL_DB}dB:d={SIL_MIN}", "-f", "null", "-"],
                         capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    sil = list(zip(starts, ends + [1e9] * (len(starts) - len(ends))))
    merged: list[list[float]] = []
    for s0, s1 in sil:
        if merged and s0 - merged[-1][1] < 0.08:
            merged[-1][1] = s1
        else:
            merged.append([s0, s1])
    return [(a, b) for a, b in merged]


def _tighten(ranges: list[dict], sil: list[tuple[float, float]], words: list[dict] | None = None) -> list[dict]:
    """Whisper stretches a line's first word back over the pause before it (a 2 s dead head on
    reel 1). Trim every range edge to where the audio really starts/stops, and cut out any
    silence longer than SIL_GAP inside a range."""
    out = []
    starts = sorted(w["start"] for w in (words or []) if w["first"])
    free = lambda lo, hi: not any(lo <= t < hi for t in starts)   # no other word begins in [lo, hi)
    for r in ranges:
        a, b = r["start"], r["end"]
        # Whisper can give a word zero length and a late start ("Comment" @51.20 while his voice starts
        # @50.92): if real speech runs up to the edge, move the edge out to where the audio starts/stops
        before = [s1 for s0, s1 in sil if s1 <= a]
        if before and a - before[-1] <= 0.6 and free(before[-1], a + 0.03):
            a = max(before[-1] - SIL_HEAD, out[-1]["end"] if out else 0.0)
        after = [s0 for s0, s1 in sil if s0 >= b]
        if after and after[0] - b <= 0.6 and free(b - 0.08, after[0]):
            b = after[0] + SIL_TAIL
        for s0, s1 in sil:
            if s0 <= a + 0.02 < s1 and s1 - SIL_HEAD < b:
                a = max(a, s1 - SIL_HEAD)
            if s0 < b - 0.02 <= s1 and s0 + SIL_TAIL > a:
                b = min(b, s0 + SIL_TAIL)
        pieces, cur = [], a
        for s0, s1 in sil:
            if s0 > cur and s1 < b and s1 - s0 > SIL_GAP:
                pieces.append((cur, s0 + SIL_TAIL))
                cur = s1 - SIL_HEAD
        pieces.append((cur, b))
        for p0, p1 in pieces:
            if p1 - p0 >= 0.15:
                out.append({**r, "start": round(p0, 3), "end": round(p1, 3)})
    return out


GROW_WORDS, GROW_GAP = 4, 0.45


def _restarts(words: list[dict], kept: list[int], script_toks: list[str] | None = None) -> set[int]:
    """Restarts in the kept word sequence (across line joins too) -> word indexes to drop.
    - a word Whisper wrote trailing off ("inside...", "how to...") then a restart: drop back to where
      the restart's first word was said before (within 6 words), else just the trailing word
    - a repeat of 2+ words within 8 words ("this whole... this whole reel", "and it should load my
      sender and it loads…"): drop the first attempt"""
    drop: set[int] = set()
    firsts = [i for i in kept if words[i]["first"]]
    same = lambda a, b: a == b or (min(len(a), len(b)) >= 2 and (a.startswith(b) or b.startswith(a)))
    for n, i in enumerate(firsts[:-1]):
        if words[i]["text"].strip().endswith(("...", "…")):
            nxt = words[firsts[n + 1]]["tok"]
            back = [j for j in firsts[max(0, n - 6): n + 1] if same(words[j]["tok"], nxt)]
            if back:
                start = back[0]
            else:   # no earlier copy: drop the fragment back to the sentence start ("built a..."), max 3 words
                m = n
                while m > 0 and n - m < 3 and not words[firsts[m - 1]]["text"].strip().endswith((".", "?", "!")):
                    m -= 1
                start = firsts[m]
            drop.update(j for j in kept if start <= j < firsts[n + 1])
    toks = [words[i]["tok"] for i in firsts]
    for a in range(len(firsts)):
        for b in range(a + 3, min(len(firsts), a + 9)):  # "over and over" is speech, not a restart
            pair = toks[a:a + 2]
            if pair == toks[b:b + 2] and firsts[a] not in drop:
                # the script itself says it twice ("my own experience and my own proof"): not a restart
                if script_toks and sum(script_toks[x:x + 2] == pair for x in range(len(script_toks) - 1)) >= 2:
                    continue
                # scripts repeat structures on purpose ("…for the fatal flaw. One fights for the…");
                # a real restart is mid-sentence, so never drop across a sentence end
                run = 2
                while b + run < len(toks) and toks[a + run] == toks[b + run] and a + run < b:
                    run += 1
                ends = (".", "?", "!") if run >= 3 else (".", "?", "!", ",")   # 3+ words said again = restart
                if any(words[firsts[x]]["text"].strip().endswith(ends) for x in range(a, b)):
                    continue
                drop.update(j for j in kept if firsts[a] <= j < firsts[b])
                break
    return drop


def _grow(words: list[dict], chosen: list) -> list:
    """A take ends on its last word that MATCHED the script, so a mis-heard last word ("anything",
    "requests") or first word ("Comment") would be cut off the audio. Extend each take over up to
    GROW_WORDS words spoken in the same breath (gap <= GROW_GAP), never into a neighbouring take."""
    out = list(chosen)
    idx = [k for k, c in enumerate(out) if c]
    for n, k in enumerate(idx):
        r, i0, i1 = out[k]
        lo = out[idx[n - 1]][2] if n else -1
        hi = out[idx[n + 1]][1] if n + 1 < len(idx) else len(words)
        added = 0
        while i1 + 1 < hi and words[i1 + 1]["start"] - words[i1]["end"] <= GROW_GAP and added < GROW_WORDS:
            i1 += 1
            added += words[i1]["first"]
        added = 0
        while i0 - 1 > lo and words[i0]["start"] - words[i0 - 1]["end"] <= GROW_GAP and added < 2:
            i0 -= 1
            added += words[i0]["first"]
        while i0 > 0 and not words[i0]["first"]:
            i0 -= 1
        out[k] = (r, i0, i1)
    return out


def autocut(reel_dir: Path) -> None:
    reel_dir = reel_dir.resolve()
    script = json.loads((reel_dir / "script.json").read_text(encoding="utf-8"))
    src = find_sources(reel_dir / "raw")[0]
    words = load_words(reel_dir / "edit" / "transcripts" / f"{src.stem}.json")
    lines = script["lines"]
    chosen = _grow(words, choose_last_takes(words, lines))

    # word runs: chosen lines, split wherever a pause > SPLIT_GAP sits between kept words
    runs: list[list[int]] = []
    report = []
    drop = _restarts(words, [i for c in chosen if c for i in range(c[1], c[2] + 1)],
                     [t for ln in lines for t in tokens(ln)])
    for k, c in enumerate(chosen):
        if c is None:
            report.append(f"  MISSING line {k + 1}: {lines[k]}")
            continue
        recall, i0, i1 = c
        if recall < 0.85:
            report.append(f"  WEAK {recall:.0%} line {k + 1}: {lines[k]}")
        idx = [i for i in range(i0, i1 + 1) if i not in drop]
        cut = [words[i]["text"].strip() for i in range(i0, i1 + 1) if i in drop and words[i]["first"]]
        if cut:
            report.append(f"  restart cut in line {k + 1}: '{' '.join(cut)}'")
        if runs and words[idx[0]]["start"] - words[runs[-1][-1]]["end"] <= SPLIT_GAP and idx[0] == runs[-1][-1] + 1:
            runs[-1].extend(idx)   # spoken straight on from the previous line: keep the natural joint
        else:
            runs.append(idx)
    ranges = []
    for run in runs:
        seg = [run[0]]
        for a, b in zip(run, run[1:]):
            if b != a + 1 or words[b]["start"] - words[a]["end"] > INLINE_GAP:
                ranges.append(seg)
                seg = []
            seg.append(b)
        ranges.append(seg)

    edl_ranges = []
    for r_i, seg in enumerate(ranges):
        start = max(0.0, words[seg[0]]["start"] - HEAD_PAD)
        end = words[seg[-1]]["end"] + (LAST_TAIL if r_i == len(ranges) - 1 else TAIL_PAD)
        nxt = seg[-1] + 1
        while nxt < len(words) and not words[nxt]["first"]:
            nxt += 1
        if nxt < len(words):  # never let a pad swallow the start of a word we dropped
            end = min(end, max(words[seg[-1]]["end"] + 0.02, words[nxt]["start"] - 0.03))
        if edl_ranges and start < edl_ranges[-1]["end"]:
            start = edl_ranges[-1]["end"]
        quote = " ".join(w["text"].strip() for w in (words[i] for i in seg) if w["first"])
        edl_ranges.append({"source": src.stem, "start": round(start, 3), "end": round(end, 3),
                           "beat": "HOOK" if r_i == 0 else "BODY", "quote": quote, "reason": "last clean take"})
    edl_ranges = _tighten(edl_ranges, _silences(src), words)
    total = sum(r["end"] - r["start"] for r in edl_ranges)
    edl = {"version": 1, "sources": {src.stem: str(src).replace("\\", "/")}, "ranges": edl_ranges,
           "total_duration_s": round(total, 3)}
    (reel_dir / "edit" / "edl.json").write_text(json.dumps(edl, indent=2), encoding="utf-8")

    # captions should read like the script, not like Whisper: map mis-heard words to the script's spelling
    fixes = {}
    for k, c in enumerate(chosen):
        if not c:
            continue
        script_words = re.findall(r"[A-Za-z0-9'’]+", lines[k])
        heard = [w for w in words[c[1]: c[2] + 1] if w["first"]]
        sw_tok = [_SYNONYMS.get(w.lower().replace("'", "").replace("’", ""), w.lower().replace("'", "").replace("’", "")) for w in script_words]
        hw_tok = [re.sub(r"[^a-z0-9]", "", w["text"].lower()) for w in heard]
        for op, a0, a1, b0, b1 in SequenceMatcher(None, sw_tok, hw_tok, autojunk=False).get_opcodes():
            if op == "replace" and a1 - a0 == b1 - b0:
                for a, b in zip(range(a0, a1), range(b0, b1)):
                    said = re.sub(r"[^A-Za-z0-9']", "", heard[b]["text"])
                    want = script_words[a]
                    # fixes apply to every occurrence in the reel, so only keep real mishearings:
                    # never a common word ("the" -> "that" was him paraphrasing), never digits
                    # (they read better on screen), and only sound-alikes (same first letter, similar length)
                    if not said or said.isdigit() or said.lower() in _STOP or want.lower() in _STOP:
                        continue
                    if tokens(said) != tokens(want):
                        if said[0].lower() == want[0].lower() and abs(len(said) - len(want)) <= 3:
                            fixes[said] = want
                    elif said.lower() != want.lower():
                        fixes[said] = want
    (reel_dir / "edit" / "caption_fixes.auto.json").write_text(json.dumps(fixes, indent=2), encoding="utf-8")

    kept = sum(1 for c in chosen if c)
    print(f"autocut: {kept}/{len(lines)} lines, {len(edl_ranges)} ranges, {total:.1f}s -> {reel_dir / 'edit' / 'edl.json'}")
    for line in report:
        print(line)
    # retake check: the same 3-word opener twice in the kept text means a false start slipped through
    kept_toks = [words[i]["tok"] for seg in ranges for i in seg]
    seen = {}
    for i in range(len(kept_toks) - 2):
        tri = tuple(kept_toks[i:i + 3])
        if tri in seen and i - seen[tri] < 25:
            print(f"  CHECK repeated phrase '{' '.join(tri)}' — possible doubled take")
        seen[tri] = i
