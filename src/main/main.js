const {
	app,
	BrowserWindow,
	screen,
	ipcMain,
	Tray,
	Menu,
	nativeImage,
	globalShortcut,
} = require("electron")
const path = require("path")
const fs = require("fs")

// Transparent always-on-top windows can render as a white/black square or
// crash on some GPUs; disabling HW acceleration is the standard, safe fix.
app.disableHardwareAcceleration()
app.setAppUserModelId("com.pixelpaw.app")

// ---------- Default cats (presets) ----------
const DEFAULT_CATS = {
	tuxedo: { id: "tuxedo", name: "Tuxedo", bodyA: "#3b3b40", bodyB: "#141417", accent: "#f6f6f2", gradient: true, pattern: "tuxedo" },
	orange: { id: "orange", name: "Orange tabby", bodyA: "#f7a94a", bodyB: "#e07a2c", accent: "#fff1d6", gradient: true, pattern: "tabby" },
	grey: { id: "grey", name: "Grey", bodyA: "#aab2ba", bodyB: "#727a82", accent: "#eef2f5", gradient: true, pattern: "solid" },
	calico: { id: "calico", name: "Calico", bodyA: "#f5ead7", bodyB: "#e6cfa6", accent: "#ffffff", gradient: false, pattern: "calico" },
}

const defaultSettings = {
	activeCat: "tuxedo",
	cats: JSON.parse(JSON.stringify(DEFAULT_CATS)),
	scale: 0.75, // cat size (0.01 - 2.5 = 1%-250%), adjustable in the controller
	petName: "",
	showName: false,
	followCursor: true,
	stretchEnabled: true,
	stretchMinutes: 30,
	pomodoroFocus: 25,
	pomodoroBreak: 5,
	pinnedMessage: "",
	notes: "",
	reminders: [], // { id, text, at (epoch ms), done }
}

const settingsPath = path.join(app.getPath("userData"), "settings.json")
let settings = JSON.parse(JSON.stringify(defaultSettings))
try {
	if (fs.existsSync(settingsPath)) {
		const saved = JSON.parse(fs.readFileSync(settingsPath, "utf8"))
		settings = mergeSettings(defaultSettings, saved)
	}
} catch (e) {
	console.error("read settings failed", e)
}

function mergeSettings(base, patch) {
	const out = { ...base, ...patch }
	// merge cats per-id so we keep all presets
	out.cats = { ...base.cats }
	if (patch.cats) {
		for (const k of Object.keys(patch.cats)) {
			out.cats[k] = { ...(base.cats[k] || {}), ...patch.cats[k] }
		}
	}
	if (Array.isArray(patch.reminders)) out.reminders = patch.reminders
	return out
}

function saveSettings() {
	try {
		fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
	} catch (e) {
		console.error("save settings failed", e)
	}
}

// ---------- Windows ----------
let win = null
let controllerWin = null
let tray = null
const WIN_W = 300
const WIN_H = 340
let hitRegion = { x: 80, y: 60, w: 140, h: 240 }
let ignoring = true
// drag state (window follows the global cursor while dragging)
let dragging = false
let dragStart = { x: 0, y: 0, bounds: null, moved: false }

// The window grows/shrinks with the cat's scale so a 250% cat is never
// clipped and a 1% cat isn't lost in a huge box. Bottom-center stays anchored.
function sizeForScale(scale) {
	const s = Math.max(0.01, Math.min(2.5, scale || 0.75))
	const grow = Math.max(1, s) // only grow above 100%; small cats keep the base box
	const w = Math.round(Math.max(220, Math.min(900, WIN_W * grow)))
	const h = Math.round(Math.max(260, Math.min(1000, WIN_H * grow + 130))) // headroom for bubbles/timer
	return { width: w, height: h }
}

function applyScaleSize() {
	if (!win || win.isDestroyed()) return
	const { width, height } = sizeForScale(settings.scale)
	const b = win.getBounds()
	if (b.width === width && b.height === height) return
	const cx = b.x + b.width / 2
	const bottom = b.y + b.height
	const area = screen.getDisplayMatching(b).workArea
	let x = Math.round(cx - width / 2)
	let y = Math.round(bottom - height)
	// keep on-screen
	x = Math.max(area.x, Math.min(area.x + area.width - width, x))
	y = Math.max(area.y, Math.min(area.y + area.height - height, y))
	win.setBounds({ x, y, width, height })
}

