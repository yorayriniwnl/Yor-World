# Interaction catalog

Date: 2026-09-30. Behavior contracts for delegated implementation.

Parent: [Product design](../superpowers/specs/2026-09-30-yor-world-design.md).

[Delegation and work orders](delegation-and-work-orders.md) controls assignments and acceptance. This catalog owns interaction behavior; the product and engineering specifications own shared constraints and interfaces. [Art and experience](art-and-experience.md) records the main workstation reference. Preserve its white furniture, blue-and-white chair, colored lighting, plants, gaming props, and pegboard; added interaction props use secondary placements without crowding that setup.

## 1. Shared contract

Each interactive entity registers: ID, label, category, available actions, hit proxy, content destination if any, camera preset, animation command, attention target, sound cue, cooldown, accessible control, reduced-motion behavior, and readiness condition.

Object states: idle, discoverable, active, settling, unavailable. Cooldown is a timestamp restriction, not a reason to disable navigation globally.

Every accepted input returns one of: local reaction, navigate, open panel, update preference, or unavailable-with-explanation. An unavailable project remains a labeled object without a deceptive working link.

## 2. Input rules

| Input | Rule |
| --- | --- |
| Pointer proximity | Small, optional anticipation; no navigation or camera travel |
| Hover/focus | Material-specific feedback and a readable DOM label after 120 ms |
| Primary click/tap | One clear action; never require double-click |
| Touch project object | One tap gives brief acknowledgment and enters its case study |
| Touch decoration | One tap performs its local reaction |
| Drag painting | Capture one pointer; movement threshold 8 CSS px; suppress click after drag |
| Scroll | Native content scroll; never hijack it for room movement |
| Escape | Close top dialog; otherwise cancel focus/intro and return HOME |
| Keyboard | Conventional DOM navigation plus named Room controls |
| Shortcuts | Optional only when no text field/dialog owns input; no unmodified global letter shortcuts in V1 |

Pressing a project link in ordinary navigation goes directly to the route. The room's richer transition is tied to the room action.

Hit proxies may be larger than detailed geometry, but cannot steal input from nearby objects or HTML controls. Use clear priority and nearest visible intersection; ignore occluded objects.

## 3. V1 interaction matrix

All sounds below require explicit sound opt-in. All "panel" outcomes use accessible HTML. RM means reduced motion. Times are proposed maximum presentation durations, tuned within these limits.

