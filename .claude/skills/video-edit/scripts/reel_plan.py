"""Phrase-anchored reel planning: edit/plan.json -> edit/reel.json (v2).

Writing reel.json by hand means looking up a word time for every scene and every prop
cue. Here a scene says *which words* it lands on and this resolves the times from
edit/timeline_words.json (times on the cut, final.mp4).

plan.json = a normal reel.json v2, except:
  scene "on":  "phrase"      scene starts at the first word of that phrase (lead 0.08 s)
  scene "end": "@phrase"     scene ends where that phrase starts (leaves a face gap after)
               "@phrase$"    ...ends where that phrase ends
               number        absolute seconds on the cut
               (omitted)     ends where the next scene starts (or the cut ends)
  any prop string "@phrase", "@phrase$", "@phrase+0.3"
               -> seconds from the scene start (word start / end, plus offset)

Phrases are matched in order through the transcript (each search starts at the previous
scene's anchor), case/punctuation-insensitive, digits == number words. "@phrase#2" takes
the 2nd occurrence after the cursor.

usage: reel_plan.py <reel_dir>
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

LEAD = 0.08
NUM = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven",
       "8": "eight", "9": "nine", "10": "ten", "15": "fifteen", "20": "twenty", "30": "thirty", "36": "thirtysix"}


def norm(w: str) -> str:
    w = re.sub(r"[^a-z0-9]", "", w.lower())
    return NUM.get(w, w)


class Words:
    def __init__(self, words: list[dict]):
        self.w = words
        self.t = [norm(x["text"]) for x in words]

    def find(self, phrase: str, cursor: int, nth: int = 1) -> int:
        toks = [norm(x) for x in phrase.split() if norm(x)]
        hits = 0
        for i in range(cursor, len(self.t) - len(toks) + 1):
            if all(self.t[i + j] == toks[j] for j in range(len(toks))):
                hits += 1
                if hits == nth:
                    return i
        raise SystemExit(f"plan: phrase not found after word {cursor} "
                         f"({self.w[min(cursor, len(self.w) - 1)]['start']:.2f}s): '{phrase}'\n"
                         f"  transcript from there: {' '.join(x['text'] for x in self.w[cursor:cursor + 40])}")


def resolve(ref: str, words: Words, cursor: int) -> float:
    m = re.match(r"^@(.+?)(\$)?(#\d+)?([+-]\d*\.?\d+)?$", ref.strip())
    if not m:
        raise SystemExit(f"plan: bad reference '{ref}'")
    phrase, at_end, nth, off = m.groups()
    i = words.find(phrase, cursor, int(nth[1:]) if nth else 1)
    n = len([x for x in phrase.split() if norm(x)])
    t = words.w[i + n - 1]["end"] if at_end else words.w[i]["start"]
    return t + (float(off) if off else 0.0)


TIME_KEYS = {"at", "countAt", "labelAt", "nameAt", "imageAt", "typeAt", "promiseAt", "captionAt", "stampAt", "markAt"}


def walk_props(v, words: Words, cursor: int, at: float, key: str = ""):
    if isinstance(v, dict):
        return {k: walk_props(x, words, cursor, at, k) for k, x in v.items()}
    if isinstance(v, list):
        return [walk_props(x, words, cursor, at, key) for x in v]
    if key in TIME_KEYS and isinstance(v, str) and v.startswith("@"):
        return round(max(0.0, resolve(v, words, cursor) - at), 2)
    return v


MAX_SCENE, FACE_SHARE = 3.6, 0.15   # style bible: the screen changes every 1-3 s; face ~15-20% of the reel
OTHER = {"split": "full", "full": "split"}


def shift(v, dt: float, key: str = ""):
    if isinstance(v, dict):
        return {k: shift(x, dt, k) for k, x in v.items()}
    if isinstance(v, list):
        return [shift(x, dt, key) for x in v]
    if key in TIME_KEYS and isinstance(v, (int, float)):
        return round(v - dt, 2)
    return v


def pace(scenes: list[dict], words: Words, total: float, max_scene: float, face_share: float,
         cut_points: list[float] | None = None) -> list[dict]:
    """Split any scene longer than max_scene at word starts into pieces that alternate split/full (the
    graphic keeps its state — props times shift, so items already shown stay shown), then turn middle
    pieces into face gaps until the face holds ~face_share of the reel."""
    starts = [w["start"] for w in words.w]
    out: list[dict] = []
    for s in scenes:
        if s.get("component") == "ReelHeadline":   # the hook is shown once: never split, max 3 s, then face
            if s["duration"] > 3.2:
                s = {**s, "duration": 3.0}
            out.append(s)
            continue
        n = int(s["duration"] // (max_scene * 0.85)) + 1 if s["duration"] > max_scene else 1
        if n == 1 or s.get("layout", "split") not in OTHER or s.get("component") == "ReelMedia":
            out.append(s)
            continue
        cuts = [s["at"]]
        for i in range(1, n):
            target = s["at"] + s["duration"] * i / n
            inside = [x for x in (cut_points or []) if abs(x - target) <= s["duration"] / n / 2]
            c = min(inside, key=lambda x: abs(x - target)) if inside else min(starts, key=lambda t: abs(t - target)) - LEAD
            if cuts[-1] + 0.9 < c < s["at"] + s["duration"] - 0.9:
                cuts.append(round(c, 2))
        cuts.append(round(s["at"] + s["duration"], 2))
        for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
            piece = {**s, "at": a, "duration": round(b - a, 2), "props": shift(s["props"], a - s["at"])}
            piece["layout"] = s.get("layout", "split") if i % 2 == 0 else OTHER[s.get("layout", "split")]
            piece["_piece"] = i
            out.append(piece)
    def cues(v, key=""):
        if isinstance(v, dict):
            return [c for k, x in v.items() for c in cues(x, k)]
        if isinstance(v, list):
            return [c for x in v for c in cues(x, key)]
        return [v] if key in TIME_KEYS and isinstance(v, (int, float)) else []

    # a piece where something new appears (a pill, a count, a box) must stay on the graphic
    quiet = [x for x in out if x.get("_piece", 0) >= 1 and not any(0.05 <= c < x["duration"] for c in cues(x["props"]))]
    face = total - sum(x["duration"] for x in out)
    for x in sorted(quiet, key=lambda x: -x["duration"]):
        if face >= face_share * total:
            break
        x["component"] = "__face__"
        face += x["duration"]
    out = [x for x in out if x.get("component") != "__face__"]
    for x in out:
        x.pop("_piece", None)
    return out


def fill_gaps(scenes: list[dict]) -> list[dict]:
    """faceMode "cta": his eyes are off-lens (he reads a prompter), so the full-face punch-in only comes
    at the end (the CTA). Every earlier face gap holds the previous graphic in split, where the face is
    small and the graphic takes the eye."""
    out: list[dict] = []
    for k, s in enumerate(scenes):
        out.append(s)
        if k + 1 < len(scenes):
            end, nxt = s["at"] + s["duration"], scenes[k + 1]["at"]
            if nxt - end > 0.05:
                piece = {**s, "at": round(end, 2), "duration": round(nxt - end, 2),
                         "props": shift(s["props"], end - s["at"]), "layout": "split"}
                if s.get("layout") == "split":   # same graphic, same layout: just lengthen it
                    out[-1] = {**s, "duration": round(nxt - s["at"], 2)}
                else:
                    out.append(piece)
    return out


def main(reel_dir: Path) -> None:
    edit = reel_dir / "edit"
    plan = json.loads((edit / "plan.json").read_text(encoding="utf-8"))
    words = Words(json.loads((edit / "timeline_words.json").read_text(encoding="utf-8")))
    total = words.w[-1]["end"]

    edl = json.loads((edit / "edl.json").read_text(encoding="utf-8"))
    cuts, t = [], 0.0
    for r in edl["ranges"][:-1]:
        t += r["end"] - r["start"]
        cuts.append(round(t, 3))

    def snap(at: float, back: float = 0.35, fwd: float = 0.2) -> float:
        # a layout switch on the same frame as a jump cut hides the cut (his face jumps otherwise)
        near = [c for c in cuts if at - back <= c <= at + fwd]
        return min(near, key=lambda c: abs(c - at)) if near else at

    cursor = 0
    starts: list[tuple[float, int]] = []
    for s in plan["scenes"]:
        i = words.find(s["on"], cursor, s.get("nth", 1)) if s.get("on") else cursor
        at = 0.0 if i == 0 or (not starts and words.w[i]["start"] < 1.5) else max(0.0, words.w[i]["start"] - LEAD)  # the hook opens on frame 0
        if "at" in s:
            at = float(s["at"])
        elif at > 0:
            at = snap(at)
        starts.append((round(at, 2), i))
        cursor = i

    scenes = []
    for k, (s, (at, i)) in enumerate(zip(plan["scenes"], starts)):
        end = s.get("end")
        if isinstance(end, (int, float)):
            stop = float(end)
        elif isinstance(end, str):
            stop = resolve(end, words, i) - (LEAD if not end.rstrip("0123456789.+-#").endswith("$") else -0.05)
        else:
            stop = starts[k + 1][0] if k + 1 < len(starts) else total
        stop = min(stop, total)
        if k + 1 < len(starts):
            stop = min(stop, starts[k + 1][0])
        out = {key: v for key, v in s.items() if key not in ("on", "end", "nth", "props")}
        out["at"] = at
        out["duration"] = round(stop - at, 2)
        if out["duration"] < 0.4:
            raise SystemExit(f"plan: scene {k} ({s.get('component')} on '{s.get('on')}') is only {out['duration']} s")
        out["props"] = walk_props(s.get("props", {}), words, i, at)
        scenes.append(out)

    cta_only = plan.get("faceMode") == "cta"
    scenes = pace(scenes, words, total, float(plan.get("maxScene", MAX_SCENE)),
                  0.0 if cta_only else float(plan.get("faceShare", FACE_SHARE)), cuts)
    if cta_only:
        scenes = fill_gaps(scenes)

    spec = {k: v for k, v in plan.items() if k not in ("scenes", "maxScene", "faceShare", "faceMode")}
    spec["version"] = 2
    spec["scenes"] = scenes
    (edit / "reel.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")

    face = total - sum(x["duration"] for x in scenes)
    print(f"reel.json: {len(scenes)} scenes, cut {total:.1f}s, face gaps {face:.1f}s")
    for x in scenes:
        print(f"  {x['at']:6.2f} +{x['duration']:<5} {x.get('layout', 'split'):<5} {x.get('theme', 'glass'):<5} "
              f"{x['component'] or '-'}")
    mids = [round(x["at"] + min(x["duration"] - 0.1, max(0.6, x["duration"] * 0.7)), 2) for x in scenes]
    print("stills:", " ".join(str(m) for m in mids))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
