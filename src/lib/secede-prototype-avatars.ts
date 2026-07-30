/*
 * Every image the prototype displays, inlined as base64.
 *
 * They are carried as strings rather than as imported files on purpose. Any
 * image import, with or without a `?url` / `?inline` query, is claimed by
 * astro:assets and registered for emission outside of tree-shaking. The file
 * then appears in `dist/_astro/` on a production build even though the route is
 * dev-only and renders nothing — a real leak of the author's own photograph and
 * artwork from an unpublished story. A plain string constant lives in the
 * dev-only module graph and is tree-shaken away with the rest of it, which the
 * build verification in the handoff confirms.
 *
 * To replace any of these: prepare the image at the size below, then
 *   python -c "import base64;print(base64.b64encode(open('new.png','rb').read()).decode())"
 * and paste the result in.
 */

/* Ray: the photograph the author supplied — the eye the first chat opens
   on — cropped square at 176px. */
export const rayAvatarDataUri =
  'data:image/jpeg;base64,' +
  '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';

/*
 * Eveline: a crop of the author's own painting, square at 176px.
 *
 * The blur is authored, not an artefact. Ray is reconstructing a conversation
 * from fifteen years ago and does not remember what display picture she had;
 * her face is the one thing on the page that will not resolve. Baked into the
 * image rather than applied in CSS so it holds wherever she appears, with no
 * soft edge where a filter would bleed past the frame. Gaussian radius 5.5 at
 * 176px, which is what reads as unresolvable at the 88px it displays at —
 * regenerate from the source painting if it needs changing.
 */
export const evelineAvatarDataUri =
  'data:image/jpeg;base64,' +
  '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';

/*
 * The three MSN emoticons, at their native 19x19. The author supplied smile
 * and nudge at that size; wink existed only as a 200px upscale, so it was
 * reduced with Lanczos and lightly unsharpened to recover a crisp icon.
 *
 * smile and nudge arrived on opaque white, which would have shown as white
 * boxes against the toolbar's blue gradient. The surrounding white is flood
 * filled to transparent from the four corners only, so white *inside* each
 * face — the eye highlights — is left alone.
 */
export const msnSmileDataUri =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAABzElEQVR4nJWUPY7bMBCFPxnu06ULQAOpRB+Ce4hxlcIHSbH3' +
  '2Ma15hDWIUy2mgPsHZhiaJnaXScIAYESh/PmvfnRwF9WXaYKSjaIAEEYDqfh2f0vDXWRigHhsy2bEhGGF/3kuzmoy1QxdZAA' +
  'WDP07yuoMz12TNeXu6SVTc/sA1APGDvp+9ViCgnyDGV2oDFATA92eYZiDj4miCh5foDvnJXUu5RiIK8Tcp5Wxzu7YiC/3pDf' +
  'b25DICi3q9QV7Glueqn37/03fwwIXgzM07Sry1S3CVdO4Vn1O1sATNbzbLDLphsW2YQRmpNumGY6W/PLKDFAMWUf+8AGcoYS' +
  'ICKMactLklIQosEYHCwi5BZ0uC1SI/+zFFqeMkrE1QDsPIH6D+eevd/P+IhlxO8EYTccToMfdO5n7x/PZ7OZkmclm6Kv0jFU' +
  'DxBaazxkOovxDOXil7I5qAcUysXtsckEoQQ4Hk7D2gO3KxWk5cDPyuUuUbpAjU2SNgECZ9mC1etUPaGt5MZDRviwJ1ejszAm' +
  '4fjis7npztsyVWYfdk+urqXf7Oaj1QN9AntIFv8VNXkxyFqMYsoYBNL29/MUDHzWnIE35BiAILz/+E76mb70+wMQ//IH6p7/' +
  'vQAAAABJRU5ErkJggg==';


export const msnNudgeDataUri =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAB1UlEQVR4nH2UPY7cMAyFPxnpkypdAC2wlT2H8DR7A7rJAuuj' +
  '+B5ppjYPMTrEyK11gNRbbKMUkn/kmYkAw5QoPT4+UTT8Z8R5jATFAw2AFcxLZ57tf+iIs0QCYPMHELa/B05nvTtbLMR5jD4o' +
  'zR5kAbLl34fE9LRjuhpxHiNoyWQPsAfOwwdodqlXmysDBUEHUJfsFRDwTlCXfUBjwbuuTDPOEldIB9KPyR46ZNgYqQN5/wPf' +
  'vidfT6FhVaSUWehF6awpWC328PoDvezkyOtxHmMV5zHe6QTUh/liT8Cn+SpuF6v4ABXoJluOIu9vDCFuzMLmG0Pk4+N3DpLO' +
  'NsAUFHO7Smx2lH0QppxGbaFpNwaeg28ngw9gVvEf6HNXsMcRFBBA0SBUafIEKBzWCxBWIB+E2gqVeenMEUh7vStO7RXtQYd0' +
  'OPkVnwGxuWj9GnEBFbxLG7yDaVDqVpBL0mpyu0sDJtKzWp/T7UpsrKxMpoEcUajbLDZJIx1AhmR7B/QHsHgdo6ejsZI0sYuW' +
  'm8jYLT0QNCi1HTmdD2/TnDuDHVOkJeUFyGYWWXiPoK4Egif97HZd+pnSILk5ZuFRJoS6LdvPUzBYeluq7GXUVvj76yfta/vw' +
  '3D9qpfQ9BICZJQAAAABJRU5ErkJggg==';


