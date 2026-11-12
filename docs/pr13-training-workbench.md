# PR13: Actual training workbench integration

## Render-path audit
The shipped entry is public/index.html → public/app.js. Hash routing renders #run through training()/pbLibraryView(), and #calendar through the calendar view. The calendar “安排训练” button and ordinary “编辑课次” both call openEditor('plans'). Previously that branch used the same narrow generic form as unrelated records; the prior full-page work covered openPBWorkout and coach confirmation, not this actual editor. No design image was connected to this form. The new workbench replaces that exact branch and is directly accessible through #run → 编排训练. No new page, Work, repository, or independent demo is created.

## Real component and data changes
- public/training-workbench.js renders the editor, the live structure preview, and course maps. Desktop separates editing and sticky preview; mobile puts identification and a compact preview before the phase controls. The existing footer owns one primary save action.
- public/training-structure.js validates versioned user-authored segments and derives work/recovery sequence and main-work totals. No PB-derived dose or Tempo pace is added. Timeline bar widths are ordinal, not duration/intensity. Course cards and details use actual course snapshots/segments, not decorative illustrations.
- Add/remove/reorder, repeats, distance/time units, target text, rep recovery, set recovery, preparation and cooldown are real controls. The same edited structure drives the live preview and saved trainingStructure. Missing fields remain pending; a filled structure is not independent coaching approval or a generated executable prescription.
- New structure is additive to existing plan fields. A legacy total distance/time is not silently converted into a main-work prescription. Authored course snapshots remain read-only in schedule metadata editing; their actual recipe/calibration flow remains separate. Coach originals, health data, run history, food and memberships are not migrated or deleted.
- Saving uses the existing local transaction path and schedule assessment. Explicit time overlap blocks saving; load/readiness warnings stay recorded. Existing pain and youth execution checks remain in force. No real billing, account changes or paid services are introduced.

## Delivery and checks
Both modules are in the local server map, preview export allowlist and versioned service worker shell. TypeScript 5.9.3 is a pinned dev-only checker for the two new JavaScript modules; the existing application remains JavaScript/React Native. CI runs check:types alongside existing syntax, lint, tests and iOS build checks.

Before screenshots were captured from actual deployed commit 2a96fddfd556e20cda1b4b21e5d754e27b1b9736 at 390×844 and 1440×900, using clean private contexts and the same fixed date for comparison. Final after screenshots must use the deployed final commit and identical viewports/routes. Filled-in examples are separately labeled as synthetic user input, not professional recommendations.

Browser viewport/keyboard-space simulations are not real iPhone, Safari or native GPS/HealthKit acceptance. Independent coaching review remains outstanding and is not established by UI tests.
