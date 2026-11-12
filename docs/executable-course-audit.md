# PR #13: executable-course acceptance

Review addressed: https://github.com/qitaifeng5-lang/breakwind-app/pull/13#issuecomment-6751569287

## Scope and professional boundary

The existing 800m 200m-repeat and 800m/1500m combination structures now have a manual-lap execution path. This does **not** approve their dose. No repetitions were increased to make a course look more professional. No published source establishes the existing 4 × 200 or 2 × (200 + 150) as a universal prescription. These remain editorial examples, explicitly pending independent review.

Execution requires transcribing/confirming an existing course's missing parameters, not a personal-history questionnaire. The user supplies the actual recovery action, appropriate current reference or calibrated target, warmup/cooldown duration, and parameter source. Unknown actions are blank rather than invented. The resulting specification is user-entered and unverified, never labelled coach-approved. A complete UI workflow is not proof of physiological appropriateness.

## Evidence to rule mapping

- [Haugen et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8363530/): supports distinguishing middle-distance stimulus categories and individualization; does not establish this App's repetition counts, recovery actions or safe workload for an individual.
- [World Athletics speed training, 2022](https://worldathletics.org/personal-best/performance/speed-training-endurance-runners-benefits-limits): public coaching practice includes specific 500m and combination examples for trained runners. It does not supply all recovery modes or segment targets needed for our different 200/150 structure. Those parameters are not attributed to this source.
- [World Athletics injury management, 2021](https://worldathletics.org/personal-best/performance/how-prevent-manage-rehab-muscle-injuries): general preparation/recovery context only. The App's three preparation checks are an editorial workflow, not an evidence-derived minimum warmup duration or injury-prevention guarantee.

`targetBasis` separates current achieved 800m/1500m race-average references, user-entered calibrated threshold targets and coach-entered seconds. For example, 130 seconds over 800m mathematically yields 32.5 seconds per 200m. This is not a threshold estimate, future-goal pace or automatic dose prescription. A missing 1500m reference is not extrapolated from 800m. The 90-day reference confirmation window is a product freshness rule, not a claim that older performances invalidate ability.

## Execution semantics

- Compile explicit sets and repetitions into warmup, work, recovery and cooldown steps. A set recovery replaces the trailing rep recovery; there is no recovery appended after the final main repetition.
- Time, distance, both and either termination rules are distinct. Distance is confirmed by the runner against track markings. Standing recovery cannot have movement distance. Mixed recovery can be represented in the core schema; the initial editor offers one action per recovery.
- Quality distance excludes unknown warmup/cooldown/recovery distance. Total duration is only estimated when every non-work stage is time-defined. Distance-based or mixed time-distance recovery makes total duration unknown rather than falsely precise.
- A session deep-copies the specification, sources, review status and reference performance. Browsing PB changes do not mutate a scheduled or active snapshot. Explicit editing of a scheduled execution specification is a separate user action.
- Manual completion records actual elapsed seconds. Reference alerts never automatically finish a lap. Backgrounding and interruption pause; reopening resumes only on explicit confirmation, without adding unobserved time. Web foreground alerts are not native background support.
- Pain can stop any stage immediately and sets the existing training hold. No mandatory cooldown after pain. Only confirmed completed main laps count toward recorded distance; all elapsed stages remain in the report. Saving the same draft twice is idempotent.

## Verification and remaining limits

Arithmetic fixtures deliberately use illustrative numbers, not training advice. Tests cover same-event reference matching, missing parameters, exact recovery placement, totals, partial distance, interruption, duplicate saves, full 200m and combination execution, and the existing youth/pain gating.

Browser evidence scripts run the real `#run` product, not a separate demo. The recorded execution uses a visibly labelled accelerated test clock; it is not a real workout or a physical iPhone recording. Real iPhone/Safari behavior, background reminders and independent sports-coach review remain unverified. Existing native GPS/HealthKit modules are unchanged.
