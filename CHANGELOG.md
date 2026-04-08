# Changelog

All notable changes to the veQueue demo are documented here.

---

## [Unreleased] — 2026-04-08

### Fixed

#### Mobile ESC button now dismisses queue confirm dialogs
**File:** `public/js/input.js` — `handleEsc()`

The mobile on-screen ESC button (`btn-esc`) calls `handleEsc()` on touchstart. Previously, `handleEsc()` jumped straight into checking for open UI panels (simulator, bank, transmuter, etc.) without first checking whether a confirm dialog was waiting for a Y/N response. As a result, mobile players who reached a queue gate (Marketplace or Treasury), advanced through the five-page entry tutorial, and then wanted to decline at the final confirmation prompt had no way to dismiss it — the ESC button did nothing useful, and no other button was wired to "No". The keyboard path was fine (the `keydown` listener checked `G._pendingConfirm` directly before calling `handleEsc()`), but mobile players were stuck.

**Fix:** Added a `G._pendingConfirm` guard at the very top of `handleEsc()`:
```js
if(G._pendingConfirm&&!G._pendingConfirm._info){ _dismissConfirm(false); return; }
```
The `!G._pendingConfirm._info` guard ensures the five-page info tutorial can't be skipped — only the final Y/N confirmation is dismissible this way, matching the keyboard behaviour exactly.

---

#### Player no longer trapped inside fence box after declining queue entry
**File:** `public/js/game.js` — `joinQueue()` → `_onDecline()`

The Marketplace and Treasury buildings are surrounded by a solid FENCE perimeter. The only walkable entry point is the QUEUE_IN tile at the north face of each building (zone row 15). When a player stepped onto that tile, the queue join dialog triggered and `G.paused` was set to `true`. After declining (pressing N or mobile ESC), `G.paused` returned to `false` — but the player was still standing on the QUEUE_IN tile, one tile inside the fence box.

Moving north immediately cleared `G._queueDeclinedTile` (because the player's tile coordinate changed from ty=70 to ty=69), meaning walking back south to row 70 would fire the dialog again. The fence walls on the sides of the gate prevented lateral escape, so players were effectively stuck in a loop: approach gate → dialog fires → decline → walk north → walk south → dialog fires again, endlessly.

**Fix:** `_onDecline()` now immediately snaps the player's Y coordinate back to the centre of the E-W road tile (row `EW_B`, world row 69) after declining, placing them safely outside the fence with room to walk away freely:
```js
function _onDecline(){
  G._queueDeclinedTile={tx:_declineTx,ty:_declineTy};
  if(G.zone==='world') G.y=(EW_B+0.5)*TS;
}
```
`EW_B` was added to the `data.js` import to support this.

---

#### How To Play guide: corrected Marketplace and Treasury gate directions
**File:** `public/js/ui.js` — "Getting Around" tab

The How To Play overlay listed the Marketplace entry as "east gate" and the Treasury entry as "south gate". Both buildings are in the south district of town — the Marketplace occupies the south-west quadrant and its queue gate faces south from the E-W road, while the Treasury occupies the south-east quadrant with its gate symmetrically placed. Neither is accessible from the east or from a dedicated south gate distinct from the other.

**Fix:** Updated labels to `(south-west gate)` and `(south-east gate)` respectively, accurately describing the spatial layout players will see when approaching from Town Square.

---

### Changed (earlier today — commit a74ac51)

#### Interior ceiling renders removed
**File:** `public/js/render.js` — `renderCeiling()`

The `renderCeiling()` function was painting a 64 px (2 tile-rows) dark semi-transparent strip along the north edge of every interior zone to simulate a low ceiling effect. In practice this obscured north-wall doors and NPCs, making it impossible to see where exits were when approaching from the south. The function now calls `ctx.clearRect(0,0,W,H)` instead, leaving the interior view unobstructed.

#### Chamber Warden repositioned in Governance Hall
**File:** `public/js/maps.js` — `makeGovernance()`

The Chamber Warden NPC was placed at tile column 13 inside the Governance Hall, partially hidden behind the right side of the locked Chamber door. Moved to column 10, directly in front of the door, so players see the NPC and its interaction prompt before attempting to open the door.

#### Velvet carpet added to Governance Hall approach
**File:** `public/js/maps.js` — `makeGovernance()`

Added a two-row strip of VELVET tiles at rows 1–2, columns 8–11 leading up to the Chamber door, giving the entrance a visual distinction that signals the guarded zone boundary to players approaching from the main hall.

---

## Earlier entries

See `git log` for the full commit history prior to 2026-04-08.
