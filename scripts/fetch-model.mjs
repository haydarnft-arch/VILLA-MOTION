// Télécharge le modèle de profondeur MiDaS small (licence MIT, ~66 Mo) s'il manque.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.resolve(__dirname, '..', 'models', 'midas-small.onnx');
const URL = 'https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx';

if (fs.existsSync(dest) && fs.statSync(dest).size > 60_000_000) {
  console.log('Modèle de profondeur déjà présent.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), {recursive: true});
console.log('Téléchargement du modèle de profondeur (MiDaS, ~66 Mo)…');
try {
  const res = await fetch(URL, {redirect: 'follow'});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`${dest}.part`, buf);
  fs.renameSync(`${dest}.part`, dest);
  console.log('Modèle installé.');
} catch (err) {
  // Le logiciel fonctionne sans : les mouvements restent en 2D.
  console.warn(`Modèle non téléchargé (${err.message}). Les effets 3D seront désactivés.`);
}
