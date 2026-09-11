"use client";

import { useEffect, useId, useRef } from "react";

export type AvatarMode = "idle" | "listening" | "thinking" | "speaking";

/* Raw SDK levels are small in normal speech. Raise if her mouth or your ring looks lazy on a real device. */
const GAIN = 2.5;

const SKIN = "#f6c39f";
const SKIN_SHADE = "#e3a27c";
const HAIR = "#4a2c1d";
const INK = "#2b2118";
const LIP = "#7a2a22";

/** Mean level (0 to 1) of a slice of the spectrum, given as fractions of its length. */
function band(data: Uint8Array, from: number, to: number) {
  const a = Math.floor(data.length * from);
  const b = Math.max(a + 1, Math.floor(data.length * to));
  let sum = 0;
  for (let i = a; i < b; i++) sum += data[i] ?? 0;
  return sum / (b - a) / 255;
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Giulia, drawn in code. Her mouth is shaped by the spectrum of her voice (low energy opens the
 * jaw, high energy widens it, so an "o" and an "i" look different), she nods along while you
 * speak, glances away while she thinks, and blinks at uneven intervals. Per-frame values are
 * written straight to the DOM, so nothing re-renders at 60fps.
 */
export function Avatar({
  mode = "idle",
  inputVolume,
  outputVolume,
  outputFrequencies,
  className = "",
}: {
  mode?: AvatarMode;
  inputVolume?: () => number;
  outputVolume?: () => number;
  outputFrequencies?: () => Uint8Array;
  className?: string;
}) {
  const clip = useId();
  const head = useRef<SVGGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const mouth = useRef<SVGEllipseElement>(null);
  const teeth = useRef<SVGEllipseElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  // Blink at uneven intervals, like a person does.
  useEffect(() => {
    const g = eyes.current;
    if (!g || reducedMotion()) return;
    let timer: ReturnType<typeof setTimeout>;
    const blink = () => {
      g.style.transform = "scaleY(0.1)";
      timer = setTimeout(() => {
        g.style.transform = "";
        timer = setTimeout(blink, 2200 + Math.random() * 3800);
      }, 110);
    };
    timer = setTimeout(blink, 1200 + Math.random() * 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mode !== "speaking" && mode !== "listening") return;
    const still = reducedMotion();
    const m = mouth.current;
    const t = teeth.current;
    const r = ring.current;
    const h = head.current;
    // Fast attack, slower release: mouths snap open and settle closed.
    const ease = (from: number, to: number) => from + (to - from) * (to > from ? 0.5 : 0.22);
    let open = 0;
    let wide = 0.5;
    let nod = 0;
    let frame = 0;

    const tick = () => {
      if (mode === "speaking") {
        const f = outputFrequencies?.();
        let o: number;
        let w = 0.5;
        if (f?.length) {
          const lo = band(f, 0, 0.12);
          const mid = band(f, 0.12, 0.35);
          const hi = band(f, 0.35, 0.7);
          o = Math.min(1, (lo * 0.6 + mid * 0.4) * GAIN);
          w = Math.min(1, Math.max(0, 0.5 + (hi - lo * 0.6) * 2));
        } else {
          o = Math.min(1, (outputVolume?.() ?? 0) * GAIN);
        }
        open = ease(open, o);
        wide = ease(wide, w);
        const ry = 1.8 + open * 10;
        m?.setAttribute("ry", ry.toFixed(2));
        m?.setAttribute("rx", (7 + wide * 6).toFixed(2));
        t?.setAttribute("cy", (136 - ry * 0.62).toFixed(2));
        t?.setAttribute("rx", (4 + wide * 4).toFixed(2));
        t?.setAttribute("opacity", Math.max(0, open - 0.3).toFixed(2));
      } else {
        nod = ease(nod, Math.min(1, (inputVolume?.() ?? 0) * GAIN));
        if (r) {
          r.style.transform = `scale(${(1 + nod * 0.12).toFixed(3)})`;
          r.style.opacity = (0.3 + nod * 0.7).toFixed(2);
        }
        if (h && !still) h.style.transform = `translateY(${(nod * 3).toFixed(2)}px) rotate(${(-nod * 2).toFixed(2)}deg)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (r) r.style.cssText = "";
      if (h) h.style.transform = "";
    };
  }, [mode, inputVolume, outputVolume, outputFrequencies]);

  return (
    <div className={`avatar relative aspect-square ${className}`} data-mode={mode}>
      <div ref={ring} aria-hidden className="absolute -inset-3 rounded-full border-[5px] border-basil opacity-0" />
      <svg viewBox="0 0 200 200" role="img" aria-label="Giulia" className="breathe relative size-full">
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="100" />
        </clipPath>
        <g clipPath={`url(#${clip})`}>
          <circle cx="100" cy="100" r="100" fill="#fbe3b8" />
          <g ref={head} className="head">
            <circle cx="100" cy="40" r="22" fill={HAIR} />
            <ellipse cx="100" cy="100" rx="62" ry="64" fill={HAIR} />
            <rect x="88" y="138" width="24" height="26" rx="6" fill={SKIN_SHADE} />
            <path d="M34 210 C38 170 66 156 100 156 C134 156 162 170 166 210Z" fill="#c9533f" />
            <path d="M84 157 L100 176 L116 157Z" fill={SKIN_SHADE} />
            <circle cx="51" cy="106" r="8" fill={SKIN} />
            <circle cx="149" cy="106" r="8" fill={SKIN} />
            <circle cx="51" cy="118" r="3.5" fill="#e8b23a" />
            <circle cx="149" cy="118" r="3.5" fill="#e8b23a" />
            <ellipse cx="100" cy="100" rx="49" ry="53" fill={SKIN} />
            <path d="M51 96 C49 60 74 42 101 42 C130 42 153 62 149 96 C140 80 122 68 100 68 C82 68 62 78 51 96Z" fill={HAIR} />
            <g className="brows" stroke={HAIR} strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M70 83 Q80 78 90 83" />
              <path d="M110 83 Q120 78 130 83" />
            </g>
            <g ref={eyes} className="eyes" fill={INK}>
              <g className="gaze">
                <ellipse cx="80" cy="102" rx="5.5" ry="6.5" />
                <ellipse cx="120" cy="102" rx="5.5" ry="6.5" />
              </g>
            </g>
            {/* Round glasses: she runs a bookshop. */}
            <g stroke={INK} strokeWidth="3" fill="none">
              <circle cx="80" cy="102" r="15" />
              <circle cx="120" cy="102" r="15" />
              <path d="M95 101 Q100 97 105 101" />
            </g>
            <circle cx="64" cy="127" r="8" fill="#f28b7d" opacity="0.4" />
            <circle cx="136" cy="127" r="8" fill="#f28b7d" opacity="0.4" />
            <path d="M100 109 Q97 118 102 119" stroke={SKIN_SHADE} strokeWidth="3" strokeLinecap="round" fill="none" />
            {mode === "speaking" ? (
              <>
                <ellipse ref={mouth} cx="100" cy="136" rx="10" ry="1.8" fill={LIP} />
                <ellipse ref={teeth} cx="100" cy="135" rx="6" ry="1.8" fill="#fbf3e8" opacity="0" />
              </>
            ) : mode === "thinking" ? (
              <path d="M92 136 Q100 138 108 134" stroke={LIP} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M89 133 Q100 143 111 133" stroke={LIP} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}
