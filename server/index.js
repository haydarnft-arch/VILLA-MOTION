// VILLA MOTION — serveur principal.
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn, execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {generateDepth, depthAvailable} from './depth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'projects');
const PORT = Number(process.env.PORT || 4680);

fs.mkdirSync(PROJECTS_DIR, {recursive: true});

const app = express();
app.use(express.json({limit: '2mb'}));

// ---------- helpers ----------
const id = () => crypto.randomBytes(8).toString('hex');
const projectDir = (pid) => path.join(PROJECTS_DIR, pid);
const projectFile = (pid) => path.join(projectDir(pid), 'project.json');
const safeId = (s) => typeof s === 'string' && /^[a-f0-9]{16}$/.test(s);
const depthName = (file) => file.replace(/\.[a-z0-9]+$/i, '.depth.png');
const photoPath = (pid, file) => path.join(projectDir(pid), 'photos', file);

// Cartes de profondeur calculées en arrière-plan dès l'import (une à la fois).
let depthChain = Promise.resolve();
const queueDepth = (pid, file) => {
  if (!depthAvailable()) return depthChain;
  depthChain = depthChain.then(async () => {
    const src = photoPath(pid, file);
    const out = photoPath(pid, depthName(file));
    if (!fs.existsSync(src) || fs.existsSync(out)) return;
    try {
      await generateDepth(src, out);
    } catch (err) {
      console.error('Profondeur impossible pour', file, err.message);
    }
  });
  return depthChain;
};

const readProject = (pid) => {
  if (!safeId(pid)) return null;
  try {
    return JSON.parse(fs.readFileSync(projectFile(pid), 'utf8'));
  } catch {
    return null;
  }
};
const writeProject = (p) => {
  fs.mkdirSync(projectDir(p.id), {recursive: true});
  fs.writeFileSync(projectFile(p.id), JSON.stringify(p, null, 2));
};

const STYLES = ['luxury', 'cinematic', 'modern'];
const MUSICS = ['luxury', 'cinematic', 'modern', 'none'];
const DURATIONS = [30, 35, 40, 45];
const MAX_PHOTOS = 50;
const RECOMMENDED_MIN = 20;
const HARD_MIN_RENDER = 3;

const publicProject = (p) => ({
  ...p,
  photos: p.photos.map((ph) => ({
    id: ph.id,
    label: ph.label || '',
    originalName: ph.originalName,
    url: `/media/${p.id}/${ph.file}`,
  })),
});

// ---------- static ----------
// Le moteur de rendu lit les photos depuis une autre origine (textures WebGL).
app.use(['/assets', '/media'], (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/assets', express.static(path.join(ROOT, 'assets'), {maxAge: '1d'}));
app.use(express.static(path.join(ROOT, 'public')));

app.get('/media/:pid/:file', (req, res) => {
  const {pid, file} = req.params;
  if (!safeId(pid) || !/^[a-f0-9]{16}(\.depth)?\.(jpg|jpeg|png|webp)$/i.test(file)) {
    return res.status(400).end();
  }
  res.sendFile(path.join(projectDir(pid), 'photos', file), {maxAge: '1d'});
});

// ---------- projects ----------
app.get('/api/config', (_req, res) => {
  res.json({
    styles: STYLES,
    musics: MUSICS,
    durations: DURATIONS,
    maxPhotos: MAX_PHOTOS,
    recommendedMin: RECOMMENDED_MIN,
    hardMinRender: HARD_MIN_RENDER,
  });
});

app.get('/api/projects', (_req, res) => {
  const list = fs
    .readdirSync(PROJECTS_DIR)
    .map((pid) => readProject(pid))
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((p) => ({
      id: p.id,
      villaName: p.villaName,
      location: p.location,
      photoCount: p.photos.length,
      styleId: p.styleId,
      updatedAt: p.updatedAt,
      cover: p.photos[0] ? `/media/${p.id}/${p.photos[0].file}` : null,
      hasVideo: Boolean(p.lastVideo && fs.existsSync(path.join(projectDir(p.id), 'render', p.lastVideo))),
    }));
  res.json(list);
});

app.post('/api/projects', (req, res) => {
  const villaName = String(req.body?.villaName || '').trim().slice(0, 60);
  const location = String(req.body?.location || '').trim().slice(0, 60);
  if (!villaName) return res.status(400).json({error: 'Le nom de la villa est requis.'});
  const p = {
    id: id(),
    villaName,
    location,
    tagline: 'Visite privée sur demande',
    styleId: 'luxury',
    music: 'luxury',
    durationSeconds: 35,
    photos: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastVideo: null,
  };
  writeProject(p);
  res.json(publicProject(p));
});

app.get('/api/projects/:pid', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  res.json(publicProject(p));
});

app.patch('/api/projects/:pid', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  const b = req.body || {};
  if (typeof b.villaName === 'string' && b.villaName.trim()) p.villaName = b.villaName.trim().slice(0, 60);
  if (typeof b.location === 'string') p.location = b.location.trim().slice(0, 60);
  if (typeof b.tagline === 'string') p.tagline = b.tagline.trim().slice(0, 80);
  if (STYLES.includes(b.styleId)) p.styleId = b.styleId;
  if (MUSICS.includes(b.music)) p.music = b.music;
  if (DURATIONS.includes(Number(b.durationSeconds))) p.durationSeconds = Number(b.durationSeconds);
  if (Array.isArray(b.order)) {
    const byId = new Map(p.photos.map((ph) => [ph.id, ph]));
    const next = b.order.map((pid2) => byId.get(pid2)).filter(Boolean);
    if (next.length === p.photos.length) p.photos = next;
  }
  if (b.labels && typeof b.labels === 'object') {
    for (const ph of p.photos) {
      if (typeof b.labels[ph.id] === 'string') ph.label = b.labels[ph.id].trim().slice(0, 40);
    }
  }
  p.updatedAt = Date.now();
  writeProject(p);
  res.json(publicProject(p));
});

