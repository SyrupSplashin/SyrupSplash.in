/* ==========================================================================
   Living Architectural Topographic Relief Field + Quiet Warm Embers
   Refined cartographic hairline contours morphing via 3D Simplex noise,
   illuminated by slow drifting 2700K warm architectural light pools.
   ========================================================================== */

window.SyrupOS = window.SyrupOS || {};

(function (ns) {
    'use strict';

    const MS_TABLE = [
        [],
        [[3, 2]],
        [[2, 1]],
        [[3, 1]],
        [[0, 1]],
        [[0, 3], [1, 2]],
        [[0, 2]],
        [[0, 3]],
        [[0, 3]],
        [[0, 2]],
        [[0, 1], [2, 3]],
        [[0, 1]],
        [[3, 1]],
        [[2, 1]],
        [[3, 2]],
        []
    ];

    class TopographyEngine {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: false });
            this.noise = new ns.SimplexNoise(4207);

            this.width = 0;
            this.height = 0;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.cellSize = 24;
            this.cols = 0;
            this.rows = 0;
            this.field = new Float32Array(0);

            this.levels = [-0.55, -0.34, -0.14, 0.06, 0.26, 0.46, 0.66];

            // Slow, languid gallery light pools drifting across the relief
            this.lights = [
                { phaseX: 0.4, phaseY: 1.2, speedX: 0.11, speedY: 0.085, radius: 0.44, intensity: 0.95 },
                { phaseX: 2.7, phaseY: 4.3, speedX: 0.075, speedY: 0.12, radius: 0.38, intensity: 0.78 },
                { phaseX: 5.1, phaseY: 2.0, speedX: 0.095, speedY: 0.065, radius: 0.32, intensity: 0.65 }
            ];

            // Restrained, delicate floating warm light dust motes
            this.embers = [];
            this.emberCount = 46;

            // Serene water-like ripples on background click
            this.ripples = [];

            this.pointer = { x: 0.5, y: 0.5, active: false };
            this.smoothPointer = { x: 0.5, y: 0.5 };
            this.bootFactor = 0;

            this.resize();
            this.initEmbers();
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.canvas.width = Math.floor(this.width * this.dpr);
            this.canvas.height = Math.floor(this.height * this.dpr);
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

            this.cellSize = this.width < 640 ? 28 : 24;
            this.cols = Math.ceil(this.width / this.cellSize) + 2;
            this.rows = Math.ceil(this.height / this.cellSize) + 2;
            this.field = new Float32Array(this.cols * this.rows);
        }

        initEmbers() {
            this.embers = [];
            for (let i = 0; i < this.emberCount; i++) {
                this.embers.push(this.createEmber(true));
            }
        }

        createEmber(randomY) {
            const z = 0.25 + Math.random() * 0.75;
            return {
                x: Math.random() * (this.width || 1440),
                y: randomY ? Math.random() * (this.height || 900) : (this.height || 900) + 18,
                z,
                vx: (Math.random() - 0.5) * 6 * z,
                vy: -(5 + Math.random() * 12) * z,
                size: (0.9 + Math.random() * 1.9) * z,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.55 + Math.random() * 1.35,
                warmth: Math.random()
            };
        }

        setPointer(nx, ny, active) {
            this.pointer.x = nx;
            this.pointer.y = ny;
            this.pointer.active = active;
        }

        triggerRipple(clientX, clientY) {
            this.ripples.push({
                x: clientX,
                y: clientY,
                radius: 10,
                maxRadius: Math.max(this.width, this.height) * 0.58,
                alpha: 1
            });
            if (this.ripples.length > 5) this.ripples.shift();
        }

        update(timeSec, dt, reducedMotion) {
            const motionScale = reducedMotion ? 0.16 : 1.0;
            this.bootFactor = Math.min(1, this.bootFactor + dt * 0.65);

            this.smoothPointer.x += (this.pointer.x - this.smoothPointer.x) * Math.min(1, dt * 3.6);
            this.smoothPointer.y += (this.pointer.y - this.smoothPointer.y) * Math.min(1, dt * 3.6);

            const activeLights = [];
            for (let i = 0; i < this.lights.length; i++) {
                const l = this.lights[i];
                const lx = (0.5 + 0.38 * Math.sin(timeSec * l.speedX * motionScale + l.phaseX)
                    + 0.09 * Math.cos(timeSec * l.speedY * 0.7 * motionScale + l.phaseY)) * this.width;
                const ly = (0.5 + 0.36 * Math.cos(timeSec * l.speedY * motionScale + l.phaseY)
                    + 0.08 * Math.sin(timeSec * l.speedX * 0.9 * motionScale + l.phaseX)) * this.height;
                activeLights.push({
                    x: lx,
                    y: ly,
                    r: Math.min(this.width, this.height) * l.radius,
                    intensity: l.intensity
                });
            }

            if (this.pointer.active) {
                activeLights.push({
                    x: this.smoothPointer.x * this.width,
                    y: this.smoothPointer.y * this.height,
                    r: Math.min(this.width, this.height) * 0.32,
                    intensity: 0.92
                });
            }

            for (let i = this.ripples.length - 1; i >= 0; i--) {
                const r = this.ripples[i];
                r.radius += dt * 360;
                r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
                if (r.alpha <= 0.005) this.ripples.splice(i, 1);
            }

            const cols = this.cols;
            const rows = this.rows;
            const field = this.field;
            const scale = 0.0021;
            const tDriftX = timeSec * 0.022 * motionScale;
            const tDriftY = timeSec * 0.015 * motionScale;
            const tZ = timeSec * 0.056 * motionScale;

            const parX = (this.smoothPointer.x - 0.5) * 0.09;
            const parY = (this.smoothPointer.y - 0.5) * 0.09;

            for (let row = 0; row < rows; row++) {
                const py = row * this.cellSize;
                const ny = py * scale + tDriftY + parY;
                const rowOffset = row * cols;

                for (let col = 0; col < cols; col++) {
                    const px = col * this.cellSize;
                    const nx = px * scale + tDriftX + parX;

                    let val = this.noise.noise3D(nx, ny, tZ) * 0.74
                        + this.noise.noise3D(nx * 2.1 + 11.4, ny * 2.1 - 7.2, tZ * 1.3) * 0.26;

                    for (let k = 0; k < this.ripples.length; k++) {
                        const rp = this.ripples[k];
                        const dx = px - rp.x;
                        const dy = py - rp.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const delta = dist - rp.radius;
                        if (Math.abs(delta) < 105) {
                            val += Math.cos((delta / 105) * Math.PI * 0.5) * Math.sin(delta * 0.08) * 0.28 * rp.alpha;
                        }
                    }

                    field[rowOffset + col] = val;
                }
            }

            this.render(timeSec, dt, activeLights, motionScale);
        }

        render(timeSec, dt, activeLights, motionScale) {
            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;
            const boot = this.bootFactor;

            // Deep matte obsidian base
            ctx.fillStyle = '#08080a';
            ctx.fillRect(0, 0, w, h);

            // Soft warm architectural ambient light pools
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < activeLights.length; i++) {
                const l = activeLights[i];
                const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 1.45);
                const alpha = 0.068 * l.intensity * boot;
                grad.addColorStop(0, `rgba(252, 186, 112, ${alpha})`);
                grad.addColorStop(0.45, `rgba(218, 124, 52, ${alpha * 0.42})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }

            // Quiet warm central glow behind the floating emblem
            const cx = w * 0.5;
            const cy = h * 0.42;
            const coreRadius = Math.min(w, h) * 0.54;
            const coreBreath = 0.92 + 0.08 * Math.sin(timeSec * 0.72);
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
            coreGrad.addColorStop(0, `rgba(250, 184, 108, ${0.1 * boot * coreBreath})`);
            coreGrad.addColorStop(0.46, `rgba(214, 118, 48, ${0.038 * boot * coreBreath})`);
            coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = coreGrad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();

            // Fine hairline topographic isolines
            this.renderContours(activeLights, boot);

            // Soft ripple ring on click
            if (this.ripples.length > 0) {
                ctx.save();
                for (let i = 0; i < this.ripples.length; i++) {
                    const rp = this.ripples[i];
                    ctx.beginPath();
                    ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 214, 162, ${rp.alpha * 0.34 * boot})`;
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                }
                ctx.restore();
            }

            this.updateAndRenderEmbers(timeSec, dt, boot, motionScale);
        }

        renderContours(activeLights, boot) {
            const ctx = this.ctx;
            const cols = this.cols;
            const rows = this.rows;
            const cs = this.cellSize;
            const field = this.field;
            const levels = this.levels;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let li = 0; li < levels.length; li++) {
                const iso = levels[li];
                const isMajor = li % 2 === 1;

                ctx.beginPath();
                for (let r = 0; r < rows - 1; r++) {
                    const r0 = r * cols;
                    const r1 = (r + 1) * cols;
                    const y = r * cs;

                    for (let c = 0; c < cols - 1; c++) {
                        const v0 = field[r0 + c];
                        const v1 = field[r0 + c + 1];
                        const v2 = field[r1 + c + 1];
                        const v3 = field[r1 + c];

                        let idx = 0;
                        if (v0 > iso) idx |= 8;
                        if (v1 > iso) idx |= 4;
                        if (v2 > iso) idx |= 2;
                        if (v3 > iso) idx |= 1;

                        if (idx === 0 || idx === 15) continue;

                        const segs = MS_TABLE[idx];
                        const x = c * cs;

                        for (let s = 0; s < segs.length; s++) {
                            const pA = this.interpEdge(segs[s][0], x, y, cs, v0, v1, v2, v3, iso);
                            const pB = this.interpEdge(segs[s][1], x, y, cs, v0, v1, v2, v3, iso);
                            ctx.moveTo(pA[0], pA[1]);
                            ctx.lineTo(pB[0], pB[1]);
                        }
                    }
                }

                ctx.lineWidth = isMajor ? 0.95 : 0.6;
                ctx.strokeStyle = isMajor
                    ? `rgba(248, 204, 152, ${0.11 * boot})`
                    : `rgba(218, 178, 134, ${0.055 * boot})`;
                ctx.stroke();

                if (isMajor && activeLights.length > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    for (let k = 0; k < activeLights.length; k++) {
                        const l = activeLights[k];
                        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
                        g.addColorStop(0, `rgba(255, 220, 172, ${0.34 * l.intensity * boot})`);
                        g.addColorStop(0.55, `rgba(238, 154, 76, ${0.12 * l.intensity * boot})`);
                        g.addColorStop(1, 'rgba(255, 160, 72, 0)');
                        ctx.strokeStyle = g;
                        ctx.lineWidth = 1.25;
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            ctx.restore();
        }

        interpEdge(edge, x, y, cs, v0, v1, v2, v3, iso) {
            let t;
            switch (edge) {
                case 0:
                    t = (iso - v0) / (v1 - v0 || 1e-6);
                    return [x + t * cs, y];
                case 1:
                    t = (iso - v1) / (v2 - v1 || 1e-6);
                    return [x + cs, y + t * cs];
                case 2:
                    t = (iso - v3) / (v2 - v3 || 1e-6);
                    return [x + t * cs, y + cs];
                default:
                    t = (iso - v0) / (v3 - v0 || 1e-6);
                    return [x, y + t * cs];
            }
        }

        updateAndRenderEmbers(timeSec, dt, boot, motionScale) {
            const ctx = this.ctx;
            const w = this.width;
            const h = this.height;
            const px = this.smoothPointer.x * w;
            const py = this.smoothPointer.y * h;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            for (let i = 0; i < this.embers.length; i++) {
                const e = this.embers[i];
                const n = this.noise.noise2D(e.x * 0.0028 + timeSec * 0.06, e.y * 0.0028);
                e.x += (e.vx + Math.cos(n * Math.PI * 2) * 11 * e.z) * dt * motionScale;
                e.y += (e.vy + Math.sin(n * Math.PI * 2) * 5 * e.z) * dt * motionScale;

                if (this.pointer.active) {
                    const dx = e.x - px;
                    const dy = e.y - py;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 24000 && distSq > 4) {
                        const dist = Math.sqrt(distSq);
                        const force = (1 - dist / 155) * 38 * e.z * dt;
                        e.x += (dx / dist) * force;
                        e.y += (dy / dist) * force;
                    }
                }

                for (let k = 0; k < this.ripples.length; k++) {
                    const rp = this.ripples[k];
                    const dx = e.x - rp.x;
                    const dy = e.y - rp.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (Math.abs(dist - rp.radius) < 40) {
                        const push = 75 * rp.alpha * e.z * dt;
                        e.x += (dx / dist) * push;
                        e.y += (dy / dist) * push;
                    }
                }

                if (e.y < -24) {
                    e.y = h + 20;
                    e.x = Math.random() * w;
                }
                if (e.x < -26) e.x = w + 22;
                if (e.x > w + 26) e.x = -22;

                const pulse = 0.45 + 0.55 * Math.sin(timeSec * e.pulseSpeed + e.phase);
                const alpha = (0.1 + 0.26 * pulse) * e.z * boot;
                const glowRadius = e.size * (4.2 + pulse * 2.0);

                const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, glowRadius);
                if (e.warmth > 0.5) {
                    g.addColorStop(0, `rgba(255, 236, 208, ${alpha})`);
                    g.addColorStop(0.35, `rgba(248, 190, 120, ${alpha * 0.45})`);
                } else {
                    g.addColorStop(0, `rgba(252, 208, 150, ${alpha})`);
                    g.addColorStop(0.35, `rgba(226, 134, 58, ${alpha * 0.42})`);
                }
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(e.x, e.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    ns.TopographyEngine = TopographyEngine;
})(window.SyrupOS);
