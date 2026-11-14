import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import type {VillaProps, StyleId} from './types';
import {COLORS, THEMES, Theme} from './theme';
import {loadFonts} from './fonts';
import {buildPlan, Clip} from './planner';
import {DepthCanvas} from './gl/DepthCanvas';
import {applyFx, cameraAt, combineFx, enterFx, exitFx} from './components/camera';
import {ChapterTitle, IntroTitle, LightLeak, OutroCard} from './components/Typography';

const OUTRO_DISSOLVE = 20;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const ClipView: React.FC<{
  clip: Clip;
  clipIndex: number;
  dissolveIn: number;
  beatFrames: number;
  theme: Theme;
  styleId: StyleId;
  props: VillaProps;
}> = ({clip, clipIndex, dissolveIn, beatFrames, theme, styleId, props}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const dur = clip.end - clip.start;
  const fx = combineFx(enterFx(clip.inT, frame, dissolveIn), frame < dur ? exitFx(clip.outT, dur - frame) : exitFx('cut', 0));
  const t = frame / dur;
  const photo = (i: number) => props.photos[clip.photos[i]];
  const seed = clip.start + frame;

  if (clip.kind === 'intro') {
    const cam = cameraAt(clip.moves[0], t);
    const exposure = interpolate(frame, [0, 22, dur - 12, dur], [0, 0.58, 0.58, 1], clamp);
    return (
      <AbsoluteFill style={{opacity: fx.opacity}}>
        <DepthCanvas
          src={photo(0).src}
          depthSrc={photo(0).depth}
          width={width}
          height={height}
          seed={seed}
          grain={theme.grain}
          vignette={theme.vignette + 0.15}
          camera={applyFx({...cam, exposure}, fx)}
        />
        <AbsoluteFill
          style={{
            transform: `translateX(${-fx.offsetX * width}px) scale(${fx.zoomMul})`,
            filter: Math.abs(fx.blurX) + fx.radial > 0.002 ? `blur(${Math.min(30, Math.abs(fx.blurX) * 90 + fx.radial * 50)}px)` : undefined,
          }}
        >
          <IntroTitle frame={frame} duration={dur} villaName={props.villaName} location={props.location} theme={theme} styleId={styleId} />
        </AbsoluteFill>
        <LightLeak intensity={Math.max(fx.leak, interpolate(frame, [6, 26, 50], [0, 0.35, 0], clamp))} seed={clipIndex} />
      </AbsoluteFill>
    );
  }

  if (clip.kind === 'outro') {
    const cam = cameraAt(clip.moves[0], t);
    const blur = interpolate(frame, [0, fps * 1.2], [0, 12], clamp);
    return (
      <AbsoluteFill style={{opacity: fx.opacity, backgroundColor: COLORS.black}}>
        <AbsoluteFill style={{filter: `blur(${blur}px)`, transform: 'scale(1.04)'}}>
          <DepthCanvas
            src={photo(0).src}
            depthSrc={photo(0).depth}
            width={width}
            height={height}
            seed={seed}
            grain={theme.grain}
            vignette={theme.vignette + 0.2}
            camera={{...cam, exposure: interpolate(frame, [0, fps * 1.2, dur - fps, dur - 4], [1, 0.36, 0.3, 0], clamp)}}
          />
        </AbsoluteFill>
        <OutroCard frame={frame} duration={dur} villaName={props.villaName} location={props.location} tagline={props.tagline} theme={theme} />
      </AbsoluteFill>
    );
  }

  if (clip.kind === 'split') {
    const n = clip.photos.length;
    const gap = 10;
    const pw = Math.floor((width - gap * (n - 1)) / n);
    const blurPx = Math.min(36, Math.abs(fx.blurX) * 110 + fx.radial * 60);
    return (
      <AbsoluteFill style={{opacity: fx.opacity, backgroundColor: COLORS.black, overflow: 'hidden'}}>
        <AbsoluteFill
          style={{
            transform: `translateX(${-fx.offsetX * width}px) scale(${fx.zoomMul})`,
            filter: `brightness(${fx.exposure})${blurPx > 0.3 ? ` blur(${blurPx}px)` : ''}`,
          }}
        >
          {clip.photos.map((_, k) => {
            const delay = Math.round(k * beatFrames * 0.5);
            const p = interpolate(frame, [delay, delay + 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: k * (pw + gap),
                  top: 0,
                  width: pw,
                  height,
                  overflow: 'hidden',
                  clipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
                }}
              >
                <div style={{transform: `translateY(${(1 - p) * 80}px)`}}>
                  <DepthCanvas
                    src={photo(k).src}
                    depthSrc={photo(k).depth}
                    width={pw}
                    height={height}
                    seed={seed + k * 13}
                    grain={theme.grain}
                    vignette={0.18}
                    camera={cameraAt(clip.moves[k], Math.max(0, frame - delay) / dur)}
                  />
                </div>
              </div>
            );
          })}
        </AbsoluteFill>
        <LightLeak intensity={fx.leak} seed={clipIndex} />
      </AbsoluteFill>
    );
  }

  // Plan simple
  const cam = applyFx(cameraAt(clip.moves[0], t), fx);
  return (
    <AbsoluteFill style={{opacity: fx.opacity}}>
      <DepthCanvas
        src={photo(0).src}
        depthSrc={photo(0).depth}
        width={width}
        height={height}
        seed={seed}
        grain={theme.grain}
        vignette={theme.vignette}
        camera={cam}
      />
      {clip.chapter ? (
        <>
          <AbsoluteFill
            style={{
              background:
                styleId === 'cinematic'
                  ? 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(5,5,6,0.7) 100%)'
                  : 'radial-gradient(ellipse 75% 70% at 10% 100%, rgba(5,5,6,0.78) 0%, rgba(5,5,6,0.45) 45%, rgba(5,5,6,0) 75%)',
              opacity: interpolate(frame, [0, 10, Math.min(dur, fps * 2.4) - 6, Math.min(dur, fps * 2.4)], [0, 1, 1, 0], clamp),
            }}
          />
          <ChapterTitle
            frame={frame}
            clipDuration={dur}
            index={clip.chapter.index}
            total={clip.chapter.total}
            title={clip.chapter.title}
            theme={theme}
            styleId={styleId}
            letterbox={theme.letterbox}
          />
        </>
      ) : null}
      <LightLeak intensity={fx.leak} seed={clipIndex} />
    </AbsoluteFill>
  );
};

