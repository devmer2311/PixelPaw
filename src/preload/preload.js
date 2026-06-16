const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("pet", {
	// main -> window pushes
	onCursor: (cb) => ipcRenderer.on("cursor", (_e, data) => cb(data)),
	onKeyActivity: (cb) => ipcRenderer.on("key-activity", (_e, data) => cb(data)),
	onScroll: (cb) => ipcRenderer.on("scroll", (_e, data) => cb(data)),
	onCommand: (cb) => ipcRenderer.on("command", (_e, data) => cb(data)),
	onSettings: (cb) => ipcRenderer.on("settings", (_e, data) => cb(data)),
	// window -> main
	setHitRegion: (rect) => ipcRenderer.send("set-hit-region", rect),
	moveWindowBy: (dx, dy) => ipcRenderer.send("move-window-by", { dx, dy }),
	requestSettings: () => ipcRenderer.send("request-settings"),
	saveSettings: (patch) => ipcRenderer.send("save-settings", patch),
	sendCommand: (name, payload) => ipcRenderer.send("command", { name, payload }),
	openController: () => ipcRenderer.send("open-controller"),
	log: (msg) => ipcRenderer.send("renderer-log", msg),
})
