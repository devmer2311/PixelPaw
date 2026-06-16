/* PixelPaw controller logic. Uses window.pet bridge (preload). */
let settings = null
let previewRenderer = null
const thumbRenderers = {}
let animT = 0
let previewScale = 0.75

const $ = (id) => document.getElementById(id)

window.pet.onSettings((s) => { settings = s; render() })

function activeCat() {
	return settings.cats[settings.activeCat] || Object.values(settings.cats)[0]
}

// Keep the preview visually inside its stage while the real cat can go 1%-250%.
function clampPreview(scale) { return Math.max(0.15, Math.min(1.5, scale)) }

function render() {
	if (!settings) return
	const wrap = $("cats")
	wrap.innerHTML = ""
	Object.values(settings.cats).forEach((c) => {
		const card = document.createElement("div")
		card.className = "catcard" + (c.id === settings.activeCat ? " active" : "")
		const cv = document.createElement("canvas")
		cv.width = 104; cv.height = 104
		const label = document.createElement("span")
		label.textContent = c.name
		card.appendChild(cv); card.appendChild(label)
		card.addEventListener("click", () => window.pet.saveSettings({ activeCat: c.id }))
		wrap.appendChild(card)
		const rr = new CatRenderer(cv)
		rr.setScale(0.7)
		rr.setPalette(c)
		thumbRenderers[c.id] = rr
	})

	const a = activeCat()
	$("activeName").textContent = a.name
	$("bodyA").value = a.bodyA
	$("bodyB").value = a.bodyB
	$("accent").value = a.accent
	$("gradient").checked = !!a.gradient
	$("pattern").value = a.pattern

	const pct = Math.round((typeof settings.scale === "number" ? settings.scale : 0.75) * 100)
	$("scale").value = pct
	$("sizeval").textContent = pct + "%"
	previewScale = clampPreview(pct / 100)

	$("showName").checked = !!settings.showName
	$("petName").value = settings.petName || ""

	$("pinnedMessage").value = settings.pinnedMessage || ""
	$("pomodoroFocus").value = settings.pomodoroFocus || 25
	$("pomodoroBreak").value = settings.pomodoroBreak || 5
	$("stretchMinutes").value = settings.stretchMinutes || 30
	$("stretchEnabled").checked = settings.stretchEnabled !== false
	$("notes").value = settings.notes || ""

	if (!previewRenderer) previewRenderer = new CatRenderer($("preview"))
	previewRenderer.setPalette(a)

	renderReminders()
}