const Letterbox: React.FC<{size: number}> = ({size}) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [0, 30], [0, size], {...clamp, easing: Easing.out(Easing.cubic)});
  const bar: React.CSSProperties = {position: 'absolute', left: 0, right: 0, height: h, background: '#000'};
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{...bar, top: 0}} />
      <div style={{...bar, bottom: 0}} />
    </AbsoluteFill>
  );
};

export const VillaVideo: React.FC<VillaProps> = (props) => {
  const {styleId, music, photos, serverBase, beats} = props;
  const theme = THEMES[styleId];
  const {fps, durationInFrames} = useVideoConfig();

  loadFonts(serverBase);

  const plan = useMemo(
    () => buildPlan(photos, styleId, fps, durationInFrames, music === 'none' ? undefined : beats),
    [photos, styleId, fps, durationInFrames, beats, music]
  );

  if (!photos.length) {
    return <AbsoluteFill style={{backgroundColor: COLORS.black}} />;
  }

  const fadeInF = Math.round(fps * 0.6);
  const fadeOutStartF = durationInFrames - Math.round(fps * 2.6);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black}}>
      {plan.clips.map((clip, i) => {
        const next = plan.clips[i + 1];
        const dissolveIn = clip.kind === 'outro' ? OUTRO_DISSOLVE : theme.dissolveFrames;
        const tail = clip.outT === 'dissolve' && next ? (next.kind === 'outro' ? OUTRO_DISSOLVE : theme.dissolveFrames) : 0;
        return (
          <Sequence key={i} from={clip.start} durationInFrames={Math.max(1, clip.end - clip.start + tail)}>
            <ClipView
              clip={clip}
              clipIndex={i}
              dissolveIn={dissolveIn}
              beatFrames={plan.beatFrames}
              theme={theme}
              styleId={styleId}
              props={props}
            />
          </Sequence>
        );
      })}

      {theme.letterbox ? <Letterbox size={theme.letterbox} /> : null}

      {music !== 'none' ? (
        <Audio
          src={`${serverBase}/assets/music/${music}.mp3`}
          pauseWhenBuffering
          volume={(f) =>
            interpolate(f, [0, fadeInF, fadeOutStartF, durationInFrames - 5], [0, 1, 1, 0], clamp)
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
