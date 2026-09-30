# Art, room, and experience specification

Date: 2026-09-30. Proposed production baseline. This is a written specification; no room, avatar, storyboard images, or production assets have been created.

Parent: [Product design](../superpowers/specs/2026-09-30-yor-world-design.md).

## 1. Art direction

The user-designated main image sets the room's bright, rounded gaming-studio appearance. Reproduce its white/ivory furniture, blue-and-white chair, layered gaming objects, plants, and prominent colored lighting. Use soft manufactured forms, believable scale, varied matte/gloss finishes, and readable upholstery; the seated human is an addition to this scene.

| Element | Direction |
| --- | --- |
| Base | White/ivory desk and drawer units, pale lavender-gray walls, blue carpet; preserve bright furniture under colored spill |
| Warm light | Visible monitor light bar; a narrow warm counterpoint to the surrounding cool/pink light |
| Cool light | Cyan behind the monitor and beneath the desk, with blue fill across the room |
| Accent | Prominent pink/lilac hexagonal wall lights and purple/pink monitor/PC glow |
| Shape | Small bevels, clean silhouette, occasional chunky personal object |
| Character | Stylized human, believable joints and seated posture, moderate facial detail |
| Surface variation | Painted furniture, blue-and-white upholstery, soft plastic, glass PC panels, plants, and restrained metal reflections |
| Composition | Central monitor; console/mic left; PC/controller pegboard/headset right; chair forward-right; planted shelves and hex lights above |

Approximate working color anchors: wall #CFCDD9, ivory #EDEAE7, chair blue #496DD5, hex pink #F1A5F3, lavender #B99AF5, cyan #74D8F3, and light-bar amber #FFE2A0. These are proposed art anchors, not sampled material values or verified text-contrast pairs. UI color pairs must be measured separately.

The monitor, chair, and large hex-light arrangement jointly establish the reference. Keep the hex lights visibly prominent; control exposure so desk edges and screen content remain legible. Greeting framing may emphasize the added avatar's face temporarily. Personal branding and portfolio UI must fit the composition without erasing gaming props or darkening the room into the earlier portfolio concept.

Typography: a licensed, self-hosted neutral sans for reading and large names; a restrained monospace for actual technical labels. Use system fonts in the first prototype. Select final font only after checking existing license/availability. Body copy remains normal HTML; no required text is baked into room textures.

## 2. Reference interpretation

Main reference: [references/images/main-reference.png](../../references/images/main-reference.png), explicitly designated by the user and inspected on 30 September 2026. It takes precedence over the earlier reference mix. Read supplementary files through the [local reference index](../../references/README.md); original source locations and hashes live in the [manifest](../../references/manifest.json).

| Reference | Use | Do not inherit automatically |
| --- | --- | --- |
| Main image | Visible composition, palette, lighting, furniture, gaming props, plants, shelves, and material character | Editable geometry, exact dimensions, asset ownership, or unseen room surfaces |
| Earlier images 1–6 | Supplementary close-up detail and seated human scale where compatible with the main image | A palette/composition override, exact avatar likeness, or screen activity claimed as real work |
| Images 7–8 | Gray-material and geometry inspection standards | Assumed access to editable models or efficient topology |
| Image 9 | Optional HTML identity treatment only where compatible | Its dark/wood room palette, replacement props, robots, floating terrain, or unsupported titles |
| Video | Camera-motion pacing for the added entrance | A lighting override, music-production identity, piano ownership, or demonstrated interaction |

Maintain a reference register with creator/source URL if known, file hash, permitted use, and notes. A downloaded picture is reference evidence, not permission to redistribute a model or texture. Unknown rights block shipping that asset, not discussing its visual qualities.

## 3. Spatial layout

The image shows one desk corner, not a complete measured room. Blockout dimensions are proposed at 4.2 m wide × 3.6 m deep × 2.8 m high; the added entrance zone extends 1.0 m outside it. Dimensions, doorway, side/reverse walls, and all unseen surfaces are invented geometry to validate through camera tests.

