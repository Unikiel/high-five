import React from "react";
import { APP_NAME, APP_TAGLINE, LOGO_URL } from "@/lib/brand";

const SCORE_SCALE = [
  { score: 1, height: "20%" },
  { score: 2, height: "36%" },
  { score: 3, height: "54%" },
  { score: 4, height: "74%" },
  { score: 5, height: "100%" },
];

export function Wordmark({ className = "text-xl" }) {
  return (
    <span className={`font-display font-bold tracking-tight leading-none ${className}`}>
      <span className="text-white">High </span>
      <span className="hf-gradient-text">Five</span>
    </span>
  );
}

function ScoreRail() {
  return (
    <figure className="mt-10">
      <div className="flex items-end gap-2.5 h-24 max-w-[248px]" aria-hidden="true">
        {SCORE_SCALE.map(({ score, height }, i) => {
          const isTarget = score === 5;
          return (
            <div
              key={score}
              className={`hf-rail-bar flex-1 rounded-t-[3px] ${
                isTarget
                  ? "shadow-[0_0_30px_-4px_hsl(var(--hf-magenta)/0.85)]"
                  : "bg-white/10"
              }`}
              style={{
                height,
                animationDelay: `${380 + i * 85}ms`,
                ...(isTarget ? { backgroundImage: "var(--hf-ramp)" } : null),
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-2.5 mt-2.5 max-w-[248px]" aria-hidden="true">
        {SCORE_SCALE.map(({ score }) => (
          <span
            key={score}
            className={`flex-1 text-center text-[11px] font-display tabular-nums ${
              score === 5 ? "hf-gradient-text font-bold" : "text-white/35"
            }`}
          >
            {score}
          </span>
        ))}
      </div>
      <figcaption
        className="hf-enter mt-5 text-sm text-white/55"
        style={{ animationDelay: "760ms" }}
      >
        <span className="font-semibold text-white">1,000+ students</span> have finished at a 5.
      </figcaption>
    </figure>
  );
}

export default function AuthBrandPanel({ headline, highlight, body }) {
  return (
    <aside className="hf-panel relative hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col justify-between overflow-hidden p-12 xl:p-14">
      <div className="relative flex items-center gap-3 hf-enter" style={{ animationDelay: "60ms" }}>
        <img
          src={LOGO_URL}
          alt=""
          className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/15"
        />
        <div>
          <Wordmark className="text-xl" />
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-1">
            {APP_TAGLINE}
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <h2
          className="hf-enter font-display text-[2.75rem] xl:text-5xl font-bold leading-[1.08] tracking-tight text-white"
          style={{ animationDelay: "140ms" }}
        >
          {headline}
          <br />
          <span className="hf-gradient-text">{highlight}</span>
        </h2>
        <p
          className="hf-enter mt-5 text-[15px] leading-relaxed text-white/60"
          style={{ animationDelay: "220ms" }}
        >
          {body}
        </p>
        <ScoreRail />
      </div>

      <p className="relative text-xs text-white/30">
        &copy; {new Date().getFullYear()} {APP_NAME}
      </p>
    </aside>
  );
}
