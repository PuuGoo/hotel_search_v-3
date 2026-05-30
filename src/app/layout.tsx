import ActiveStatus from "./components/ActiveStatus";
import { Providers } from "./components/theme/Providers";
import AuthContext from "./context/AuthContext";
import ToasterContext from "./context/ToasterContext";
import "./globals.css";

export const metadata = {
  title: "Hotel Search",
  description: "Search, match and manage hotels with bulk search and URL finding.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets `class` and a `color-scheme` style on <html> before
    // hydration to avoid a theme flash, which makes the server markup and the
    // client's first render differ on this element. suppressHydrationWarning
    // silences that expected diff for <html> only (not its descendants).
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <AuthContext>
          <Providers>
            <>
              <ActiveStatus />
              <ToasterContext />
              {children}
            </>
          </Providers>
        </AuthContext>
      </body>
    </html>
  );
}
