import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {COLORS, Theme} from '../theme';

export const Outro: React.FC<{
  villaName: string;
  location: string;
  tagline: string;
  backgroundSrc?: string;
  theme: Theme;
}> = ({villaName, location, tagline, backgroundSrc, theme}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const appear = (delaySec: number) =>
    spring({
      frame: frame - Math.round(fps * delaySec),
      fps,
      config: {damping: 130, stiffness: 55, mass: 1},
    });

  const frameDraw = appear(0.25);
  const nameIn = appear(0.55);
  const locationIn = appear(0.95);
  const taglineIn = appear(1.4);

  // Final fade to black for a clean professional ending.
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 1.1, durationInFrames - 6],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  const nameSize = villaName.length > 22 ? 76 : 96;

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black}}>
      {backgroundSrc ? (
        <AbsoluteFill style={{opacity: 0.22}}>
          <Img
            src={backgroundSrc}
            pauseWhenLoading
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(14px) brightness(0.5) saturate(0.8)',
              transform: `scale(${1.15 + frame * 0.0006})`,
            }}
          />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: fadeOut}}>
        <div
          style={{
            position: 'relative',
            padding: '90px 130px',
            textAlign: 'center',
            maxWidth: 1400,
          }}
        >
          {/* drawing frame */}
          <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
            <div style={{position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: `${frameDraw * 100}%`, height: 1, background: COLORS.goldSoft}} />
            <div style={{position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: `${frameDraw * 100}%`, height: 1, background: COLORS.goldSoft}} />
            <div style={{position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: `${frameDraw * 100}%`, width: 1, background: COLORS.goldSoft}} />
            <div style={{position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', height: `${frameDraw * 100}%`, width: 1, background: COLORS.goldSoft}} />
          </div>

          <div
            style={{
              fontFamily: `'${theme.headingFamily}', serif`,
              fontWeight: theme.headingWeight,
              fontSize: nameSize,
              color: COLORS.white,
              textTransform: theme.headingTransform,
              letterSpacing: theme.headingSpacing,
              lineHeight: 1.1,
              opacity: Math.min(1, nameIn * 1.4),
              transform: `translateY(${(1 - nameIn) * 26}px)`,
            }}
          >
            {villaName}
          </div>

          <div
            style={{
              marginTop: 26,
              fontFamily: `'${theme.bodyFamily}', sans-serif`,
              fontWeight: 300,
              fontSize: 26,
              letterSpacing: '0.42em',
              paddingLeft: '0.42em',
              textTransform: 'uppercase',
              color: COLORS.gold,
              opacity: Math.min(1, locationIn * 1.4),
              transform: `translateY(${(1 - locationIn) * 20}px)`,
            }}
          >
            {location}
          </div>

          {tagline ? (
            <div
              style={{
                marginTop: 44,
                fontFamily: `'Cormorant Garamond', serif`,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 34,
                color: 'rgba(247,244,238,0.85)',
                opacity: Math.min(1, taglineIn * 1.4),
                transform: `translateY(${(1 - taglineIn) * 16}px)`,
              }}
            >
              {tagline}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
