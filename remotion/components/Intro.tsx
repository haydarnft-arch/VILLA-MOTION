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
import type {StyleId} from '../types';

const WordReveal: React.FC<{
  text: string;
  startFrame: number;
  style: React.CSSProperties;
  stagger?: number;
}> = ({text, startFrame, style, stagger = 4}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div style={{...style, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.32em'}}>
      {words.map((word, i) => {
        const s = spring({
          frame: frame - startFrame - i * stagger,
          fps,
          config: {damping: 110, stiffness: 60, mass: 1.1},
        });
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom'}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - s) * 110}%)`,
                opacity: Math.min(1, s * 1.6),
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const Intro: React.FC<{
  villaName: string;
  location: string;
  backgroundSrc?: string;
  styleId: StyleId;
  theme: Theme;
}> = ({villaName, location, backgroundSrc, styleId, theme}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const bgScale = interpolate(frame, [0, durationInFrames], [1.3, 1.18]);
  const bgOpacity = interpolate(frame, [0, fps * 1.1], [0, 0.55], {
    extrapolateRight: 'clamp',
  });

  const line = spring({frame: frame - fps * 0.5, fps, config: {damping: 200}, durationInFrames: Math.round(fps * 1.4)});
  const locIn = interpolate(frame, [fps * 1.7, fps * 2.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const locTracking = 0.55 - locIn * 0.13;

  const nameSize = villaName.length > 22 ? 104 : villaName.length > 14 ? 128 : 150;

  const isModern = styleId === 'modern';

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black}}>
      {backgroundSrc ? (
        <AbsoluteFill style={{opacity: bgOpacity}}>
          <AbsoluteFill style={{transform: `scale(${bgScale})`}}>
            <Img
              src={backgroundSrc}
              pauseWhenLoading
              style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7) saturate(0.9)'}}
            />
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(10,10,11,0.25) 0%, rgba(10,10,11,0.85) 100%)',
            }}
          />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          alignItems: isModern ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: isModern ? '0 140px' : '0 100px',
        }}
      >
        {isModern ? (
          <div
            style={{
              width: 3,
              height: interpolate(line, [0, 1], [0, 190]),
              background: COLORS.gold,
              marginBottom: 38,
            }}
          />
        ) : (
          <div
            style={{
              width: interpolate(line, [0, 1], [0, 260]),
              height: 1.5,
              background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
              marginBottom: 44,
            }}
          />
        )}

        <WordReveal
          text={villaName}
          startFrame={Math.round(fps * 0.9)}
          style={{
            fontFamily: `'${theme.headingFamily}', serif`,
            fontWeight: theme.headingWeight,
            fontSize: nameSize,
            lineHeight: 1.08,
            color: COLORS.white,
            textTransform: theme.headingTransform,
            letterSpacing: theme.headingSpacing,
            textAlign: isModern ? 'left' : 'center',
            justifyContent: isModern ? 'flex-start' : 'center',
            maxWidth: 1500,
            textShadow: '0 4px 60px rgba(0,0,0,0.6)',
          }}
        />

        <div
          style={{
            marginTop: 42,
            opacity: locIn,
            transform: `translateY(${(1 - locIn) * 14}px)`,
            fontFamily: `'${theme.bodyFamily}', sans-serif`,
            fontWeight: 300,
            fontSize: 32,
            letterSpacing: `${locTracking}em`,
            paddingLeft: `${locTracking}em`,
            textTransform: 'uppercase',
            color: COLORS.gold,
          }}
        >
          {location}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
