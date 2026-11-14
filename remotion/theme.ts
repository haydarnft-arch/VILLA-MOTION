import type {StyleId} from './types';

export const COLORS = {
  black: '#0A0A0B',
  anthracite: '#232327',
  white: '#F7F4EE',
  gold: '#C8A96E',
  goldSoft: 'rgba(200, 169, 110, 0.85)',
};

export type TransitionKind =
  | 'cut'
  | 'dissolve'
  | 'whip-left'
  | 'whip-right'
  | 'punch'
  | 'flash'
  | 'dip';

export type Theme = {
  headingFamily: string;
  headingWeight: number;
  bodyFamily: string;
  headingTransform: 'none' | 'uppercase';
  headingSpacing: string;
  // Montage (en temps musicaux)
  introBeats: number;
  outroSeconds: number;
  establishBeats: number; // premier plan d'une pièce (avec le titre)
  wideBeats: number;
  shortBeats: number;
  splitBeats: number;
  minBeats: number;
  maxBeats: number;
  // Transitions
  chapterTransitions: TransitionKind[];
  innerTransitions: TransitionKind[];
  dissolveFrames: number;
  // Mouvements de caméra
  motion: number; // amplitude globale
  grain: number;
  vignette: number;
  letterbox: number; // hauteur des bandes (px), 0 = aucune
  splitMinChapter: number; // taille minimale d'une pièce pour un écran partagé
};

export const THEMES: Record<StyleId, Theme> = {
  luxury: {
    headingFamily: 'Cormorant Garamond',
    headingWeight: 500,
    bodyFamily: 'Montserrat',
    headingTransform: 'none',
    headingSpacing: '0.02em',
    introBeats: 6,
    outroSeconds: 4.4,
    establishBeats: 5,
    wideBeats: 4,
    shortBeats: 2,
    splitBeats: 5,
    minBeats: 2,
    maxBeats: 7,
    chapterTransitions: ['flash', 'dissolve'],
    innerTransitions: ['cut', 'dissolve', 'cut', 'cut'],
    dissolveFrames: 12,
    motion: 0.9,
    grain: 0.025,
    vignette: 0.32,
    letterbox: 0,
    splitMinChapter: 6,
  },
  cinematic: {
    headingFamily: 'Marcellus',
    headingWeight: 400,
    bodyFamily: 'Montserrat',
    headingTransform: 'uppercase',
    headingSpacing: '0.2em',
    introBeats: 7,
    outroSeconds: 4.6,
    establishBeats: 6,
    wideBeats: 4,
    shortBeats: 2,
    splitBeats: 6,
    minBeats: 2,
    maxBeats: 8,
    chapterTransitions: ['dip', 'flash'],
    innerTransitions: ['cut', 'cut', 'punch', 'cut', 'dissolve'],
    dissolveFrames: 10,
    motion: 1.05,
    grain: 0.04,
    vignette: 0.48,
    letterbox: 132,
    splitMinChapter: 6,
  },
  modern: {
    headingFamily: 'Montserrat',
    headingWeight: 600,
    bodyFamily: 'Montserrat',
    headingTransform: 'uppercase',
    headingSpacing: '0.08em',
    introBeats: 5,
    outroSeconds: 4.0,
    establishBeats: 4,
    wideBeats: 3,
    shortBeats: 2,
    splitBeats: 4,
    minBeats: 1,
    maxBeats: 5,
    chapterTransitions: ['whip-left', 'punch', 'whip-right'],
    innerTransitions: ['cut', 'whip-left', 'cut', 'punch', 'cut', 'whip-right'],
    dissolveFrames: 8,
    motion: 1.2,
    grain: 0.02,
    vignette: 0.25,
    letterbox: 0,
    splitMinChapter: 5,
  },
};

export const WHIP_FRAMES = 7;
export const PUNCH_OUT_FRAMES = 6;
export const PUNCH_IN_FRAMES = 9;
export const FLASH_OUT_FRAMES = 4;
export const FLASH_IN_FRAMES = 12;
export const DIP_FRAMES = 9;
