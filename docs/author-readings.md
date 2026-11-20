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

The quote becomes a button with a quiet play/pause cue. Its initial gentle pulse
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

`ReadingAudio.astro` supplies full and excerpt controls. The shared account route
imports `reading-audio.ts` dynamically only when a recording is configured.
No audio `src` is attached until Play is pressed; `preload="none"` is also set.
Media events update state and progress without a polling/animation loop. Failed
playback can be retried and cancelled requests cannot overwrite later playback.
Without JavaScript (or if enhancement fails), a direct recording link remains.
Leaving the page pauses playback. Shared account CSS may include the player
styles even on stories without recordings.

Hosted story cover quotes appear on hover, keyboard focus and mobile viewport
focus even without a clip. Only configured recordings have a pulse/play cue.
The existing small cover date tabs are unchanged. The journal credit's date uses
month, ordinal day and comma/year: `October 17th, 2026`, with `11th/12th/13th`
exceptions. Stored DD/MM/YYYY values and machine-readable ISO dates stay intact.
