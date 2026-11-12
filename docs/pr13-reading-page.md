# PR 13 — shared training reading page

Review: 6811581429. Baseline: d5aab975766521047c769f3beb3ecd57a2674a7f.

## Delivered interaction

The official library, saved course, calendar, generated plan and long-program course adapters now render `workoutDetail`. Coach transcription review and saved coach plans use the same four phase cards. Reading is a section inside the workspace, not a full-screen native dialog; short selectors still use a native dialog. Editing and execution retain their existing separate flows.

Desktop: 224px sidebar, navy reading canvas, title and compact metadata, three actual tab panels, four vertical phase cards, source-derived statistics and bottom actions. Mobile: no sidebar, 18px content inset, main training visible early, secondary structure disclosure, safe-area footer. SVG icons, interrupted short transitions and reduced-motion support replace decorative placeholders.

Navigation preserves the list position, restores the reading page on refresh and supports browser Back. An edit can be discarded back to the original reading page; existing draft handling remains. Warmup and cooldown remain self-ended; work/rest timers and historical snapshots are unchanged. No new prescription values or membership rules are introduced.

## Problems found during verification

- Moving the date input into the fixed footer detached it from its form, preventing schedule saves. All footer controls now explicitly retain their form association; save/reload/cancel verified.
- A mobile PB selector inherited desktop width through the new short-dialog shell. The shell and its content now constrain their width to the viewport.
- Browser automatic history restoration overrode the saved list offset. Page navigation now manages scroll restoration explicitly, tested with nonzero offsets.
- Horizontal transition offset temporarily expanded the narrow document. Page entry uses a short vertical transition instead.

## Evidence scope

The original reference image is not accessible in this workspace. Implementation follows the detailed review's layout and visual specifications; it is not claimed to be a pixel comparison against that missing image.

Before/after capture uses the same 1500m / 500m stable-interval course, uncalibrated state, fixed date and four viewports: 1440×900, 390×844, 375×812 and 430×932. Coach capture uses an explicitly synthetic transcription in an isolated browser profile, never private user data. Screenshots and recording are generated from the deployed app, not design mockups. Additional checks cover 320px, enlarged text and landscape. Browser emulation is not a physical iPhone or Safari/native test.

No prior screenshot baseline is blindly accepted. Assertions check actual card geometry, text visibility above the footer, overflow, tab interaction, route restoration, save/cancel behavior and original private-text preservation.

## Attached reference images — subsequent refinement

The two reference images are now available in the conversation. The shared reading component follows their title/category hierarchy, icon-led metadata strip, wide tab navigation, colored stage rails with running/stretching SVGs, and four-column metric strip. Narrow screens reflow the same data instead of scaling the desktop image. There are no added fake favorite/more actions, synthetic acceptance labels or copied hero-image assets.

The new cumulative-rest metric sums only the executable specification. The real 3×5 minute Tempo remains 15 minutes main work with two 60-second recoveries, not a made-up 6–8km workout or an inferred percentage of 1500m pace. A regression verifies these values and that rendering does not mutate the prescription. Existing preparation/cooldown descriptions remain self-ended.
