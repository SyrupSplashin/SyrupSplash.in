/* ==========================================================================
   Sculptural Floating Swoup Emblem Engine
   - Renders the authentic images/Swoup.png ASCII emblem freely in open space
     with a pre-softened, silhouette-matched warm tungsten backlight bloom
   - Continuously glides liquid champagne-tungsten light across the ASCII relief
   - Two minimal sculptural 3D elliptical hairlines slowly precessing with
     true front/back occlusion & glowing warm light pearls
   - Restrained warm dust motes drifting softly off the silhouette
   ========================================================================== */

window.SyrupOS = window.SyrupOS || {};

(function (ns) {
    'use strict';

    class EmblemEngine {
        constructor(canvas, imageSrc) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.wrapEl = document.getElementById('emblem-wrap');
            this.imageSrc = imageSrc;

            this.size = 420;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.logoLayer = document.createElement('canvas');
            this.logoCtx = this.logoLayer.getContext('2d');

            this.bloomLayer = document.createElement('canvas');
            this.bloomCtx = this.bloomLayer.getContext('2d');
            this.bloomSize = 148;

            this.img = new Image();
            this.imgLoaded = false;
            this.drawRect = { x: 0, y: 0, w: 0, h: 0 };

            this.anchors = [];
            this.particles = [];
            this.particleCount = 42;

            // Two minimal sculptural 3D orbital hairlines (quiet kinetic art, zero HUD clutter)
            this.orbits = [
                { tiltZ: -0.36, rx: 0.455, ry: 0.165, speed: 0.44, phase: 0.4, pearlSize: 6.5 },
                { tiltZ: 0.44, rx: 0.415, ry: 0.145, speed: -0.33, phase: 3.4, pearlSize: 5.2 }
            ];

            this.localPointer = { x: 0, y: 0, active: false };
            this.tilt = { pitch: 0, roll: 0 };
            this.bootFactor = 0;
            this.impulseEnergy = 0;

            this.resize();
            this.loadImage();
            this.bindPointer();
        }

        resize() {
            const rect = this.wrapEl
                ? this.wrapEl.getBoundingClientRect()
                : { width: 420, height: 420 };
            const cssSize = Math.max(200, Math.min(rect.width || 420, rect.height || 420));

            this.size = cssSize;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            const pixelSize = Math.round(this.size * this.dpr);
            this.canvas.width = pixelSize;
            this.canvas.height = pixelSize;
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

            this.logoLayer.width = pixelSize;
            this.logoLayer.height = pixelSize;
            this.logoCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

            this.bloomLayer.width = this.bloomSize;
            this.bloomLayer.height = this.bloomSize;

            if (this.imgLoaded) {
                this.computeDrawRect();
                this.buildBloomSilhouette();
                this.extractSilhouetteAnchors();
            }
        }

        loadImage() {
            this.img.onload = () => {
                this.imgLoaded = true;
                this.computeDrawRect();
                this.buildBloomSilhouette();
                this.extractSilhouetteAnchors();
                this.initParticles();
            };
            this.img.src = this.imageSrc;
        }

        computeDrawRect() {
            const padding = this.size * 0.115;
            const avail = this.size - padding * 2;
            const aspect = (this.img.naturalWidth || 830) / (this.img.naturalHeight || 1000);

            let drawW, drawH;
            if (aspect < 1) {
                drawH = avail;
                drawW = avail * aspect;
            } else {
                drawW = avail;
                drawH = avail / aspect;
            }

            this.drawRect = {
                x: (this.size - drawW) * 0.5,
                y: (this.size - drawH) * 0.5,
                w: drawW,
                h: drawH
            };
        }

        buildBloomSilhouette() {
            const bs = this.bloomSize;
            const scale = bs / this.size;
            const bx = this.drawRect.x * scale;
            const by = this.drawRect.y * scale;
            const bw = this.drawRect.w * scale;
            const bh = this.drawRect.h * scale;

            const tmp = document.createElement('canvas');
            tmp.width = bs;
            tmp.height = bs;
            const tCtx = tmp.getContext('2d');
            tCtx.drawImage(this.img, bx, by, bw, bh);
            tCtx.globalCompositeOperation = 'source-in';

            const grad = tCtx.createRadialGradient(
                bs * 0.5, bs * 0.44, bs * 0.04,
                bs * 0.5, bs * 0.5, bs * 0.46
            );
            grad.addColorStop(0, '#ffdfb3');
            grad.addColorStop(0.55, '#eb9748');
            grad.addColorStop(1, '#ba5b24');
            tCtx.fillStyle = grad;
            tCtx.fillRect(0, 0, bs, bs);

            const bCtx = this.bloomCtx;
            bCtx.clearRect(0, 0, bs, bs);
            bCtx.save();
            if ('filter' in bCtx) {
                bCtx.filter = 'blur(8px)';
                bCtx.drawImage(tmp, 0, 0);
                bCtx.filter = 'none';
            } else {
                const offsets = [
                    [-3, -3], [0, -4], [3, -3],
                    [-4, 0], [0, 0], [4, 0],
                    [-3, 3], [0, 4], [3, 3]
                ];
                bCtx.globalAlpha = 0.16;
                for (let i = 0; i < offsets.length; i++) {
                    bCtx.drawImage(tmp, offsets[i][0], offsets[i][1]);
                }
            }
            bCtx.restore();
        }

        extractSilhouetteAnchors() {
            this.anchors = [];
            const { x, y, w, h } = this.drawRect;

            try {
                const sampleCanvas = document.createElement('canvas');
                const sw = 92;
                const sh = 112;
                sampleCanvas.width = sw;
                sampleCanvas.height = sh;
                const sCtx = sampleCanvas.getContext('2d');
                sCtx.drawImage(this.img, 0, 0, sw, sh);
                const data = sCtx.getImageData(0, 0, sw, sh).data;

                for (let sy = 1; sy < sh - 1; sy += 2) {
                    for (let sx = 1; sx < sw - 1; sx += 2) {
                        const a = data[(sy * sw + sx) * 4 + 3];
                        if (a > 60) {
                            const aL = data[(sy * sw + (sx - 1)) * 4 + 3];
                            const aR = data[(sy * sw + (sx + 1)) * 4 + 3];
                            const aU = data[((sy - 1) * sw + sx) * 4 + 3];
                            const aD = data[((sy + 1) * sw + sx) * 4 + 3];
                            const isEdge = aL < 40 || aR < 40 || aU < 40 || aD < 40;
                            if (isEdge || Math.random() < 0.12) {
                                this.anchors.push({
                                    x: x + (sx / sw) * w,
                                    y: y + (sy / sh) * h
                                });
                            }
                        }
                    }
                }
            } catch (_err) {
                const cx = this.size * 0.5;
                const cy = this.size * 0.5;
                const rx = w * 0.44;
                const ry = h * 0.46;
                for (let i = 0; i < 100; i++) {
                    const ang = (i / 100) * Math.PI * 2;
                    const rad = 0.75 + Math.random() * 0.25;
                    this.anchors.push({
                        x: cx + Math.cos(ang) * rx * rad,
                        y: cy + Math.sin(ang) * ry * rad
                    });
                }
            }
        }

        initParticles() {
            this.particles = [];
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push(this.spawnParticle(true));
            }
        }

        spawnParticle(randomProgress) {
            const anchor = this.anchors.length > 0
                ? this.anchors[Math.floor(Math.random() * this.anchors.length)]
                : { x: this.size * 0.5, y: this.size * 0.5 };

            const cx = this.size * 0.5;
            const cy = this.size * 0.5;
            const outAngle = Math.atan2(anchor.y - cy, anchor.x - cx) + (Math.random() - 0.5) * 0.7;
            const speed = 4.5 + Math.random() * 10;
            const maxLife = 3.2 + Math.random() * 3.8;

            return {
                x: anchor.x,
                y: anchor.y,
                vx: Math.cos(outAngle) * speed * 0.45,
                vy: Math.sin(outAngle) * speed * 0.3 - (4 + Math.random() * 8),
                life: randomProgress ? Math.random() * maxLife : 0,
                maxLife,
                size: 0.8 + Math.random() * 1.6,
                inFront: Math.random() > 0.48,
                orbitPhase: Math.random() * Math.PI * 2,
                orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.8)
            };
        }

        bindPointer() {
            this.canvas.addEventListener('pointermove', (ev) => {
                const rect = this.canvas.getBoundingClientRect();
                this.localPointer.x = ev.clientX - rect.left;
                this.localPointer.y = ev.clientY - rect.top;
                this.localPointer.active = true;
            });
            this.canvas.addEventListener('pointerleave', () => {
                this.localPointer.active = false;
            });
        }

        setTilt(pitch, roll) {
            this.tilt.pitch = pitch;
            this.tilt.roll = roll;
        }

        triggerPulse() {
            this.impulseEnergy = 1.0;
        }

        update(timeSec, dt, reducedMotion) {
            const motion = reducedMotion ? 0.16 : 1.0;
            this.bootFactor = Math.min(1, this.bootFactor + dt * 0.72);
            this.impulseEnergy = Math.max(0, this.impulseEnergy - dt * 1.3);

            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.size, this.size);

            if (!this.imgLoaded) return;

            const cx = this.size * 0.5;
            const cy = this.size * 0.5;
            const breath = Math.sin(timeSec * 0.95) * 0.5 + 0.5;
            const floatY = Math.sin(timeSec * 0.84 * motion) * 3.6 + Math.cos(timeSec * 0.46 * motion) * 1.8;

            this.updateParticles(timeSec, dt, motion);

            // 1. Soft Sculptural Warm Backlight Halo
            ctx.save();
            const haloRadius = this.size * (0.45 + breath * 0.03 + this.impulseEnergy * 0.055);
            const halo = ctx.createRadialGradient(
                cx - this.tilt.roll * 2.4,
                cy + floatY - this.tilt.pitch * 2.4,
                this.size * 0.03,
                cx,
                cy + floatY,
                haloRadius
            );
            const boost = (1 + this.impulseEnergy * 0.48) * this.bootFactor;
            halo.addColorStop(0, `rgba(255, 204, 138, ${0.22 * boost})`);
            halo.addColorStop(0.42, `rgba(230, 134, 56, ${0.09 * boost})`);
            halo.addColorStop(0.76, `rgba(186, 84, 30, ${0.022 * boost})`);
            halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(cx, cy + floatY, haloRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 2. Far-Side Sculptural Orbital Hairlines & Embers (passing BEHIND emblem)
            this.renderOrbits(timeSec, floatY, false, motion, this.bootFactor);
            this.renderParticles(false, floatY, this.bootFactor);

            // 3. Silhouette-Matched Warm Tungsten Back-Bloom
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.imageSmoothingEnabled = true;
            ctx.globalAlpha = (0.46 + 0.16 * breath + this.impulseEnergy * 0.25) * this.bootFactor;
            ctx.drawImage(this.bloomLayer, -this.tilt.roll * 0.8, floatY - this.tilt.pitch * 0.8, this.size, this.size);

            ctx.globalAlpha = (0.24 + 0.1 * breath + this.impulseEnergy * 0.18) * this.bootFactor;
            ctx.drawImage(this.bloomLayer, 0, floatY, this.size, this.size);
            ctx.restore();

            // 4. Primary Crisp Swoup Emblem with Continuous Liquid Warm Light Sweep
            this.renderLitLogo(timeSec, breath, motion);

            ctx.save();
            ctx.globalAlpha = this.bootFactor;
            ctx.drawImage(this.logoLayer, 0, floatY, this.size, this.size);
            ctx.restore();

            // 5. Near-Side Sculptural Orbital Hairlines & Embers (passing IN FRONT of emblem)
            this.renderOrbits(timeSec, floatY, true, motion, this.bootFactor);
            this.renderParticles(true, floatY, this.bootFactor);
        }

        renderOrbits(timeSec, floatY, frontHalf, motion, boot) {
            const ctx = this.ctx;
            const cx = this.size * 0.5;
            const cy = this.size * 0.5 + floatY;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';

            for (let oi = 0; oi < this.orbits.length; oi++) {
                const o = this.orbits[oi];
                const precess = o.tiltZ + Math.sin(timeSec * 0.16 * motion + oi * 2.1) * 0.15;
                const cosP = Math.cos(precess);
                const sinP = Math.sin(precess);
                const rx = this.size * o.rx;
                const ry = this.size * o.ry;

                // Draw the whisper-thin hairline half-ellipse (back arc or front arc)
                const startA = frontHalf ? 0 : Math.PI;
                const endA = frontHalf ? Math.PI : Math.PI * 2;
                const steps = 48;

                ctx.beginPath();
                for (let s = 0; s <= steps; s++) {
                    const ang = startA + (s / steps) * (endA - startA);
                    const lx = Math.cos(ang) * rx;
                    const ly = Math.sin(ang) * ry;
                    const px = cx + lx * cosP - ly * sinP;
                    const py = cy + lx * sinP + ly * cosP;
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }

                ctx.strokeStyle = frontHalf
                    ? `rgba(255, 218, 168, ${0.22 * boot})`
                    : `rgba(242, 186, 122, ${0.095 * boot})`;
                ctx.lineWidth = frontHalf ? 0.85 : 0.65;
                ctx.stroke();

                // Gliding luminous warm pearl + short silky comet tail along the hairline
                const headAng = ((timeSec * o.speed * motion + o.phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const trailSteps = 18;
                let prevPt = null;

                for (let s = 0; s <= trailSteps; s++) {
                    const frac = 1 - s / trailSteps;
                    const ang = headAng - (o.speed > 0 ? 1 : -1) * s * 0.048;
                    const zDepth = Math.sin(ang);
                    const isFront = zDepth >= 0;

                    const lx = Math.cos(ang) * rx;
                    const ly = zDepth * ry;
                    const px = cx + lx * cosP - ly * sinP;
                    const py = cy + lx * sinP + ly * cosP;

                    if (prevPt && isFront === frontHalf) {
                        const alpha = Math.pow(frac, 2.0) * (frontHalf ? 0.56 : 0.22) * boot;
                        ctx.strokeStyle = `rgba(255, 224, 178, ${alpha.toFixed(3)})`;
                        ctx.lineWidth = (0.55 + frac * 1.25) * (frontHalf ? 1 : 0.72);
                        ctx.beginPath();
                        ctx.moveTo(prevPt.x, prevPt.y);
                        ctx.lineTo(px, py);
                        ctx.stroke();
                    }

                    if (s === 0 && isFront === frontHalf) {
                        const r = o.pearlSize * (frontHalf ? 1.1 : 0.75);
                        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
                        g.addColorStop(0, `rgba(255, 248, 234, ${(frontHalf ? 0.92 : 0.42) * boot})`);
                        g.addColorStop(0.4, `rgba(255, 198, 126, ${(frontHalf ? 0.45 : 0.18) * boot})`);
                        g.addColorStop(1, 'rgba(255, 160, 72, 0)');
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.arc(px, py, r, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    prevPt = { x: px, y: py };
                }
            }

            ctx.restore();
        }

        renderLitLogo(timeSec, breath, motion) {
            const lCtx = this.logoCtx;
            const { x, y, w, h } = this.drawRect;

            lCtx.clearRect(0, 0, this.size, this.size);

            lCtx.save();
            lCtx.globalCompositeOperation = 'source-over';
            lCtx.drawImage(this.img, x, y, w, h);

            // Warm brushed alabaster-champagne base tint
            lCtx.globalCompositeOperation = 'source-atop';
            const baseGrad = lCtx.createLinearGradient(x, y, x + w * 0.4, y + h);
            baseGrad.addColorStop(0, '#fff5e6');
            baseGrad.addColorStop(0.55, '#ead8c2');
            baseGrad.addColorStop(1, '#c8aa87');
            lCtx.fillStyle = baseGrad;
            lCtx.fillRect(x, y, w, h);

            // Slow, hypnotic diagonal warm gallery light sweeping across the ASCII characters
            const sweepPhase = ((timeSec * 0.19 * motion) % 1.75) - 0.36;
            const sx = x + w * sweepPhase;
            const sweepGrad = lCtx.createLinearGradient(sx - w * 0.34, y, sx + w * 0.34, y + h * 0.72);
            sweepGrad.addColorStop(0, 'rgba(255, 196, 124, 0)');
            sweepGrad.addColorStop(0.36, 'rgba(255, 206, 140, 0.32)');
            sweepGrad.addColorStop(0.5, 'rgba(255, 248, 232, 0.88)');
            sweepGrad.addColorStop(0.64, 'rgba(255, 192, 114, 0.32)');
            sweepGrad.addColorStop(1, 'rgba(255, 186, 108, 0)');
            lCtx.fillStyle = sweepGrad;
            lCtx.fillRect(x, y, w, h);

            // Subtle interactive warm lamp glint when hovering over the emblem
            if (this.localPointer.active) {
                const pGrad = lCtx.createRadialGradient(
                    this.localPointer.x, this.localPointer.y, 4,
                    this.localPointer.x, this.localPointer.y, w * 0.5
                );
                pGrad.addColorStop(0, 'rgba(255, 248, 232, 0.78)');
                pGrad.addColorStop(0.45, 'rgba(255, 196, 122, 0.28)');
                pGrad.addColorStop(1, 'rgba(255, 166, 82, 0)');
                lCtx.fillStyle = pGrad;
                lCtx.fillRect(x, y, w, h);
            }

            // Gentle breathing warm center radiance
            const coreGrad = lCtx.createRadialGradient(
                x + w * 0.5 + this.tilt.roll * 2.8,
                y + h * 0.42 + this.tilt.pitch * 2.8,
                w * 0.05,
                x + w * 0.5,
                y + h * 0.5,
                w * 0.62
            );
            coreGrad.addColorStop(0, `rgba(255, 236, 206, ${0.16 + breath * 0.14 + this.impulseEnergy * 0.2})`);
            coreGrad.addColorStop(1, 'rgba(255, 174, 92, 0)');
            lCtx.fillStyle = coreGrad;
            lCtx.fillRect(x, y, w, h);

            lCtx.restore();
        }

        updateParticles(timeSec, dt, motion) {
            const cx = this.size * 0.5;
            const cy = this.size * 0.5;

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    this.particles[i] = this.spawnParticle(false);
                    continue;
                }

                const dx = p.x - cx;
                const dy = p.y - cy;
                const swirl = p.orbitSpeed * 0.2 * motion;

                p.x += (p.vx - dy * swirl * 0.22 + Math.sin(timeSec * 1.1 + p.orbitPhase) * 3.2) * dt * motion;
                p.y += (p.vy + dx * swirl * 0.12) * dt * motion;

                if (this.impulseEnergy > 0.05) {
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    p.x += (dx / dist) * this.impulseEnergy * 34 * dt;
                    p.y += (dy / dist) * this.impulseEnergy * 34 * dt;
                }

                if (this.localPointer.active) {
                    const mdx = p.x - this.localPointer.x;
                    const mdy = p.y - this.localPointer.y;
                    const mdSq = mdx * mdx + mdy * mdy;
                    if (mdSq < 6800 && mdSq > 4) {
                        const md = Math.sqrt(mdSq);
                        const f = (1 - md / 82) * 74 * dt;
                        p.x += ((mdx / md) * 0.65 - (mdy / md) * 0.45) * f;
                        p.y += ((mdy / md) * 0.65 + (mdx / md) * 0.45) * f;
                    }
                }
            }
        }

        renderParticles(frontLayer, floatY, boot) {
            const ctx = this.ctx;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                if (p.inFront !== frontLayer) continue;

                const t = p.life / p.maxLife;
                const env = t < 0.2 ? t / 0.2 : Math.pow(1 - (t - 0.2) / 0.8, 1.4);
                const alpha = env * (frontLayer ? 0.62 : 0.36) * boot;
                if (alpha <= 0.01) continue;

                const py = p.y + floatY;
                const r = p.size * (3.0 + env * 1.5);

                const g = ctx.createRadialGradient(p.x, py, 0, p.x, py, r);
                g.addColorStop(0, `rgba(255, 242, 218, ${alpha})`);
                g.addColorStop(0.36, `rgba(252, 190, 114, ${alpha * 0.52})`);
                g.addColorStop(1, 'rgba(226, 130, 52, 0)');

                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, py, r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    ns.EmblemEngine = EmblemEngine;
})(window.SyrupOS);
