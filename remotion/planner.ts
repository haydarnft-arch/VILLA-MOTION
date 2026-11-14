import {random} from 'remotion';
import type {Photo, StyleId} from './types';
import {THEMES, TransitionKind} from './theme';

type Range = [number, number];

export type Move = {
  zoom: Range;
  dolly: Range;
  parX: Range;
  parY: Range;
  panX: Range;
  panY: Range;
  focus: number;
};

export type Clip = {
  kind: 'intro' | 'shot' | 'split' | 'outro';
  start: number;
  end: number;
  photos: number[];
  moves: Move[];
  inT: TransitionKind;
  outT: TransitionKind;
  chapter?: {index: number; total: number; title: string};
};

export type Plan = {
  clips: Clip[];
  beatFrames: number; // durée moyenne d'un temps, en images
};

// ---------- bibliothèque de mouvements de caméra (profondeur réelle) ----------
const scale = (r: Range, k: number): Range => [r[0] * k, r[1] * k];

const MOVES: Record<string, (m: number) => Move> = {
  dollyIn: (m) => ({zoom: [1.14, 1.14 + 0.07 * m], dolly: [0, 0.17 * m], parX: [0, 0], parY: [0, 0], panX: [0, 0], panY: [0.012, -0.008], focus: 0.12}),
  dollyOut: (m) => ({zoom: [1.14 + 0.08 * m, 1.14], dolly: [0.17 * m, 0], parX: [0, 0], parY: [0, 0], panX: [0, 0], panY: [-0.008, 0.012], focus: 0.12}),
  orbitLeft: (m) => ({zoom: [1.17, 1.19], dolly: [0.03, 0.05], parX: scale([0.032, -0.032], m), parY: [0, 0], panX: [0, 0], panY: [0, 0], focus: 0.55}),
  orbitRight: (m) => ({zoom: [1.17, 1.19], dolly: [0.03, 0.05], parX: scale([-0.032, 0.032], m), parY: [0, 0], panX: [0, 0], panY: [0, 0], focus: 0.55}),
  craneUp: (m) => ({zoom: [1.17, 1.2], dolly: [0.02, 0.06], parX: [0, 0], parY: scale([0.026, -0.022], m), panX: [0, 0], panY: scale([0.03, -0.03], m), focus: 0.5}),
  craneDown: (m) => ({zoom: [1.2, 1.17], dolly: [0.06, 0.02], parX: [0, 0], parY: scale([-0.022, 0.026], m), panX: [0, 0], panY: scale([-0.03, 0.03], m), focus: 0.5}),
  slideLeft: (m) => ({zoom: [1.2, 1.22], dolly: [0.05, 0.08], parX: scale([0.02, -0.02], m), parY: [0, 0], panX: scale([0.03, -0.03], m), panY: [0, 0], focus: 0.4}),
  slideRight: (m) => ({zoom: [1.2, 1.22], dolly: [0.05, 0.08], parX: scale([-0.02, 0.02], m), parY: [0, 0], panX: scale([-0.03, 0.03], m), panY: [0, 0], focus: 0.4}),
  pushDiagonal: (m) => ({zoom: [1.15, 1.15 + 0.11 * m], dolly: [0.02, 0.1 * m], parX: [0, 0], parY: [0, 0], panX: scale([-0.018, 0.012], m), panY: scale([0.014, -0.01], m), focus: 0.3}),
};

const SEQUENCE = ['dollyIn', 'orbitLeft', 'craneUp', 'slideRight', 'pushDiagonal', 'orbitRight', 'dollyOut', 'slideLeft', 'craneDown'];

const pickMove = (i: number, prevOut: TransitionKind, m: number, seed: string): Move => {
  // Après un « whip », la caméra continue dans le sens du mouvement.
  if (prevOut === 'whip-left') return MOVES.slideLeft(m);
  if (prevOut === 'whip-right') return MOVES.slideRight(m);
  if (prevOut === 'punch') return MOVES.dollyIn(m);
  const offset = Math.floor(random(seed) * SEQUENCE.length);
  return MOVES[SEQUENCE[(i + offset) % SEQUENCE.length]](m);
};

// ---------- grille rythmique ----------
const beatGrid = (beatsSec: number[] | undefined, fps: number, total: number) => {
  let beats = (beatsSec || []).filter((b) => b > 0.2);
  let gap = 0.6;
  if (beats.length >= 8) {
    const gaps = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
    gap = gaps[Math.floor(gaps.length / 2)];
  } else {
    beats = [0.5];
  }
  // Prolonge la grille si la musique est plus courte que la vidéo.
  while (beats[beats.length - 1] < total / fps + 2) beats.push(beats[beats.length - 1] + gap);
  const frames: number[] = [];
  for (const b of beats) {
    const f = Math.round(b * fps);
    if (frames.length === 0 || f > frames[frames.length - 1]) frames.push(f);
  }
  return {frames, beatFrames: gap * fps};
};

