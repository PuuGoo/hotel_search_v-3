"use client";

import clsx from "clsx";

export type PandaMood = "idle" | "happy" | "sad" | "loading";

interface PandaMascotProps {
  mood?: PandaMood;
  peek?: boolean;
  lookX?: number;
  typing?: boolean; // NEW: bounces gently while user types
}

// A CSS-only chibi panda (styles live in globals.css under ".panda *"). It
// reacts to the auth form: eyes track the email being typed, the paws cover
// the eyes while a password is entered, and the face cheers on success or
// droops on error. Purely decorative, so it is hidden from assistive tech.
const PandaMascot: React.FC<PandaMascotProps> = ({
  mood = "idle",
  peek = false,
  lookX = 0,
  typing = false,
}) => {
  const lookY = mood === "sad" ? 3 : 0;

  return (
    <div
      className={clsx(
        "panda-stage",
        mood === "idle"    && "panda-stage--idle",
        mood === "happy"   && "panda-stage--happy",
        mood === "sad"     && "panda-stage--sad",
        mood === "loading" && "panda-stage--loading",
        peek               && "panda-stage--peek",
        typing             && "panda-stage--typing",
      )}
      aria-hidden="true"
    >
      <div className={clsx(
        "panda-wrap",
        peek    && "panda-wrap--peek",
        typing  && "panda-wrap--typing",
        mood === "happy"   && "panda-wrap--happy",
        mood === "sad"     && "panda-wrap--sad",
        mood === "loading" && "panda-wrap--loading",
      )}>
        <div
          className={clsx(
            "panda",
            peek              && "panda--peek",
            mood === "happy"  && "panda--happy",
            mood === "sad"    && "panda--sad",
            mood === "loading"&& "panda--loading"
          )}
          style={
            {
              "--look-x": `${lookX}px`,
              "--look-y": `${lookY}px`,
            } as React.CSSProperties
          }
        >
          <span className="panda-shadow" />

          <span className="panda-suitcase">
            <span className="panda-suitcase-handle" />
            <span className="panda-suitcase-body" />
            <span className="panda-suitcase-wheel l" />
            <span className="panda-suitcase-wheel r" />
          </span>

          <span className="panda-arm left" />
          <span className="panda-leg left" />
          <span className="panda-leg right" />
          <span className="panda-foot left" />
          <span className="panda-foot right" />

          <span className="panda-body" />
          <span className="panda-belly" />

          <span className="panda-head">
            <span className="panda-ear left" />
            <span className="panda-ear right" />
            <span className="panda-tuft l" />
            <span className="panda-tuft c" />
            <span className="panda-tuft r" />
            <span className="panda-patch left" />
            <span className="panda-patch right" />
            <span className="panda-cheek left" />
            <span className="panda-cheek right" />
            <span className="panda-eye left" />
            <span className="panda-eye right" />
            <span className="panda-glasses">
              <span className="panda-glasses-lens left" />
              <span className="panda-glasses-bridge" />
              <span className="panda-glasses-lens right" />
              <span className="panda-glasses-arm left" />
              <span className="panda-glasses-arm right" />
            </span>
            <span className="panda-nose" />
            <span className="panda-mouth">
              <span className="panda-smile-big" />
              <span className="panda-frown" />
            </span>
          </span>

          <span className="panda-arm right" />

          {/* Peek paws — only shown when peek=true */}
          <span className="panda-peek-paw left" aria-hidden="true">🐾</span>
          <span className="panda-peek-paw right" aria-hidden="true">🐾</span>
        </div>

        {/* Floating sparkles that appear on happy mood */}
        {["✨", "⭐", "💫"].map((star, i) => (
          <div
            key={`star-${i}`}
            className="panda-sparkle"
            style={{ "--star-i": i } as React.CSSProperties}
            aria-hidden="true"
          >
            {star}
          </div>
        ))}

        {/* 3 baby pandas orbiting around the big panda */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="baby-panda-orbit"
            style={{ "--delay": `${i * -2.8}s` } as React.CSSProperties}
          >
            <div className="baby-panda">
              <span className="baby-panda-leg left" />
              <span className="baby-panda-leg right" />
              <span className="baby-panda-body" />
              <span className="baby-panda-arm left" />
              <span className="baby-panda-arm right" />
              <span className="baby-panda-head">
                <span className="baby-panda-ear left" />
                <span className="baby-panda-ear right" />
                <span className="baby-panda-patch left" />
                <span className="baby-panda-patch right" />
                <span className="baby-panda-eye left" />
                <span className="baby-panda-eye right" />
                <span className="baby-panda-cheek left" />
                <span className="baby-panda-cheek right" />
                <span className="baby-panda-nose" />
                <span className="baby-panda-mouth" />
              </span>
            </div>
          </div>
        ))}

        {/* Loading dots below panda when loading */}
        {mood === "loading" && (
          <div className="panda-loading-dots" aria-hidden="true">
            <span className="panda-loading-dot" />
            <span className="panda-loading-dot" />
            <span className="panda-loading-dot" />
          </div>
        )}

        {/* Mood particles: bamboo leaves on idle, stars on happy, rain drops on sad */}
        {mood === "idle" && (
          <div className="panda-mood-particles panda-mood-particles--idle" aria-hidden="true">
            {["🎋", "🍃", "🌿"].map((p, i) => (
              <span key={i} className="mood-particle" style={{ "--pi": i } as React.CSSProperties}>{p}</span>
            ))}
          </div>
        )}
        {mood === "happy" && (
          <div className="panda-mood-particles panda-mood-particles--happy" aria-hidden="true">
            {["🌸","🎊","💚","🎉","✨"].map((p, i) => (
              <span key={i} className="mood-particle" style={{ "--pi": i } as React.CSSProperties}>{p}</span>
            ))}
          </div>
        )}
        {mood === "sad" && (
          <div className="panda-mood-particles panda-mood-particles--sad" aria-hidden="true">
            {["💧","😢","💧"].map((p, i) => (
              <span key={i} className="mood-particle" style={{ "--pi": i } as React.CSSProperties}>{p}</span>
            ))}
          </div>
        )}
        {mood === "loading" && (
          <div className="panda-mood-particles panda-mood-particles--loading" aria-hidden="true">
            {["⚡","🔄","⚡"].map((p, i) => (
              <span key={i} className="mood-particle" style={{ "--pi": i } as React.CSSProperties}>{p}</span>
            ))}
          </div>
        )}

        {/* Tooltip bubble: mood message */}
        <div
          className="panda-tooltip"
          style={{
            position: "absolute",
            top: -2,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(45,90,39,0.85)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 99,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: mood === "happy" ? 1 : mood === "sad" ? 1 : 0,
            transition: "opacity 0.3s ease",
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            zIndex: 20,
          }}
          aria-hidden="true"
        >
          {mood === "happy" ? "🐼 Xin chào!" : mood === "sad" ? "😢 Thử lại nhé!" : ""}
        </div>

        {/* Peek bubble — shown when peek=true */}
        <div
          className="panda-peek-bubble"
          aria-hidden="true"
        >
          {peek ? "🙈 Không nhìn nha!" : ""}
        </div>

        {/* Typing indicator dots — shown while typing */}
        <div className="panda-typing-indicator" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export default PandaMascot;
