export type StyleId = 'luxury' | 'cinematic' | 'modern';
export type MusicId = 'luxury' | 'cinematic' | 'modern' | 'none';

export type Photo = {
  src: string;
  label?: string;
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
};

export const FPS = 30;
