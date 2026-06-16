/* Behavior + animation loop (v3). */
const canvas = document.getElementById("cat")
const cat = new CatRenderer(canvas)
const pinEl = document.getElementById("pin")
const timerEl = document.getElementById("timer")
const shoutEl = document.getElementById("shout")
const nameEl = document.getElementById("petname")

let settings = null
const now = () => performance.now()

const S = {
	eyeDir: { x: 0, y: 0 },
	blink: 0,
	nextBlink: now() + 3000,
	kneadPhase: 0,
	kneading: false,
	kneadUntil: 0,
	heat: 0,
	lastKeys: [],
	hearts: [],
	paperLen: 0,
	paperUntil: 0,
	stretchStart: 0,
	stretchUntil: 0,
	hopV: 0,
	hop: 0,
	sleeping: false,
	lastActivity: now(),
	huntUntil: 0,
	huntLean: 0,
	purrUntil: 0,
	// mochi drag spring
	mochi: 0,
	mochiV: 0,
	mochiTarget: 0,
}

let pomo = null
let stretchTimer = null
let shoutTimer = null
const firedReminders = new Set()

function scheduleStretch() {
	if (stretchTimer) clearTimeout(stretchTimer)
	if (!settings || !settings.stretchEnabled) return
	const ms = Math.max(1, settings.stretchMinutes || 30) * 60000
	stretchTimer = setTimeout(() => { triggerStretch(); scheduleStretch() }, ms)
}
function triggerStretch() {
	if (S.sleeping) wake()
	S.stretchStart = now()
	S.stretchUntil = now() + 2600
	// no text bubble during a stretch — just the pose
}

function startPomodoro() {
	const fM = Math.max(1, (settings && settings.pomodoroFocus) || 25) * 60000
	const bM = Math.max(1, (settings && settings.pomodoroBreak) || 5) * 60000
	pomo = { phase: "focus", endsAt: now() + fM, focusMs: fM, breakMs: bM }
	timerEl.classList.remove("hidden", "break")
}
function stopPomodoro() { pomo = null; timerEl.classList.add("hidden") }
function tickPomodoro() {
	if (!pomo) return
	if (pomo.endsAt - now() <= 0) {
		if (pomo.phase === "focus") {
			pomo.phase = "break"; pomo.endsAt = now() + pomo.breakMs
			timerEl.classList.add("break"); triggerJump(); shout("Break time! \u2615", 4000)
		} else {
			pomo.phase = "focus"; pomo.endsAt = now() + pomo.focusMs
			timerEl.classList.remove("break"); shout("Back to focus!", 4000)
		}
	}
	const rem = Math.max(0, pomo.endsAt - now())
	const mm = String(Math.floor(rem / 60000)).padStart(2, "0")
	const ss = String(Math.floor((rem % 60000) / 1000)).padStart(2, "0")
	timerEl.textContent = `${pomo.phase === "focus" ? "Focus" : "Break"} ${mm}:${ss}`
}

function triggerJump() { if (S.sleeping) wake(); S.hopV = -7 }

// reminders: cat shouts only (no system notification)
function checkReminders() {
	if (!settings || !Array.isArray(settings.reminders)) return
	const nowMs = Date.now()
	let changed = false
	for (const r of settings.reminders) {
		if (r.done || firedReminders.has(r.id)) continue
		if (r.at && r.at <= nowMs) {
			firedReminders.add(r.id)
			r.done = true
			changed = true
			if (S.sleeping) wake()
			shout(r.text || "Reminder!", 9000)
			triggerJump()
		}
	}
	if (changed) window.pet.saveSettings({ reminders: settings.reminders })
}

function shout(text, ms) {
	shoutEl.textContent = text
	shoutEl.classList.remove("hidden")
	shoutEl.style.animation = "none"
	// eslint-disable-next-line no-unused-expressions
	shoutEl.offsetHeight
	shoutEl.style.animation = ""
	if (shoutTimer) clearTimeout(shoutTimer)
	shoutTimer = setTimeout(() => shoutEl.classList.add("hidden"), ms || 4000)
}

function spawnHeart() {
	const hb = cat.hitBox()
	S.hearts.push({ x: hb.x + hb.w / 2 + (Math.random() - 0.5) * 26, y: hb.y + 24, life: 1, vy: 0.5 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.6 })
}

// inputs
window.pet.onSettings((s) => applySettings(s))
window.pet.onCursor((c) => handleCursor(c))
window.pet.onKeyActivity(() => handleKey())
window.pet.onScroll(() => handleScroll())
window.pet.onCommand((c) => handleCommand(c))
window.addEventListener("keydown", () => handleKey())
window.addEventListener("wheel", () => handleScroll())

