import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {COLORS, Theme} from '../theme';
import type {StyleId} from '../types';

type Move = {
  fromScale: number;
  toScale: number;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  rotate: number;
};

// A set of elegant camera moves, cycled with seeded variety.
const buildMove = (index: number, styleId: StyleId): Move => {
  const r = (k: string) => random(`${styleId}-${index}-${k}`);
  const intensity = styleId === 'modern' ? 1.2 : styleId === 'cinematic' ? 1.1 : 1;
  const variant = index % 4;
  const dir = r('dir') > 0.5 ? 1 : -1;
  const drift = (18 + r('drift') * 22) * intensity;
  const lift = (10 + r('lift') * 16) * intensity;
  switch (variant) {
    case 0: // slow push-in, slight lateral drift
      return {
        fromScale: 1.08,
        toScale: 1.22 + r('s') * 0.05,
        fromX: -dir * drift * 0.4,
        toX: dir * drift * 0.6,
        fromY: lift * 0.3,
        toY: -lift * 0.5,
        rotate: dir * 0.4,
      };
    case 1: // pull-back reveal
      return {
        fromScale: 1.28 + r('s') * 0.05,
        toScale: 1.1,
        fromX: dir * drift * 0.5,
        toX: -dir * drift * 0.3,
        fromY: -lift * 0.4,
        toY: lift * 0.3,
        rotate: -dir * 0.35,
      };
    case 2: // lateral glide
      return {
        fromScale: 1.18,
        toScale: 1.24,
        fromX: -dir * drift,
        toX: dir * drift,
        fromY: -lift * 0.2,
        toY: lift * 0.2,
        rotate: dir * 0.3,
      };
    default: // rising push-in (ceilings / exteriors)
      return {
        fromScale: 1.12,
        toScale: 1.26,
        fromX: dir * drift * 0.3,
        toX: -dir * drift * 0.3,
        fromY: lift,
        toY: -lift,
        rotate: 0,
      };
  }
};

export const KenBurnsPhoto: React.FC<{
  src: string;
  label?: string;
  index: number;
  styleId: StyleId;
  theme: Theme;
}> = ({src, label, index, styleId, theme}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const move = buildMove(index, styleId);

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Gentle ease on the camera path keeps motion organic, never linear.
  const eased = t * t * (3 - 2 * t) * 0.25 + t * 0.75;

  const scale = move.fromScale + (move.toScale - move.fromScale) * eased;
  const x = move.fromX + (move.toX - move.fromX) * eased;
  const y = move.fromY + (move.toY - move.fromY) * eased;
  const rot = move.rotate * (eased - 0.5);

  // Parallax foreground veil drifts against the camera for depth.
  const veilX = -x * 0.45;
  const veilY = -y * 0.45;

  const labelIn = label
    ? interpolate(frame, [fps * 0.7, fps * 1.5], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const labelOut = label
    ? interpolate(
        frame,
        [durationInFrames - fps * 0.8, durationInFrames - fps * 0.2],
        [1, 0],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
      )
    : 0;
  const labelOpacity = Math.min(labelIn, labelOut);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rot}deg)`,
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        <Img
          src={src}
          pauseWhenLoading
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </AbsoluteFill>

      {/* depth veil: soft directional gradient moving against the camera */}
      <AbsoluteFill
        style={{
          transform: `translate3d(${veilX}px, ${veilY}px, 0) scale(1.1)`,
          background:
            'linear-gradient(115deg, rgba(10,10,11,0.35) 0%, rgba(10,10,11,0) 30%, rgba(10,10,11,0) 70%, rgba(10,10,11,0.3) 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* cinematic vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(5,5,6,0.42) 100%)',
          pointerEvents: 'none',
        }}
      />

      {label ? (
        <div
          style={{
            position: 'absolute',
            left: styleId === 'modern' ? 90 : '50%',
            bottom: styleId === 'cinematic' ? 150 : 90,
            transform:
              styleId === 'modern'
                ? `translateY(${(1 - labelIn) * 24}px)`
                : `translateX(-50%) translateY(${(1 - labelIn) * 24}px)`,
            opacity: labelOpacity,
            textAlign: styleId === 'modern' ? 'left' : 'center',
          }}
        >
          <div
            style={{
              width: 56 + labelIn * 24,
              height: 1.5,
              background: COLORS.gold,
              margin: styleId === 'modern' ? '0 0 16px 2px' : '0 auto 16px',
              opacity: 0.9,
            }}
          />
          <div
            style={{
              fontFamily: `'${theme.bodyFamily}', sans-serif`,
              fontWeight: 300,
              fontSize: 30,
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              color: COLORS.white,
              textShadow: '0 2px 24px rgba(0,0,0,0.75)',
              paddingLeft: '0.42em',
            }}
          >
            {label}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