| ID / object | Idle and discovery | Activate / outcome | Camera and character | Persistence / cooldown | Touch, keyboard, RM |
| --- | --- | --- | --- | --- | --- |
| entrance-door | Light at threshold; label Enter studio | Open door and start prepared 8 s entrance | ENTRY path; resident notices later | Intro completion persists; ignore duplicate start | Enter button equivalent; RM goes HOME |
| resident | Coding/breathing; small attention shift on hover | Pause, turn, acknowledge, return | No major camera travel; full-body clip sequence | 7 s full-greeting cooldown; repeat gets a small glance | "Greet the creator" in controls; use a personal name only when verified; RM brief acknowledgment pose |
| wall-painting | Tiny material/edge response | Tilt and damp back; optional controlled drag | Camera remains still; resident unchanged | No persistent tilt; 250 ms input coalescing | Tap/button preset tilt; RM label and subtle border response |
| main-monitor | Illustrative code display; screen/label brightens | Focus screen and open YOR launcher | MONITOR preset; character clears hands | Focus is transient; at most 900 ms approach | Same launcher panel; RM opens panel directly |
| candidatex-launcher | CandidateX label within launcher | Evidence motif, then project route | Short screen focus; attention toward monitor | No cooldown on direct links; one active transition | Link navigates; RM skips graph movement |
| helios-pc | Low fan motion; local light/label response | Short network-path motif, then Helios route | PC focus; resident brief glance if free | Temporary lighting layer; no lasting override | Tap/link; RM static network icon then route |
| zenith-model | Small physical energy model | Trace solar/grid/storage path, then Zenith route | ENERGY focus; no full-body interruption | Temporary effect, at most 1.4 s | Tap/link; RM static energy diagram |
| ai-real-camera | Lens reflection; label identifies project | Lens movement and classification motif, then route | SCANNER focus; no bright flash | Effect resets on navigation | Tap/link; RM no scanning movement |
| talks-microphone | Inactive LED; label on discovery | LED/waveform acknowledgment, then Yor Talks route | MICROPHONE focus; no microphone recording | Temporary; audio cue is prerecorded effect only | Tap/link; RM static waveform |
| project-shortcuts | Small labeled DOM rail while in room | Navigate to any published project | No camera dependency | None | Same on all modes; primary accessible equivalent |
| research-books | Quiet shelf; spine highlight/label | Book nudges; Research section/panel opens | Small focus only if comfortable | Return closes focus | Tap/Research link; RM opens directly |
| skills-board | Sparse physical board | Reveal verified skill groups in About page | Local focus; resident unchanged | None | Tap/About link; no skill percentages |
| certificate-frame | Non-readable decorative certificate shape | Open verified credential details | Optional short focus | None | Tap/link; absent public action if no verified credential |
| contact-phone | Screen dark; wakes on hover/focus | Open contact page/form | CONTACT focus; resident may glance | Form draft stays in current page memory only | Tap/link; RM direct form |
| desk-lamp | Current on/off state | Toggle lamp contribution with 250 ms ease | No camera; resident lighting updates | On/off remembered within room session | Labeled switch; RM immediate |
| window-blinds | Current open/closed state | Toggle blinds and validated fill preset | No camera; no weather API | Room-session preference | Labeled switch; RM preset swap |
| desk-clock | Real time in Asia/Kolkata, explicitly labeled | Toggle 12/24-hour format | No camera/character | Format preference persists locally | Button equivalent; RM unchanged |
| speakers | Physical mute indicator reflects actual audio state | Explicit sound enable/disable | No camera; audio engine responds | Mute preference persists; autoplay rules still respected | Visible global Sound control |
| plant-leaves | Still with very low ambient variation | Small bounded leaf deflection and settle | No camera/character | No persistent deformation; 500 ms coalescing | Tap/control preset; RM no swaying |
| keyboard | Resident typing at low amplitude | Brief key response; launcher Commands tab opens | Uses MONITOR focus; one character owner | Transient | Button equivalent; no real shell execution |
| mouse | Subtle pointer/material response | Wake monitor launcher | Same as monitor; no parallel camera owner | Transient | Same as monitor |
| chair | Occupied and stable | Small resident posture adjustment when idle | Root controlled by character director | Block while turning; 5 s cooldown | Named control; RM acknowledgment only |
| about-personal-object | One user-approved object, labeled About | Open About page | ABOUT composition if available | None | Ordinary About link |
| door-inside | Visible from relevant focus; label Replay entrance | Open confirmation panel for replay/reset preferences | No surprise travel on first click | Replay is explicit; resetting preferences separate | Menu equivalents |
| hidden-yor-mark | Hidden behind painting | Reveal small signature once; no gated content | No camera required | Session discovery flag | Accessible optional "Reveal room detail" control |

The interaction catalog defines behavior, not proof that source assets already contain the required pivots, rig, or animations.

## 4. Avatar interaction

Full click response reuses approved clips: stop typing, turn_to_visitor, greeting_nod, return_to_work, coding_idle. Total target is 3.6 seconds.

- A second click during the sequence does not queue another full greeting.
- During the 7-second cooldown, one attention_glance is allowed after the current clip safely finishes.
- A project action cancels the social sequence and settles the avatar into its safe working pose; the user is never forced to wait for the greeting before navigation.
- While a contact/launcher dialog is open, the character cannot steal input or focus.
- The clock, fan, and decorative movement stop being updated when the page is hidden.
- After 30 seconds of no input, ambient action frequency reduces. There is no unrequested new greeting.

A broken or missing optional clip falls back to the approved coding pose. A missing essential avatar asset triggers the declared lightweight presentation and a logged diagnostic; do not silently claim the full world is ready.

## 5. Painting behavior

