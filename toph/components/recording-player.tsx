'use client';

import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/**
 * The waveform and "Play Recording" button — Figma I1:764;448:5888 / 448:5987.
 *
 * The Figma draws 96 hairlines of varying height across 592px. Real amplitude
 * data would mean decoding the audio, which needs the file in hand before the
 * first paint. Instead the bars are derived deterministically from the log's
 * id: the same log always draws the same waveform, so it is stable across
 * re-renders and identical on server and client (a random one would trip a
 * hydration mismatch). It is an honest placeholder — a real implementation
 * would store peak data alongside the audio at ingest time.
 */

const BAR_COUNT = 96;
const WIDTH = 592;
const HEIGHT = 81;

/** xmur3 + mulberry32: a tiny seeded PRNG, so the shape is a pure function of the id. */
function seededHeights(seed: string): number[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: BAR_COUNT }, (_, i) => {
    // A gentle envelope so the clip swells and tapers like speech rather than
    // looking like uniform noise.
    const envelope = Math.sin((i / (BAR_COUNT - 1)) * Math.PI) ** 0.6;
    const jitter = 0.35 + rand() * 0.65;
    return Math.max(4, HEIGHT * envelope * jitter);
  });
}

export function RecordingPlayer({
  logId,
  audioUrl,
  durationSeconds,
}: {
  logId: string;
  audioUrl: string | null;
  durationSeconds: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const heights = seededHeights(logId);
  const playedBars = Math.round(progress * BAR_COUNT);
  const gap = WIDTH / BAR_COUNT;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
  }

  /** Click anywhere on the waveform to seek. */
  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    audio.currentTime = Math.min(Math.max(ratio, 0), 1) * audio.duration;
  }

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div
        className={audioUrl ? 'cursor-pointer' : undefined}
        onClick={audioUrl ? seek : undefined}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[81px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={
            durationSeconds
              ? `Audio waveform, ${durationSeconds} seconds`
              : 'Audio waveform'
          }
        >
          {heights.map((h, i) => (
            <rect
              key={i}
              x={i * gap}
              y={(HEIGHT - h) / 2}
              width={1.6}
              height={h}
              rx={0.8}
              className={i < playedBars ? 'fill-wave-played' : 'fill-wave-remaining'}
            />
          ))}
          {progress > 0 && progress < 1 ? (
            <rect x={progress * WIDTH} y={0} width={1} height={HEIGHT} className="fill-ink" />
          ) : null}
        </svg>
      </div>

      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress(el.currentTime / el.duration);
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={toggle}
        disabled={!audioUrl}
        title={audioUrl ? undefined : 'No recording file attached to this log yet'}
        className="flex w-full items-center justify-center gap-shell rounded-button border border-ink bg-surface px-[8.8px] py-[10.56px] text-[16px] text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {playing ? (
          <Pause className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        ) : (
          <Play className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        )}
        {playing ? 'Pause Recording' : 'Play Recording'}
      </button>
    </div>
  );
}