Runtime coordinates: meters, Y up, origin at room-floor center. The rear desk wall is Z = -1.8; added entrance wall is Z = +1.8. X increases toward the right side of the reference. Blender remains Z up; the export pipeline handles the conversion once.

~~~text
             REAR WALL / Z = -1.8
 +------------------------------------------------+
 |      pink/lilac hex lights      pegboard       |
 |      shelves + plants          controllers    |
 |                                                |
 | console/mic   monitor / desk    PC + headset   |
 |              keyboard/mouse                    |
 |                     added resident             |
 |                     blue/white chair            |
 |                                                |
 | plant         added painting/project zones*    |
 | ADDED DOOR / entry path                         |
 +------------------------------------------------+
             FRONT WALL / Z = +1.8
~~~

*Exact added-object locations are provisional. Put the painting on a side-wall area outside the main view, and test project props and window/blinds in secondary zones without displacing reference anchors.

| Object/group | Initial placement/extent |
| --- | --- |
| Desk | Center (0, 0.75, -1.15); 2.6 m wide × 0.8 m deep |
| Main monitor | Center approximately (0, 1.12, -1.36); 0.86 m screen width |
| Chair / added resident | Blue-and-white chair forward-right, feasibility root approximately (0.30, 0, -0.36); validate human fit and tune camera matching without losing its silhouette |
| PC / headset / pegboard | Desk right at X ≈ +1.0; preserve tower, headset stand, and mounted-controller sightlines |
| Console / microphone | Desk left; retain console silhouette and microphone boom |
| Hex lights / shelves | Rear upper wall; retain large light arrangement, plants, camera, and gaming/display objects |
| Shelf camera / AI vs Real | Use the visible left-shelf camera for `ai-real-camera` and SCANNER focus; retain its grouping with the shelf plants |
| Two round desktop speakers / sound | Use the visible speaker pair around the monitor/controller desk grouping for sound controls; preserve their placement |
| Painting | Added side-wall area outside the main view, within one local focus shot |
| Energy model / research books / contact phone | Added secondary props; assign in blockout without replacing reference props or crowding shelves |
| Door | Added front-left; proposed 0.9 m × 2.1 m opening |
| Window/blinds | Added side/reverse-wall zone outside the reference composition; test visibility and lighting impact |

Prove that the door swing and entry path clear one another, the chair can turn without passing through desk geometry, and every camera has an unobstructed path. Model surfaces revealed by the entrance, return, and object-focus shots. Omit unseen internals only after those shots are tested.

## 4. Camera grammar

Use a perspective camera with a restrained field of view. Proposed initial desktop home FOV is 43 degrees; mobile is composed separately rather than cropping the desktop shot.

| Camera | Initial intent | Constraints |
| --- | --- | --- |
| HALLWAY | Door as focal point; light visible at threshold | Navigation and loading status remain HTML |
| ENTRY | Move inside while revealing desk through doorway | No roll, sudden acceleration, wall collision, or simulated head bob |
| REVEAL | Establish reference desk composition and added resident | Do not expose unfinished added geometry or obscure the reference anchors |
| GREETING | Rear three-quarter to resident; readable face turn | No extreme facial close-up |
| HOME_DESKTOP | Initial position (-1.55, 1.42, 1.05), look near (0, 1.0, -1.1) | Revise against the main image; retain chair, hex lights, console, and right PC/pegboard grouping |
| HOME_MOBILE | Closer, elevated three-quarter composition | Character, monitor, and current object fit above controls |
| MONITOR | Align toward screen; transition to sharp HTML panel | Stop moving before interactive text receives focus |
| PC / ENERGY / SCANNER / MICROPHONE | Short object-specific focus | Maximum 1.4-second presentation before navigation |
| ABOUT | Character and personal objects | Text opens in DOM; no face used as reading surface |
| CONTACT | Phone and nearby desk | Form remains readable and keyboard-operable |

