"use client";

import clsx from "clsx";

export type PandaMood = "idle" | "happy" | "sad";

interface PandaMascotProps {
  mood?: PandaMood;
  peek?: boolean;
  lookX?: number;
}

// A CSS-only chibi panda (styles live in globals.css under ".panda *"). It
// reacts to the auth form: eyes track the email being typed, the paws cover
// the eyes while a password is entered, and the face cheers on success or
// droops on error. Purely decorative, so it is hidden from assistive tech.
const PandaMascot: React.FC<PandaMascotProps> = ({
  mood = "idle",
  peek = false,
  lookX = 0,
}) => {
  const lookY = mood === "sad" ? 3 : 0;

  return (
    <div className="panda-stage" aria-hidden="true">
      <div className="panda-wrap">
        <div
          className={clsx(
            "panda",
            peek && "panda--peek",
            mood === "happy" && "panda--happy",
            mood === "sad" && "panda--sad"
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
        </div>

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
      </div>
    </div>
  );
};

export default PandaMascot;
