import React from 'react';
import {Composition} from 'remotion';
import {VillaVideo} from './VillaVideo';
import {FPS, VillaProps} from './types';

const defaultProps: VillaProps = {
  villaName: 'Villa Horizon',
  location: 'Saint-Tropez, France',
  tagline: 'Visite privée sur demande',
  styleId: 'luxury',
  music: 'luxury',
  durationSeconds: 36,
  photos: [],
  serverBase: 'http://127.0.0.1:4680',
  beats: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VillaMotion"
      component={VillaVideo}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={36 * FPS}
      defaultProps={defaultProps}
      calculateMetadata={({props}) => {
        const seconds = Math.min(60, Math.max(15, props.durationSeconds || 36));
        return {
          durationInFrames: Math.round(seconds * FPS),
          props,
        };
      }}
    />
  );
};