Pointer parallax is at most 1.5 degrees on fine-pointer desktop, with damping. Disable on touch, reduced motion, dialogs, camera transitions, and character close views. Scroll is native document scroll; it does not drive the entrance.

Camera and depth-of-field values are named presets. Strong depth blur is reserved for approved cinematic moments and never obscures the active control or text.

## 5. Entrance storyboard

The timeline starts only after essential assets are loaded and decoded. It is not a loading-time guarantee.

| Time | Picture | Character/object action | Sound if explicitly enabled | Exit behavior |
| --- | --- | --- | --- | --- |
| 0.0–0.8 s | Door framed; warm/cool light at threshold | Door opens; light strip grows | Quiet hinge/click | Skip settles HOME |
| 0.8–2.6 s | Camera passes threshold | Character continues coding | Low room tone | Direct link cancels timeline |
| 2.6–3.6 s | Desk and personal objects revealed | Typing continues | Quiet key texture | Essential assets already present |
| 3.6–4.2 s | Camera approaches greeting composition | Typing pauses; notice pose | Keys stop | No action queue builds |
| 4.2–5.4 s | Stable, restrained reframing | Chair/body/head turn together | Soft chair movement | Never rotate head alone through an implausible angle |
| 5.4–6.3 s | Greeting held clearly | Small nod/wave; eye contact | Optional very short user-recorded greeting; absent by default | No lip-sync requirement |
| 6.3–7.6 s | Camera eases toward home | Character returns to keyboard | Typing resumes | Skip can settle instantly |
| 7.6–8.0 s | Home composition settles | Coding idle | Room tone | Exploration available |

Skip lands in a coherent ready state, not at an arbitrary timeline frame. Reduced motion uses the poster/home pose and at most a 150 ms opacity change. Returning visitors do not repeat the entrance automatically.

## 6. Avatar specification

Make the resident recognizable through silhouette, clothing, posture, and a user-reviewed likeness. The current references do not supply a verified portrait.

The main image's empty chair faces outward. A seated typing pose changes chair orientation and introduces occlusion; review that authored difference in home and greeting shots while preserving the chair's shape/colors and the desk composition.

Use a seated figure with normal joint proportions, simplified hair masses, low-complexity clothing, and restrained facial shapes. Hands must visibly clear the keyboard when turning. Feet, chair root, body, and desk contact must agree.

Core deliverables:

| Clip | Proposed length | Review condition |
| --- | --- | --- |
| coding_idle | 6 s loop | Hands stay near keys; loop seam invisible at home camera |
| mouse_idle | 2 s | Hand reaches a consistent mouse position |
| notice_visitor | 0.6 s | Typing pauses without abrupt pose pop |
| turn_to_visitor | 1.2 s | Chair/body/head coordinated; no clipping |
| greeting_nod | 0.9 s | Subtle acknowledgment; readable from intended framing |
| return_to_work | 1.3 s | Hands land plausibly; coding resumes |
| attention_glance | 1.2 s | Small variation for repeat interaction |
| breathing_idle | 4 s loop | Low-amplitude additive motion; no hand drift |

Author at 30 FPS with time-based playback in the browser. Export named actions with explicit ranges and common rest pose. Blend windows begin around 150–250 ms and are tuned after visual review.

Runtime attention adds only small bounded offsets over approved poses. A full-body turn carries the major rotation; head tracking must not compensate for an incorrectly oriented body. Freeze additive attention during clips that own those bones.

Mug drinking, headphone handling, and alternative moods/greetings are queued full-product milestones after the core avatar deliverable. Their work orders need prop/hand rigs, attachment markers, interruption-safe returns, and user likeness/voice sources where applicable. Drawer interiors, additional weather/daylight scenes, and the expanded easter-egg set likewise remain queued production work with separate assets and acceptance evidence; none is delivered by completing the baseline.

## 7. Lighting and materials

Separate invariant room lighting from user-controlled contributions:

