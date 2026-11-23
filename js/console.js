/* ==========================================================================
   Weightless Emblem Levitation & Stationary Button Light Engine
   - Drives continuous multi-harmonic 3D floating on the Swoup emblem + shadow
   - Keeps all 5 sharp-cornered buttons completely stationary while animating
     pure warm light:
     1. Exact-aspect-ratio SVG perimeter light filament orbiting all 4 sharp
        edges at constant velocity (expanding to enclose all 4 sides on hover)
     2. Real-time interior glass light cast from the moving perimeter light tip
     3. Shared-coordinate warm proximity spotlight from cursor
   ========================================================================== */

window.SyrupOS = window.SyrupOS || {};

(function (ns) {
    'use strict';

    // Exact Euclidean perimeter point (0..100%) for a rectangle of dimensions (w, h)
    function rectPerimeterPoint(u, w, h) {
        const p = ((u % 1) + 1) % 1;
        const perim = 2 * (w + h) || 1;
        const fTop = w / perim;
        const fRight = h / perim;
        const fBottom = w / perim;
        const fLeft = h / perim;

        if (p < fTop) {
            return { x: (p / fTop) * 100, y: 0 };
        } else if (p < fTop + fRight) {
            return { x: 100, y: ((p - fTop) / fRight) * 100 };
        } else if (p < fTop + fRight + fBottom) {
            return { x: (1 - (p - fTop - fRight) / fBottom) * 100, y: 100 };
        } else {
            return { x: 0, y: (1 - (p - fTop - fRight - fBottom) / fLeft) * 100 };
        }
    }

    class FloatEngine {
        constructor() {
            this.emblemWrap = document.getElementById('emblem-wrap');
            this.emblemShadow = document.getElementById('emblem-shadow');

            const slots = Array.from(document.querySelectorAll('.dock-slot'));
            this.keyStates = slots.map((slot, i) => {
                const el = slot.querySelector('.dock-key');
                return {
                    slot,
                    el,
                    frameSvg: slot.querySelector('.key-frame'),
                    frameRects: Array.from(slot.querySelectorAll('.key-frame rect')),
                    trailEl: slot.querySelector('.frame-trail'),
                    headEl: slot.querySelector('.frame-head'),
                    width: 150,
                    height: 48,
                    hovered: false,
                    hoverSpring: 0,
                    hoverVel: 0,
                    dir: i % 2 === 0 ? 1 : -1,
                    orbitProgress: (i * 0.21) % 1,
                    baseSpeed: 0.115 + (i % 3) * 0.012
                };
            });

            this.pointerTarget = {
                x: 0,
                y: 0,
                clientX: window.innerWidth * 0.5,
                clientY: window.innerHeight * 0.5,
                active: false
            };
            this.pointerSpring = { x: 0, y: 0, vx: 0, vy: 0 };

            this.attitude = { pitch: 0, roll: 0, lift: 0 };

            this.syncFrameGeometry();
            this.bindKeyInteractions();
        }

        // Sync each button's SVG viewBox & <rect> to its actual pixel box for razor-sharp 1px edges
        syncFrameGeometry() {
            for (let i = 0; i < this.keyStates.length; i++) {
                const ks = this.keyStates[i];
                if (!ks.el || !ks.frameSvg) continue;
                const rect = ks.slot.getBoundingClientRect();
                const w = Math.max(40, Math.round(rect.width) || 150);
                const h = Math.max(30, Math.round(rect.height) || 48);
                ks.width = w;
                ks.height = h;
                ks.frameSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
                for (let r = 0; r < ks.frameRects.length; r++) {
                    ks.frameRects[r].setAttribute('width', String(w - 1));
                    ks.frameRects[r].setAttribute('height', String(h - 1));
                }
            }
        }

        resize() {
            this.syncFrameGeometry();
        }

        bindKeyInteractions() {
            this.keyStates.forEach((ks) => {
                if (!ks.el) return;
                ks.el.addEventListener('pointerenter', () => {
                    ks.hovered = true;
                });
                ks.el.addEventListener('pointerleave', () => {
                    ks.hovered = false;
                });
                ks.el.addEventListener('focus', () => {
                    ks.hovered = true;
                });
                ks.el.addEventListener('blur', () => {
                    ks.hovered = false;
                });
                ks.el.addEventListener('click', () => {
                    this.flashKey(ks);
                });
            });
        }

        flashKey(ks) {
            ks.el.classList.add('is-flash');
            window.setTimeout(() => ks.el.classList.remove('is-flash'), 340);
        }

        triggerKeyByNumber(numIndex) {
            const ks = this.keyStates[numIndex];
            if (!ks || !ks.el) return;
            ks.el.classList.add('is-hot');
            this.flashKey(ks);
            window.setTimeout(() => {
                ks.el.classList.remove('is-hot');
                ks.el.click();
            }, 150);
        }

        setPointer(nx, ny, clientX, clientY, active) {
            this.pointerTarget.x = (nx - 0.5) * 2;
            this.pointerTarget.y = (ny - 0.5) * 2;
            this.pointerTarget.clientX = clientX;
            this.pointerTarget.clientY = clientY;
            this.pointerTarget.active = active;
        }

        update(timeSec, dt, reducedMotion) {
            const motion = reducedMotion ? 0.16 : 1.0;

            const stiffness = 22;
            const damping = 6.8;
            const targetX = this.pointerTarget.active ? this.pointerTarget.x : 0;
            const targetY = this.pointerTarget.active ? this.pointerTarget.y : 0;

            const ax = (targetX - this.pointerSpring.x) * stiffness - this.pointerSpring.vx * damping;
            const ay = (targetY - this.pointerSpring.y) * stiffness - this.pointerSpring.vy * damping;
            this.pointerSpring.vx += ax * dt;
            this.pointerSpring.vy += ay * dt;
            this.pointerSpring.x += this.pointerSpring.vx * dt;
            this.pointerSpring.y += this.pointerSpring.vy * dt;

            // Continuous multi-harmonic weightless levitation for the Swoup emblem
            const autoLift = (
                Math.sin(timeSec * 0.82) * 9.0 +
                Math.sin(timeSec * 1.37 + 1.1) * 3.4 +
                Math.cos(timeSec * 0.39) * 2.5
            ) * motion;

            const autoDriftX = (
                Math.cos(timeSec * 0.52 + 0.6) * 5.2 +
                Math.sin(timeSec * 1.04) * 1.8
            ) * motion;

            const autoPitch = (
                Math.sin(timeSec * 0.64 + 0.5) * 3.2 +
                Math.cos(timeSec * 1.12) * 1.1
            ) * motion;

            const autoRoll = (
                Math.cos(timeSec * 0.56 + 1.7) * 3.8 +
                Math.sin(timeSec * 0.98) * 1.3
            ) * motion;

            const autoYaw = Math.sin(timeSec * 0.34 + 0.8) * 0.6 * motion;

            const pitch = autoPitch - this.pointerSpring.y * 8.5 * motion;
            const roll = autoRoll + this.pointerSpring.x * 9.5 * motion;

            this.attitude.pitch = pitch;
            this.attitude.roll = roll;
            this.attitude.lift = autoLift;

            if (this.emblemWrap) {
                this.emblemWrap.style.transform =
                    `translate3d(${autoDriftX.toFixed(2)}px, ${autoLift.toFixed(2)}px, 0px) ` +
                    `rotateX(${pitch.toFixed(3)}deg) rotateY(${roll.toFixed(3)}deg) rotateZ(${autoYaw.toFixed(3)}deg)`;
            }

            if (this.emblemShadow) {
                const shadowX = -50 - (roll * 0.9);
                const shadowY = 8 - autoLift * 0.7;
                const shadowScale = 0.94 - autoLift / 220;
                this.emblemShadow.style.transform =
                    `translate3d(${shadowX.toFixed(2)}%, ${shadowY.toFixed(2)}px, -90px) scale(${shadowScale.toFixed(4)})`;
                this.emblemShadow.style.opacity = (0.82 - autoLift * 0.012).toFixed(3);
            }

            this.updateKeys(dt, motion);
        }

        updateKeys(dt, motion) {
            for (let i = 0; i < this.keyStates.length; i++) {
                const ks = this.keyStates[i];
                const el = ks.el;
                if (!el) continue;

                // Smooth spring for hover light expansion only (zero physical movement)
                const targetHover = ks.hovered ? 1 : 0;
                const hAcc = (targetHover - ks.hoverSpring) * 115 - ks.hoverVel * 14.5;
                ks.hoverVel += hAcc * dt;
                ks.hoverSpring += ks.hoverVel * dt;
                const hs = Math.max(0, Math.min(1, ks.hoverSpring));

                // 1. Orbiting warm perimeter light filament around all 4 sharp edges
                const speedBoost = 1 + hs * 1.25;
                ks.orbitProgress = (ks.orbitProgress + ks.dir * ks.baseSpeed * speedBoost * dt * motion + 1) % 1;

                const headPos = ks.orbitProgress * 100;
                const trailLen = 22 + hs * 78;
                const headLen = 3.2 * (1 - hs * 0.55);

                if (ks.trailEl) {
                    const trailOffset = ks.dir > 0 ? (trailLen - headPos) : (-headPos);
                    ks.trailEl.style.strokeDasharray = `${trailLen.toFixed(2)} ${(100 - trailLen).toFixed(2)}`;
                    ks.trailEl.style.strokeDashoffset = trailOffset.toFixed(2);
                }

                if (ks.headEl) {
                    const headOffset = ks.dir > 0 ? (headLen - headPos) : (-headPos);
                    ks.headEl.style.strokeDasharray = `${headLen.toFixed(2)} ${(100 - headLen).toFixed(2)}`;
                    ks.headEl.style.strokeDashoffset = headOffset.toFixed(2);
                    ks.headEl.style.opacity = (0.95 - hs * 0.35).toFixed(2);
                }

                // 2. Live warm interior glass light cast from the moving perimeter tip
                const pt = rectPerimeterPoint(ks.orbitProgress, ks.width, ks.height);
                el.style.setProperty('--orbit-x', `${pt.x.toFixed(1)}%`);
                el.style.setProperty('--orbit-y', `${pt.y.toFixed(1)}%`);

                // 3. Shared-coordinate warm proximity spotlight from cursor
                if (this.pointerTarget.active) {
                    const rect = ks.slot.getBoundingClientRect();
                    const lx = this.pointerTarget.clientX - rect.left;
                    const ly = this.pointerTarget.clientY - rect.top;
                    const cx = rect.left + rect.width * 0.5;
                    const cy = rect.top + rect.height * 0.5;
                    const dist = Math.hypot(this.pointerTarget.clientX - cx, this.pointerTarget.clientY - cy);
                    const prox = Math.max(0, 1 - dist / 220);

                    el.style.setProperty('--spot-x', `${lx.toFixed(1)}px`);
                    el.style.setProperty('--spot-y', `${ly.toFixed(1)}px`);
                    el.style.setProperty('--spot-alpha', prox.toFixed(3));
                } else {
                    el.style.setProperty('--spot-alpha', '0');
                }
            }
        }
    }

    ns.FloatEngine = FloatEngine;
})(window.SyrupOS);
