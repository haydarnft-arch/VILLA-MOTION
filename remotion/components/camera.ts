import {CameraState, NEUTRAL_CAMERA} from '../gl/DepthCanvas';
import type {Move} from '../planner';
import {
  DIP_FRAMES,
  FLASH_IN_FRAMES,
  FLASH_OUT_FRAMES,
  PUNCH_IN_FRAMES,
  PUNCH_OUT_FRAMES,
  TransitionKind,
  WHIP_FRAMES,
} from '../theme';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// La caméra part avec de l'élan après la coupe puis se pose : jamais linéaire.
export const moveEase = (t: number) => {
  if (t <= 1) return 1 - Math.pow(1 - t, 1.7);
  return 1 + (t - 1) * 0.4;
};

export const cameraAt = (move: Move, t: number): CameraState => {
  const e = moveEase(Math.max(0, t));
  return {
    ...NEUTRAL_CAMERA,
    zoom: lerp(move.zoom[0], move.zoom[1], e),
    dolly: lerp(move.dolly[0], move.dolly[1], e),
    parX: lerp(move.parX[0], move.parX[1], e),
    parY: lerp(move.parY[0], move.parY[1], e),
    panX: lerp(move.panX[0], move.panX[1], e),
    panY: lerp(move.panY[0], move.panY[1], e),
    focus: move.focus,
  };
};

export type TransitionFx = {
  offsetX: number;
  blurX: number;
  zoomMul: number;
  radial: number;
  exposure: number;
  opacity: number;
  leak: number; // intensité de la lumière parasite (flash)
};

const NONE: TransitionFx = {offsetX: 0, blurX: 0, zoomMul: 1, radial: 0, exposure: 1, opacity: 1, leak: 0};

const WHIP_DIST = 0.6;

// Effet d'entrée : `f` = image locale depuis le début du plan.
export const enterFx = (kind: TransitionKind, f: number, dissolveFrames: number): TransitionFx => {
  switch (kind) {
    case 'whip-left':
    case 'whip-right': {
      const s = kind === 'whip-left' ? 1 : -1;
      const p = clamp01(f / WHIP_FRAMES);
      const q = 1 - p;
      return {...NONE, offsetX: -s * WHIP_DIST * q * q * q, blurX: s * (3 * WHIP_DIST * q * q) / WHIP_FRAMES * 2.2};
    }
    case 'punch': {
      const q = 1 - clamp01(f / PUNCH_IN_FRAMES);
      return {...NONE, zoomMul: 1 + 0.32 * q * q * q, radial: 0.22 * q * q, exposure: 1 + 0.25 * q * q};
    }
    case 'flash': {
      const q = 1 - clamp01(f / FLASH_IN_FRAMES);
      return {...NONE, exposure: 1 + 2.2 * Math.pow(q, 2.2), leak: Math.pow(q, 1.4)};
    }
    case 'dip': {
      const p = clamp01(f / DIP_FRAMES);
      return {...NONE, exposure: Math.pow(p, 1.4)};
    }
    case 'dissolve': {
      return {...NONE, opacity: clamp01(f / dissolveFrames)};
    }
    default:
      return NONE;
  }
};

// Effet de sortie : `r` = nombre d'images restantes avant la coupe.
export const exitFx = (kind: TransitionKind, r: number): TransitionFx => {
  switch (kind) {
    case 'whip-left':
    case 'whip-right': {
      const s = kind === 'whip-left' ? 1 : -1;
      const p = 1 - clamp01(r / WHIP_FRAMES);
      return {...NONE, offsetX: s * WHIP_DIST * p * p * p, blurX: s * (3 * WHIP_DIST * p * p) / WHIP_FRAMES * 2.2};
    }
    case 'punch': {
      const p = 1 - clamp01(r / PUNCH_OUT_FRAMES);
      return {...NONE, zoomMul: 1 + 0.55 * p * p * p, radial: 0.3 * p * p, exposure: 1 + 0.3 * p * p};
    }
    case 'flash': {
      const p = 1 - clamp01(r / FLASH_OUT_FRAMES);
      return {...NONE, exposure: 1 + 1.6 * p * p, leak: p * 0.6};
    }
    case 'dip': {
      const p = 1 - clamp01(r / DIP_FRAMES);
      return {...NONE, exposure: Math.pow(1 - p, 1.4)};
    }
    default:
      return NONE;
  }
};

export const combineFx = (a: TransitionFx, b: TransitionFx): TransitionFx => ({
  offsetX: a.offsetX + b.offsetX,
  blurX: a.blurX + b.blurX,
  zoomMul: a.zoomMul * b.zoomMul,
  radial: a.radial + b.radial,
  exposure: a.exposure * b.exposure,
  opacity: a.opacity * b.opacity,
  leak: Math.max(a.leak, b.leak),
});

export const applyFx = (cam: CameraState, fx: TransitionFx): CameraState => ({
  ...cam,
  zoom: cam.zoom * fx.zoomMul,
  offsetX: cam.offsetX + fx.offsetX,
  blurX: cam.blurX + fx.blurX,
  radial: cam.radial + fx.radial,
  exposure: cam.exposure * fx.exposure,
});