type Item = {
  kind: 'shot' | 'split';
  photos: number[];
  beats: number;
  role: 'establish' | 'wide' | 'short' | 'split' | 'reframe';
  chapterIdx: number;
  chapterTitle?: string;
};

// Plan serré sur le sujet principal de la photo (détecté par la profondeur).
const reframeMove = (photo: Photo, m: number, flip: boolean): Move => {
  const c = (v: number | undefined) => Math.max(-0.14, Math.min(0.14, ((v ?? 0.5) - 0.5) * 0.85));
  const fx = c(photo.focusX);
  const fy = c(photo.focusY ?? 0.55);
  const d = flip ? -1 : 1;
  return {
    zoom: [1.48, 1.48 + 0.1 * m],
    dolly: [0.05, 0.05 + 0.1 * m],
    parX: [0.014 * d * m, -0.014 * d * m],
    parY: [0, 0],
    panX: [fx - 0.012 * d, fx + 0.012 * d],
    panY: [fy + 0.008, fy - 0.008],
    focus: 0.65,
  };
};

const sameLabel = (a?: string, b?: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

export const buildPlan = (
  photos: Photo[],
  styleId: StyleId,
  fps: number,
  totalFrames: number,
  beatsSec?: number[]
): Plan => {
  const theme = THEMES[styleId];
  const m = theme.motion;
  const {frames: bf, beatFrames} = beatGrid(beatsSec, fps, totalFrames);

  const introIdx = Math.min(theme.introBeats, bf.length - 3);
  const outroTarget = totalFrames - Math.round(theme.outroSeconds * fps);
  let outroIdx = introIdx + 1;
  for (let i = introIdx + 1; i < bf.length; i++) if (bf[i] <= outroTarget) outroIdx = i;
  const B = Math.max(1, outroIdx - introIdx);

  // ---- chapitres (pièces consécutives portant le même libellé) ----
  const body = photos.length > 3 ? photos.map((_, i) => i).slice(1) : photos.map((_, i) => i);
  const chapters: {title: string; idx: number[]}[] = [];
  for (const i of body) {
    const last = chapters[chapters.length - 1];
    const lab = photos[i].label || '';
    if (last && (sameLabel(photos[last.idx[0]].label, lab) && (lab || last.idx.length < 4))) {
      last.idx.push(i);
    } else {
      chapters.push({title: lab.trim(), idx: [i]});
    }
  }
  const titled = chapters.filter((c) => c.title).length;

  // ---- plans souhaités ----
  const items: Item[] = [];
  chapters.forEach((ch, ci) => {
    const [first, ...rest] = ch.idx;
    items.push({kind: 'shot', photos: [first], beats: theme.establishBeats, role: 'establish', chapterIdx: ci, chapterTitle: ch.title || undefined});
    let singles = rest;
    let split: number[] | null = null;
    if (ch.idx.length >= theme.splitMinChapter && rest.length >= 4) {
      split = rest.slice(-3);
      singles = rest.slice(0, -3);
    }
    singles.forEach((p, j) => {
      const role = j % 2 === 0 ? 'short' : 'wide';
      items.push({kind: 'shot', photos: [p], beats: role === 'wide' ? theme.wideBeats : theme.shortBeats, role, chapterIdx: ci});
    });
    if (split) items.push({kind: 'split', photos: split, beats: theme.splitBeats, role: 'split', chapterIdx: ci});
  });

  // ---- ajustement au nombre de temps disponibles ----
  const sum = () => items.reduce((acc, it) => acc + it.beats, 0);
  let guard = 0;
  // 1) trop long : on raccourcit d'abord les plans d'ouverture et les écrans partagés
  while (sum() > B && guard++ < 500) {
    const big = items.filter((it) => it.beats > theme.wideBeats).sort((a, b) => b.beats - a.beats)[0];
    if (!big) break;
    big.beats -= 1;
  }
  // 2) puis on retire des photos secondaires dans les pièces les plus fournies
  guard = 0;
  while (sum() > B && guard++ < 500) {
    const counts = new Map<number, number>();
    items.forEach((it) => counts.set(it.chapterIdx, (counts.get(it.chapterIdx) || 0) + 1));
    const removable = items
      .map((it, i) => ({it, i}))
      .filter(({it}) => it.role !== 'establish' && (counts.get(it.chapterIdx) || 0) > 1)
      .sort(
        (a, b) =>
          (counts.get(b.it.chapterIdx) || 0) - (counts.get(a.it.chapterIdx) || 0) ||
          (a.it.role === 'short' ? 0 : 1) - (b.it.role === 'short' ? 0 : 1) ||
          b.i - a.i
      );
    if (!removable.length) break;
    items.splice(removable[0].i, 1);
  }
  // 3) puis on raccourcit jusqu'au minimum, et en dernier recours on retire des pièces
  guard = 0;
  while (sum() > B && guard++ < 500) {
    const shrinkable = items.filter((it) => it.beats > theme.minBeats).sort((a, b) => b.beats - a.beats);
    if (shrinkable.length) {
      shrinkable[0].beats -= 1;
    } else if (items.length > 1) {
      items.splice(items.length - 1, 1);
    } else {
      break;
    }
  }

  // Peu de photos pour la durée : chaque plan large peut donner un second plan
  // serré sur son sujet (montage « plan large → plan rapproché »), au lieu
  // d'allonger les plans.
  const reframeBeats = theme.shortBeats;
  const targetAvg = (theme.wideBeats + theme.shortBeats) / 2 + 0.5;
  const prefs = ['establish', 'wide', 'short'];
  for (const role of prefs) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.role !== role || it.kind !== 'shot') continue;
      if ((B - sum()) / (items.length + 1) < targetAvg - 0.8 && sum() + reframeBeats > B) break;
      if (sum() + reframeBeats > B) break;
      const avg = sum() / items.length;
      if (B - sum() < reframeBeats || (B / (items.length + 1)) < Math.min(targetAvg, avg) - 1.2) break;
      items.splice(i + 1, 0, {kind: 'shot', photos: it.photos, beats: reframeBeats, role: 'reframe', chapterIdx: it.chapterIdx});
      i++;
    }
  }

  // Les temps restants allongent d'abord les plans d'ouverture et les plans larges :
  // on garde le contraste avec les plans courts.
  const order = ['establish', 'wide', 'split', 'reframe', 'short'];
  guard = 0;
  while (sum() < B && guard++ < 2000) {
    const cands = items
      .filter((it) => it.beats < theme.maxBeats + (it.role === 'split' ? 2 : 0))
      .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.beats - b.beats);
    const pool = cands.filter((c) => c.beats < theme.wideBeats + 2);
    const pick = (pool.length ? pool : cands)[0];
    if (pick) pick.beats += 1;
    else [...items].sort((x, y) => x.beats - y.beats)[0].beats += 1;
  }

  // ---- placement sur la grille + transitions ----
  const clips: Clip[] = [];
  const heroMove: Move = {zoom: [1.12, 1.2], dolly: [0, 0.12 * m], parX: [0, 0], parY: [0, 0], panX: [0, 0], panY: [0.015, -0.005], focus: 0.1};
  clips.push({kind: 'intro', start: 0, end: bf[introIdx], photos: [0], moves: [heroMove], inT: 'cut', outT: 'cut'});

  let cursor = introIdx;
  let chapterSeen = -1;
  let titleCount = 0;
  items.forEach((it, i) => {
    const start = bf[cursor];
    cursor += it.beats;
    const end = i === items.length - 1 ? bf[outroIdx] : bf[cursor];
    const prev = clips[clips.length - 1];
    const isNewChapter = it.chapterIdx !== chapterSeen;
    let t: TransitionKind;
    if (it.role === 'reframe') t = 'cut';
    else if (i === 0) t = theme.chapterTransitions[0];
    else if (isNewChapter) t = theme.chapterTransitions[(it.chapterIdx) % theme.chapterTransitions.length];
    else t = theme.innerTransitions[i % theme.innerTransitions.length];
    // Les effets ont besoin de place : sur les plans très courts, coupe franche.
    const prevLen = prev.end - prev.start;
    const len = end - start;
    if (t !== 'cut' && (prevLen < 14 || len < 14)) t = 'cut';
    prev.outT = t;

    const moves =
      it.kind === 'split'
        ? it.photos.map((_, k) => ({...MOVES[k % 2 === 0 ? 'craneUp' : 'craneDown'](m * 0.8), zoom: [1.16, 1.22] as Range}))
        : it.role === 'reframe'
          ? [reframeMove(photos[it.photos[0]], m, i % 2 === 0)]
          : [pickMove(i, t, m, `${styleId}-${i}`)];
    let chapter: Clip['chapter'];
    if (isNewChapter && it.chapterTitle) {
      titleCount += 1;
      chapter = {index: titleCount, total: titled, title: it.chapterTitle};
    }
    chapterSeen = it.chapterIdx;
    clips.push({kind: it.kind, start, end, photos: it.photos, moves, inT: t, outT: 'cut', chapter});
  });

  const last = clips[clips.length - 1];
  last.outT = 'dissolve';
  const outroMove: Move = {zoom: [1.24, 1.12], dolly: [0.1 * m, 0], parX: [0, 0], parY: [0, 0], panX: [0, 0], panY: [-0.005, 0.01], focus: 0.1};
  clips.push({kind: 'outro', start: last.end, end: totalFrames, photos: [0], moves: [outroMove], inT: 'dissolve', outT: 'cut'});

  return {clips, beatFrames};
};
