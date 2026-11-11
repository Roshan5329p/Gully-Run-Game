# UncleChaser Lane-Camping Chappal Attack System

An active ranged attack mechanism for `UncleChaser` ("Sharma Ji") that punishes staying in the same lane for 5 seconds by telegraphing a red lane lock-on marker, winding up with a Hinglish warning shout, and hurling a spinning 3D chappal from behind that players can dodge by switching lanes or jumping.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following gameplay parameters were confirmed in Phase 1 and govern this implementation:

- **Confirmed Decision 1 — 5-Second Lane Camping Threshold**: Staying in the same horizontal lane for 5 seconds triggers Uncle's chappal throw. Switching lanes resets the camping timer.
- **Confirmed Decision 2 — Red Lane Target Marker + Uncle Wind-Up Shout**: During the final 1 second before the throw (`4.0s–5.0s`), a warning red target ring & lane danger stripe locks onto the player's current lane on the asphalt while Uncle pulls his chappal arm back and shouts a lock-on warning (*"Ek hi lane mein bhaagega?! Le chappal!"*).
- **Confirmed Decision 3 — Dual Evasion (Switch Lanes or Jump)**: The thrown chappal launches from Uncle's hand (`z ≈ 2.5`) forward toward the horizon (`-Z`) at `y = 0.65`. Players can evade it either by moving to an adjacent lane before impact or by jumping (`playerPos.y >= 1.15`) so the chappal whizzes beneath their sneakers.

---

## 1. Overview & Core Concept

- **What It Does**: Tracks how long the player remains in a single lane during active gameplay. If the player stays in one lane for 4 seconds, Uncle enters a 1-second wind-up telegraph with a ground target indicator and warning bark; at 5 seconds, he launches a high-speed spinning 3D chappal down that locked lane.
- **Target Audience / Persona**: Players enjoying the Indian bazaar street chase who want dynamic, fair, and humorous interaction with the chasing Uncle that rewards active lane movement and timely jumps.
- **Key Value**: Transforms `UncleChaser` from a purely reactive chaser into an active hazard that prevents passive single-lane camping while giving clear visual and audio counter-play cues.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Lane Tracking (`0.0s – 4.0s`)**: As the player runs, a lane dwell timer tracks time spent in the current lane. Moving left or right immediately resets the timer (unless a throw is already in flight).
  2. **Wind-Up & Target Telegraph (`4.0s – 5.0s`)**:
     - A crimson-orange target bullseye ring and lane warning strip appear on the road surface at the locked lane (`x = lockedLaneX, z = 0`).
     - Uncle's speech bubble switches to a lock-on warning (*"Le beta! Flying Chappal!"* / *"Seedha bhaagta hai?! Yeh le!"*) with a wind-up sound effect, and his right arm cocks far back.
  3. **Chappal Launch & Evasion (`5.0s+`)**:
     - Uncle snaps his right arm forward with a synthesized whoosh sound, and the 3D chappal leaves his hand (`[lockedLaneX, 0.65, uncleZ]`), spinning rapidly forward (`-Z`) past the player toward `z = -45`.
     - **Hit**: If the chappal crosses `z = 0` while the player is in the locked lane (`|playerX - lockedLaneX| < 0.85`) and on the ground (`playerY < 1.15`), it triggers `'player-hit'`, spawns an orange impact particle burst, and resets the cycle.
     - **Dodge**: If the player switches lanes or jumps over `y = 1.15`, the chappal flies harmlessly down the bazaar street and Uncle's hand reloads a fresh chappal after a short recovery.
- **Visual Identity & Theme**:
  - *Telegraph Marker*: Coplanar-safe (`polygonOffset` / `y = 0.035`) concentric red-amber target ring (`#ef4444` outer ring, `#f97316` inner ring) on the asphalt lane with a subtle directional arrow from Uncle toward the player.
  - *Thrown Chappal Projectile*: Multi-part 3D brown leather slipper (`CHAPPAL_SOLE_GEO` + `CHAPPAL_STRAP_GEO`) wrapped in a fiery saffron-red spinning motion ring (`#ff3d00`) so it is unmistakable as it streaks past the camera.
