import React, {useMemo} from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import type {VillaProps} from './types';
import {COLORS, THEMES} from './theme';
import {loadFonts} from './fonts';
import {Intro} from './components/Intro';
import {Outro} from './components/Outro';
import {KenBurnsPhoto} from './components/KenBurnsPhoto';

// --- Dip-to-black presentation (cinematic) ---
const DipToBlackComp: React.FC<
  TransitionPresentationComponentProps<Record<string, never>>
> = ({children, presentationDirection, presentationProgress}) => {
  const opacity =
    presentationDirection === 'exiting'
      ? interpolate(presentationProgress, [0, 0.55], [1, 0], {
          extrapolateRight: 'clamp',
        })
      : interpolate(presentationProgress, [0.45, 1], [0, 1], {
          extrapolateLeft: 'clamp',
        });
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const dipToBlack = (): TransitionPresentation<Record<string, never>> => ({
  component: DipToBlackComp,
  props: {},
});

const Letterbox: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const h = interpolate(frame, [0, fps * 1.2], [0, 110], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: h, background: '#000', zIndex: 50}} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: h, background: '#000', zIndex: 50}} />
    </>
  );
};

// Evenly sample `n` photos across the user's chosen order.
const samplePhotos = <T,>(photos: T[], n: number): T[] => {
  if (n >= photos.length) return photos;
  if (n <= 1) return [photos[0]];
  const picked: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    let idx = Math.round((i * (photos.length - 1)) / (n - 1));
    while (used.has(idx) && idx < photos.length - 1) idx++;
    used.add(idx);
    picked.push(photos[idx]);
  }
  return picked;
};

export const VillaVideo: React.FC<VillaProps> = (props) => {
  const {villaName, location, tagline, styleId, music, photos, serverBase} = props;
  const theme = THEMES[styleId];
  const {fps, durationInFrames} = useVideoConfig();

  loadFonts(serverBase);

  const plan = useMemo(() => {
    const introF = Math.round(theme.introSeconds * fps);
    const outroF = Math.round(theme.outroSeconds * fps);
    const transF = Math.round(theme.transitionSeconds * fps);
    const baseF = Math.round(theme.baseSceneSeconds * fps);

    let n = Math.max(
      1,
      Math.round((durationInFrames - introF - outroF + transF) / (baseF - transF))
    );
    n = Math.min(n, Math.max(1, photos.length));

    const totalSceneF = durationInFrames - introF - outroF + (n + 1) * transF;
    const sceneF = Math.max(Math.round(fps * 1.4), Math.floor(totalSceneF / n));
    const lastSceneF = Math.max(
      Math.round(fps * 1.4),
      totalSceneF - sceneF * (n - 1)
    );
    const scenes = samplePhotos(photos, n);
    return {introF, outroF, transF, sceneF, lastSceneF, scenes};
  }, [theme, fps, durationInFrames, photos]);

  const pickTransition = (i: number, total: number) => {
    // First and last transitions stay on an elegant fade.
    if (styleId === 'cinematic') {
      if (i === 0 || i === total - 1) return fade();
      return dipToBlack();
    }
    if (styleId === 'modern') {
      if (i === 0 || i === total - 1) return fade();
      if (i % 3 === 1) return wipe({direction: 'from-left'});
      if (i % 3 === 2) return slide({direction: 'from-right'});
      return fade();
    }
    return fade();
  };

  const totalTransitions = plan.scenes.length + 1;
  const musicVolume = 1;
  const fadeInF = Math.round(fps * 1.4);
  const fadeOutStartF = durationInFrames - Math.round(fps * 2.6);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={plan.introF}>
          <Intro
            villaName={villaName}
            location={location}
            backgroundSrc={photos[0]?.src}
            styleId={styleId}
            theme={theme}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={pickTransition(0, totalTransitions)}
          timing={linearTiming({
            durationInFrames: plan.transF,
            easing: Easing.inOut(Easing.ease),
          })}
        />

        {plan.scenes.map((photo, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence
              durationInFrames={i === plan.scenes.length - 1 ? plan.lastSceneF : plan.sceneF}
            >
              <KenBurnsPhoto
                src={photo.src}
                label={photo.label}
                index={i}
                styleId={styleId}
                theme={theme}
              />
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition
              presentation={pickTransition(i + 1, totalTransitions)}
              timing={linearTiming({
                durationInFrames: plan.transF,
                easing: Easing.inOut(Easing.ease),
              })}
            />
          </React.Fragment>
        ))}

        <TransitionSeries.Sequence durationInFrames={plan.outroF}>
          <Outro
            villaName={villaName}
            location={location}
            tagline={tagline}
            backgroundSrc={photos[photos.length - 1]?.src}
            theme={theme}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {theme.letterbox ? <Letterbox /> : null}

      {music !== 'none' ? (
        <Audio
          src={`${serverBase}/assets/music/${music}.mp3`}
          pauseWhenBuffering
          volume={(f) =>
            interpolate(
              f,
              [0, fadeInF, fadeOutStartF, durationInFrames - 5],
              [0, musicVolume, musicVolume, 0],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
            )
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
