import type {StyleId} from './types';

export const COLORS = {
  black: '#0A0A0B',
  anthracite: '#232327',
  white: '#F7F4EE',
  gold: '#C8A96E',
  goldSoft: 'rgba(200, 169, 110, 0.85)',
};

export type Theme = {
  headingFamily: string;
  headingWeight: number;
  bodyFamily: string;
  // seconds
  introSeconds: number;
  outroSeconds: number;
  baseSceneSeconds: number;
  transitionSeconds: number;
  letterbox: boolean;
  headingTransform: 'none' | 'uppercase';
  headingSpacing: string;
};

export const THEMES: Record<StyleId, Theme> = {
  luxury: {
    headingFamily: 'Cormorant Garamond',
    headingWeight: 500,
    bodyFamily: 'Montserrat',
    introSeconds: 4.2,
    outroSeconds: 4.6,
    baseSceneSeconds: 3.4,
    transitionSeconds: 1.0,
    letterbox: false,
    headingTransform: 'none',
    headingSpacing: '0.04em',
  },
  cinematic: {
    headingFamily: 'Marcellus',
    headingWeight: 400,
    bodyFamily: 'Montserrat',
    introSeconds: 4.4,
    outroSeconds: 4.8,
    baseSceneSeconds: 3.1,
    transitionSeconds: 0.9,
    letterbox: true,
    headingTransform: 'uppercase',
    headingSpacing: '0.22em',
  },
  modern: {
    headingFamily: 'Montserrat',
    headingWeight: 600,
    bodyFamily: 'Montserrat',
    introSeconds: 3.8,
    outroSeconds: 4.2,
    baseSceneSeconds: 2.7,
    transitionSeconds: 0.6,
    letterbox: false,
    headingTransform: 'uppercase',
    headingSpacing: '0.14em',
  },
};
