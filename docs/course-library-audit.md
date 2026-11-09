# Training course discovery audit — 2026-11-08

## PR #13 product review follow-up

Read [the latest product review](https://github.com/qitaifeng5-lang/breakwind-app/pull/13#issuecomment-6730275623) before editing the same branch. This follow-up changes only course depth and the live training discovery layout.

800m and 1500m now each offer two choices per category. The alternatives are original educational examples, still pending independent review. Adjacent PB values may share the same structure; PB never increases repetitions or weekly quality-session count.

| Category | Different learning goals |
| --- | --- |
| Intervals | Distance-based repeated rhythm versus time-based aerobic control; 800m and 1500m use different distance/time examples. |
| Speed endurance | Repeated single distances versus a split-distance session with within-set and between-set recovery. Stop when mechanics deteriorate. |
| Tempo | Re-enter a controlled rhythm after recoveries versus sustain a continuous effort; no PB-derived threshold pace. |
| Speed / technique | Relaxed acceleration versus low-fatigue coordination practice. |
| Combination | Two-distance repeated sets versus a three-distance rhythm transition. |
| Aerobic / recovery | Easy recovery versus continuous easy entry, steady aerobic work and deliberate slowing. |
| Hills | Controlled short uphill repetitions versus low-load terrain, walking and downhill-control technique. |

Phase patterns are explicit: base emphasizes aerobic continuity/technique; specific preparation has two separated main stimuli (800m rhythm/combination, 1500m timed aerobic intervals/Tempo); pre-competition retains one key stimulus and more recovery; recovery weeks omit quality sessions. These are browsable examples, not automatic prescriptions, fixed week volumes or a race-date taper. The middle-distance review's variation/individualization discussion informs the organization; it does not validate these original doses. Longer-distance events display their incomplete/general-example coverage explicitly.

The initial page now contains one event/PB summary and the single/week switch, with course content visible on the first screen. Event/PB, category and phase choices open only on demand. Event changes are drafts until a PB choice or explicit apply; cancellation preserves the previous summary and stored schedule. Cards have one detail-opening action and an expandable structure. Sources and pending-review labels remain visible in details and on cards.

Acceptance includes both 800m and 1500m category → alternative → detail → phase flow, first-screen course bounds, all four distinct weekly structures, known-pain protection, PB cancellation/save precision and existing business flows. The recording script now demonstrates actual horizontal swipes, expansion, return, drag-to-dismiss, date swipe, **PB cancel followed by save**, and reload persistence. Browser dimensions remain separate from physical iPhone/Safari acceptance.

## Scope and provenance

The repair branch starts from `a42f4ca` on the existing `feat/pb-tier-workout-library` branch, which contains `3602034` from the previous mobile preview. It preserves that work rather than overwriting the parallel branch. Native GPS, HealthKit, food storage and existing activity records are unchanged.

The old `groupWeek` coupled missing in-app history to a 15-minute cap and excluded every minor from quality sessions. It now returns a course preview. Three independent concerns are explicit:

1. Discovery: every event and category remains browsable without uploaded history or a questionnaire.
2. Matching: PB bands are product navigation groups, not medical or official athlete classifications. They change applicable ranges, recovery guidance and weekly relationships; faster PB does not automatically increase repetitions.
3. Execution: `courseReadiness` checks known pain, unresolved injury, recent fatigue, nearby hard sessions and youth adaptation. Adding a course stores a pending schedule, not a fitness clearance. Starting the existing recording flow requires a brief current-state confirmation and rechecks safety.

## Evidence mapping and limits

All entries are **pending professional review**. No coach identity, review date or approval is fabricated. Their dosage is an original educational example, not a validated individual prescription.

| Source | Rule actually used | Limit |
| --- | --- | --- |
| [Haugen et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/) | Separate middle-distance speed, speed endurance, aerobic and race-specific work; adequate recovery for short speed repetitions | Review combines research and elite practice, predominantly adult men. It does not validate our original repetitions or justify copying elite volume. |
| [World Athletics, 2022](https://worldathletics.org/personal-best/performance/speed-training-endurance-runners-benefits-limits) | The 1500m discovery example uses 3 × 500m with 3-minute recovery, within the published 3–4 repetitions / 2–3 minutes example | Public coaching practice, not a trial of this App or a PB-derived prescription. Other distances are not attributed to this dosage. |
| [World Athletics, 2021](https://worldathletics.org/personal-best/performance/hill-running-training-variety-speed-sessions) | Short uphill work and walking downhill recovery | Controlled technique is an editorial adaptation; not the source's maximal sprint prescription. Terrain and experience matter. |
| [Youth running consensus, 2021](https://pubmed.ncbi.nlm.nih.gov/33122252/) | Maturity, recovery and supervision matter; adult dosage cannot be inferred from age or PB | Youth technique variants remain pending coach review. Adult intensity stays browsable but cannot be scheduled for known minors. |
| [IOC load consensus, 2016](https://pubmed.ncbi.nlm.nih.gov/27535989/) | Distinguish training load from recovery and current readiness | Two low-load days between quality sessions is a conservative product rule, not a scientifically guaranteed safe threshold. |

Each course stores event, PB band, phase, purpose, warmup, segments, repetitions, within-set and between-set recovery, cooldown, intensity basis, adjustments, sources and review status. Week previews show recovery relationships and at most two quality sessions, rather than stacking all seven categories. Recovery weeks have no quality session. Road-distance templates remain general educational structures; individualized marathon load progression is not claimed.

## Interaction and regression evidence

- Actual route `#run`: horizontal event/PB/category rails, single-course and week modes, original SVG covers, expandable cards, full bottom-sheet structure, direct scheduling and existing run recording.
- Numeric PB selector: minutes/seconds, hundredths for middle distance, hours for long distance; no autofocus or mandatory colon typing. Cancel and later PB changes do not mutate scheduled snapshots.
- Search, touch date swipe, drag-to-close, interruptible card animation and reduced motion are covered by browser tests.
- The initial full-flow run caught an unhandled View Transition skip during rapid navigation. The animation readiness rejection is now handled without masking functional update failures.
- A readiness test exposed accidental exclusion of historical rows with missing IDs; matching only an explicit saved plan ID fixed that gap.
- Linux CI caught a small-screen sheet extending below the resized visual viewport during its entrance animation (88/90 browser checks initially passed). Viewport resize now finishes that entrance transform immediately; the strict boundary check is retained.
- Unit tests, lint, syntax, integrity and iOS configuration checks pass. Existing product flows pass at six viewport sizes; additional course flows cover PB recovery differences, duplicate schedule prevention, persistent custom precision, youth gating and reduced motion.

## Acceptance boundary

Browser screenshots and WebM recording are generated by `scripts/verify-preview.mjs <full-commit-sha>`, against the deployed HTTPS build. The script checks the visible build metadata, all imported module versions, active cache revision, persisted scheduling and absence of page errors. Screenshots and local test data stay in ignored `.expo/` output, not the public repository.

Chromium with iPhone dimensions is **not physical iPhone or Safari acceptance**. Native GPS/HealthKit real-device behavior was not tested in this repair. Independent sports-coach review remains required before labeling these examples professionally approved.
