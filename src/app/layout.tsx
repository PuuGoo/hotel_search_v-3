import dynamic from "next/dynamic";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalError from "./components/GlobalError";
import ShortcutsProvider from "./components/ShortcutsProvider";
import { Providers } from "./components/theme/Providers";
import AuthContext from "./context/AuthContext";
import ToasterContext from "./context/ToasterContext";
import "./globals.css";

const ShortcutsDialog = dynamic(() => import("./components/ShortcutsDialog"), { ssr: false });
const ActiveStatus = dynamic(() => import("./components/ActiveStatus"), { ssr: false });

export const metadata = {
  title: "Hotel Search",
  description: "Tìm kiếm, đối chiếu và quản lý khách sạn với tìm kiếm hàng loạt và tìm URL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets `class` and a `color-scheme` style on <html> before
    // hydration to avoid a theme flash, which makes the server markup and the
    // client's first render differ on this element. suppressHydrationWarning
    // silences that expected diff for <html> only (not its descendants).
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        {/* ── App-wide background video (fixed, behind everything) ── */}
        <video
          className="fixed inset-0 -z-10 h-full w-full object-cover"
          src="/images/panda-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          poster="/images/panda.gif"
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 -z-10 bg-gradient-to-br from-black/55 via-black/35 to-black/55"
          aria-hidden="true"
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-2 focus:bg-white focus:text-blue-600 focus:rounded-lg focus:shadow-lg"
        >
          Chuyển đến nội dung chính
        </a>
        <AuthContext>
          <Providers>
            <ShortcutsProvider>
              <ErrorBoundary>
                <>
                  <ActiveStatus />
                  <ToasterContext />
                  <GlobalError />
                  <div id="main-content" className="h-full">{children}</div>
                  <ShortcutsDialog />
                </>
              </ErrorBoundary>
            </ShortcutsProvider>
          </Providers>
        </AuthContext>
      </body>
    </html>
  );
}
