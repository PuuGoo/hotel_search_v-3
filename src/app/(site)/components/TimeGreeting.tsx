"use client";

import { useEffect, useState } from "react";

/**
 * TimeGreeting — lời chào theo giờ trong ngày.
 * SSR render fallback trung tính để tránh hydration mismatch,
 * sau khi mount đổi sang lời chào đúng buổi (fade qua CSS).
 */
const TimeGreeting: React.FC = () => {
  const [greeting, setGreeting] = useState<{ text: string; icon: string } | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) setGreeting({ text: "Chào buổi sáng", icon: "🌅" });
    else if (h >= 11 && h < 14) setGreeting({ text: "Chào buổi trưa", icon: "☀️" });
    else if (h >= 14 && h < 18) setGreeting({ text: "Chào buổi chiều", icon: "🌤️" });
    else if (h >= 18 && h < 23) setGreeting({ text: "Chào buổi tối", icon: "🌙" });
    else setGreeting({ text: "Khuya rồi đó", icon: "🌙" });
  }, []);

  if (!greeting) {
    return <>Đăng nhập vào tài khoản để tiếp tục</>;
  }
  return (
    <span className="auth-time-greeting" key={greeting.text}>
      <span aria-hidden="true">{greeting.icon}</span> {greeting.text} — đăng nhập
      để tiếp tục nhé!
    </span>
  );
};

export default TimeGreeting;
