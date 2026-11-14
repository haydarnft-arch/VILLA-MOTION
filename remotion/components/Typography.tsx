import React from 'react';
import {AbsoluteFill, interpolate, spring, useVideoConfig, Easing} from 'remotion';
import {COLORS, Theme} from '../theme';
import type {StyleId} from '../types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Lettres qui montent depuis un masque, l'une après l'autre.
const MaskedLetters: React.FC<{text: string; frame: number; delay: number; stagger: number; style: React.CSSProperties}> = ({
  text,
  frame,
  delay,
  stagger,
  style,
}) => {
  const {fps} = useVideoConfig();
  return (
    <div style={{...style, whiteSpace: 'pre'}}>
      {Array.from(text).map((ch, i) => {
        const s = spring({frame: frame - delay - i * stagger, fps, config: {damping: 200, stiffness: 90, mass: 0.9}});
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em'}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - s) * 105}%)`}}>{ch === ' ' ? ' ' : ch}</span>
          </span>
        );
      })}
    </div>
  );
};

// ---------- Titre d'ouverture ----------
export const IntroTitle: React.FC<{
  frame: number;
  duration: number;
  villaName: string;
  location: string;
  theme: Theme;
  styleId: StyleId;
}> = ({frame, duration, villaName, location, theme, styleId}) => {
  const {fps} = useVideoConfig();
  const left = styleId === 'modern';
  const line = interpolate(frame, [fps * 0.4, fps * 1.4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const locIn = interpolate(frame, [fps * 1.5, fps * 2.3], [0, 1], clamp);
  const out = interpolate(frame, [duration - 10, duration], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const size = villaName.length > 20 ? 110 : villaName.length > 13 ? 134 : 158;

  return (
    <AbsoluteFill
      style={{
        alignItems: left ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: left ? '0 150px' : '0 100px',
        opacity: 1 - out,
        transform: `translateY(${-out * 40}px) scale(${1 + out * 0.04})`,
        filter: out > 0 ? `blur(${out * 8}px)` : undefined,
      }}
    >
      <div
        style={{
          width: left ? 4 : 280 * line,
          height: left ? 170 * line : 1.5,
          background: left ? COLORS.gold : `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          marginBottom: 40,
        }}
      />
      <MaskedLetters
        text={villaName}
        frame={frame}
        delay={Math.round(fps * 0.7)}
        stagger={2}
        style={{
          fontFamily: `'${theme.headingFamily}', serif`,
          fontWeight: theme.headingWeight,
          fontSize: size,
          lineHeight: 1.05,
          color: COLORS.white,
          textTransform: theme.headingTransform,
          letterSpacing: theme.headingSpacing,
          textShadow: '0 6px 50px rgba(0,0,0,0.45)',
        }}
      />
      <div
        style={{
          marginTop: 34,
          opacity: locIn,
          fontFamily: `'${theme.bodyFamily}', sans-serif`,
          fontWeight: 300,
          fontSize: 30,
          letterSpacing: `${0.6 - locIn * 0.18}em`,
          paddingLeft: left ? 4 : `${0.6 - locIn * 0.18}em`,
          textTransform: 'uppercase',
          color: COLORS.gold,
          textShadow: '0 2px 24px rgba(0,0,0,0.6)',
        }}
      >
        {location}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Titre de pièce ----------
export const ChapterTitle: React.FC<{
  frame: number;
  clipDuration: number;
  index: number;
  total: number;
  title: string;
  theme: Theme;
  styleId: StyleId;
  letterbox: number;
}> = ({frame, clipDuration, index, total, title, theme, styleId, letterbox}) => {
  const {fps} = useVideoConfig();
  const hold = Math.min(clipDuration - 8, Math.round(fps * 2.4));
  const out = interpolate(frame, [hold - 9, hold], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  if (frame > hold) return null;
  const rule = interpolate(frame, [4, 20], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const num = `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const bottom = 96 + letterbox;

  if (styleId === 'modern') {
    return (
      <AbsoluteFill style={{opacity: 1 - out, transform: `translateX(${-out * 60}px)`}}>
        <div style={{position: 'absolute', left: 110, bottom, display: 'flex', alignItems: 'flex-end', gap: 26}}>
          <div style={{width: 10, height: 120 * rule, background: COLORS.gold}} />
          <div>
            <div style={{fontFamily: 'Montserrat', fontWeight: 600, fontSize: 22, letterSpacing: '0.3em', color: COLORS.gold, marginBottom: 6, opacity: rule, textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 2px 18px rgba(0,0,0,0.7)'}}>{num}</div>
            <MaskedLetters
              text={title}
              frame={frame}
              delay={3}
              stagger={1}
              style={{fontFamily: 'Montserrat', fontWeight: 600, fontSize: 96, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.white, textShadow: '0 2px 6px rgba(0,0,0,0.5), 0 4px 40px rgba(0,0,0,0.55)'}}
            />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const centered = styleId === 'cinematic';
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `translateY(${-out * 24}px)`}}>
      <div
        style={{
          position: 'absolute',
          bottom,
          left: centered ? 0 : 120,
          right: centered ? 0 : undefined,
          textAlign: centered ? 'center' : 'left',
        }}
      >
        <div
          style={{
            fontFamily: 'Montserrat',
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: '0.42em',
            color: COLORS.gold,
            opacity: rule,
            marginBottom: 14,
            paddingLeft: centered ? '0.42em' : 0,
            textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 2px 18px rgba(0,0,0,0.7)',
          }}
        >
          {num}
        </div>
        <MaskedLetters
          text={title}
          frame={frame}
          delay={5}
          stagger={centered ? 2 : 1}
          style={{
            fontFamily: `'${theme.headingFamily}', serif`,
            fontStyle: centered ? 'normal' : 'italic',
            fontWeight: centered ? 400 : 400,
            fontSize: centered ? 64 : 108,
            lineHeight: 1,
            textTransform: theme.headingTransform,
            letterSpacing: centered ? '0.32em' : '0.01em',
            paddingLeft: centered ? '0.32em' : 0,
            color: COLORS.white,
            textShadow: '0 2px 6px rgba(0,0,0,0.55), 0 4px 40px rgba(0,0,0,0.6)',
          }}
        />
        <div
          style={{
            width: 220 * rule,
            height: 1.5,
            background: COLORS.gold,
            marginTop: 20,
            marginLeft: centered ? 'auto' : 4,
            marginRight: centered ? 'auto' : 0,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------- Carton final ----------
export const OutroCard: React.FC<{
  frame: number;
  duration: number;
  villaName: string;
  location: string;
  tagline: string;
  theme: Theme;
}> = ({frame, duration, villaName, location, tagline, theme}) => {
  const {fps} = useVideoConfig();
  const appear = (d: number) => spring({frame: frame - Math.round(fps * d), fps, config: {damping: 140, stiffness: 60}});
  const box = appear(0.35);
  const name = appear(0.55);
  const loc = appear(0.95);
  const tag = appear(1.35);
  const fade = interpolate(frame, [duration - fps * 1.0, duration - 4], [1, 0], clamp);
  const size = villaName.length > 20 ? 78 : 98;
  const edge = {position: 'absolute' as const, background: COLORS.goldSoft};
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: fade}}>
      <div style={{position: 'relative', padding: '84px 130px', textAlign: 'center', maxWidth: 1400}}>
        <div style={{...edge, top: 0, left: '50%', transform: 'translateX(-50%)', width: `${box * 100}%`, height: 1}} />
        <div style={{...edge, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: `${box * 100}%`, height: 1}} />
        <div style={{...edge, left: 0, top: '50%', transform: 'translateY(-50%)', height: `${box * 100}%`, width: 1}} />
        <div style={{...edge, right: 0, top: '50%', transform: 'translateY(-50%)', height: `${box * 100}%`, width: 1}} />
        <div
          style={{
            fontFamily: `'${theme.headingFamily}', serif`,
            fontWeight: theme.headingWeight,
            fontSize: size,
            lineHeight: 1.08,
            color: COLORS.white,
            textTransform: theme.headingTransform,
            letterSpacing: theme.headingSpacing,
            opacity: Math.min(1, name * 1.3),
            transform: `translateY(${(1 - name) * 24}px)`,
          }}
        >
          {villaName}
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: 'Montserrat',
            fontWeight: 300,
            fontSize: 26,
            letterSpacing: '0.42em',
            paddingLeft: '0.42em',
            textTransform: 'uppercase',
            color: COLORS.gold,
            opacity: Math.min(1, loc * 1.3),
            transform: `translateY(${(1 - loc) * 18}px)`,
          }}
        >
          {location}
        </div>
        {tagline ? (
          <div
            style={{
              marginTop: 40,
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontSize: 40,
              color: COLORS.white,
              opacity: Math.min(1, tag * 1.3),
              transform: `translateY(${(1 - tag) * 14}px)`,
            }}
          >
            {tagline}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Lumière parasite chaude (flashs) ----------
export const LightLeak: React.FC<{intensity: number; seed: number}> = ({intensity, seed}) => {
  if (intensity <= 0.001) return null;
  const x = 30 + ((seed * 37) % 40);
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: intensity,
        background: `radial-gradient(ellipse 70% 90% at ${x}% 40%, rgba(255,214,150,0.95) 0%, rgba(255,170,90,0.55) 35%, rgba(255,140,60,0) 70%), radial-gradient(ellipse 40% 60% at ${100 - x}% 70%, rgba(255,235,200,0.6) 0%, rgba(255,235,200,0) 70%)`,
        pointerEvents: 'none',
      }}
    />
  );
};
