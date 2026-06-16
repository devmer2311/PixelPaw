# 🐾 PixelPaw

A tiny pixel cat that lives on your desktop — floats over your screen, follows your cursor, kneads while you type, stretches, naps, and reminds you of stuff by **shouting** in a speech bubble. Fully customizable from a modern control panel.

## ✨ Features

- **4 switchable cats** (Tuxedo, Orange tabby, Grey, Calico) — pick from the controller or tray.
- **Full customization**: two body colors + gradient, paw color, and coat pattern (tuxedo / tabby / solid / calico).
- **Adjustable size**: resize the cat anywhere from **1% to 250%** with a live slider.
- **Cursor follow** — eyes + gaze track your mouse, and the cat pounces at fast movement.
- **Typing knead** — taps two little pads with a `>  <` happy squint; type a lot and it **overheats** (turns red with stress marks + steam).
- **Scroll = toilet-paper roll** unrolling down the side.
- **Horizontal stretch** — stretches out flat on all four legs (no text, just the pose).
- **Mochi drag** — grab and fling it; the body squishes and springs back.
- **Perch & nap** — sits at the top of the screen and sleeps; idles to sleep on its own.
- **Pet name** — optional name tag shown *below* the cat.
- **Pomodoro timer** — a red `Focus 00:00` badge floats just above the cat's head.
- **Reminders** — fire as a **cat shout** (no OS popup). Add / edit / delete in the controller.
- **Pinned message + notes**.

## 🚀 Run it

```bash
npm install
npm start
```

> Requires [Node.js](https://nodejs.org) (18+). `npm install` downloads Electron, so it needs internet the first time.

## 📦 Build a shareable installer

The app uses **electron-builder**. Build on the OS you're targeting:

```bash
# Windows  -> dist/PixelPaw-3.0.0-win.exe  (NSIS installer)  + a portable .exe
npm run dist:win

# macOS    -> dist/PixelPaw-3.0.0-mac.dmg  (+ .zip)
npm run dist:mac

# Linux    -> dist/PixelPaw-3.0.0-linux.AppImage
npm run dist
```

The finished installers land in the **`dist/`** folder. Share the `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux) and anyone can install it.

- The Windows NSIS installer lets the user choose the install folder and creates desktop + Start Menu shortcuts.
- A **portable** Windows `.exe` is also produced — no install needed, just double-click.
- macOS/Windows builds are unsigned, so the OS may show a "unidentified developer" / SmartScreen warning the first time (right-click → Open on macOS; "More info → Run anyway" on Windows).

## 🎛️ Controls

- **Tray icon** → choose a cat, pet, jump, stretch, perch, Pomodoro, open the controller.
- **Global shortcuts**: `Ctrl/Cmd+Alt+P` Pomodoro · `Ctrl/Cmd+Alt+S` stretch · `Ctrl/Cmd+Alt+C` controller.
- **Drag** the cat to move it (mochi squish). It's click-through everywhere else.

## ⌨️ Optional: typing/scroll reactions in *any* app

By default the cat reacts to typing/scrolling in its own window. To make it react to global keyboard/scroll activity, the optional `uiohook-napi` dependency is used if present:

```bash
npm install uiohook-napi
```

On macOS you must grant **Accessibility** permission (System Settings → Privacy & Security → Accessibility).

## 🛠️ Tech

Electron · HTML5 Canvas pixel renderer · no telemetry, all settings stored locally in your user-data folder.