Pivot at the hanging point, with visible space for the frame to rotate without entering the wall. Maximum local tilt is 6 degrees. Drag maps pointer movement to bounded rotation; release returns to neutral within 1.2 seconds with a damped response.

Dragging releases pointer capture on pointerup, pointercancel, blur, route change, and dialog opening. No global scroll prevention outside the captured drag. Multitouch ignores secondary pointers.

Use a deterministic spring response rather than introducing a whole physics engine for one frame. The hidden detail becomes visible only when the tilt exposes it; no invisible link behind the frame captures clicks.

## 6. Monitor and command interface

The monitor has three explicit states:

1. Ambient: an inexpensive authored canvas/texture illustrates work; it is not a live IDE or a claim about current user activity.
2. Focus: camera settles and the world screen aligns with a DOM launcher.
3. Content: real HTML navigation/dialog owns interaction; tiny perspective text is not the only reading surface.

The launcher's home shows all published projects, with CandidateX featured if its evidence is approved. The monitor itself is not hardwired exclusively to CandidateX.

Commands tab accepts only a fixed allowlist: help, about, projects, skills, contact, github, clear. Commands dispatch application actions. They never reach a shell, evaluate code, or accept arbitrary executable strings. "github" opens a verified configured profile link.

If a transformed DOM screen is blurry or misaligned on a supported browser, use a matching screen-framed HTML panel after the focus shot. The same content/action contract survives this rendering fallback.

## 7. Arbitration and cancellation

Priority, highest first:

1. User navigation, accessibility controls, Skip/Escape, page hide, renderer failure.
2. Project navigation/focus.
3. Explicit character interaction.
4. Environment toggles.
5. Decorative reactions.
6. Ambient loops.

An entrance timeline does not lock out category 1. There is at most one pending high-level intent. A newer navigation replaces an older navigation; decorative actions are dropped when incompatible, not queued.

Every transition has an ID and AbortSignal. Only the current ID can complete or navigate. Cancellation removes owned timers/tweens/sounds, releases pointer capture, restores focus if appropriate, and restores persistent base lighting.

The transient project effect is layered over world preferences. For example, lamp off + blinds closed + muted stays that way after a CandidateX transition is canceled. A return to the room restores a safe pose with those preferences.

## 8. State ownership

| State | Owner | Persisted |
| --- | --- | --- |
| Current public route and history | Next router | Browser history |
| Entrance/exploration/focus/panel phase | Experience controller | Safe return mode only |
| Camera transform/timeline | Camera director | Named safe preset only |
| Character action/attention | Character director | Never an in-progress clip |
| Lamp/blinds and discovered detail | World preferences | Session snapshot |
| Sound, quality, intro completed, clock format | Preferences store | Versioned local storage, fail safely if denied |
| Contact draft | Form component | Current page memory; no analytics/log copies |
| Published content and asset revision | Publication service | Server-side immutable snapshot |

Do not persist the whole state-machine snapshot. Store a small versioned value object and validate it on restore.

## 9. Mobile and accessibility

Mobile has no hover dependency. Keep conventional navigation and a compact project rail visible below the scene. A single project tap navigates; avoid the earlier proposal's ambiguous tap-then-tap-again workflow.

The canvas is not the screen-reader navigation tree. Expose meaningful links and named controls in the DOM; avoid duplicated hidden focus targets for each mesh. Decorative controls belong in an optional Room controls panel.

Focus enters a newly opened dialog, stays inside it, and returns to the invoking DOM control when closed. Direct route changes focus the destination heading. Mesh-originated dialogs restore to the corresponding named Room control if there is no DOM invoker.

Reduced motion produces the same content outcomes without travel, strong blur, large swaying, scan sweeps, or flashing. A visible pause control stops decorative animation without disabling navigation.

## 10. Queued additions after the baseline

Mug drinking, putting on headphones, several drawers, additional weather/daylight scenes, 5–8 easter eggs, and alternative character moods remain in the full-product scope. Sequence them after the V1 baseline through work orders with estimates, required assets, state tests, and performance checks. Each addition must preserve the main workstation composition and shared interfaces. No completion date is assumed; a passing baseline does not mean these additions are delivered.