app.delete('/api/projects/:pid', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  fs.rmSync(projectDir(p.id), {recursive: true, force: true});
  res.json({ok: true});
});

// ---------- photos ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(projectDir(req.params.pid), 'photos');
      fs.mkdirSync(dir, {recursive: true});
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      const safe = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${id()}${safe}`);
    },
  }),
  limits: {fileSize: 30 * 1024 * 1024, files: MAX_PHOTOS},
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
  },
});

// Taille de travail homogène : les très grandes photos sont réduites (rendu rapide),
// les petites agrandies proprement (Lanczos + accentuation légère) pour le Full HD.
const normalizePhoto = (filePath) =>
  new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', filePath],
      (err, stdout) => {
        const width = Number(String(stdout).trim());
        if (err || !width || (width >= 1920 && width <= 2560)) return resolve();
        const vf = width > 2560 ? 'scale=2560:-2:flags=lanczos' : 'scale=2560:-2:flags=lanczos,unsharp=5:5:0.55:5:5:0';
        const tmp = `${filePath}.tmp${path.extname(filePath)}`;
        execFile('ffmpeg', ['-y', '-v', 'error', '-i', filePath, '-vf', vf, '-q:v', '2', tmp], (err2) => {
          if (!err2 && fs.existsSync(tmp)) fs.renameSync(tmp, filePath);
          else fs.rmSync(tmp, {force: true});
          resolve();
        });
      }
    );
  });

app.post('/api/projects/:pid/photos', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  upload.array('photos', MAX_PHOTOS)(req, res, async (err) => {
    if (err) return res.status(400).json({error: `Import impossible : ${err.message}`});
    const files = req.files || [];
    const room = MAX_PHOTOS - p.photos.length;
    const accepted = files.slice(0, Math.max(0, room));
    for (const f of files.slice(Math.max(0, room))) fs.rmSync(f.path, {force: true});
    await Promise.all(accepted.map((f) => normalizePhoto(f.path)));
    for (const f of accepted) {
      p.photos.push({
        id: path.parse(f.filename).name,
        file: f.filename,
        originalName: f.originalname,
        label: '',
      });
    }
    p.updatedAt = Date.now();
    writeProject(p);
    for (const f of accepted) queueDepth(p.id, f.filename);
    res.json({
      ...publicProject(p),
      rejected: files.length - accepted.length,
    });
  });
});

app.delete('/api/projects/:pid/photos/:photoId', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  const idx = p.photos.findIndex((ph) => ph.id === req.params.photoId);
  if (idx === -1) return res.status(404).json({error: 'Photo introuvable.'});
  const [ph] = p.photos.splice(idx, 1);
  fs.rmSync(photoPath(p.id, ph.file), {force: true});
  fs.rmSync(photoPath(p.id, depthName(ph.file)), {force: true});
  fs.rmSync(photoPath(p.id, depthName(ph.file).replace(/\.png$/, '.json')), {force: true});
  p.updatedAt = Date.now();
  writeProject(p);
  res.json(publicProject(p));
});

// ---------- rendering ----------
const activeRenders = new Map(); // pid -> child process

app.post('/api/projects/:pid/render', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  if (activeRenders.has(p.id)) return res.status(409).json({error: 'Un rendu est déjà en cours pour ce projet.'});
  if (p.photos.length < HARD_MIN_RENDER) {
    return res.status(400).json({error: `Importez au moins ${HARD_MIN_RENDER} photos avant de générer la vidéo.`});
  }

  const renderDir = path.join(projectDir(p.id), 'render');
  fs.mkdirSync(renderDir, {recursive: true});
  const statusPath = path.join(renderDir, 'status.json');
  const outName = `villa-motion-${p.styleId}-${Date.now()}.mp4`;
  const outPath = path.join(renderDir, outName);

  let beats;
  try {
    beats = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'music', `${p.music}.json`), 'utf8')).beats;
  } catch {}

  const inputProps = {
    beats,
    villaName: p.villaName,
    location: p.location,
    tagline: p.tagline,
    styleId: p.styleId,
    music: p.music,
    durationSeconds: p.durationSeconds,
    serverBase: `http://127.0.0.1:${PORT}`,
    photos: p.photos.map((ph) => ({
      src: `http://127.0.0.1:${PORT}/media/${p.id}/${ph.file}`,
      depth: depthAvailable() ? `http://127.0.0.1:${PORT}/media/${p.id}/${depthName(ph.file)}` : undefined,
      label: ph.label || undefined,
    })),
  };
  // Le moteur calcule les profondeurs manquantes avant le rendu.
  const depthJobs = depthAvailable()
    ? p.photos.map((ph) => ({src: photoPath(p.id, ph.file), out: photoPath(p.id, depthName(ph.file))}))
    : [];

  const jobPath = path.join(renderDir, 'job.json');
  fs.writeFileSync(jobPath, JSON.stringify({statusPath, outPath, inputProps, depthJobs}));
  fs.writeFileSync(statusPath, JSON.stringify({state: 'starting', progress: 0, updatedAt: Date.now()}));

  const child = spawn(process.execPath, [path.join(__dirname, 'render-worker.mjs'), jobPath], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  });
  activeRenders.set(p.id, child);
  child.on('exit', (code) => {
    activeRenders.delete(p.id);
    if (code === 0) {
      const latest = readProject(p.id);
      if (latest) {
        latest.lastVideo = outName;
        latest.updatedAt = Date.now();
        writeProject(latest);
      }
    }
  });

  res.json({ok: true});
});

app.get('/api/projects/:pid/render/status', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p) return res.status(404).json({error: 'Projet introuvable.'});
  const statusPath = path.join(projectDir(p.id), 'render', 'status.json');
  let status = {state: 'idle'};
  try {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch {}
  if (status.state === 'done' && !p.lastVideo) status.state = 'finalizing';
  res.json({...status, running: activeRenders.has(p.id), lastVideo: p.lastVideo});
});

app.get('/api/projects/:pid/video', (req, res) => {
  const p = readProject(req.params.pid);
  if (!p || !p.lastVideo) return res.status(404).json({error: 'Aucune vidéo disponible.'});
  const file = path.join(projectDir(p.id), 'render', p.lastVideo);
  if (!fs.existsSync(file)) return res.status(404).json({error: 'Aucune vidéo disponible.'});
  const nice = `VILLA-MOTION_${p.villaName.replace(/[^\p{L}\p{N}]+/gu, '-')}.mp4`;
  if (req.query.download === '1') {
    res.download(file, nice);
  } else {
    res.sendFile(file);
  }
});

app.listen(PORT, () => {
  console.log(`VILLA MOTION prêt sur http://localhost:${PORT}`);
});
