# Full-page training and open-ended preparation

This change retains the existing PR13 branch and formal App. Course details, current-reference checks, coach import/review and schedule editing use a full viewport reading page. Mobile uses available visual height and safe areas; desktop uses a bounded two-column reading layout. Primary scheduling/confirmation actions have a separate footer, outside the scrolling content. Existing membership, GPS, HealthKit and nutrition code paths are retained.

## Timing contract
New catalog preparation/cooldown phases have descriptive content without injected 10/15-minute timer targets. Explicit course distances and transcribed coach details remain visible. Warmup and cooldown use elapsed recording and user confirmation; work and recovery gates are unchanged. Pain can stop immediately. Recoveries remain interleaved exactly once, with no recovery after the last work bout before cooldown. Existing saved execution/history snapshots are not migrated or overwritten.

`estimatedSecondsRange` is null when full duration is unknown. `mainRecoverySecondsRange` describes only known main-work and recovery estimates, never a complete session duration. A fixed slot shorter than those known components is rejected; otherwise unknown preparation/cooldown requires capacity review. User-provided complete duration estimates remain possible through existing schedule editing. Actual reports sum logged elapsed seconds once, not planned phase durations; unknown distances remain unknown.

No sets, repetitions, pace targets, rest durations or VIP entitlements were increased/changed. Some aerobic titles now explicitly identify main-work minutes rather than imply an exact whole-session duration. Source descriptions of earlier product timing assumptions remain historical explanation, not an execution threshold.

## Editing and privacy
Coach confirmation defaults to four reading sections with inline edit controls. Explicit save-draft stores a private browser draft; discard clears it; cancellation does not save a plan. Workload/execution restrictions remain separate from scheduling warnings. Drafts do not upload to GitHub. No synthetic test course is inserted into normal user storage; screenshots use an isolated test browser.

## Verification boundaries
Automated checks cover early preparation/cooldown completion, maintained timed-work/recovery gates, exact logged totals, unchanged historical snapshots, draft restart/discard, long content, enlarged fonts, reduced viewport and a reachable bottom action. A reduced browser viewport is a keyboard-layout simulation, not an iOS keyboard/device test. Native iPhone GPS/HealthKit and independent coaching review are not certified by these tests.
