# Rebuild the video-edit toolchain. Idempotent. Run from anywhere.
#   powershell -ExecutionPolicy Bypass -File .claude/skills/video-edit/scripts/setup.ps1
$ErrorActionPreference = "Stop"

# Pick up PATH changes winget made that this shell hasn't seen yet.
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [Environment]::GetEnvironmentVariable("Path", "User")

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
$vu   = Join-Path $repo "YouTube\video-use"
$venv = Join-Path $vu ".venv"
$py   = Join-Path $venv "Scripts\python.exe"

Write-Host "repo:      $repo"
Write-Host "video-use: $vu"

# --- system deps -----------------------------------------------------------
foreach ($t in @(@{id="Gyan.FFmpeg"; cmd="ffmpeg"}, @{id="astral-sh.uv"; cmd="uv"})) {
    if (-not (Get-Command $t.cmd -ErrorAction SilentlyContinue)) {
        Write-Host "installing $($t.id) ..."
        winget install --id $t.id -e --scope user --accept-source-agreements --accept-package-agreements --disable-interactivity
        $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "$($t.cmd): $((Get-Command $t.cmd).Source)"
    }
}

if (-not (Test-Path $vu)) {
    Write-Host "cloning video-use ..."
    git clone https://github.com/browser-use/video-use.git $vu
    Remove-Item -Recurse -Force (Join-Path $vu ".git")   # vendor it, no nested repo
}

# --- python env ----------------------------------------------------------------
if (-not (Test-Path $py)) {
    Write-Host "creating venv ..."
    uv venv $venv --python 3.12
}
Write-Host "installing python deps (video-use + faster-whisper) ..."
uv pip install --python $py -e $vu faster-whisper

& $py -c "from faster_whisper import WhisperModel; import numpy, PIL, matplotlib; print('toolchain OK')"
Write-Host "`nReady. Ingest a project with:"
Write-Host "  $py .claude\skills\video-edit\scripts\run_pipeline.py ingest YouTube\edits\<slug>"
