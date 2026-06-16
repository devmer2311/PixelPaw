<div align="center">

# 🐾 PixelPaw

### *a tiny pixel cat who lives on your desktop* 🐱✨

```
/\_/\
                          ( o.o )   < mrrp! i live here now
> ^ <
```

**floats over your screen · follows your cursor · kneads while you type · naps · and shouts your reminders in the cutest little speech bubble**

<sub>made with Electron + a lot of pixel love · no telemetry · 100% local</sub>

</div>

---

## 🌸 What is this?

PixelPaw is a little desktop buddy that hangs out on top of everything you're doing. It's not a tracker, not a notification spammer, not Clippy — just a soft, squishy pixel cat that reacts to *you*. It watches your cursor, gets the zoomies, kneads happily when you type, rolls out toilet paper when you scroll, and gently reminds you to take breaks. 🧶

Think of it as a Tamagotchi that lives in the corner of your monitor and quietly keeps you company. 💛

---

## ✨ Features

| | |
|---|---|
| 🐈 **4 switchable cats** | Tuxedo, Orange tabby, Grey & Calico — swap anytime from the controller or tray. |
| 🎨 **Full customization** | Two body colors + gradient, paw color, and coat pattern (tuxedo / tabby / solid / calico). |
| 📏 **Adjustable size** | Resize from **1% to 250%** with a live slider — teeny pocket cat or absolute unit. |
| 👀 **Cursor follow** | Eyes and gaze track your mouse, and the cat *pounces* when you move fast. |
| 🐾 **Typing knead** | Pats two little pads with a happy `>  <` squint. Type *too* much and it **overheats** — turns red with stress marks + steam. 😤 |
| 🧻 **Scroll = toilet paper** | Scroll and watch a roll unfurl down the side. Chaos cat. |
| 🙆 **Horizontal stretch** | Flops out long on all four legs in a big satisfying stretch. |
| 🖱️ **Drag to move** | Grab the cat and place it anywhere on your screen. |
| 🛌 **Perch & nap** | Sits on top of the screen and dozes off, and idles into a nap on its own. |
| 🏷️ **Pet name** | Give it a name — shown on a little tag *below* the cat. |
| 🍅 **Pomodoro timer** | A red `Focus 00:00` badge floats just above its head while you grind. |
| 📣 **Reminders** | Fire as a **cat shout** (no boring OS popup). Add / edit / delete in the controller. |
| 📌 **Pinned message + notes** | Keep a little sticky thought with you all day. |

---

## 🚀 Run it

```bash
npm install
npm start
```

> 🟢 Requires [Node.js](https://nodejs.org) **18+**. `npm install` downloads Electron, so it needs internet the first time.

…and that's it — your new tiny friend appears. 🐾

---

## 📦 Build a shareable installer

Want to send PixelPaw to a friend? It uses **electron-builder**. Build on the OS you're targeting:

```bash
# 🪟 Windows  ->  dist/PixelPaw-3.0.0-win.exe   (NSIS installer)  + a portable .exe
npm run dist:win

# 🍎 macOS    ->  dist/PixelPaw-3.0.0-mac.dmg    (+ .zip)
npm run dist:mac

# 🐧 Linux    ->  dist/PixelPaw-3.0.0-linux.AppImage
npm run dist
```

The finished installers land in the **`dist/`** folder. Share the `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux) and anyone can install it. 🎁

- 🪟 The Windows **NSIS** installer lets users pick the install folder and creates desktop + Start Menu shortcuts.
- 🥡 A **portable** Windows `.exe` is also produced — no install needed, just double-click and go.
- 🔓 Builds are **unsigned**, so the OS may warn on first launch:
  - **macOS:** right-click the app → **Open**.
  - **Windows:** **More info → Run anyway**.

---

## 🎛️ Controls

- 🐈 **Tray icon** → choose a cat, pet it, jump, stretch, perch, start a Pomodoro, or open the controller.
- ⌨️ **Global shortcuts:**
  - `Ctrl/Cmd + Alt + P` → Pomodoro 🍅
  - `Ctrl/Cmd + Alt + S` → stretch 🙆
  - `Ctrl/Cmd + Alt + C` → controller 🎛️
- 🖱️ **Drag** the cat to move it. It's click-through everywhere else, so it never gets in your way.

---

## 🐭 Optional: reactions in *any* app

By default the cat reacts to typing and scrolling **inside its own window**. To make it react to keyboard/scroll activity *everywhere*, install the optional helper:

```bash
npm install uiohook-napi
```

> 🍎 On macOS you'll need to grant **Accessibility** permission:
> System Settings → Privacy & Security → Accessibility.

---

## 🛠️ Tech

**Electron** · **HTML5 Canvas** pixel renderer · zero telemetry · all settings stored locally in your user-data folder. 🔒

---

<div align="center">

### made with 🧶 and a little `meow`

```
  (\_/)
                           ( ^.^ )  thanks for adopting me!
  (")_(")
```

*if PixelPaw makes you smile, give it a little head pat* 🐾

</div>
