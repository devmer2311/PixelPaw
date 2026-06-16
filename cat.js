/*
 * Pixel cat renderer v3 (Comnyang-style).
 * Parametric pixel-art cat with palette/pattern swaps, adjustable scale,
 * ">\u00a0<" squint face when typing/happy, two-pad kneading, mochi drag
 * stretch, working stretch pose, overheat redness + stress marks, sleep,
 * paper unroll, hearts, steam, and a cursor-following gaze.
 */
;(function () {
	const PRESETS = {
		tuxedo: { id: "tuxedo", name: "Tuxedo", bodyA: "#3b3b40", bodyB: "#141417", accent: "#f6f6f2", gradient: true, pattern: "tuxedo" },
		orange: { id: "orange", name: "Orange tabby", bodyA: "#f7a94a", bodyB: "#e07a2c", accent: "#fff1d6", gradient: true, pattern: "tabby" },
		grey: { id: "grey", name: "Grey", bodyA: "#aab2ba", bodyB: "#727a82", accent: "#eef2f5", gradient: true, pattern: "solid" },
		calico: { id: "calico", name: "Calico", bodyA: "#f5ead7", bodyB: "#e6cfa6", accent: "#ffffff", gradient: false, pattern: "calico" },
	}

	function toRGB(hex) {
		const c = hex.replace("#", "")
		return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)]
	}
	function mix(h1, h2, t) {
		const a = toRGB(h1), b = toRGB(h2)
		return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`
	}
	function shade(hex, amt) {
		const a = toRGB(hex)
		return `rgb(${Math.max(0, Math.min(255, a[0] + amt))},${Math.max(0, Math.min(255, a[1] + amt))},${Math.max(0, Math.min(255, a[2] + amt))})`
	}

	class CatRenderer {
		constructor(canvas) {
			this.canvas = canvas
			this.ctx = canvas.getContext("2d")
			this.ctx.imageSmoothingEnabled = false
			this.P = 6
			this.scale = 0.75
			this.palette = { ...PRESETS.tuxedo }
			this.recompute()
		}

		recompute() {
			const W = this.canvas.width / this.P
			this.ox = Math.round((W - 20) / 2)
			this.oy = Math.round(this.canvas.height / this.P - 34)
		}

		setPalette(p) { if (p) this.palette = { ...this.palette, ...p } }
		setScale(s) { this.scale = Math.max(0.01, Math.min(2.5, s || 0.75)) }

		footPx() { return { x: (this.ox + 10) * this.P, y: (this.oy + 30) * this.P } }

		// pixel coords for a grid point, after applying current scale about foot
		sp(gx, gy) {
			const P = this.P, sc = this.scale, f = this.footPx()
			return { x: f.x + ((this.ox + gx) * P - f.x) * sc, y: f.y + ((this.oy + gy) * P - f.y) * sc }
		}

		hitBox() {
			const P = this.P, sc = this.scale, f = this.footPx()
			const x0 = (this.ox - 1) * P, y0 = (this.oy - 4) * P, w = 22 * P, h = 34 * P
			return { x: f.x + (x0 - f.x) * sc, y: f.y + (y0 - f.y) * sc, w: w * sc, h: h * sc }
		}

		clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height) }

		r(x, y, w, h, color) {
			const P = this.P
			this.ctx.fillStyle = color
			this.ctx.fillRect(Math.round((this.ox + x) * P), Math.round((this.oy + y) * P), Math.round(w * P), Math.round(h * P))
		}
		round(x, y, w, h, color) { this.r(x, y + 1, w, h - 2, color); this.r(x + 1, y, w - 2, h, color) }

		draw(state) {
			const ctx = this.ctx
			this.clear()
			const p = this.palette
			const overheat = state.name === "overheat"
			const bodyA = overheat ? "#e8503e" : p.bodyA
			const bodyB = overheat ? "#a3251c" : p.bodyB
			const accent = overheat ? "#ffd9d2" : p.accent
			const outline = mix(bodyB, "#000000", 0.4)
			const innerEar = "#f3a6c2"
			const nose = overheat ? "#7a1d16" : "#e8728f"
			const P = this.P
			const grad = (a, b) => {
				if (!p.gradient && !overheat) return bodyA
				const g = ctx.createLinearGradient(0, (this.oy + a) * P, 0, (this.oy + b) * P)
				g.addColorStop(0, bodyA); g.addColorStop(1, bodyB)
				return g
			}

			const f = this.footPx()
			const sc = this.scale
			ctx.save()
			// outer scale (size control) about foot
			ctx.translate(f.x, f.y); ctx.scale(sc, sc); ctx.translate(-f.x, -f.y)

			// squash / stretch / mochi about foot
			const footX = f.x, footY = f.y
			const sx = 1 + (state.squashX || 0)
			const sy = 1 + (state.squashY || 0)
			ctx.save()
			ctx.translate(footX, footY + (state.hop || 0))
			ctx.scale(sx, sy)
			ctx.translate(-footX, -footY)
			ctx.translate(state.lean || 0, 0)

			if (state.name === "stretch") {
				this.drawStretch(state, grad, { bodyA, bodyB, accent, outline, nose, innerEar })
				ctx.restore() // squash
				this.scaledOverlays(state)
				ctx.restore() // outer scale
				this.screenOverlays(state)
				return
			}

			const kneadOn = state.name === "knead" || state.padsVisible

			// pads
			if (kneadOn) {
				this.round(3, 29, 6, 3, "#a7abb2"); this.round(3, 29, 6, 2, "#c9ccd1")
				this.round(11, 29, 6, 3, "#a7abb2"); this.round(11, 29, 6, 2, "#c9ccd1")
			}

			// tail
			const sway = Math.sin(state.t / 320) * 1.1
			this.r(16, 18 + sway, 4, 2, outline)
			this.r(18, 13 + sway, 2, 6, grad(13, 19))
			if (p.pattern === "tuxedo") this.r(18, 17 + sway, 2, 2, accent)

			// body
			this.round(3, 16, 14, 14, outline)
			this.round(4, 16, 12, 13, grad(16, 29))
			if (p.pattern === "tuxedo") {
				ctx.fillStyle = accent
				ctx.beginPath()
				const bx = (this.ox + 10) * P
				ctx.moveTo(bx, (this.oy + 16) * P)
				ctx.lineTo(bx - 4 * P, (this.oy + 29) * P)
				ctx.lineTo(bx + 4 * P, (this.oy + 29) * P)
				ctx.closePath(); ctx.fill()
			} else if (p.pattern === "tabby") {
				this.r(5, 19, 10, 1, mix(bodyB, "#000", 0.15))
				this.r(5, 22, 10, 1, mix(bodyB, "#000", 0.15))
				this.r(7, 24, 6, 5, shade(bodyA, 25))
			} else if (p.pattern === "calico") {
				this.r(4, 16, 5, 6, "#3a3330"); this.r(11, 22, 5, 7, "#e98a3c")
			} else { this.r(7, 23, 6, 6, shade(bodyA, 22)) }

			// front legs + paws (alternating knead)
			const kp = state.kneadPhase || 0
			const lOff = kneadOn ? (Math.sin(kp) > 0 ? -1.4 : 0) : 0
			const rOff = kneadOn ? (Math.sin(kp) > 0 ? 0 : -1.4) : 0
			const pawColor = p.pattern === "tuxedo" ? accent : grad(26, 31)
			this.round(4.5, 26 + lOff, 4, 5, outline); this.round(5, 26 + lOff, 3, 4, pawColor)
			this.round(11.5, 26 + rOff, 4, 5, outline); this.round(12, 26 + rOff, 3, 4, pawColor)

			// ears
			ctx.fillStyle = outline
			this.tri(2.5, 6, 5, 0, 6.5, 6); this.tri(13.5, 6, 15, 0, 17.5, 6)
			ctx.fillStyle = bodyA
			this.tri(3.5, 5.6, 5, 1.4, 6, 5.6); this.tri(14, 5.6, 15, 1.4, 16.5, 5.6)
			ctx.fillStyle = innerEar
			this.tri(4.4, 5.2, 5, 3, 5.6, 5.2); this.tri(14.6, 5.2, 15, 3, 15.8, 5.2)

			// head
			this.round(2, 5, 16, 12, outline)
			this.round(3, 5, 14, 11, grad(5, 16))
			this.r(3, 12, 14, 4, shade(bodyA, overheat ? 0 : 16))
			if (p.pattern === "tabby" || p.pattern === "calico") {
				this.r(9, 5, 1, 4, mix(bodyB, "#000", 0.2)); this.r(11, 5, 1, 4, mix(bodyB, "#000", 0.2))
			}
			if (p.pattern === "tuxedo") this.round(7, 11, 6, 4, accent)

			// eyes
			const squint = state.name === "knead" || state.name === "purr" || state.name === "stretch"
			const sleeping = state.name === "sleep"
			const darkLine = mix(bodyB, "#000", 0.35)
			if (sleeping) {
				ctx.strokeStyle = darkLine; ctx.lineWidth = Math.max(2, P * 0.42); ctx.lineCap = "round"
				this.arc(5.5, 9.5); this.arc(11.5, 9.5)
			} else if (squint) {
				// ">  <" happy face
				ctx.strokeStyle = overheat ? "#5a0f0b" : darkLine
				ctx.lineWidth = Math.max(2, P * 0.5); ctx.lineCap = "round"; ctx.lineJoin = "round"
				this.chevron(6, 9.2, 1)
				this.chevron(12, 9.2, -1)
			} else {
				const blink = state.blink || 0
				const eyeH = blink > 0.5 ? 0.6 : 4
				this.round(5, 7.5, 4, eyeH, "#ffffff"); this.round(11, 7.5, 4, eyeH, "#ffffff")
				if (blink <= 0.5) {
					const dx = ((state.eyeDir && state.eyeDir.x) || 0) * 1.4
					const dy = ((state.eyeDir && state.eyeDir.y) || 0) * 1.4
					const pup = overheat ? "#3a0f0b" : "#1d2740"
					this.r(6.3 + dx, 8.6 + dy, 1.6, 2, pup); this.r(12.3 + dx, 8.6 + dy, 1.6, 2, pup)
					this.r(6.5 + dx, 8.8 + dy, 0.6, 0.6, "#ffffff"); this.r(12.5 + dx, 8.8 + dy, 0.6, 0.6, "#ffffff")
				}
			}

			// nose + mouth
			this.r(9.2, 11.4, 1.6, 1, nose)
			if (overheat) this.r(8.6, 12.6, 2.8, 1.8, "#7a1d16")
			if (overheat) {
				this.r(4, 11.5, 2, 1.4, "rgba(255,120,120,0.85)")
				this.r(14, 11.5, 2, 1.4, "rgba(255,120,120,0.85)")
			}

			// whiskers
			ctx.strokeStyle = overheat ? "rgba(90,20,20,0.6)" : "rgba(40,40,40,0.45)"
			ctx.lineWidth = 1
			const wy = (this.oy + 11.6) * P
			ctx.beginPath()
			ctx.moveTo((this.ox + 4) * P, wy); ctx.lineTo((this.ox - 1) * P, wy - 2)
			ctx.moveTo((this.ox + 4) * P, wy + 2); ctx.lineTo((this.ox - 1) * P, wy + 3)
			ctx.moveTo((this.ox + 14) * P, wy); ctx.lineTo((this.ox + 19) * P, wy - 2)
			ctx.moveTo((this.ox + 14) * P, wy + 2); ctx.lineTo((this.ox + 19) * P, wy + 3)
			ctx.stroke()

			ctx.restore() // squash
			this.scaledOverlays(state) // steam / zzz / paper / stress (scaled with body)
			ctx.restore() // outer scale

			this.screenOverlays(state) // hearts in canvas space
		}

		drawStretch(state, grad, c) {
			const ctx = this.ctx
			const ext = (state.stretchProg || 1) * 2 // how far the cat reaches out
			const pawColor = this.palette.pattern === "tuxedo" ? c.accent : grad(26, 31)

			// tail raised at the right, curling up
			const sway = Math.sin(state.t / 260) * 0.6
			this.r(17, 14 + sway, 2, 7, c.outline)
			this.r(17, 12.5 + sway, 4, 2, grad(13, 20))
			this.r(19, 11 + sway, 2, 4, grad(13, 20))

			// back legs (right pair)
			this.round(12, 27, 3.5, 4, c.outline); this.round(12.3, 27.2, 3, 3.4, pawColor)
			this.round(15.5, 27, 3.5, 4, c.outline); this.round(15.8, 27.2, 3, 3.4, pawColor)

			// long low body that lengthens to the left as it stretches
			this.round(-1 - ext, 21, 21 + ext, 8, c.outline)
			this.round(0 - ext, 21, 19 + ext, 7, grad(21, 29))
			if (this.palette.pattern === "tuxedo") this.r(2 - ext, 25, 12 + ext, 4, c.accent)
			else if (this.palette.pattern === "tabby") {
				this.r(1 - ext, 23, 16 + ext, 1, mix(c.bodyB, "#000", 0.15))
				this.r(1 - ext, 26, 16 + ext, 1, mix(c.bodyB, "#000", 0.15))
			}

			// front legs stretched forward to the left
			this.round(-3 - ext, 27, 4, 4, c.outline); this.round(-2.6 - ext, 27.2, 3.2, 3.4, pawColor)
			this.round(0.5 - ext, 27, 4, 4, c.outline); this.round(0.9 - ext, 27.2, 3.2, 3.4, pawColor)

			// head low at the far left, ears on top
			const hx = -4 - ext
			ctx.fillStyle = c.outline
			this.tri(hx + 1, 18, hx + 2.2, 15.2, hx + 3.4, 18); this.tri(hx + 4.8, 18, hx + 6, 15.2, hx + 7.2, 18)
			ctx.fillStyle = c.bodyA
			this.tri(hx + 1.6, 17.8, hx + 2.2, 16, hx + 2.8, 17.8); this.tri(hx + 5.4, 17.8, hx + 6, 16, hx + 6.6, 17.8)
			ctx.fillStyle = c.innerEar
			this.tri(hx + 1.9, 17.6, hx + 2.2, 16.6, hx + 2.5, 17.6); this.tri(hx + 5.7, 17.6, hx + 6, 16.6, hx + 6.3, 17.6)
			this.round(hx, 18, 9, 9, c.outline)
			this.round(hx + 1, 18, 7, 8, grad(18, 26))
			if (this.palette.pattern === "tuxedo") this.round(hx + 2.5, 23, 4, 3.5, c.accent)
			// ">  <" squint face
			ctx.strokeStyle = state.name === "overheat" ? "#5a0f0b" : mix(c.bodyB, "#000", 0.35)
			ctx.lineWidth = Math.max(2, this.P * 0.5); ctx.lineCap = "round"; ctx.lineJoin = "round"
			this.chevron(hx + 3, 21.6, 1); this.chevron(hx + 6, 21.6, -1)
			// nose
			this.r(hx + 3.8, 24, 1.6, 1, c.nose)
		}

		chevron(cx, cy, dir) {
			// dir=1 draws ">" (vertex right), dir=-1 draws "<" (vertex left)
			const P = this.P, ctx = this.ctx
			const x = (gx) => (this.ox + gx) * P
			const y = (gy) => (this.oy + gy) * P
			ctx.beginPath()
			ctx.moveTo(x(cx - 1.2 * dir), y(cy - 1.4))
			ctx.lineTo(x(cx + 0.8 * dir), y(cy))
			ctx.lineTo(x(cx - 1.2 * dir), y(cy + 1.4))
			ctx.stroke()
		}

		tri(x1, y1, x2, y2, x3, y3) {
			const P = this.P, ctx = this.ctx
			ctx.beginPath()
			ctx.moveTo((this.ox + x1) * P, (this.oy + y1) * P)
			ctx.lineTo((this.ox + x2) * P, (this.oy + y2) * P)
			ctx.lineTo((this.ox + x3) * P, (this.oy + y3) * P)
			ctx.closePath(); ctx.fill()
		}

		arc(gx, gy) {
			const P = this.P, ctx = this.ctx
			const px = (this.ox + gx) * P, py = (this.oy + gy) * P
			ctx.beginPath()
			ctx.moveTo(px, py)
			ctx.quadraticCurveTo(px + 1.5 * P, py - 1.8 * P, px + 3 * P, py)
			ctx.stroke()
		}

		scaledOverlays(state) {
			const ctx = this.ctx, P = this.P
			if (state.steam) {
				for (let i = 0; i < 3; i++) {
					const ph = (state.t / 380 + i * 0.66) % 1
					ctx.fillStyle = `rgba(225,225,225,${(1 - ph) * 0.6 * state.steam})`
					ctx.beginPath()
					ctx.arc((this.ox + 5 + i * 5) * P, (this.oy + 3) * P - ph * 30, 5 - ph * 2, 0, Math.PI * 2)
					ctx.fill()
				}
				// stress marks (red dashes) above head
				ctx.strokeStyle = "#e8503e"; ctx.lineWidth = 2; ctx.lineCap = "round"
				for (let i = 0; i < 3; i++) {
					const bob = Math.sin(state.t / 160 + i) * 2
					const bx = (this.ox + 6 + i * 4) * P
					const by = (this.oy + 2) * P + bob
					ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 7); ctx.stroke()
				}
			}
			if (state.name === "sleep") {
				ctx.fillStyle = "#7a86a0"
				const zph = (state.t / 720) % 1
				ctx.globalAlpha = 1 - zph
				ctx.font = "bold 13px Courier New"
				ctx.fillText("z", (this.ox + 15) * P, (this.oy + 4) * P - zph * 20)
				ctx.font = "bold 18px Courier New"
				ctx.fillText("Z", (this.ox + 17) * P, (this.oy + 1) * P - zph * 26)
				ctx.globalAlpha = 1
			}
			if (state.paperLen > 0) {
				const rollX = (this.ox - 2) * P
				const py = (this.oy + 30) * P
				// unrolled sheet hanging down from roll
				ctx.fillStyle = "#fdfdf5"
				ctx.fillRect(rollX - 2, py, 9, state.paperLen)
				ctx.strokeStyle = "#e2e0cc"; ctx.lineWidth = 1
				ctx.strokeRect(rollX - 2, py, 9, state.paperLen)
				// roll
				ctx.fillStyle = "#eee7cc"
				ctx.beginPath(); ctx.arc(rollX + 2.5, py, 8, 0, Math.PI * 2); ctx.fill()
				ctx.fillStyle = "#cfc6a6"
				ctx.beginPath(); ctx.arc(rollX + 2.5, py, 3, 0, Math.PI * 2); ctx.fill()
			}
		}

		screenOverlays(state) {
			const ctx = this.ctx
			if (state.hearts) {
				for (const h of state.hearts) {
					ctx.fillStyle = `rgba(255,90,140,${Math.max(0, h.life)})`
					this.heart(h.x, h.y, 6 * h.life + 3)
				}
			}
		}

		heart(x, y, rr) {
			const ctx = this.ctx
			ctx.beginPath()
			ctx.moveTo(x, y + rr * 0.3)
			ctx.bezierCurveTo(x, y, x - rr, y, x - rr, y + rr * 0.3)
			ctx.bezierCurveTo(x - rr, y + rr * 0.7, x, y + rr, x, y + rr * 1.2)
			ctx.bezierCurveTo(x, y + rr, x + rr, y + rr * 0.7, x + rr, y + rr * 0.3)
			ctx.bezierCurveTo(x + rr, y, x, y, x, y + rr * 0.3)
			ctx.fill()
		}
	}

	window.CAT_PRESETS = PRESETS
	window.CatRenderer = CatRenderer
})()