function createWindow() {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize
	win = new BrowserWindow({
		width: WIN_W,
		height: WIN_H,
		x: width - WIN_W - 30,
		y: height - WIN_H - 10,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		show: false,
		paintWhenInitiallyHidden: true,
		resizable: false,
		skipTaskbar: true,
		alwaysOnTop: true,
		hasShadow: false,
		fullscreenable: false,
		webPreferences: {
			preload: path.join(__dirname, "..", "preload", "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			backgroundThrottling: false,
		},
	})
	win.setAlwaysOnTop(true, "screen-saver")
	if (process.platform === "darwin") win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
	win.loadFile("src/renderer/index.html")
	win.once("ready-to-show", () => {
		applyScaleSize() // size the window for the saved scale before showing
		win.showInactive()
		win.setIgnoreMouseEvents(true, { forward: true })
	})
	win.webContents.on("did-finish-load", sendSettings)
}

function sendSettings() {
	if (win && !win.isDestroyed()) win.webContents.send("settings", settings)
	if (controllerWin && !controllerWin.isDestroyed()) controllerWin.webContents.send("settings", settings)
}

function cmd(name, payload) {
	if (win && !win.isDestroyed()) win.webContents.send("command", { name, payload })
}

// ---------- Cursor loop ----------
function startCursorLoop() {
	let last = { x: 0, y: 0, t: Date.now() }
	setInterval(() => {
		if (!win || win.isDestroyed()) return
		const pt = screen.getCursorScreenPoint()
		const b = win.getBounds()
		const now = Date.now()
		const dt = Math.max(1, now - last.t)
		const speed = Math.hypot(pt.x - last.x, pt.y - last.y) / dt
		last = { x: pt.x, y: pt.y, t: now }
		// While dragging, move only after the cursor actually leaves the hold point.
		// This is DPI-safe (screen points and bounds are both in DIP) and never
		// toggles mouse capture, so the cat can't flicker or vanish mid-drag.
		if (dragging) {
			const startBounds = dragStart.bounds || b
			const dragDx = pt.x - dragStart.x
			const dragDy = pt.y - dragStart.y
			if (!dragStart.moved && Math.hypot(dragDx, dragDy) < 4) {
				win.webContents.send("cursor", {
					x: pt.x, y: pt.y, localX: pt.x - b.x, localY: pt.y - b.y,
					winX: b.x, winY: b.y, winW: b.width, winH: b.height,
					speed: 0, overCat: true,
				})
				return
			}
			dragStart.moved = true
			const area = screen.getDisplayNearestPoint(pt).workArea
			let nx = startBounds.x + dragDx
			let ny = startBounds.y + dragDy
			const minX = area.x - hitRegion.x
			const maxX = area.x + area.width - hitRegion.x - hitRegion.w
			const minY = area.y - hitRegion.y
			const maxY = area.y + area.height - hitRegion.y - hitRegion.h
			nx = Math.max(Math.min(minX, maxX), Math.min(Math.max(minX, maxX), nx))
			ny = Math.max(Math.min(minY, maxY), Math.min(Math.max(minY, maxY), ny))
			win.setBounds({ x: Math.round(nx), y: Math.round(ny), width: b.width, height: b.height })
			win.webContents.send("cursor", {
				x: pt.x, y: pt.y, localX: pt.x - nx, localY: pt.y - ny,
				winX: nx, winY: ny, winW: b.width, winH: b.height,
				speed, overCat: true,
			})
			return
		}
		const localX = pt.x - b.x
		const localY = pt.y - b.y
		const overCat =
			localX >= hitRegion.x && localX <= hitRegion.x + hitRegion.w &&
			localY >= hitRegion.y && localY <= hitRegion.y + hitRegion.h
		if (overCat && ignoring) {
			win.setIgnoreMouseEvents(false)
			ignoring = false
		} else if (!overCat && !ignoring) {
			win.setIgnoreMouseEvents(true, { forward: true })
			ignoring = true
		}
		win.webContents.send("cursor", {
			x: pt.x, y: pt.y, localX, localY,
			winX: b.x, winY: b.y, winW: b.width, winH: b.height,
			speed, overCat,
		})
	}, 16)
}

// ---------- Optional global keyboard / scroll hook ----------
function startGlobalHooks() {
	let mod
	try {
		mod = require("uiohook-napi")
	} catch (e) {
		console.log("[pixel-cat] uiohook-napi not installed; typing reactions limited to focused window.")
		return
	}
	try {
		const { uIOhook } = mod
		uIOhook.on("keydown", () => {
			if (win && !win.isDestroyed()) win.webContents.send("key-activity", { t: Date.now() })
		})
		uIOhook.on("wheel", (e) => {
			if (win && !win.isDestroyed()) win.webContents.send("scroll", { t: Date.now(), rotation: e.rotation || 0 })
		})
		uIOhook.start()
		console.log("[pixel-cat] global keyboard/scroll hook active.")
	} catch (e) {
		console.error("[pixel-cat] uiohook start failed", e)
	}
}

// ---------- Tray ----------
function trayIcon() {
	const p = path.join(__dirname, "..", "..", "assets", "tray.png")
	if (fs.existsSync(p)) return nativeImage.createFromPath(p)
	return nativeImage.createEmpty()
}

function buildTray() {
	try {
		tray = new Tray(trayIcon())
	} catch (e) {
		console.error("tray failed", e)
		return
	}
	refreshTray()
	tray.setToolTip("PixelPaw")
}

function refreshTray() {
	if (!tray) return
	const catItems = Object.values(settings.cats).map((c) => ({
		label: c.name,
		type: "radio",
		checked: settings.activeCat === c.id,
		click: () => {
			settings.activeCat = c.id
			saveSettings()
			sendSettings()
		},
	}))
	const menu = Menu.buildFromTemplate([
		{ label: "PixelPaw", enabled: false },
		{ type: "separator" },
		{ label: "Choose cat", submenu: catItems },
		{ type: "separator" },
		{ label: "Pet (purr)", click: () => cmd("purr") },
		{ label: "Jump", click: () => cmd("jump") },
		{ label: "Stretch now", click: () => cmd("stretch") },
		{ label: "Perch on top & sleep", click: () => perchOnTop() },
		{ label: "Nap / wake", click: () => cmd("toggle-sleep") },
		{ type: "separator" },
		{ label: "Start Pomodoro", click: () => cmd("pomodoro-start") },
		{ label: "Stop Pomodoro", click: () => cmd("pomodoro-stop") },
		{ type: "separator" },
		{ label: "Open Controller\u2026", click: openController },
		{ label: "Reset position", click: resetPosition },
		{ type: "separator" },
		{ label: "Quit", role: "quit" },
	])
	tray.setContextMenu(menu)
}

function resetPosition() {
	if (!win) return
	const { width, height } = screen.getPrimaryDisplay().workAreaSize
	win.setBounds({ x: width - WIN_W - 30, y: height - WIN_H - 10, width: WIN_W, height: WIN_H })
}

function perchOnTop() {
	if (!win) return
	const { width } = screen.getPrimaryDisplay().workAreaSize
	const b = win.getBounds()
	win.setBounds({ x: Math.round(width / 2 - WIN_W / 2), y: 0, width: WIN_W, height: WIN_H })
	cmd("perch")
}

// ---------- Controller window ----------
function openController() {
	if (controllerWin && !controllerWin.isDestroyed()) {
		controllerWin.focus()
		return
	}
	controllerWin = new BrowserWindow({
		width: 460,
		height: 720,
		title: "PixelPaw Controller",
		resizable: true,
		minimizable: true,
		maximizable: false,
		webPreferences: {
			preload: path.join(__dirname, "..", "preload", "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	})
	controllerWin.setMenuBarVisibility(false)
	controllerWin.loadFile("src/controller/controller.html")
	controllerWin.webContents.on("did-finish-load", () => {
		controllerWin.webContents.send("settings", settings)
	})
	controllerWin.on("closed", () => (controllerWin = null))
}

// ---------- IPC ----------
ipcMain.on("set-hit-region", (_e, rect) => {
	if (rect && typeof rect.x === "number") hitRegion = rect
})
ipcMain.on("move-window-by", (_e, { dx, dy }) => {
	if (!win) return
	const b = win.getBounds()
	win.setBounds({ x: Math.round(b.x + dx), y: Math.round(b.y + dy), width: b.width, height: b.height })
})
ipcMain.on("drag-start", () => {
	if (!win || win.isDestroyed()) return
	const pt = screen.getCursorScreenPoint()
	const b = win.getBounds()
	dragStart = { x: pt.x, y: pt.y, bounds: b, moved: true }
	dragging = true
	// guarantee the window receives mouse events for the whole drag
	if (ignoring) { win.setIgnoreMouseEvents(false); ignoring = false }
})
ipcMain.on("drag-end", () => {
	dragging = false
	dragStart = { x: 0, y: 0, bounds: null, moved: false }
})
ipcMain.on("request-settings", sendSettings)
ipcMain.on("open-controller", openController)
ipcMain.on("renderer-log", (_e, m) => console.log("[renderer]", m))
ipcMain.on("command", (_e, c) => {
	if (!c) return
	if (c.name === "perch") return perchOnTop()
	cmd(c.name, c.payload)
})
ipcMain.on("save-settings", (_e, patch) => {
	settings = mergeSettings(settings, patch || {})
	saveSettings()
	sendSettings()
	refreshTray()
	applyScaleSize() // window tracks the cat size so it never clips
})

// ---------- Lifecycle ----------
app.whenReady().then(() => {
	createWindow()
	buildTray()
	startCursorLoop()
	startGlobalHooks()
	globalShortcut.register("CommandOrControl+Alt+P", () => cmd("pomodoro-start"))
	globalShortcut.register("CommandOrControl+Alt+S", () => cmd("stretch"))
	globalShortcut.register("CommandOrControl+Alt+C", openController)
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})
app.on("window-all-closed", () => {})
app.on("will-quit", () => {
	globalShortcut.unregisterAll()
	try {
		require("uiohook-napi").uIOhook.stop()
	} catch (e) {}
})