function applySettings(s) {
	settings = s
	const active = (s.cats && s.cats[s.activeCat]) || null
	if (active) cat.setPalette(active)
	cat.setScale(typeof s.scale === "number" ? s.scale : 0.75)
	if (s.pinnedMessage && s.pinnedMessage.trim()) { pinEl.textContent = s.pinnedMessage; pinEl.classList.remove("hidden") }
	else pinEl.classList.add("hidden")
	if (s.showName && s.petName && s.petName.trim()) { nameEl.textContent = s.petName; nameEl.classList.remove("hidden") }
	else nameEl.classList.add("hidden")
	if (Array.isArray(s.reminders)) for (const r of s.reminders) if (!r.done) firedReminders.delete(r.id)
	scheduleStretch()
	reportHit()
}

function handleCursor(c) {
	S.lastActivity = now()
	if (S.sleeping) wake()
	const hb = cat.hitBox()
	const centerX = c.winX + hb.x + hb.w / 2
	const centerY = c.winY + hb.y + hb.h / 3
	const dx = c.x - centerX, dy = c.y - centerY
	const d = Math.hypot(dx, dy) || 1
	S.eyeDir = { x: Math.max(-1, Math.min(1, dx / 130)), y: Math.max(-1, Math.min(1, dy / 130)) }
	if (c.speed > 1.6 && d < 460) { S.huntUntil = now() + 480; S.huntLean = Math.max(-12, Math.min(12, dx / 28)) }
	if (c.overCat && c.localY < hb.y + hb.h * 0.4 && c.speed < 0.5) S.purrUntil = now() + 700
}

function handleKey() {
	S.lastActivity = now()
	if (S.sleeping) wake()
	const t = now()
	S.lastKeys.push(t)
	S.lastKeys = S.lastKeys.filter((k) => t - k < 2500)
	S.kneading = true
	S.kneadUntil = t + 700
	if (S.lastKeys.length / 2.5 > 4) S.heat = Math.min(1, S.heat + 0.07)
}
function handleScroll() { S.lastActivity = now(); if (S.sleeping) wake(); S.paperUntil = now() + 700 }

function handleCommand(c) {
	switch (c && c.name) {
		case "purr": S.purrUntil = now() + 1800; break
		case "jump": triggerJump(); break
		case "stretch": triggerStretch(); break
		case "toggle-sleep": S.sleeping ? wake() : sleep(); break
		case "perch": sleep(); break
		case "pomodoro-start": startPomodoro(); break
		case "pomodoro-stop": stopPomodoro(); break
		case "shout": if (c.payload) shout(String(c.payload), 5000); break
	}
}
function sleep() { S.sleeping = true }
function wake() { S.sleeping = false }
function reportHit() { window.pet.setHitRegion(cat.hitBox()) }

// dragging + mochi stretch
let dragging = false
let dragLast = null
window.addEventListener("mousedown", (e) => {
	const b = cat.hitBox()
	if (e.offsetX >= b.x && e.offsetX <= b.x + b.w && e.offsetY >= b.y && e.offsetY <= b.y + b.h) {
		dragging = true
		dragLast = { x: e.screenX, y: e.screenY }
		S.mochiTarget = 0.32 // picked up: stretch tall
		if (S.sleeping) wake()
	}
})
window.addEventListener("mousemove", (e) => {
	if (dragging && dragLast) {
		const dx = e.screenX - dragLast.x
		const dy = e.screenY - dragLast.y
		if (dx || dy) window.pet.moveWindowBy(dx, dy)
		// mochi: faster drag => more stretch
		const spd = Math.hypot(dx, dy)
		S.mochiTarget = Math.max(0.2, Math.min(0.7, 0.25 + spd * 0.02))
		dragLast = { x: e.screenX, y: e.screenY }
	}
})
window.addEventListener("mouseup", () => { dragging = false; dragLast = null; S.mochiTarget = 0; S.mochiV -= 0.18 /* release boing */ })
window.addEventListener("dblclick", () => (S.purrUntil = now() + 1500))

function updateMochi(dt) {
	// critically-ish damped spring toward target
	const k = 0.02, damp = 0.012
	S.mochiV += (S.mochiTarget - S.mochi) * k * dt
	S.mochiV *= Math.max(0, 1 - damp * dt)
	S.mochi += S.mochiV * dt
}

