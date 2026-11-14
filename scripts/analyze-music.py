"""Analyse rythmique des pistes : écrit assets/music/<piste>.json avec les temps (beats).

Usage : python3 scripts/analyze-music.py   (nécessite numpy + ffmpeg)
Les fichiers JSON produits sont versionnés : l'analyse n'est à refaire que si
vous remplacez une musique.
"""
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC = os.path.join(ROOT, "assets", "music")
SR = 22050
HOP = 512
FPS = SR / HOP


def load(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def onset_envelope(y):
    n_fft = 2048
    win = np.hanning(n_fft)
    frames = 1 + (len(y) - n_fft) // HOP
    idx = np.arange(n_fft)[None, :] + HOP * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    spec = np.log1p(100 * spec)
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    # retire la tendance lente, normalise
    k = int(FPS)
    trend = np.convolve(flux, np.ones(k) / k, mode="same")
    env = np.maximum(0, flux - trend)
    return env / (env.std() + 1e-9)


def estimate_tempo(env):
    ac = np.correlate(env, env, mode="full")[len(env) - 1:]
    lags = np.arange(len(ac))
    bpm = 60 * FPS / np.maximum(lags, 1)
    mask = (bpm >= 60) & (bpm <= 140)
    # préférence douce autour de 95 BPM (tempo typique d'une musique d'ambiance)
    weight = np.exp(-0.5 * (np.log2(bpm / 95) / 0.9) ** 2)
    score = np.where(mask, ac * weight, -np.inf)
    best = int(np.argmax(score))
    return 60 * FPS / best


def track_beats(env, bpm, tightness=100):
    """Suivi de temps par programmation dynamique (Ellis 2007)."""
    period = 60 * FPS / bpm
    n = len(env)
    score = env.copy()
    back = -np.ones(n, dtype=int)
    lo, hi = int(round(period / 2)), int(round(period * 2))
    for t in range(hi, n):
        prev = np.arange(t - hi, t - lo)
        pen = -tightness * (np.log((t - prev) / period)) ** 2
        cand = score[prev] + pen
        j = int(np.argmax(cand))
        score[t] = env[t] + cand[j]
        back[t] = prev[j]
    # meilleur point de départ dans la dernière période
    t = int(np.argmax(score[n - hi:])) + n - hi
    beats = []
    while t >= 0:
        beats.append(t)
        t = back[t]
    beats = np.array(beats[::-1]) / FPS
    return beats


def main():
    names = sys.argv[1:] or ["luxury", "cinematic", "modern"]
    for name in names:
        path = os.path.join(MUSIC, f"{name}.mp3")
        y = load(path)
        env = onset_envelope(y)
        bpm = estimate_tempo(env)
        beats = track_beats(env, bpm)
        # accents : temps dont l'attaque est la plus forte (repères pour les gros effets)
        strength = [float(env[min(len(env) - 1, int(b * FPS))]) for b in beats]
        out = {
            "bpm": round(float(bpm), 2),
            "duration": round(len(y) / SR, 3),
            "beats": [round(float(b), 3) for b in beats],
            "strength": [round(s, 3) for s in strength],
        }
        with open(os.path.join(MUSIC, f"{name}.json"), "w") as f:
            json.dump(out, f)
        print(f"{name}: {out['bpm']} BPM, {len(beats)} temps, premier à {beats[0]:.2f}s")


if __name__ == "__main__":
    main()
