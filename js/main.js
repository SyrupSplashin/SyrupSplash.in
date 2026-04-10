const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

// Keyboard polish: ESC to blur, ENTER to open focused link
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur?.();
  }
  if (e.key === "Enter" && document.activeElement instanceof HTMLAnchorElement) {
    document.activeElement.click();
  }
});

// Background: Matrix-ish, slightly more "alive" (still restrained)
const canvas = document.getElementById("bg");
const ctx = canvas?.getContext?.("2d", { alpha: true });

let w = 0;
let h = 0;
let dpr = 1;

const rand = (a = 1) => Math.random() * a;
const glyphs =
  "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン<>[]{}()$#@*+-=:_";

let cols = 0;
let drops = [];
let speeds = [];
let sizes = [];
let jitter = [];

function reseedMatrix() {
  cols = Math.max(1, Math.floor(w / 17));
  drops = new Array(cols).fill(0).map(() => rand(h));
  speeds = new Array(cols).fill(0).map(() => 0.65 + rand(1.6));
  sizes = new Array(cols).fill(0).map(() => 11 + rand(11));
  jitter = new Array(cols).fill(0).map(() => rand(1));
}

function resize() {
  if (!canvas || !ctx) return;
  dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  w = Math.max(1, Math.floor(window.innerWidth));
  h = Math.max(1, Math.floor(window.innerHeight));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  reseedMatrix();
}

window.addEventListener("resize", resize, { passive: true });
resize();

let mx = 0.5;
window.addEventListener(
  "pointermove",
  (e) => {
    mx = e.clientX / Math.max(1, window.innerWidth);
  },
  { passive: true }
);

function clear() {
  if (!ctx) return;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = prefersReducedMotion ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.10)";
  ctx.fillRect(0, 0, w, h);
}

function drawMatrix(t) {
  if (!ctx) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const sway = (mx - 0.5) * 12;
  for (let i = 0; i < cols; i++) {
    const x = i * 17 + sway;
    const y = drops[i];
    const size = sizes[i];
    const sp = speeds[i] * (prefersReducedMotion ? 0.45 : 1.0);
    const alphaHead = 0.12 + jitter[i] * 0.06;
    const alphaTail = 0.04 + jitter[i] * 0.03;

    const head = glyphs[(Math.random() * glyphs.length) | 0];
    const tail = glyphs[(Math.random() * glyphs.length) | 0];

    ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;

    ctx.shadowColor = "rgba(165,255,240,0.14)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = `rgba(210,255,245,${alphaHead})`;
    ctx.fillText(head, x, y);

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(165,255,240,${alphaTail})`;
    ctx.fillText(tail, x, y - size * 1.7);

    drops[i] = y + sp * 14;
    if (drops[i] > h + 40) {
      drops[i] = -rand(h * 0.4);
      speeds[i] = 0.65 + rand(1.6);
      sizes[i] = 11 + rand(11);
      jitter[i] = rand(1);
    }
  }

  if (((t / 1000) | 0) % 9 === 0 && Math.random() < 0.05) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(165,255,240,0.03)";
    const gy = rand(h);
    ctx.fillRect(0, gy, w, 2);
  }

  ctx.restore();
}

let raf = 0;
function frame(t) {
  if (!ctx) return;
  clear();
  drawMatrix(t);
  raf = requestAnimationFrame(frame);
}

raf = requestAnimationFrame(frame);