// position floating HTML bits relative to the cat
function layoutBubbles() {
	const hb = cat.hitBox()
	const cx = hb.x + hb.w / 2
	const headTop = hb.y + hb.h * 0.12
	const feet = hb.y + hb.h * 0.92
	const place = (el, bottomY) => {
		el.style.left = cx + "px"
		el.style.top = bottomY + "px"
	}
	// timer sits just above the head
	let stack = headTop - 6
	if (!timerEl.classList.contains("hidden")) {
		timerEl.style.left = cx + "px"
		timerEl.style.top = stack + "px"
		timerEl.style.transform = "translate(-50%, -100%)"
		stack -= timerEl.offsetHeight + 4
	}
	// shout above timer
	if (!shoutEl.classList.contains("hidden")) {
		shoutEl.style.left = cx + "px"
		shoutEl.style.top = stack + "px"
		shoutEl.style.transform = "translate(-50%, -100%)"
		stack -= shoutEl.offsetHeight + 4
	}
	// pinned message above that
	if (!pinEl.classList.contains("hidden")) {
		pinEl.style.left = cx + "px"
		pinEl.style.top = stack + "px"
		pinEl.style.transform = "translate(-50%, -100%)"
	}
	// name below feet
	if (!nameEl.classList.contains("hidden")) {
		nameEl.style.left = cx + "px"
		nameEl.style.top = feet + "px"
		nameEl.style.transform = "translate(-50%, 0)"
	}
}

let lastFrame = now()
function loop() {
	try {
	const t = now()
	const dt = t - lastFrame
	lastFrame = t

	S.heat = Math.max(0, S.heat - dt * 0.00025)
	if (t > S.nextBlink) {
		S.blink = 1
		if (t > S.nextBlink + 120) { S.blink = 0; S.nextBlink = t + 2500 + Math.random() * 3000 }
	}
	if (S.kneading && t > S.kneadUntil) S.kneading = false
	if (S.kneading) S.kneadPhase += dt * 0.018

	if (S.hopV !== 0 || S.hop < 0) {
		S.hopV += dt * 0.06
		S.hop += S.hopV
		if (S.hop >= 0) { S.hop = 0; S.hopV = 0 }
	}

	updateMochi(dt)

	if (t < S.purrUntil && Math.random() < 0.15) spawnHeart()
	S.hearts.forEach((h) => { h.y -= h.vy * dt * 0.06; h.x += h.vx; h.life -= dt * 0.0009 })
	S.hearts = S.hearts.filter((h) => h.life > 0)

	if (t < S.paperUntil) S.paperLen = Math.min(60, S.paperLen + dt * 0.4)
	else S.paperLen = Math.max(0, S.paperLen - dt * 0.5)

	if (!S.sleeping && t - S.lastActivity > 45000) sleep()

	const stretching = t < S.stretchUntil
	let name = "idle"
	if (stretching) name = "stretch"
	else if (S.sleeping) name = "sleep"
	else if (S.heat > 0.55) name = "overheat"
	else if (t < S.purrUntil) name = "purr"
	else if (t < S.huntUntil) name = "hunt"
	else if (S.kneading) name = "knead"

	let squashX = 0, squashY = Math.sin(t / 900) * 0.02, lean = 0, stretchProg = 0
	if (dragging || Math.abs(S.mochi) > 0.01) {
		// mochi: tall + thin when stretched
		squashY += S.mochi
		squashX += -S.mochi * 0.5
	}
	if (stretching) {
		// horizontal four-legged stretch pose is drawn by cat.js; keep body un-squashed
		const pr = (t - S.stretchStart) / 2600
		stretchProg = Math.sin(Math.min(1, pr) * Math.PI)
		squashX = 0; squashY = 0; lean = 0
	} else if (name === "hunt") { lean = S.huntLean; squashY -= 0.08; squashX += 0.06 }
	else if (name === "purr") { squashY += Math.sin(t / 80) * 0.015 }
	else if (name === "overheat") { squashX += Math.sin(t / 60) * 0.02 }

	cat.draw({
		name, t,
		eyeDir: S.eyeDir, blink: S.blink,
		kneadPhase: S.kneadPhase, padsVisible: S.kneading,
		hearts: S.hearts, paperLen: S.paperLen, hop: S.hop,
		lean, squashX, squashY, stretchProg,
		steam: name === "overheat" ? 1 : 0,
	})

	tickPomodoro()
	checkReminders()
	layoutBubbles()
	} catch (e) { try { window.pet.log("loop error: " + (e && e.message)) } catch (_) {} }
	requestAnimationFrame(loop)
}

reportHit()
window.pet.requestSettings()
requestAnimationFrame(loop)
