# Visual thesis: the recovery proof sheet

Restore Drill Attestor uses a **dithered/halftone print system** inspired by a
machine-room test sheet: an artifact deliberately stamped after a destructive,
repeatable procedure. The image is not nostalgic decoration. Coarse dots make
the disposable restore environment visibly distinct from the crisp, permanent
attestation layered above it. Registration marks, rules, and numbered stages
communicate repeatability and custody.

## Palette

The site is intentionally single-mode, like warm uncoated stock under an
inspection lamp. `paper #F2EAD8` is the background, `ink #17211B` the primary
text, `quiet ink #536057` muted copy, and `sheet #FFF9EA` the raised surface.
`signal orange #B33A18` marks actions and destructive boundaries;
`verification green #176044` means a passed check; `warning ochre #8A5700` and
`failure red #9F2E28` complete the operational states. Body text has at least
7:1 contrast on paper. Dot fields use ink at low opacity and never carry state
alone.

## Type and spacing

The display face is self-hosted **Bricolage Grotesque**, chosen for blunt,
tool-label headlines without becoming a terminal cliché. Operational copy uses
the system monospace stack because commands and durations must align. One local
Latin WOFF2 file is subset and kept under the 120 KB font budget. Type steps are
16/20/28/48/72px; even compact evidence labels stay at the 16px baseline.
Spacing follows an 8px base with 4px optical corrections;
the content rail is 1184px and prose stops at 68 characters.

## Interaction grammar and depth

Controls look like press controls: square-ish 2px borders, a 4px ink shadow,
and a two-pixel pressed translation. Evidence sheets sit above the halftone
field; state changes arrive as a paper strip sliding a short distance from the
left. Focus is a double signal-orange/ink ring, never a browser-default afterthought.
At 390px, navigation collapses to the three decisions operators need—install,
run, inspect—while the demonstration becomes one vertical proof sheet.

## Motion

Motion is functional and finite: 180ms press feedback, 260ms proof-strip
entries, and one user-triggered drill sequence. Only opacity and transforms are
animated. Under `prefers-reduced-motion: reduce`, all stages appear immediately
with no translation. Nothing loops or flashes.

## Original asset plan and provenance

The hero is a generated editorial halftone illustration of an isolated database
cylinder passing through a four-stage proof press (restore, check, destroy,
attest), with generous paper-colored negative space and no text/logos. It is
generated specifically for this product via `/opt/fleet/lib/gen-image.sh` using
the factory `factory-image` deployment, then converted locally to WebP at two
responsive sizes (≤300 KB). Prompt metadata is retained beside the source
image. CSS-authored dot screens and registration crosses are original project
elements. License: project artwork, © 2026 Sociobot, distributed with this MIT
repository.

The 1200×630 social preview is a deterministic center crop of the original
proof-press artwork. The 180×180 touch icon is hand-composed from the same ink,
paper, signal-orange, circular press plate, and check-mark geometry. Both are
original derivatives created locally with ImageMagick on 28 August 2026.
