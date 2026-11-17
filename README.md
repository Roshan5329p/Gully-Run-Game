# Gully Runner: Bhaago Beta! (भागो बेटा!)

An immersive 3D Indian street endless runner game built with **React Three Fiber**, **Three.js**, **Zustand**, and **Tailwind CSS**.

---

## 🏏 Game Lore & Story

It’s Sunday 4:45 PM in the mohalla. The gully cricket match is down to the wire on the final ball. Raju steps up, swings his Kashmir Willow bat with everything he’s got, and hits a massive sixer!

**CRASH!** The ball flies directly through Sharma Uncle’s living room window, shattering the glass and sending his steaming cup of afternoon masala chai flying across the floor.

Armed with an airborne chappal and raging fury, Sharma Uncle storms onto the bazaar street shouting:
> *“Meri khidki tod di?! RUK BETA!”*

Your only goal: **BHAAGO BETA!** Sprint through vibrant Indian bazaar streets, leap over vegetable crates, dodge parked auto-rickshaws, and stay ahead of Uncle’s flying chappals!

---

## 🎮 Gameplay Features

### 1. Two Game Modes
- **Story Campaign (Regular Mohalla Run)**: Clear all 3 unique environmental zones to shake off Uncle and reach safety.
- **Endless Bazaar Run**: Infinite escalating challenge with scaling speeds, dense obstacles, and maximum leaderboard score multipliers.

### 2. Procedural Indian Mohalla Environments
- **Zone 1: Subzi Mandi (Vegetable Market)** — Wooden tomato crates, vegetable carts, sacks of potatoes, and startled goats.
- **Zone 2: Street Bazaar** — Yellow-and-green auto-rickshaws, bustling roadside chai stalls, and colorful fabric shops.
- **Zone 3: Temple Ghats & Festival Street** — Evening twilight ambiance, clay diyas, marigold garlands, and festive lamps.

### 3. Authentic Desi Power-Ups & Items
- **☕ Cutting Masala Chai Rush**: Restores 1 stamina heart and unleashes 4 seconds of turbocharged invincibility with warm amber steam vignettes.
- **🔤 Spell B-H-A-A-G-O**: Collect glowing letters across bazaar lanes to trigger massive point jackpots and unlock the roadside *Raju Chai Tapri* shop.
- **🙏 Maa Ka Aashirwad**: Temporary divine blessing that grants invulnerability.
- **🛺 Auto-Rickshaw Shield**: Protective bumper aura absorbing vehicle collisions.
- **⚡ Reflex Phase Dodge**: Emergency auto-dodge that saves you from a fatal hit.
- **🧲 Chumbak Coin Magnet**: Pulls all nearby samosas and coins across all lanes.

### 4. Runner Characters & Persistent Progression
- **Raju The Gully Cricketer**: Balanced runner with cricket bat emergency parry.
- **Simran The Sprint Queen**: Fast-paced runner starting with an extra stamina heart.
- **Kabir The Street Skater**: Urban cruiser equipped with enhanced coin magnet radius.
- **Gully Wallet & Upgrades**: Earn ₹10% score bonus every run to buy permanent stamina heart upgrades that persist across new runs.
- **Daily Mohalla Missions**: Date-based daily challenges (e.g., collect 50 samosas, slide under 5 awnings) with safe reward claiming.

### 5. Accessibility & Audio
- **Web Audio Soundscape**: Procedurally generated Indian street audio including auto horns, temple bells, bicycle rings, and tabla beats.
- **Full Settings Suite**: Master volume control, SFX mute, reduced camera shake accessibility toggle, and skip story intro preference.
- **Pause & Resume**: Seamless pause flow via <kbd>Esc</kbd>, <kbd>P</kbd>, or the in-game HUD pause button.

---

## 🕹️ Controls

| Action | Keyboard Controls | Touch / Mobile |
| :--- | :--- | :--- |
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Swipe Left / Right |
| **Jump** | <kbd>W</kbd> or <kbd>Space</kbd> or <kbd>↑</kbd> | Swipe Up |
| **Slide** | <kbd>S</kbd> or <kbd>↓</kbd> | Swipe Down |
| **Pause / Resume** | <kbd>Esc</kbd> or <kbd>P</kbd> | Pause Button (HUD) |

---

## 🛠️ Architecture & Tech Stack

- **Rendering Engine**: Three.js & React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- **UI Framework**: React 19 + TypeScript + Tailwind CSS
- **State Management**: Zustand store with multi-key `localStorage` persistence
- **Audio**: Web Audio API (procedural synthesis for zero external audio asset latency)
- **Icons**: Lucide React
- **Build Tool**: Vite 6

```
src/
├── components/
│   ├── System/
│   │   └── Audio.ts          # Web Audio synthesizer & bazaar ambient manager
│   ├── UI/
│   │   ├── HUD.tsx            # Main HUD overlay with strict visual hierarchy
│   │   ├── MainMenu.tsx       # Full-screen cinematic title screen & mode selector
│   │   ├── PauseModal.tsx     # Pause & resume overlay with quick stats & settings
│   │   ├── ResultsModal.tsx   # Cinematic results with score reveal & personal bests
│   │   ├── ProgressionModal.tsx # Daily missions, character roster, & demo leaderboard
│   │   ├── SettingsModal.tsx  # Master volume, reduced shake & intro settings
│   │   └── HowToPlayModal.tsx # Controls guide and gameplay rulebook
│   └── World/
│       ├── Environment.tsx    # 3D procedural street, shops, obstacles, lighting
│       ├── Player.tsx         # 3D runner character, physics, lane switching, jumping
│       └── UncleChaser.tsx    # Sharma Uncle 3D model, chappal throwing, chase AI
├── store.ts                   # Centralized Zustand game state & persistent wallet
└── types.ts                   # Game models, enums, items, and character types
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (version 18 or newer)
- npm or yarn

### Installation
```bash
git clone https://github.com/Roshan5329p/Gully-Run-Game.git
cd Gully-Run-Game
npm install
```

### Local Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Type Check & Production Build
```bash
npm run lint
npm run build
npm run preview
```

---

## 🌐 Deployment
This project is continuously deployed on **Vercel** connected via GitHub:
- Production URL: [https://gully-run-game.vercel.app](https://gully-run-game.vercel.app)
