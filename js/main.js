/* ==========================================================================
   SyrupSplash.in — Master Orchestrator
   Unifies the living topographic relief, sculptural floating Swoup emblem,
   and weightless floating link monoliths in a single 60fps loop.
   ========================================================================== */

(function (ns) {
    'use strict';

    function init() {
        const topoCanvas = document.getElementById('topo-canvas');
        const emblemCanvas = document.getElementById('emblem-canvas');

        if (!topoCanvas || !emblemCanvas) return;

        const topoEngine = new ns.TopographyEngine(topoCanvas);
        const emblemEngine = new ns.EmblemEngine(emblemCanvas, 'images/Swoup.png');
        const floatEngine = new ns.FloatEngine();

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        let reducedMotion = motionQuery.matches;
        if (motionQuery.addEventListener) {
            motionQuery.addEventListener('change', (e) => {
                reducedMotion = e.matches;
            });
        }

        // Smooth warm fade-in on arrival
        window.requestAnimationFrame(() => {
            window.setTimeout(() => {
                document.body.classList.remove('is-booting');
            }, 80);
        });

        window.addEventListener('pointermove', (ev) => {
            const nx = ev.clientX / (window.innerWidth || 1);
            const ny = ev.clientY / (window.innerHeight || 1);
            topoEngine.setPointer(nx, ny, true);
            floatEngine.setPointer(nx, ny, ev.clientX, ev.clientY, true);
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
            topoEngine.setPointer(0.5, 0.5, false);
            floatEngine.setPointer(0.5, 0.5, window.innerWidth * 0.5, window.innerHeight * 0.5, false);
        });

        window.addEventListener('deviceorientation', (ev) => {
            if (ev.gamma == null || ev.beta == null) return;
            const nx = Math.max(0, Math.min(1, 0.5 + ev.gamma / 55));
            const ny = Math.max(0, Math.min(1, 0.5 + (ev.beta - 35) / 55));
            topoEngine.setPointer(nx, ny, true);
            floatEngine.setPointer(nx, ny, nx * window.innerWidth, ny * window.innerHeight, true);
        }, { passive: true });

        // Quiet water-like topographic wave & warm emblem bloom on click
        window.addEventListener('pointerdown', (ev) => {
            topoEngine.triggerRipple(ev.clientX, ev.clientY);
            emblemEngine.triggerPulse();
        }, { passive: true });

        // Quiet 1–5 keyboard shortcuts
        window.addEventListener('keydown', (ev) => {
            if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
            if (ev.key >= '1' && ev.key <= '5') {
                const idx = Number(ev.key) - 1;
                floatEngine.triggerKeyByNumber(idx);
                topoEngine.triggerRipple(window.innerWidth * 0.5, window.innerHeight * 0.65);
                emblemEngine.triggerPulse();
            }
        });

        let resizeRaf = 0;
        window.addEventListener('resize', () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                topoEngine.resize();
                emblemEngine.resize();
                floatEngine.resize();
            });
        });

        let lastTime = performance.now();
        const startTime = lastTime;

        function frame(now) {
            const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
            const timeSec = (now - startTime) / 1000;
            lastTime = now;

            if (!document.hidden) {
                floatEngine.update(timeSec, dt, reducedMotion);
                emblemEngine.setTilt(floatEngine.attitude.pitch, floatEngine.attitude.roll);
                topoEngine.update(timeSec, dt, reducedMotion);
                emblemEngine.update(timeSec, dt, reducedMotion);
            }

            window.requestAnimationFrame(frame);
        }

        window.requestAnimationFrame(frame);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window.SyrupOS);