export const msnWinkDataUri =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAADiklEQVR4nH2UfUzVZRTHPw/3hTcLxkUbmtgWzBnljCnVWsMQ' +
  'Uhf9wdI7y9LGFjMmvSzWMCtbDV2yZdpmga05yLZoy7UoTbGt1dYLZvFivF1G5HYL4XIv9wr3cn/38u0PQJoRZ3t2nu17zvc8' +
  'z3me74EFTBJNrYXULIjtpPEu6Bret1DqjcH/IV4lHdsuaYduBBcl2nsSgINN4u2Svc3AK+o/LOl5SY1S9DVJefv3uTI/OF37' +
  '0pFFTtQ44/25SBvj6tmtlhdytC3Zob7z6yVtkJSv1urb1Fp1q9R9SFuhThJnf1jgahoAaZOkXbPrWf14skT34lQoukVSmfT3' +
  'Q4p875D+qNHAhXovgCIzBGamD60wVQzjxUGWLb8J0mbL2IEQhCNgj0E8CPZh6g84STIJrL87uSfv0dY1f/EeWTwD7d37kUAX' +
  'G1qkFyW5pfHH1Hv6PrW8Xyj5NkraKYW2SyrVO+Vozs4dTpcGKusA/KcqSEhNa8YYILHqG/ideDQFTJSpqIXfc5Xapwb54q0O' +
  'iIeAaZatcNLw+td8dqKPP3sDkO2olpSR3tcw0y/5lCcdkWKbZA1vkyaflFQhqVz9P23R5a8ekAKlksrUcjxPgACdeA5JL0vS' +
  'HgC7MaD+g/lkeMA/gcFFPBzBlhQD4yCnIB1IgtE4BCM8vHslv5g4HucS3OvaiX33CWd+83gAEgDI2ZMC+XBtDJs1gS01SqjD' +
  'S7jdC7EIDE8Si8aIjoRhJEB+SSruggmioxb2vHK2uutyABJUBZDxKZFBsMawFIfEJM696aX+8Taw28FmsMVj2MIRpgMxpkYs' +
  'LP8kQR/4Oi3st2Q3HzgECd5jjRhjxvAMHSW3EFvYB1aY+6uzGLoyRdu7vZDpxCwJYkuJkpBqge0aDvxkrt3Mt21dR40xY3eu' +
  'acLMfNghIBsGisZxBW/G74ClDgbPjtJcESFr7QR37MhiqctCDnG+ZoynP0yi17cyuLq4JY3kSWA5htmnMUDgS0i7fYNImYCr' +
  'IVjhYvCSGKyfoLvLSTjixT4dprQoF5U6aQ1cNpWVU9eVZOYl9RHGPIEurMOSZTlWu+zRnjacrjAkJcLkFDjSYNU99HaOx66M' +
  'TjtKytqu5y0g9o9nvZDnjYaeUwVSoFa6VCR5d6nj883qu/hqw9womotfZHrM761QH5Lcvp+PP6jpX92KeufjFqf5FyEgnVkQ' +
  '69Qj/0v0D5vtERolyxFZAAAAAElFTkSuQmCC';

/*
 * The display-picture frame. This is the game's own square frame — sprite
 * 1524 out of msgsres.dll, 119x119, the one Messenger uses for an offline
 * contact — recoloured from its silver into the online green, keeping its own
 * bevel, gloss and drop shadow. The shipped green frame (sprite 4401) is
 * 167x120, a landscape shape that will not square off cleanly, so the square
 * one was retinted rather than the green one reshaped. Regenerate by mapping
 * the grey frame's luminance onto a green ramp; it is a straight recolour, no
 * geometry touched.
 */
export const msnFrameGreenDataUri =
  'data:image/png;base64,' +
  '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';

/*
 * Ray after a silent choice: Messenger's exact 119x119 offline frame supplied
 * by the author. Kept as a separate sprite rather than filtering the online
 * green frame, so the bevel, gloss, cyan edge and dimmed silver are the real
 * client asset. Like every prototype image, it remains in the dev-only module
 * graph and cannot be emitted by astro:assets.
 */
export const msnFrameGreyDataUri =
  'data:image/png;base64,' +
  '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';