- **Interactive Feedback & Motion**:
  - Smooth wind-up arm rotation on `UncleChaser` before release, followed by a fast follow-through swing and brief empty-hand cooldown while the projectile is in flight.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Lock Target Lane at Wind-Up Start (`4.0s`)**:
  - *Chosen Approach*: When the 4.0-second mark is reached, Uncle locks onto that specific lane X coordinate for the 1-second telegraph and subsequent throw.
  - *Why*: Ensures switching lanes during the 1-second telegraph is a reliable, skill-based dodge rather than having the projectile home in unavoidably.
- **Decision 2 — Self-Contained Projectile Lifecycle in `UncleChaser`**:
  - *Chosen Approach*: Manage the lane-camping FSM (`IDLE` -> `WINDUP` -> `THROWN`), telegraph mesh, and thrown chappal mesh directly inside `UncleChaser` using pre-allocated refs (`useFrame` with zero GC allocations), dispatching the existing `'player-hit'` and `'particle-burst'` window events on impact.
  - *Why*: Keeps Uncle's hand visual state (hiding the chappal in his hand while it is flying through the air), telegraph marker, and collision check tightly synchronized without adding per-frame React state re-renders.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Player World Position (_playerWorldPos)           │
│                  Sampled each frame in UncleChaser useFrame             │
└───────────────────────────────────────┬─────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  Lane-Camping Attack FSM (UncleChaser)                  │
│  • IDLE (0–4s): Tracks currentPlayerLane; resets if lane changes        │
│  • WINDUP (4–5s): Locks targetLaneX, shows ground reticle, cocks arm,   │
│    triggers warning speech bubble + audio.playChappalWindup()           │
│  • THROWN (5s+): Launches 3D Chappal from z = uncleZ -> z = -45         │
│    at speed = 28 u/s, plays audio.playChappalThrow()                    │
└──────────────────┬───────────────────────────────────┬──────────────────┘
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────┐
│   3D Telegraph & Projectile Meshes   │ │  Swept Collision Check (z ≈ 0) │
│  • Target Reticle Group at           │ │  • Checks |playerX - projX|<0.85│
│    [targetLaneX, 0.035, 0]           │ │    AND playerY < 1.15          │
│  • Thrown Chappal Group spinning     │ │  • Dispatches 'player-hit' &   │
│    along [targetLaneX, 0.65, projZ]  │ │    'particle-burst' on hit     │
└──────────────────────────────────────┘ └────────────────────────────────┘
```

### Data Model & State

- **Attack FSM States (`attackStateRef`)**:
  - `'IDLE'`: Monitoring `laneDwellTimeRef`. If `currentLane !== trackedLaneRef`, `laneDwellTimeRef` resets to `0`. When `laneDwellTimeRef >= 4.0`, transitions to `'WINDUP'`.
  - `'WINDUP'`: Lasts `1.0s` (`4.0s` to `5.0s`). Locks `lockedLaneXRef = trackedLaneRef * LANE_WIDTH`, displays the ground target marker at `[lockedLaneXRef, 0.035, 0]`, raises and cocks Uncle's right arm back, and shouts a chappal warning line.
  - `'THROWN'`: Hides the chappal in Uncle's hand, spawns the thrown chappal mesh at `[lockedLaneXRef, 0.65, uncleZ]`, and advances `projZ -= 26 * safeDelta`. Performs a swept Z collision check against the player at `z = 0`. Once `projZ < -40` or on impact, returns to `'IDLE'` and restores the chappal in Uncle's hand.

### Interactive Component & State Mapping

- **Audio Synthesis (`AudioController`)**:
  - `playChappalWindup()`: Rising tense whistle/alert tone + angry Uncle bark when the red lane marker locks on.
  - `playChappalThrow()`: Fast aerodynamic whoosh (filtered noise + pitch drop) when the chappal is hurled.
- **Pause / Status Safety**:
  - Resets `laneDwellTimeRef` and hides active telegraph/projectiles whenever `status !== GameStatus.PLAYING` (e.g., entering `SHOP`, `MENU`, `GAME_OVER`, or `VICTORY`) or while `isImmortalityActive` is active.
