// Carte de profondeur locale (MiDaS small, licence MIT) — aucune API externe.
// Sortie : PNG en niveaux de gris, blanc = proche, noir = loin.
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL = path.resolve(__dirname, '..', 'models', 'midas-small.onnx');
const SIZE = 256;

let sessionPromise = null;
const getSession = async () => {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import('onnxruntime-node');
      const session = await ort.InferenceSession.create(MODEL);
      return {ort, session};
    })();
  }
  return sessionPromise;
};

const run = (cmd, args, input) =>
  new Promise((resolve, reject) => {
    const child = execFile(cmd, args, {encoding: 'buffer', maxBuffer: 64 * 1024 * 1024}, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    );
    if (input) {
      child.stdin.end(input);
    }
  });

const probeSize = async (file) => {
  const out = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file,
  ]);
  const [w, h] = String(out).trim().split(',').map(Number);
  return {w, h};
};

export const depthAvailable = () => fs.existsSync(MODEL);

export const generateDepth = async (imagePath, outPath) => {
  const {ort, session} = await getSession();
  const rgb = await run('ffmpeg', [
    '-v', 'error', '-i', imagePath,
    '-vf', `scale=${SIZE}:${SIZE}:flags=area`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ]);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const plane = SIZE * SIZE;
  const data = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      data[c * plane + i] = (rgb[i * 3 + c] / 255 - mean[c]) / std[c];
    }
  }
  const inputName = session.inputNames[0];
  const result = await session.run({[inputName]: new ort.Tensor('float32', data, [1, 3, SIZE, SIZE])});
  const depth = result[session.outputNames[0]].data;

  // Normalisation robuste (percentiles) pour ignorer les valeurs aberrantes.
  const sorted = Float32Array.from(depth).sort();
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const gray = Buffer.alloc(plane);
  for (let i = 0; i < plane; i++) {
    const v = (depth[i] - lo) / Math.max(1e-6, hi - lo);
    gray[i] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }

  // Point d'intérêt : centre des éléments les plus proches (canapé, table, objet…),
  // utilisé pour les recadrages serrés du montage.
  const thr = sorted[Math.floor(sorted.length * 0.7)];
  let sx = 0;
  let sy = 0;
  let sw = 0;
  // Le bas de l'image (sol au premier plan) est exclu : on vise les meubles et objets.
  for (let y = Math.floor(SIZE * 0.18); y < Math.floor(SIZE * 0.76); y++) {
    for (let x = Math.floor(SIZE * 0.12); x < Math.floor(SIZE * 0.88); x++) {
      const v = depth[y * SIZE + x];
      if (v >= thr) {
        const wgt = v - thr + 1e-3;
        sx += x * wgt;
        sy += y * wgt;
        sw += wgt;
      }
    }
  }
  const raw = sw > 0 ? {x: sx / sw / SIZE, y: sy / sw / SIZE} : {x: 0.5, y: 0.55};
  const focus = {x: raw.x * 0.75 + 0.5 * 0.25, y: raw.y * 0.75 + 0.55 * 0.25};
  fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify({focusX: +focus.x.toFixed(3), focusY: +focus.y.toFixed(3)}));

  const {w, h} = await probeSize(imagePath);
  const outW = 768;
  const outH = Math.max(2, Math.round((outW * h) / w / 2) * 2);
  // Léger flou : la parallaxe étire doucement les contours au lieu de les déchirer.
  await run(
    'ffmpeg',
    [
      '-y', '-v', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${SIZE}x${SIZE}`, '-i', '-',
      '-vf', `scale=${outW}:${outH}:flags=bicubic,gblur=sigma=4`,
      '-frames:v', '1', outPath,
    ],
    gray
  );
  return outPath;
};

// Utilisation en ligne de commande : node server/depth.mjs photo.jpg depth.png
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , input, output] = process.argv;
  generateDepth(input, output)
    .then(() => console.log('OK', output))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
