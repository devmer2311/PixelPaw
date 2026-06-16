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
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			backgroundThrottling: false,
		},
	})
	win.setAlwaysOnTop(true, "screen-saver")
	if (process.platform === "darwin") win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
	win.loadFile("index.html")
	win.once("ready-to-show", () => {
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
	const p = path.join(__dirname, "assets", "tray.png")
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
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	})
	controllerWin.setMenuBarVisibility(false)
	controllerWin.loadFile("controller.html")
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
