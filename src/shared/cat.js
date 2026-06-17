/*
 * Comnyang-style Pixel Cat Renderer — CatRenderer class
 * Combines the improved drawing from comnyang_cat_2x with the
 * CatRenderer API that renderer.js expects.
 */
;(function () {

  const PRESETS = {
    orange:  { id: "orange",  name: "Orange tabby", bodyA: "#f7a94a", bodyB: "#e07a2c", accent: "#fff1d6", belly: "#fff8ee", innerEar: "#f5a0b0", nose: "#e87090", gradient: true,  pattern: "tabby"   },
    tuxedo:  { id: "tuxedo",  name: "Tuxedo",        bodyA: "#3b3b40", bodyB: "#141417", accent: "#f6f6f2", belly: "#f6f6f2", innerEar: "#f3a6c2", nose: "#e8728f", gradient: true,  pattern: "tuxedo"  },
    grey:    { id: "grey",    name: "Grey",           bodyA: "#aab2ba", bodyB: "#727a82", accent: "#eef2f5", belly: "#f5f7f8", innerEar: "#f0a0c0", nose: "#d070a0", gradient: true,  pattern: "solid"   },
    calico:  { id: "calico",  name: "Calico",         bodyA: "#f5ead7", bodyB: "#e6cfa6", accent: "#ffffff", belly: "#ffffff", innerEar: "#f5a0b8", nose: "#e06888", gradient: false, pattern: "calico"  },
    cream:   { id: "cream",   name: "Cream",          bodyA: "#ffecd2", bodyB: "#e8c89a", accent: "#ffffff", belly: "#ffffff", innerEar: "#f8b0c0", nose: "#e88898", gradient: true,  pattern: "solid"   },
  }

  function toRGB(h) {
    const c = h.replace("#", "")
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
  }
  function mix(h1, h2, t) {
    const a = toRGB(h1), b = toRGB(h2)
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`
  }
  function shade(h, amt) {
    const c = toRGB(h)
    return `rgb(${Math.max(0, Math.min(255, c[0] + amt))},${Math.max(0, Math.min(255, c[1] + amt))},${Math.max(0, Math.min(255, c[2] + amt))})`
  }

  class CatRenderer {
    constructor(canvas) {
      this.canvas = canvas
      this.ctx = canvas.getContext("2d")
      this.ctx.imageSmoothingEnabled = false
      this.P = 8
      this.scale = 0.75
      this.dpr = 1
      this.cssW = canvas.width
      this.cssH = canvas.height
      this.palette = { ...PRESETS.orange }
      this.recompute()
    }

    resize(cssW, cssH, dpr) {
      this.dpr = Math.max(1, dpr || 1)
      this.cssW = Math.max(1, Math.round(cssW))
      this.cssH = Math.max(1, Math.round(cssH))
      this.canvas.width = Math.round(this.cssW * this.dpr)
      this.canvas.height = Math.round(this.cssH * this.dpr)
      this.canvas.style.width = this.cssW + "px"
      this.canvas.style.height = this.cssH + "px"
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      this.ctx.imageSmoothingEnabled = false
      this.recompute()
    }

    recompute() {
      const W = this.cssW / this.P
      this.ox = Math.round((W - 22) / 2)
      this.oy = Math.round(this.cssH / this.P - 34)
    }

    setPalette(p) {
      if (!p) return
      const match = p.id ? PRESETS[p.id] : (p.pattern ? Object.values(PRESETS).find(pr => pr.pattern === p.pattern) : null)
      this.palette = match ? { ...match, ...p } : { ...this.palette, ...p }
    }
    setScale(s) { this.scale = Math.max(0.01, Math.min(2.5, s || 0.75)) }

    footPx() {
      return { x: (this.ox + 10) * this.P, y: (this.oy + 31) * this.P }
    }

    hitBox() {
      const P = this.P, sc = this.scale, f = this.footPx()
      const x0 = (this.ox - 1) * P, y0 = (this.oy - 4) * P, w = 22 * P, h = 34 * P
      return {
        x: f.x + (x0 - f.x) * sc,
        y: f.y + (y0 - f.y) * sc,
        w: w * sc,
        h: h * sc,
      }
    }

    clear() { this.ctx.clearRect(0, 0, this.cssW, this.cssH) }

    // ── Drawing primitives ────────────────────────────────────────────────

    r(x, y, w, h, color) {
      const ctx = this.ctx
      ctx.fillStyle = color
      ctx.fillRect(
        Math.round((this.ox + x) * this.P),
        Math.round((this.oy + y) * this.P),
        Math.round(w * this.P),
        Math.round(h * this.P),
      )
    }

    bigRound(x, y, w, h, color, radMult) {
      if (radMult === undefined) radMult = 0.38
      const ctx = this.ctx, P = this.P
      const rx = (this.ox + x) * P, ry = (this.oy + y) * P
      const rw = w * P, rh = h * P
      const rad = Math.min(rw, rh) * radMult
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(rx, ry, rw, rh, rad)
      ctx.fill()
    }

    tri(x1, y1, x2, y2, x3, y3) {
      const ctx = this.ctx, P = this.P
      ctx.beginPath()
      ctx.moveTo((this.ox + x1) * P, (this.oy + y1) * P)
      ctx.lineTo((this.ox + x2) * P, (this.oy + y2) * P)
      ctx.lineTo((this.ox + x3) * P, (this.oy + y3) * P)
      ctx.closePath()
      ctx.fill()
    }

    drawArc(gx, gy) {
      const ctx = this.ctx, P = this.P
      const px = (this.ox + gx) * P, py = (this.oy + gy) * P
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.quadraticCurveTo(px + 1.5 * P, py - 1.8 * P, px + 3 * P, py)
      ctx.stroke()
    }

    chevron(cx, cy, dir) {
      const ctx = this.ctx, P = this.P
      ctx.beginPath()
      ctx.moveTo((this.ox + cx - 1.2 * dir) * P, (this.oy + cy - 1.4) * P)
      ctx.lineTo((this.ox + cx + 0.8 * dir) * P, (this.oy + cy) * P)
      ctx.lineTo((this.ox + cx - 1.2 * dir) * P, (this.oy + cy + 1.4) * P)
      ctx.stroke()
    }

    grad(ya, yb, a, b) {
      if (!this.palette.gradient) return a
      const ctx = this.ctx, P = this.P
      const g = ctx.createLinearGradient(0, (this.oy + ya) * P, 0, (this.oy + yb) * P)
      g.addColorStop(0, a); g.addColorStop(1, b)
      return g
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

    drawEye(gx, gy, dx, dy, blinkAmt, squinting, sleeping, eyeOutline, eyeDark) {
      const ctx = this.ctx, P = this.P
      const outline = eyeOutline || mix(this.palette.bodyB, "#000000", 0.4)
      if (sleeping) {
        ctx.strokeStyle = outline
        ctx.lineWidth = P * 0.45
        ctx.lineCap = "round"
        this.drawArc(gx, gy)
        return
      }
      if (squinting) {
        ctx.strokeStyle = eyeDark || mix(this.palette.bodyB, "#000", 0.35)
        ctx.lineWidth = P * 0.5
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        const dir = gx < 10 ? 1 : -1
        this.chevron(gx + 1.5, gy, dir)
        return
      }
      const eyeH = blinkAmt > 0.5 ? 0.5 : 3.5
      this.bigRound(gx, gy, 3, eyeH, "#ffffff", 0.45)
      if (blinkAmt <= 0.5) {
        const ix = (this.ox + gx + 1 + dx) * P, iy = (this.oy + gy + 0.5 + dy) * P
        ctx.fillStyle = "#3daa55"
        ctx.beginPath(); ctx.ellipse(ix + P * 0.7, iy + P * 0.7, P * 0.85, P * 0.85, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = "#0d1520"
        ctx.beginPath(); ctx.ellipse(ix + P * 0.7, iy + P * 0.7, P * 0.45, P * 0.55, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.beginPath(); ctx.ellipse(ix + P * 0.35, iy + P * 0.35, P * 0.22, P * 0.22, 0, 0, Math.PI * 2); ctx.fill()
      }
    }

    // ── Cat body drawing ──────────────────────────────────────────────────

    drawCat(state) {
      const ctx = this.ctx, P = this.P
      const p = this.palette
      const overheat = state.name === "overheat"
      const bodyA = overheat ? "#e8503e" : p.bodyA
      const bodyB = overheat ? "#a3251c" : p.bodyB
      const accent = overheat ? "#ffd9d2" : p.accent
      const belly = overheat ? "#ffd9d2" : p.belly
      const outline = mix(bodyB, "#000000", 0.4)
      const innerEar = overheat ? "#e88878" : p.innerEar
      const nose = overheat ? "#7a1d16" : p.nose

      const isKnead = state.name === "knead"
      const isPurr = state.name === "purr"
      const isSleep = state.name === "sleep"
      const isWalk = state.name === "walk"
      const squinting = isKnead || isPurr

      let eyeDX = 0, eyeDY = 0
      if (state.eyeDir && !squinting && !isSleep) {
        eyeDX = (state.eyeDir.x || 0) * 0.6
        eyeDY = (state.eyeDir.y || 0) * 0.4
      }

      const eyeOutline = mix(bodyB, "#000000", 0.4)
      const eyeDark = overheat ? "#5a0f0b" : mix(bodyB, "#000", 0.35)

      // ── Tail ──────────────────────────────────────────────────────────
      // Thick stroked curve — always a continuous shape, no gaps between segments.
      // Wave motion travels from base (barely moves) to tip (largest swing).
      const tailT = state.t || 0
      const tg = this.grad(12, 22, bodyA, bodyB)
      const tPhase = tailT / 300

      // Tail curve control points (grid coords).
      // prog is used to scale the wave amplitude progressively toward the tip.
      const tPts = [
        { x: 17.5, y: 17, prog: 0.0 },
        { x: 18,   y: 15, prog: 0.2 },
        { x: 18.5, y: 13, prog: 0.4 },
        { x: 18.8, y: 11, prog: 0.6 },
        { x: 18.5, y: 9,  prog: 0.8 },
        { x: 17.5, y: 7,  prog: 1.0 },
        { x: 16,   y: 5.5, prog: 1.2 },
      ]
      const px = (gx) => (this.ox + gx) * P
      const py = (gy) => (this.oy + gy) * P
      ctx.beginPath()
      for (const pt of tPts) {
        const amp = pt.prog * 2.0
        const sx = Math.sin(tPhase + pt.prog * 2.5) * amp * 0.35
        const sy = Math.cos(tPhase * 0.85 + pt.prog * 2.2) * amp * 0.2
        ctx.lineTo(px(pt.x + sx), py(pt.y + sy))
      }
      ctx.strokeStyle = outline
      ctx.lineWidth = P * 2.8
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
      ctx.strokeStyle = tg
      ctx.lineWidth = P * 2.2
      ctx.stroke()
      if (p.pattern === "tuxedo") {
        const tip = tPts[tPts.length - 1]
        const amp = tip.prog * 2.0
        const sx = Math.sin(tPhase + tip.prog * 2.5) * amp * 0.35
        const sy = Math.cos(tPhase * 0.85 + tip.prog * 2.2) * amp * 0.2
        ctx.beginPath()
        ctx.arc(px(tip.x + sx), py(tip.y + sy), P * 1.0, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.fill()
      }

      // ── Hind paws (walk only, behind body) ────────────────────────────
      if (isWalk) {
        const wp = state.walkPhase || 0
        const blo = Math.max(0, Math.sin(wp + Math.PI)) * -2
        const bro = Math.max(0, Math.sin(wp)) * -2
        const hc = p.pattern === "tuxedo" ? accent : this.grad(24, 30, bodyA, bodyB)
        this.bigRound(2, 24 + blo, 4, 5, outline); this.bigRound(2.4, 24.2 + blo, 3.2, 4.2, hc)
        this.bigRound(13, 24 + bro, 4, 5, outline); this.bigRound(13.4, 24.2 + bro, 3.2, 4.2, hc)
      }

      // ── Body ──────────────────────────────────────────────────────────
      const bg = this.grad(14, 32, bodyA, bodyB)
      this.bigRound(1, 13, 18, 20, outline, 0.42)
      this.bigRound(2, 13, 16, 19, bg, 0.42)
      this.bigRound(5, 17, 10, 12, belly, 0.48)

      if (p.pattern === "tabby") {
        this.r(3, 16, 14, 1, mix(bodyB, "#000", 0.12))
        this.r(3, 19, 14, 1, mix(bodyB, "#000", 0.12))
        this.r(5, 21, 10, 6, shade(bodyA, 22))
      } else if (p.pattern === "tuxedo") {
        ctx.fillStyle = accent
        ctx.beginPath()
        const bx = (this.ox + 10) * P
        ctx.moveTo(bx, (this.oy + 14) * P)
        ctx.lineTo(bx - 5 * P, (this.oy + 32) * P)
        ctx.lineTo(bx + 5 * P, (this.oy + 32) * P)
        ctx.closePath(); ctx.fill()
      } else if (p.pattern === "calico") {
        this.r(2, 13, 6, 7, "#3a3330"); this.r(12, 19, 5, 8, "#e98a3c")
      }

      // ── Front paws ────────────────────────────────────────────────────
      let lOff = 0, rOff = 0
      if (isKnead || isPurr) {
        const kp = state.kneadPhase || 0
        lOff = Math.sin(kp) > 0 ? -1.5 : 0
        rOff = Math.sin(kp) > 0 ? 0 : -1.5
      }
      if (isWalk) {
        const wp = state.walkPhase || 0
        lOff = Math.max(0, Math.sin(wp)) * -2.8
        rOff = Math.max(0, Math.sin(wp + Math.PI)) * -2.8
      }
      const pawC = p.pattern === "tuxedo" ? accent : this.grad(26, 32, bodyA, bodyB)
      this.bigRound(3, 25 + lOff, 4.5, 6, outline, 0.45); this.bigRound(3.4, 25.2 + lOff, 3.7, 5.2, pawC, 0.45)
      this.bigRound(12.5, 25 + rOff, 4.5, 6, outline, 0.45); this.bigRound(12.9, 25.2 + rOff, 3.7, 5.2, pawC, 0.45)

      if (state.padsVisible || isKnead || isPurr) {
        const padC = "#d09090"
        const kp = state.kneadPhase || 0
        if (Math.sin(kp) > 0) this.bigRound(3.5, 29.5, 3, 1.2, padC, 0.45)
        else this.bigRound(13, 29.5, 3, 1.2, padC, 0.45)
      }

      // ── Ears ──────────────────────────────────────────────────────────
      ctx.fillStyle = outline
      this.tri(2, 6, 4.5, 0, 7, 6);    this.tri(13, 6, 15.5, 0, 18, 6)
      ctx.fillStyle = bodyA
      this.tri(3, 5.5, 4.5, 1.5, 6.5, 5.5);  this.tri(13.5, 5.5, 15.5, 1.5, 17.5, 5.5)
      ctx.fillStyle = innerEar
      this.tri(3.8, 5, 4.5, 3, 5.2, 5);      this.tri(14.3, 5, 15.5, 3, 16.3, 5)

      // ── Head ──────────────────────────────────────────────────────────
      this.bigRound(1, 4, 18, 14, outline, 0.48)
      this.bigRound(2, 4, 16, 13, this.grad(4, 17, bodyA, bodyB), 0.48)

      this.r(2, 12, 6, 4, shade(bodyA, overheat ? 0 : 20))
      this.r(12, 12, 6, 4, shade(bodyA, overheat ? 0 : 20))

      if (p.pattern === "tabby" || p.pattern === "calico") {
        this.r(9, 4, 1.5, 4, mix(bodyB, "#000", 0.18))
        this.r(11.5, 4, 1.5, 4, mix(bodyB, "#000", 0.18))
      }
      if (p.pattern === "tuxedo") this.bigRound(6, 10, 8, 4, accent, 0.35)

      // ── Eyes ──────────────────────────────────────────────────────────
      this.drawEye(5, 7, eyeDX, eyeDY, state.blink || 0, squinting, isSleep, eyeOutline, eyeDark)
      this.drawEye(12, 7, eyeDX, eyeDY, state.blink || 0, squinting, isSleep, eyeOutline, eyeDark)

      if (overheat) {
        this.r(3, 10, 3, 2, "rgba(255,120,120,0.7)")
        this.r(14, 10, 3, 2, "rgba(255,120,120,0.7)")
      }

      // ── Nose & mouth ─────────────────────────────────────────────────
      this.bigRound(6, 11, 8, 4, belly, 0.4)
      this.r(9, 11.5, 2, 1.2, nose)
      if (overheat) this.r(7, 13, 6, 2, "#7a1d16")

      ctx.strokeStyle = mix(nose, "#000", 0.3); ctx.lineWidth = P * 0.35; ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo((this.ox + 9) * P, (this.oy + 13) * P)
      ctx.lineTo((this.ox + 10) * P, (this.oy + 14) * P)
      ctx.lineTo((this.ox + 11) * P, (this.oy + 13) * P)
      ctx.stroke()

      // ── Whiskers ─────────────────────────────────────────────────────
      ctx.strokeStyle = overheat ? "rgba(80,20,20,0.5)" : "rgba(50,50,50,0.4)"
      ctx.lineWidth = 1; ctx.lineCap = "round"
      const wy = (this.oy + 12) * P
      ctx.beginPath()
      ctx.moveTo((this.ox + 5) * P, wy);           ctx.lineTo((this.ox - 1) * P, wy - 2)
      ctx.moveTo((this.ox + 5) * P, wy + P * 0.3); ctx.lineTo((this.ox - 1) * P, wy + P * 0.3 + 2)
      ctx.moveTo((this.ox + 15) * P, wy);          ctx.lineTo((this.ox + 21) * P, wy - 2)
      ctx.moveTo((this.ox + 15) * P, wy + P * 0.3); ctx.lineTo((this.ox + 21) * P, wy + P * 0.3 + 2)
      ctx.stroke()

      // ── Blush ─────────────────────────────────────────────────────────
      ctx.fillStyle = "rgba(255,150,140,0.28)"
      ctx.beginPath(); ctx.ellipse((this.ox + 4.5) * P, (this.oy + 13) * P, P * 1.6, P * 1.1, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse((this.ox + 15.5) * P, (this.oy + 13) * P, P * 1.6, P * 1.1, 0, 0, Math.PI * 2); ctx.fill()
    }

    drawStretch(state) {
      const ctx = this.ctx, P = this.P
      const p = this.palette
      const overheat = state.name === "overheat"
      const bodyA = overheat ? "#e8503e" : p.bodyA
      const bodyB = overheat ? "#a3251c" : p.bodyB
      const accent = overheat ? "#ffd9d2" : p.accent
      const outline = mix(bodyB, "#000000", 0.4)
      const innerEar = overheat ? "#e88878" : p.innerEar
      const nose = overheat ? "#7a1d16" : p.nose

      const ext = (state.stretchProg || 1) * 2.5
      const pawC = p.pattern === "tuxedo" ? accent : this.grad(26, 31, bodyA, bodyB)

      // ── Stretch tail ── raised upward at right (thick stroked curve)
      const sT = state.t || 0
      const sPhase = sT / 280
      const spx = (gx) => (this.ox + gx) * P
      const spy = (gy) => (this.oy + gy) * P
      const sPts = [
        { x: 17.5, y: 17, prog: 0.0 },
        { x: 18,   y: 15, prog: 0.2 },
        { x: 18.5, y: 13, prog: 0.4 },
        { x: 18.8, y: 11, prog: 0.6 },
        { x: 18.5, y: 9,  prog: 0.8 },
        { x: 17.5, y: 7.5, prog: 1.0 },
      ]
      ctx.beginPath()
      for (const pt of sPts) {
        const amp = pt.prog * 1.5
        const sx = Math.sin(sPhase + pt.prog * 2) * amp * 0.3
        const sy = Math.cos(sPhase * 0.9 + pt.prog * 1.8) * amp * 0.15
        ctx.lineTo(spx(pt.x + sx), spy(pt.y + sy))
      }
      ctx.strokeStyle = outline
      ctx.lineWidth = P * 2.6
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
      ctx.strokeStyle = this.grad(13, 20, bodyA, bodyB)
      ctx.lineWidth = P * 2.0
      ctx.stroke()
      if (p.pattern === "tuxedo") {
        const tip = sPts[sPts.length - 1]
        const amp = tip.prog * 1.5
        const sx = Math.sin(sPhase + tip.prog * 2) * amp * 0.3
        const sy = Math.cos(sPhase * 0.9 + tip.prog * 1.8) * amp * 0.15
        ctx.beginPath()
        ctx.arc(spx(tip.x + sx), spy(tip.y + sy), P * 1.0, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.fill()
      }

      this.bigRound(12, 23, 3, 4, outline);   this.bigRound(12.3, 23.2, 2.5, 3.2, pawC)
      this.bigRound(15, 23, 3, 4, outline);   this.bigRound(15.3, 23.2, 2.5, 3.2, pawC)

      this.bigRound(-6 - ext, 17, 26 + ext, 9, outline, 0.12)
      this.bigRound(-5 - ext, 17, 24 + ext, 8, this.grad(17, 25, bodyA, bodyB), 0.12)
      if (p.pattern === "tuxedo")       this.r(-3 - ext, 21, 18 + ext, 4, accent)
      else if (p.pattern === "tabby") { this.r(-4 - ext, 19, 20 + ext, 1, mix(bodyB, "#000", 0.15)); this.r(-4 - ext, 22, 20 + ext, 1, mix(bodyB, "#000", 0.15)) }

      this.bigRound(-8 - ext, 23, 4, 4, outline);  this.bigRound(-7.6 - ext, 23.2, 3.2, 3.4, pawC)
      this.bigRound(-4.5 - ext, 23, 4, 4, outline); this.bigRound(-4.1 - ext, 23.2, 3.2, 3.4, pawC)

      const hx = -9 - ext
      ctx.fillStyle = outline
      this.tri(hx + 1, 14, hx + 2.5, 10.5, hx + 4, 14);   this.tri(hx + 5, 14, hx + 6.5, 10.5, hx + 8, 14)
      ctx.fillStyle = bodyA
      this.tri(hx + 1.8, 13.8, hx + 2.5, 11.5, hx + 3.2, 13.8); this.tri(hx + 5.8, 13.8, hx + 6.5, 11.5, hx + 7.2, 13.8)
      ctx.fillStyle = innerEar
      this.tri(hx + 2.1, 13.6, hx + 2.5, 12.2, hx + 2.9, 13.6); this.tri(hx + 6.1, 13.6, hx + 6.5, 12.2, hx + 6.9, 13.6)
      this.bigRound(hx, 14, 10, 10, outline, 0.45)
      this.bigRound(hx + 1, 14, 8, 9, this.grad(14, 23, bodyA, bodyB), 0.45)
      if (p.pattern === "tuxedo") this.bigRound(hx + 2, 19, 5, 4, accent, 0.4)

      ctx.strokeStyle = overheat ? "#5a0f0b" : mix(bodyB, "#000", 0.35)
      ctx.lineWidth = Math.max(2, P * 0.5); ctx.lineCap = "round"; ctx.lineJoin = "round"
      this.chevron(hx + 4, 18, 1); this.chevron(hx + 7.5, 18, -1)
      this.r(hx + 3.8, 20, 1.6, 1, nose)
    }

    // ── Overlays (after squash, before outer scale) ──────────────────────

    drawOverlays(state) {
      const ctx = this.ctx, P = this.P

      if (state.steam) {
        for (let i = 0; i < 3; i++) {
          const ph = ((state.t || 0) / 380 + i * 0.66) % 1
          ctx.fillStyle = `rgba(225,225,225,${(1 - ph) * 0.6 * state.steam})`
          ctx.beginPath(); ctx.arc((this.ox + 5 + i * 5) * P, (this.oy + 3) * P - ph * 30, 5 - ph * 2, 0, Math.PI * 2); ctx.fill()
        }
        ctx.strokeStyle = "#e8503e"; ctx.lineWidth = 2; ctx.lineCap = "round"
        for (let i = 0; i < 3; i++) {
          const bob = Math.sin((state.t || 0) / 160 + i) * 2
          const bx = (this.ox + 6 + i * 4) * P, by = (this.oy + 2) * P + bob
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 7); ctx.stroke()
        }
      }

      if (state.name === "sleep") {
        ctx.fillStyle = "#7a86a0"
        const zph = ((state.t || 0) / 720) % 1
        ctx.globalAlpha = 1 - zph
        ctx.font = `bold ${Math.round(P * 1.5)}px monospace`
        ctx.fillText("z", (this.ox + 18) * P, (this.oy + 4) * P - zph * 25)
        ctx.font = `bold ${Math.round(P * 2)}px monospace`
        ctx.fillText("Z", (this.ox + 20) * P, (this.oy + 1) * P - zph * 30)
        ctx.globalAlpha = 1
      }

      if (state.paperLen > 0) {
        const rollX = (this.ox - 2) * P
        const py = (this.oy + 30) * P
        ctx.fillStyle = "#fdfdf5"
        ctx.fillRect(rollX - 2, py, 9, state.paperLen)
        ctx.strokeStyle = "#e2e0cc"; ctx.lineWidth = 1
        ctx.strokeRect(rollX - 2, py, 9, state.paperLen)
        ctx.fillStyle = "#eee7cc"
        ctx.beginPath(); ctx.arc(rollX + 2.5, py, 8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = "#cfc6a6"
        ctx.beginPath(); ctx.arc(rollX + 2.5, py, 3, 0, Math.PI * 2); ctx.fill()
      }
    }

    drawScreenOverlays(state) {
      if (state.hearts) {
        const ctx = this.ctx
        for (const h of state.hearts) {
          ctx.fillStyle = `rgba(255,80,140,${Math.max(0, h.life)})`
          this.heart(h.x, h.y, 7 * h.life + 3)
        }
      }
    }

    // ── Main draw entry point ────────────────────────────────────────────

    draw(state) {
      this.clear()
      const ctx = this.ctx
      const f = this.footPx()
      const sc = this.scale

      ctx.save()
      ctx.translate(f.x, f.y); ctx.scale(sc, sc); ctx.translate(-f.x, -f.y)

      const sx = 1 + (state.squashX || 0)
      const sy = 1 + (state.squashY || 0)
      ctx.save()
      ctx.translate(f.x, f.y + (state.hop || 0))
      ctx.scale(sx, sy)
      ctx.translate(-f.x, -f.y)
      ctx.translate(state.lean || 0, 0)

      if (state.faceDir < 0) {
        ctx.translate(f.x, 0); ctx.scale(-1, 1); ctx.translate(-f.x, 0)
      }

      if (state.name === "stretch") {
        this.drawStretch(state)
      } else {
        this.drawCat(state)
      }

      ctx.restore()
      this.drawOverlays(state)
      ctx.restore()
      this.drawScreenOverlays(state)
    }
  }

  window.CatRenderer = CatRenderer
  window.CAT_PRESETS = PRESETS
})()
