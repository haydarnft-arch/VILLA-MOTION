// Outil de contrôle : rend quelques images d'un rendu existant.
// Usage : node scripts/render-stills.mjs projects/<id>/render/job.json <dossier> <image> [<image>...]
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
const [,, jobPath, outDir, ...frames] = process.argv;
const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
const inputProps = job.inputProps;
for (const ph of inputProps.photos) {
  const d = job.depthJobs.find((j) => ph.depth && ph.depth.endsWith(path.basename(j.out)));
  if (d) Object.assign(ph, JSON.parse(fs.readFileSync(d.out.replace(/\.png$/, '.json'), 'utf8')));
}
const serveUrl = await bundle({entryPoint: path.resolve('remotion/index.ts')});
const opts = {serveUrl, inputProps, browserExecutable: '/opt/pw-browsers/chromium', chromiumOptions: {gl: 'swangle'}, logLevel: 'error'};
const composition = await selectComposition({...opts, id: 'VillaMotion'});
for (const f of frames) await renderStill({...opts, composition, frame: Number(f), output: `${outDir}/s-${f}.jpg`, imageFormat: 'jpeg', scale: 0.5});
console.log('ok');
