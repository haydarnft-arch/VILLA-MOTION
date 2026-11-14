import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

// Uniformes d'un plan : tout le mouvement de caméra est piloté par ces valeurs.
export type CameraState = {
  zoom: number; // >= 1
  panX: number; // décalage du cadre (fraction de l'image)
  panY: number;
  parX: number; // translation caméra (parallaxe selon la profondeur)
  parY: number;
  dolly: number; // avance caméra : le premier plan grossit plus vite que le fond
  focus: number; // profondeur qui reste immobile (0 = loin, 1 = proche)
  blurX: number; // flou de mouvement directionnel (fraction de l'écran)
  blurY: number;
  radial: number; // flou de zoom (transitions « punch »)
  offsetX: number; // décalage écran (transitions « whip »)
  offsetY: number;
  exposure: number; // 1 = neutre
};

export const NEUTRAL_CAMERA: CameraState = {
  zoom: 1.1,
  panX: 0,
  panY: 0,
  parX: 0,
  parY: 0,
  dolly: 0,
  focus: 0.5,
  blurX: 0,
  blurY: 0,
  radial: 0,
  offsetX: 0,
  offsetY: 0,
  exposure: 1,
};

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uCover;
uniform float uZoom;
uniform vec2 uPan;
uniform vec2 uPar;
uniform float uDolly;
uniform float uFocus;
uniform vec2 uBlur;
uniform float uRadial;
uniform vec2 uOffset;
uniform float uExposure;
uniform float uSeed;
uniform float uGrain;
uniform float uVignette;
uniform vec2 uRes;

vec2 sampleUv(vec2 p) {
  vec2 q = (p - 0.5) * uCover / uZoom;
  vec2 uv0 = 0.5 + q + uPan;
  vec2 uv = uv0;
  // Parallaxe itérative : on cherche le point de l'image qui se projette ici.
  for (int i = 0; i < 5; i++) {
    float d = texture2D(uDepth, clamp(uv, 0.001, 0.999)).r;
    uv = uv0 - (uPar + uDolly * q) * (d - uFocus);
  }
  return clamp(uv, 0.001, 0.999);
}

vec3 shade(vec2 p) {
  return texture2D(uImg, sampleUv(p)).rgb;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed * 43.17) * 43758.5453);
}

void main() {
  vec2 p = vUv + uOffset;
  vec3 col = vec3(0.0);
  float blurLen = length(uBlur) + uRadial;
  if (blurLen > 0.0005) {
    const int N = 28;
    // Tramage par pixel : le flou devient un filé continu au lieu de copies en escalier.
    float jitter = hash(vUv * uRes + 7.31) - 0.5;
    for (int i = 0; i < N; i++) {
      float t = (float(i) + 0.5 + jitter) / float(N) - 0.5;
      vec2 pp = p + uBlur * t + (p - 0.5) * uRadial * t;
      col += shade(pp);
    }
    col /= float(N);
  } else {
    col = shade(p);
  }
  col *= uExposure;
  // Étalonnage doux : léger contraste en S, sans dénaturer les couleurs réelles.
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  // Vignettage
  vec2 v = vUv - 0.5;
  col *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(v * vec2(1.0, 0.85)) * 1.25);
  // Grain argentique
  col += (hash(vUv * uRes) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------- chargement des images (cache partagé) ----------
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (src: string) => {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image introuvable : ${src}`));
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
};

type GLState = {
  gl: WebGLRenderingContext;
  prog: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
  imgW: number;
  imgH: number;
};

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || 'shader error');
  }
  return s;
};

const makeTexture = (gl: WebGLRenderingContext, unit: number, img: HTMLImageElement) => {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
};

export const DepthCanvas: React.FC<{
  src: string;
  depthSrc?: string;
  width: number;
  height: number;
  camera: CameraState;
  seed: number;
  grain?: number;
  vignette?: number;
  style?: React.CSSProperties;
}> = ({src, depthSrc, width, height, camera, seed, grain = 0.035, vignette = 0.35, style}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GLState | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender(`Photo ${src}`, {timeoutInMilliseconds: 60000}));

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current!;
    Promise.all([loadImage(src), depthSrc ? loadImage(depthSrc) : Promise.resolve(null)])
      .then(([img, depth]) => {
        if (cancelled) return;
        const gl = canvas.getContext('webgl', {preserveDrawingBuffer: true, antialias: false});
        if (!gl) throw new Error('WebGL indisponible');
        const prog = gl.createProgram()!;
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        makeTexture(gl, 0, img);
        if (depth) {
          makeTexture(gl, 1, depth);
        } else {
          // Sans carte de profondeur : profondeur uniforme (mouvement 2D classique).
          const tex = gl.createTexture();
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128]));
        }
        const names = ['uImg', 'uDepth', 'uCover', 'uZoom', 'uPan', 'uPar', 'uDolly', 'uFocus', 'uBlur', 'uRadial', 'uOffset', 'uExposure', 'uSeed', 'uGrain', 'uVignette', 'uRes'];
        const loc: GLState['loc'] = {};
        for (const n of names) loc[n] = gl.getUniformLocation(prog, n);
        gl.uniform1i(loc.uImg, 0);
        gl.uniform1i(loc.uDepth, 1);
        stateRef.current = {gl, prog, loc, imgW: img.naturalWidth, imgH: img.naturalHeight};
        setReady(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
      const s = stateRef.current;
      if (s) s.gl.getExtension('WEBGL_lose_context')?.loseContext();
      stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, depthSrc]);

  useLayoutEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const {gl, loc, imgW, imgH} = s;
    gl.viewport(0, 0, width, height);
    const canvasAspect = width / height;
    const imgAspect = imgW / imgH;
    const cover = canvasAspect > imgAspect ? [1, imgAspect / canvasAspect] : [canvasAspect / imgAspect, 1];
    gl.uniform2f(loc.uCover, cover[0], cover[1]);
    gl.uniform1f(loc.uZoom, camera.zoom);
    gl.uniform2f(loc.uPan, camera.panX, camera.panY);
    gl.uniform2f(loc.uPar, camera.parX, camera.parY);
    gl.uniform1f(loc.uDolly, camera.dolly);
    gl.uniform1f(loc.uFocus, camera.focus);
    gl.uniform2f(loc.uBlur, camera.blurX, camera.blurY);
    gl.uniform1f(loc.uRadial, camera.radial);
    gl.uniform2f(loc.uOffset, camera.offsetX, camera.offsetY);
    gl.uniform1f(loc.uExposure, camera.exposure);
    gl.uniform1f(loc.uSeed, seed % 97);
    gl.uniform1f(loc.uGrain, grain);
    gl.uniform1f(loc.uVignette, vignette);
    gl.uniform2f(loc.uRes, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  return <canvas ref={canvasRef} width={width} height={height} style={{width, height, display: 'block', ...style}} />;
};
