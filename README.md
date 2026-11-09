# VIDEO: raw footage in, finished YouTube video out

You commented "VIDEO," so here's the setup.

I give Claude my raw footage and tell it what the video is about. It gives me back a finished YouTube video. Editing used to eat my whole week. Now I just review it.

## What `/ship-video` does

1. **Reads your brief and the footage.** You say what the video is and what you want in the edit.
2. **Asks before it builds** whatever your brief leaves open: order, cut style, intro, blur, thumbnail, title. It doesn't guess.
3. **Transcribes everything on your own computer** with Whisper. Nothing gets uploaded.
4. **Cuts** the silences, mistakes and retakes.
5. **Cleans the audio.** It splits your voice from the background, which removes music, keyboard clicks and noise, then sets YouTube loudness.
6. **Blurs private stuff** on screen, like emails, API keys and client names.
7. **Builds intro animations** designed for that one video, as code (see [REMOTION](https://github.com/shubham01g/claude-code-remotion)).
8. **Makes the thumbnail** from your concept and gives you **title options**.

Every video is different, so nothing is a fixed template. The skill is a way of working, and it follows your brief.

## What you need

- Claude Code
- Windows. My setup is Windows-first; Claude can adapt the paths for Mac or Linux.
- Python and ffmpeg. The setup script installs both.
- Node.js for the Remotion animations
- A decent CPU. An NVIDIA GPU makes transcription faster, but it isn't required.

## Files in this pack

| File | What it is |
|---|---|
| [`.claude/skills/ship-video/`](.claude/skills/ship-video/) | The skill + scripts: `cut.py` (cut rules), `stems.py` (voice/background split), `redact.py` (blur), `frames.py` (thumbnail frames) |
| [`.claude/skills/video-edit/`](.claude/skills/video-edit/) | The shared pipeline: local transcription, cutting, rendering, captions |
| [`.claude/skills/youtube-edit/`](.claude/skills/youtube-edit/) | Plans and builds the motion graphics |
| [`YouTube/remotion/`](YouTube/remotion/) | The animation components |

## Setup

1. Download this repo (green **Code** button → **Download ZIP**) and copy everything in this repo except README.md and LICENSE into your project folder.
2. Run once:
   ```
   powershell -ExecutionPolicy Bypass -File .claude/skills/video-edit/scripts/setup.ps1
   ```
   This installs ffmpeg, a Python environment and local Whisper, and pulls in [video-use](https://github.com/browser-use/video-use), the open-source cutting toolkit underneath.
3. Install the animation project:
   ```
   cd YouTube/remotion && npm install
   ```
4. For voice cleanup, ask Claude to install Demucs into the same Python environment.
5. Restart Claude Code.

## How to use it

Put your recordings in a folder, then:

```
/ship-video YouTube/edits/my-video/raw
This is a tutorial on X. Cut the dead air, keep my retakes out,
add an intro that shows the 3 steps, blur my email, thumbnail idea: me pointing at a big "3x".
```

It replies with questions, then a short plan, then builds the video.

## Tips

- **Say "retake" out loud** when you mess up a line. It makes the cut easy to find.
- **Write a one-paragraph brief** for every video. The better the brief, the less it asks.
- **Review the cut before the graphics.** Fixing the order early saves re-renders.

---

Made by [@shubham_gunjal_ai](https://instagram.com/shubham_gunjal_ai)
