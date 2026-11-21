# Author readings

Recordings are optional. No audio or playback cue is published until its field
is added to the piece's existing `account` object in `site-data.json`.

## Add a short cover reading

1. Save the finished excerpt as `public/audio/excerpts/leaves.mp3` (replace the
   slug for each piece). Record the actual quote in that piece's `excerpt` field.
2. Add `"excerptAudio": "audio/excerpts/leaves.mp3"` inside its existing `account`
   object, keeping its other fields. Commit the data and recording together.
3. Run the usual checks and preview the hosted piece. Confirm hover/mobile-center
   quote reveal, play/pause/resume, completion, rapid taps and keyboard activation.

The quote becomes a button on the hosted story cover, cycle cards and Selected
Works cards. A small play/pause glyph sits inline after the closing quote, kept
with the final word. There is no separate cue row or visible Listen/Pause label;
the entire sentence remains the button. Its initial gentle glow
runs only while the cover is active and stops after interaction. Reduced-motion
users get the static cue. Tapping again pauses; another tap resumes at the same
position. A completed recording can be played again. Double-clicks and taps less
than 300 milliseconds apart are ignored. Clips and full readings cannot overlap.

## Add a full reading later

Save `public/audio/readings/leaves.mp3` and add
`"audio": "audio/readings/leaves.mp3"` to the same `account` object. Either field
can be used independently; no full reading is needed to publish an excerpt.

The full player sits below the journal/date/award details. It uses the homepage's
raised button styling with play/pause glyphs and a seek slider. There is no replay
button or visible time display. The slider supports dragging, five-second arrow
keys, Page Up/Down, and Home/End. Seeking while paused keeps playback paused.

## Storage and validation

Use lowercase filenames with hyphens. MP3, M4A, OGG and WAV paths are accepted;
MP3 is the default delivery choice. Keep editing masters out of the repository.
Recordings are ordinary public static files. The build rejects malformed paths,
missing/empty files, excerpts without quote text, and audio on non-full-text pages.
It does not validate codecs or audio quality. Test actual recordings in desktop
and mobile browsers, including iOS, before publishing them.

Remove either field to remove that player. Do not add placeholder paths, nulls,
or test clips to production data.

## Implementation and settled presentation

`ReadingAudio.astro` supplies full and excerpt controls and dynamically imports
`reading-audio.ts` when a recording is configured. Short excerpts have a `src`
and `preload="auto"` in the initial HTML, so fetching can begin before the
controller loads. Only clips represented on the current page are preloaded;
no audio plays automatically. Each media element is reused on Play, avoiding
a second fetch/reset. Preloading remains subject to browser and network policy.
Full readings still attach their `src` on Play and use `preload="none"`.
Media events update state and progress without a polling/animation loop. Failed
playback can be retried and cancelled requests cannot overwrite later playback.
Without JavaScript (or if enhancement fails), a direct recording link remains.
Leaving the page pauses playback. Shared account CSS may include the player
styles even on stories without recordings.

The 32 excerpts use `-v3.mp3` filenames so browsers request the rebuilt files.
They are mono 192 kbps MP3 copies made directly from the supplied OGG recordings,
with the existing start/end padding trims and internal pauses preserved.

### Required Opus decoding

The FFmpeg 7.1.5 native `opus` decoder used for the first two audio exports
introduced short noise bursts into these recordings, especially at pauses in
Alpha, Mothhead and Clothesline Divorce. The earlier v2 attenuation reduced the
level of those bursts but retained the corrupted waveform. Measurements made
with that same native decoder incorrectly attributed its output to the source.

Explicitly select `-c:a libopus -request_sample_fmt flt` **before `-i`** for every
OGG decode, including source analysis, trimming and conversion. The encoder
selection, `-c:a libmp3lame`, belongs after the input. Do not use the native Opus
decoder or either earlier MP3 export as an editing master. Keep the original
recordings outside the repository.

All 32 original files were cross-checked through libsndfile's Ogg/Opus path.
After accounting for the Opus header's pre-skip, its samples agree exactly with
FFmpeg's explicitly selected floating-point libopus decoder. The complete
finished MP3 waveforms were then compared with those clean source decodes, with
separate checks of the three reported burst intervals. Checking peak levels
alone cannot detect this fault. Browser playback was unavailable during this
verification; these are decoded-sample checks, not a listening-test claim.

Retain fixed attenuation only where needed for encoding headroom: aim for a
3 dB margin in the clean source and verify that the decoded MP3 stays below
-2 dBFS with 4x oversampling. Never boost quiet recordings or apply dynamic
normalization. The regular site build validates paths, not audio fidelity.

Cover audio buttons are siblings of navigation links, never nested within links;
the other cover and Read links keep their existing destinations.

Hosted story cover quotes appear on hover, keyboard focus and mobile viewport
focus even without a clip. Only configured recordings have a pulse/play cue.
The existing small cover date tabs are unchanged. The journal credit's date uses
month, ordinal day and comma/year: `October 17th, 2026`, with `11th/12th/13th`
exceptions. Stored DD/MM/YYYY values and machine-readable ISO dates stay intact.
