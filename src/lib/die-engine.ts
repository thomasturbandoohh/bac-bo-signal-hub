/**
 * One shared 3D die for the whole session. Building three.js, the face textures and the
 * shaders takes ~1–2 s on phones, so it is done once in idle time (warmDie) and the same
 * canvas is moved into whichever spot shows the die. Browser-only: call from effects.
 */

// Pip cells on a 3x3 grid (0..8). Face order follows the box geometry: +x, -x, +y, -y, +z, -z,
// so opposite faces add up to 7 like a real die.
const FACE_PIPS: number[][] = [
  [0, 4, 8], // 3
  [0, 2, 6, 8], // 4
  [0, 8], // 2
  [0, 2, 4, 6, 8], // 5
  [4], // 1
  [0, 2, 3, 5, 6, 8], // 6
];

const TEX = 512;

function pipCenters(pips: number[]) {
  const step = TEX * 0.26;
  return pips.map((cell) => ({
    x: TEX / 2 + ((cell % 3) - 1) * step,
    y: TEX / 2 + (Math.floor(cell / 3) - 1) * step,
  }));
}

/** Glossy black face with white pips shaded as if pressed into the surface. */
function drawColor(pips: number[]) {
  const c = document.createElement("canvas");
  c.width = c.height = TEX;
  const g = c.getContext("2d")!;
  g.fillStyle = "#050506";
  g.fillRect(0, 0, TEX, TEX);
  const r = TEX * 0.092;
  for (const { x, y } of pipCenters(pips)) {
    g.beginPath();
    g.arc(x, y, r * 1.12, 0, Math.PI * 2);
    g.fillStyle = "#020203";
    g.fill();
    const grad = g.createRadialGradient(x + r * 0.28, y + r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.62, "#f1f1f3");
    grad.addColorStop(0.88, "#b9bcc4");
    grad.addColorStop(1, "#6d7079");
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = grad;
    g.fill();
  }
  return c;
}

/** Height map: flat face = white, pips sink down into a shallow bowl. */
function drawBump(pips: number[]) {
  const c = document.createElement("canvas");
  c.width = c.height = TEX;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, TEX, TEX);
  const r = TEX * 0.103;
  for (const { x, y } of pipCenters(pips)) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "#3a3a3a");
    grad.addColorStop(0.7, "#5a5a5a");
    grad.addColorStop(1, "#ffffff");
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = grad;
    g.fill();
  }
  return c;
}

export interface DieEngine {
  /** Shows the die inside `mount` at `box` CSS px; returns a function that takes it out again. */
  attach: (mount: HTMLElement, box: number) => () => void;
}

let engine: DieEngine | null = null;
let pending: Promise<DieEngine> | null = null;

export function isDieReady() {
  return engine !== null;
}

/** Starts (or returns) the one-time build of the die. */
export function warmDie(): Promise<DieEngine> | null {
  if (typeof window === "undefined") return null;
  if (engine) return Promise.resolve(engine);
  pending ??= build().then(
    (e) => {
      engine = e;
      return e;
    },
    (err) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/** Warms the die once the browser is idle, so the first "Analisando" shows it at once. */
export function warmDieWhenIdle() {
  if (typeof window === "undefined" || engine || pending) return () => {};
  const start = () => void warmDie()?.catch(() => {});
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(start, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(start, 600);
  return () => clearTimeout(id);
}

async function build(): Promise<DieEngine> {
  const [THREE, { RoundedBoxGeometry }, { RoomEnvironment }] = await Promise.all([
    import("three"),
    import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const canvas = renderer.domElement;
  canvas.style.display = "block";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.35, 4.3);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 3, 3);
  const rim = new THREE.DirectionalLight(0xfff1d6, 1.2);
  rim.position.set(-3, 1.5, -2);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

  const materials = FACE_PIPS.map((pips) => {
    const map = new THREE.CanvasTexture(drawColor(pips));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return new THREE.MeshPhysicalMaterial({
      map,
      bumpMap: new THREE.CanvasTexture(drawBump(pips)),
      bumpScale: 2.2,
      roughness: 0.16,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.45,
    });
  });

  // Slightly rounded corners and edges.
  const die = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 10, 0.12), materials);
  die.rotation.set(-0.45, 0.6, 0);
  scene.add(die);

  // Compile shaders and upload textures now, not when the die first appears.
  renderer.setSize(160, 160, false);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  let last = 0;
  let owner: HTMLElement | null = null;

  const tick = (t: number) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (!reduce) {
      die.rotation.x += dt * 0.55;
      die.rotation.y += dt * 0.8;
      die.rotation.z = Math.sin(t / 2200) * 0.18;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  return {
    attach(mount, box) {
      cancelAnimationFrame(raf);
      owner = mount;
      renderer.setSize(box, box, false);
      canvas.style.width = `${box}px`;
      canvas.style.height = `${box}px`;
      mount.appendChild(canvas);
      last = 0;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
      return () => {
        if (owner !== mount) return;
        owner = null;
        cancelAnimationFrame(raf);
        canvas.remove();
      };
    },
  };
}
