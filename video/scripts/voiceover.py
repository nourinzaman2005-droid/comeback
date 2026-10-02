"""
Generates the ComeBack narration with Microsoft's Ava neural voice, times each
line to its scene, and mixes everything into public/voiceover.mp3.

    python scripts/voiceover.py

Each line has a start time (seconds into the video) and the latest time it
may end. Lines that would overrun are sped up slightly (never above 1.12x).
"""
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts

VOICE = "en-US-AvaMultilingualNeural"
ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "voice-work"
OUT = ROOT / "public" / "voiceover.mp3"
TOTAL = 176.47

# (start, latest end, rate, text). Slower, softer pacing for the story,
# a little brighter for the product walkthrough.
LINES = [
    # Hook
    (0.3, 5.0, "-4%", "In the late two-thousands, Hiruka Fernando was Sri Lanka's best batter."),
    (5.2, 10.0, "-4%", "Then she had a baby. And when she came back... no plan. No support."),
    (10.3, 15.0, "-6%", "Her captain says she had no choice... but to retire."),
    (15.3, 20.0, "-6%", "Pakistan's Nain Abidi put it simply. My heart sank."),
    (20.2, 24.0, "-6%", "For years, pregnancy usually ended her career."),
    # Turn
    (24.3, 28.6, "+0%", "Then, in 2026, the ICC published its guidelines."),
    (28.7, 34.2, "+2%", "Its chairman said: no player should have to choose between motherhood and representing her country."),
    (34.4, 38.0, "+0%", "But it's a PDF. It can't guide her recovery."),
    # Team
    (38.3, 46.0, "+0%", "We're Noo-rin and Aash-ra, an all-women team. Women's health is too often an afterthought in sport. So we built this."),
    (46.2, 51.0, "+0%", "Meet ComeBack: the ICC's six stages, on any phone."),
    (51.2, 56.0, "+2%", "Three promises: cited guidance, a private camera check, and a clinician in charge."),
    # Walkthrough
    (56.4, 65.9, "+0%", "She signs up in under a minute, gives consent, and chooses an ICC-verified clinician."),
    (66.3, 75.2, "+0%", "Her home screen shows exactly where she is. Stage one of six: Ready. And one clear next step."),
    (75.6, 83.8, "+0%", "Every stage comes from the ICC guidelines, with the page number. And it fits her role. She's a bowler, so her plan says so."),
    (84.2, 93.3, "+0%", "She can ask questions in her own words. The AI explains the guidance, but it will never say she's cleared to play. Only her clinician can."),
    (93.7, 113.0, "-2%", "Then, a two-minute check-in. She props up her phone, and AI on the phone itself tracks her movement, and times her balance. Her video never leaves her device."),
    (113.4, 124.2, "+0%", "Then: how did that feel? If she reports a warning sign, like pelvic heaviness, ComeBack pauses her stage, and alerts her clinician."),
    (124.6, 142.0, "-2%", "Her clinician sees the check-in, adds a note, and approves the next stage. The app never does that on its own. A person always decides."),
    (142.4, 152.6, "+0%", "And on her phone, the ring moves to Review. She even gets a notification."),
    (153.0, 159.4, "+0%", "It works in English, Bengali, Hindi and Urdu. And it even works offline."),
    # Impact
    (159.6, 163.7, "+2%", "Built on the ICC's own guidelines, it's ready to pilot now."),
    (163.8, 166.9, "+2%", "Free, offline, and in four languages."),
    (167.0, 171.0, "+2%", "And with FIFA's similar guidance, it can grow to every sport."),
    (171.2, 174.6, "-8%", "Every mother deserves a way back."),
    (174.6, 176.4, "+0%", "This is ComeBack."),
]


def duration(path: Path) -> float:
    return float(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]
        )
    )


async def main() -> None:
    WORK.mkdir(exist_ok=True)
    placed, problems = [], []
    for index, (start, end, rate, text) in enumerate(LINES):
        raw = WORK / f"line-{index:02d}.mp3"
        await edge_tts.Communicate(text, VOICE, rate=rate).save(str(raw))
        length = duration(raw)
        window = end - start
        speed = max(1.0, length / window)
        if speed > 1.12:
            problems.append(f"Line {index}: {length:.1f}s for {window:.1f}s (x{speed:.2f}): {text}")
        fitted = WORK / f"fit-{index:02d}.wav"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", f"atempo={speed:.4f}", "-ar", "48000", "-ac", "2", str(fitted)],
            check=True,
        )
        placed.append((start, fitted))
        print(f"{start:6.1f}s  {length:4.1f}s in {window:4.1f}s  x{speed:.2f}  {text[:60]}")

    if problems:
        raise SystemExit("Too long:\n" + "\n".join(problems))

    inputs, filters = [], []
    for i, (start, path) in enumerate(placed):
        inputs += ["-i", str(path)]
        ms = int(start * 1000)
        filters.append(f"[{i}]adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(placed)))
    filters.append(
        f"{mix}amix=inputs={len(placed)}:normalize=0,"
        "highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,"
        f"loudnorm=I=-16:TP=-1.5:LRA=9,apad,atrim=0:{TOTAL}[out]"
    )
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters),
         "-map", "[out]", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", str(OUT)],
        check=True,
    )
    (WORK / "timing.json").write_text(json.dumps([[s, str(p.name)] for s, p in placed], indent=1))
    print("wrote", OUT, f"{duration(OUT):.2f}s")


asyncio.run(main())


# Background music: "Touching Moments Two - Higher" by Kevin MacLeod
# (incompetech.com), licensed under Creative Commons: By Attribution 4.0.
# The music sits well under the voice and ducks further while she speaks.
MUSIC = ROOT / "input" / "music" / "Touching Moments Two - Higher.mp3"
MIXED = ROOT / "public" / "voiceover-with-music.mp3"

if MUSIC.exists():
    fade_out = TOTAL - 4.5
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", str(OUT), "-i", str(MUSIC),
            "-filter_complex",
            "[0]aresample=48000,asplit=2[voice][key];"
            f"[1]aresample=48000,apad,atrim=0:{TOTAL},loudnorm=I=-30:TP=-6:LRA=11,"
            f"afade=t=in:st=0:d=3,afade=t=out:st={fade_out}:d=4.5[music];"
            "[music][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=700[ducked];"
            "[voice][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.89[out]",
            "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k", str(MIXED),
        ],
        check=True,
    )
    print("wrote", MIXED, f"{duration(MIXED):.2f}s")
