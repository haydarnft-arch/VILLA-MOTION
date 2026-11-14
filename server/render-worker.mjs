// VILLA MOTION — render worker.
// Usage: node server/render-worker.mjs <jobFile.json>
// Writes progress to the job's status file; exits 0 on success.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, ensureBrowser} from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.cache');
const BUNDLE_DIR = path.join(CACHE_DIR, 'remotion-bundle');
const BUNDLE_HASH_FILE = path.join(CACHE_DIR, 'bundle-hash.txt');

const CHROMIUM = fs.existsSync('/opt/pw-browsers/chromium')
  ? '/opt/pw-browsers/chromium'
  : undefined;

const jobFile = process.argv[2];
if (!jobFile) {
  console.error('Missing job file');
  process.exit(2);
}
const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
const {statusPath, outPath, inputProps} = job;

let lastWrite = 0;
const writeStatus = (data, force = false) => {
  const now = Date.now();
  if (!force && now - lastWrite < 400) return;
  lastWrite = now;
  fs.mkdirSync(path.dirname(statusPath), {recursive: true});
  const tmp = `${statusPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({...data, updatedAt: now}));
  fs.renameSync(tmp, statusPath);
};

const hashRemotionSources = () => {
  const dir = path.join(ROOT, 'remotion');
  const h = crypto.createHash('sha1');
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else h.update(entry.name).update(fs.readFileSync(p));
    }
  };
  walk(dir);
  h.update(fs.readFileSync(path.join(ROOT, 'package-lock.json')));
  return h.digest('hex');
};

const getBundle = async () => {
  const hash = hashRemotionSources();
  if (
    fs.existsSync(BUNDLE_DIR) &&
    fs.existsSync(path.join(BUNDLE_DIR, 'index.html')) &&
    fs.existsSync(BUNDLE_HASH_FILE) &&
    fs.readFileSync(BUNDLE_HASH_FILE, 'utf8') === hash
  ) {
    return BUNDLE_DIR;
  }
  writeStatus({state: 'bundling', progress: 0}, true);
  fs.rmSync(BUNDLE_DIR, {recursive: true, force: true});
  fs.mkdirSync(CACHE_DIR, {recursive: true});
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'remotion', 'index.ts'),
    outDir: BUNDLE_DIR,
    onProgress: (p) => writeStatus({state: 'bundling', progress: p / 100}),
  });
  fs.writeFileSync(BUNDLE_HASH_FILE, hash);
  return serveUrl;
};

const main = async () => {
  const startedAt = Date.now();
  writeStatus({state: 'starting', progress: 0, startedAt}, true);

  await ensureBrowser({browserExecutable: CHROMIUM});
  const serveUrl = await getBundle();

  writeStatus({state: 'preparing', progress: 0, startedAt}, true);
  const composition = await selectComposition({
    serveUrl,
    id: 'VillaMotion',
    inputProps,
    browserExecutable: CHROMIUM,
    timeoutInMilliseconds: 120000,
  });

  fs.mkdirSync(path.dirname(outPath), {recursive: true});
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 17,
    outputLocation: outPath,
    inputProps,
    browserExecutable: CHROMIUM,
    timeoutInMilliseconds: 120000,
    concurrency: Math.min(6, Math.max(2, os.cpus().length - 1)),
    onProgress: ({progress}) => {
      writeStatus({state: 'rendering', progress, startedAt});
    },
  });

  writeStatus(
    {
      state: 'done',
      progress: 1,
      startedAt,
      finishedAt: Date.now(),
      outFile: path.basename(outPath),
    },
    true
  );
};

main().catch((err) => {
  console.error(err);
  writeStatus(
    {state: 'error', error: String(err?.message || err), finishedAt: Date.now()},
    true
  );
  process.exit(1);
});
