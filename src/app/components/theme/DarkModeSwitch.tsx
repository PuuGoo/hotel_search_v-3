"use client";

import { CSSProperties, HTMLAttributes } from "react";

type SVGProps = Omit<HTMLAttributes<HTMLOrSVGElement>, "onChange">;
export interface Props extends SVGProps {
  onChange: () => void;
  checked: boolean;
  style?: CSSProperties;
  size?: number | string;
  moonColor?: string;
  sunColor?: string;
}

export const DarkModeSwitch: React.FC<Props> = ({
  onChange,
  checked = false,
  size = 24,
  moonColor = "rgb(229 231 235)",
  sunColor = "#242526",
  style,
  ...rest
}) => {
  const isDark = checked;

  return (
    <div
      onClick={onChange}
      className="
        h-10
        rounded-full 
        p-2 
        bg-gray-100 
        text-gray-600 
        cursor-pointer 
        hover:opacity-75 
        transition
        dark:bg-lightgray
        dark:text-gray-200
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        color={isDark ? moonColor : sunColor}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
        style={{
          transition: "transform 0.4s ease-in-out",
          transform: isDark ? "rotate(40deg)" : "rotate(90deg)",
          ...style,
        }}
        {...rest}
      >
        <mask id="circle-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle
            cx={isDark ? "50%" : "100%"}
            cy={isDark ? "23%" : "0%"}
            r={isDark ? 9 : 5}
            fill="black"
            style={{ transition: "cx 0.4s ease-in-out, cy 0.4s ease-in-out, r 0.4s ease-in-out" }}
          />
        </mask>

        <circle
          cx="12"
          cy="12"
          fill={isDark ? moonColor : sunColor}
          r={isDark ? 9 : 5}
          mask="url(#circle-mask)"
          style={{ transition: "r 0.4s ease-in-out, fill 0.4s ease-in-out" }}
        />
        <g stroke="currentColor" style={{ transition: "opacity 0.4s ease-in-out", opacity: isDark ? 0 : 1 }}>
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
      </svg>
    </div>
  );
};
