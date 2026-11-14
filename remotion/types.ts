export type StyleId = 'luxury' | 'cinematic' | 'modern';
export type MusicId = 'luxury' | 'cinematic' | 'modern' | 'none';

export type Photo = {
  src: string;
  depth?: string;
  label?: string;
  // Point d'intérêt (0..1) détecté sur la carte de profondeur
  focusX?: number;
  focusY?: number;
};

export type VillaProps = {
  villaName: string;
  location: string;
  tagline: string;
  styleId: StyleId;
  music: MusicId;
  durationSeconds: number;
  photos: Photo[];
  serverBase: string;
  // Temps musicaux (secondes) — les coupes tombent dessus.
  beats?: number[];
};

export const FPS = 30;