function fmtWhen(at) {
	if (!at) return ""
	const d = new Date(at)
	const sameDay = d.toDateString() === new Date().toDateString()
	if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
	return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function renderReminders() {
	const list = $("remList")
	list.innerHTML = ""
	const rems = (settings.reminders || []).slice().sort((x, y) => (x.at || 0) - (y.at || 0))
	if (!rems.length) {
		list.innerHTML = '<div class="empty">No reminders yet — add one above 👆</div>'
		return
	}
	rems.forEach((r) => {
		const row = document.createElement("div")
		row.className = "rem" + (r.done ? " done" : "")

		const when = document.createElement("div")
		when.className = "when2"; when.textContent = fmtWhen(r.at)
		const txt = document.createElement("div")
		txt.className = "txt"; txt.textContent = r.text
		const tag = document.createElement("div")
		tag.className = "tag"; tag.textContent = r.done ? "Done" : "Once"

		const edit = document.createElement("button")
		edit.textContent = "Edit"
		edit.addEventListener("click", () => {
			$("remText").value = r.text
			if (r.at) {
				const d = new Date(r.at - new Date().getTimezoneOffset() * 60000)
				$("remWhen").value = d.toISOString().slice(0, 16)
			}
			const next = (settings.reminders || []).filter((x) => x.id !== r.id)
			window.pet.saveSettings({ reminders: next })
		})

		const del = document.createElement("button")
		del.className = "del"; del.textContent = "Delete"
		del.addEventListener("click", () => {
			const next = (settings.reminders || []).filter((x) => x.id !== r.id)
			window.pet.saveSettings({ reminders: next })
		})

		row.appendChild(when); row.appendChild(txt); row.appendChild(tag); row.appendChild(edit); row.appendChild(del)
		list.appendChild(row)
	})
}

// live preview/thumbnail animation
function tick() {
	animT += 16
	const base = (name) => ({ name, t: animT, eyeDir: { x: 0, y: 0 }, blink: 0, kneadPhase: animT * 0.012, padsVisible: name === "knead", hearts: [], paperLen: 0, hop: 0, lean: 0, squashX: 0, squashY: Math.sin(animT / 900) * 0.02, stretchProg: 1 })
	Object.values(thumbRenderers).forEach((rr) => rr.draw(base("idle")))
	if (previewRenderer) {
		previewRenderer.setScale(previewScale)
		previewRenderer.draw(base("knead"))
	}
	requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

// palette edits
function savePalette() {
	const id = settings.activeCat
	const patch = { cats: {} }
	patch.cats[id] = {
		bodyA: $("bodyA").value, bodyB: $("bodyB").value, accent: $("accent").value,
		gradient: $("gradient").checked, pattern: $("pattern").value,
	}
	if (previewRenderer) previewRenderer.setPalette(patch.cats[id])
	if (thumbRenderers[id]) thumbRenderers[id].setPalette(patch.cats[id])
	window.pet.saveSettings(patch)
}
;["bodyA", "bodyB", "accent", "gradient", "pattern"].forEach((id) => {
	$(id).addEventListener("input", savePalette)
	$(id).addEventListener("change", savePalette)
})

// size slider (1%-250%)
$("scale").addEventListener("input", () => {
	const pct = Number($("scale").value)
	$("sizeval").textContent = pct + "%"
	previewScale = clampPreview(pct / 100)
})
$("scale").addEventListener("change", () => {
	window.pet.saveSettings({ scale: Number($("scale").value) / 100 })
})

// name
$("showName").addEventListener("change", () => window.pet.saveSettings({ showName: $("showName").checked }))
const saveName = () => window.pet.saveSettings({ petName: $("petName").value })
$("petName").addEventListener("change", saveName)
$("petName").addEventListener("blur", saveName)

// general settings
function saveGeneral() {
	window.pet.saveSettings({
		pinnedMessage: $("pinnedMessage").value,
		pomodoroFocus: Number($("pomodoroFocus").value) || 25,
		pomodoroBreak: Number($("pomodoroBreak").value) || 5,
		stretchMinutes: Number($("stretchMinutes").value) || 30,
		stretchEnabled: $("stretchEnabled").checked,
		notes: $("notes").value,
	})
}
;["pinnedMessage", "pomodoroFocus", "pomodoroBreak", "stretchMinutes", "stretchEnabled"].forEach((id) => {
	$(id).addEventListener("change", saveGeneral)
})
$("notes").addEventListener("blur", saveGeneral)

// actions
$("a-stretch").addEventListener("click", () => window.pet.sendCommand("stretch"))
$("a-jump").addEventListener("click", () => window.pet.sendCommand("jump"))
$("a-purr").addEventListener("click", () => window.pet.sendCommand("purr"))
$("a-perch").addEventListener("click", () => window.pet.sendCommand("perch"))
$("a-pomo").addEventListener("click", () => window.pet.sendCommand("pomodoro-start"))
$("a-pomo-stop").addEventListener("click", () => window.pet.sendCommand("pomodoro-stop"))

// reminders
function addReminder(atMs) {
	const text = $("remText").value.trim()
	if (!text) return
	const id = "r_" + Date.now() + "_" + Math.floor(Math.random() * 1000)
	const next = (settings.reminders || []).concat([{ id, text, at: atMs, done: false }])
	window.pet.saveSettings({ reminders: next })
	$("remText").value = ""; $("remWhen").value = ""
}
$("remAdd").addEventListener("click", () => {
	const v = $("remWhen").value
	addReminder(v ? new Date(v).getTime() : Date.now() + 5 * 60000)
})
function quick(mins) { return (e) => { e.preventDefault(); addReminder(Date.now() + mins * 60000) } }
$("q5").addEventListener("click", quick(5))
$("q15").addEventListener("click", quick(15))
$("q60").addEventListener("click", quick(60))

window.pet.requestSettings()