- Bake static ambient appearance/AO into the static environment as appropriate.
- Preserve the main image's pink hex glow, cyan fill, and warm monitor light bar in the default preset; use baked/emissive contributions where needed to meet runtime budgets.
- Keep the lamp's switchable local contribution separate; do not bake an always-on lamp into the only base texture and then pretend to turn it off.
- Use a small number of bounded dynamic lights near the resident and interactive objects.
- Use two validated window-fill presets for blinds open/closed; there is no continuous sun/weather simulation in V1.
- Project focus layers temporarily adjust lighting over the user's base preferences; removing focus restores those preferences.
- Use probe/environment lighting and art-directed material response before adding expensive real-time reflection effects.

Review desk, skin, hair, plants, metal, and monitor under every supported lighting preset. Avoid an interaction making labels unreadable or removing the only visible outline of the character.

## 8. Sound

Sound is off by default, with a persistent visible control and a speaker-object equivalent. An explicit Sound on action enables playback if the browser permits it; failure leaves the control honestly off.

Keep desired preference separate from actual engine state. A returning visitor's recorded opt-in may be attempted after their new Enter studio gesture; without that prior opt-in the entry gesture never enables sound. If playback is denied, show Enable sound rather than claiming audio is playing.

Use a small layered palette: room tone, keyboard, hinge, chair, and short object responses. Voice is optional, user-recorded, and separately approved. No synthesized claim of personal voice.

Limit simultaneous one-shot effects to four; repeated inputs coalesce rather than stack audio. Fade when the page loses visibility and pause the audio engine while hidden. The main navigation and feedback remain complete when muted.

Maintain source/license information for every sound. Total compressed V1 sound allocation is 1 MB and is loaded only after sound opt-in.

## 9. Asset production contract

Source folders and generated exports are separate. Each asset record contains asset ID, owner/source, license, source revision, export revision, dimensions, triangle counts per LOD, material count, texture dimensions/format, animation names, byte sizes, and review status.

Recommended asset groups: room-shell, static-desk-group, interactive-props, avatar, and project-effects. Do not create dozens of independent network requests merely because props are separate Blender objects.

Pipeline:

1. Inspect existing user-supplied editable assets if provided; otherwise build a new blockout.
2. Validate a matching main-reference view for composition, palette, and prop placement, then test scale, added geometry, camera paths, door swing, and seated turn.
3. Build one finished desk/monitor/character sample and test in-browser.
4. Produce environment and character using that sample as the visual standard.
5. Bake unsupported procedural appearance into portable textures where appropriate.
6. Export named objects, pivots, collision/hit proxies, and clips.
7. Optimize geometry and textures into tiered runtime exports.
8. Compare an identical reference camera in Blender and the browser; approve material/color differences explicitly.
9. Record budgets and hashes in the release asset manifest.

The glTF animation model centers on object transforms, skeletal poses, and morph weights; Blender-only behavior is not assumed to transfer automatically. Export proof must use the installed Blender 5.2.2 LTS, since the retrieved [Blender export reference](https://docs.blender.org/manual/en/4.1/addons/import_export/scene_gltf2.html) describes an older version.

## 10. Existing-resource route and escalation

Blender is installed; no paid DCC is required by the plan. Parent Codex specifies art contracts, coordinates delegated modeling/export/runtime work, and audits returned assets against the main reference and browser evidence. Workers perform the production labor; the user reviews likeness and visual fidelity. Follow [Delegation and work orders](delegation-and-work-orders.md).

The user reports 2 ChatGPT Plus, 3 Gemini AI Pro, and 15 Claude free browser accounts. No account integration, API access, upload/export path, or available quota has been verified. Assign provider-dependent work only after its actual access and deliverable path are known; account counts do not guarantee parallel production capacity or visual quality.

If a character test fails its visual gate after two focused revision cycles, retain the same product behavior and review three concrete choices: improve the existing rig, reduce facial fidelity while preserving the seated turn, or request a targeted specialist quote. Do not silently replace the resident with a robot or remove the look-back.

Potential separately flagged purchases: a licensed base human rig, a reusable material/audio pack, or a short character-rigging/animation commission. None is required or authorized by the current planning task.
