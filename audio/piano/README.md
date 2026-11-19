# Warm grand playback

Licensed source: **Salamander Grand Piano V3**, Alexander Holm, **CC BY 3.0**.
Source revision: `3382bf9496bba2486f5ab0de55a264d1dfc38404`.
https://github.com/sfzinstruments/SalamanderGrandPiano/tree/3382bf9496bba2486f5ab0de55a264d1dfc38404
https://creativecommons.org/licenses/by/3.0/
Original: https://archive.org/details/SalamanderGrandPianoV3
SFZ remapping credit: kinwie; the application does not run the SFZ mapping.
See credits.html for the user-facing attribution, linked in the app footer.

## Scope and tuning

Only screen/PC keyboard and synthesized score-demo playback change. `beep` remains
for game feedback, and MIDI input/scoring, metronome, charts, billing, stems stay
unchanged. This is an approximation of the approved warmer comparison, not the
instrument identity used to render an earlier Wind composition. No composition or
reference audio is imported. Gain/EQ/short stereo room match the approved direction.

Layers 5/8/10 retain source relative levels. The present score format does not have
authored dynamics and screen/PC keys do not report velocity, so they use neutral
layer 8; no invented phrasing or velocity is injected. Explicit velocity in the
engine / audio-plan API supports the other recorded shades. Physical MIDI input
still only judges the external instrument; it does not double-sound it.

## Size, loading, limitations

90 stereo MP3 anchors, MIDI21–108, every minor third, 80 kbps, 44.1 kHz.
Total bank: 4,235,040 bytes (~4.04 MiB); exact individual hashes in manifest.json.
Sample tails: 6s below MIDI48, 5s below MIDI72, 3.5s above, final 250ms fade.
A long written note retains its timing but the acoustic sample can decay to silence
before its note-off; this compact bank is not an infinite sustaining instrument.
Sample-external notes retain the old synth fallback.

Preload only requested working-register medium anchors, 3 concurrent fetches;
other layers lazy. No note-on awaits loading, and completion never replays a late
note. Failed requests retry after 30s. Browser HTTP cache can reuse downloaded
assets; no offline-first/service-worker guarantee is introduced. LRU 36 decoded
buffers (worst-case ~73 MiB at44.1kHz stereo float; temporarily more while active
voices retain evicted buffers). 32 audible voices per route (keyboard/demo),
15ms fade when stealing a sampled voice. Note-on has no convolution pre-delay;
room is parallel, short and subtle. Context uses interactive latency hint, not a
promise of measured device latency.

Demo schedules 150ms ahead, 25ms ticks; ties/selected range/tempo/swing are applied
in the audio plan, not the scored events. Stop/pause ends scheduling immediately,
fades the existing demo bus then disposes sources/effect route. Resume uses
sample offset for a held note rather than playing its attack again. Source expiry
means no sound is restarted once the recording has naturally finished.

demo.js is shared code across trainer projects: optional schedule cleanup is
backward-compatible; this PR changes only sight-reading's copy.

## Rebuild and validate

Python3 + ffmpeg: `python scripts/build-piano-samples.py` (downloads pinned original
FLACs into /tmp, outputs MP3 and manifest including source and output SHA256).
`node --test tests/*.test.cjs`; `git diff --check`.
No npm/build step or pre-existing automated suite was present.
Cloud Chromium cannot start here (socket() Operation not permitted), so tests use
Web Audio/DOM fakes. Real Safari/iPhone sound, touch unlock, memory, latency and
headphone/Bluetooth delay remain device checks before release. Browser-emulated
iPhone would not establish hardware latency. This branch is not a deployment.
