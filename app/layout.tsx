import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * The three Clubhouse families (DESIGN.md §4).
 *
 * Inter (UI) and JetBrains Mono (data) load as variable fonts. Playfair Display
 * (display) is used only for h1/h2, so it is subset to the two weights actually
 * rendered rather than shipping its full weight axis. All three use
 * `display: swap`; only Inter is preloaded — it paints the most text and the
 * app's defining moment is a phone on course wifi.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Fairway",
  description:
    "Plan, track, and improve your competitive golf. Am I getting there?",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        inter.variable,
        jetbrainsMono.variable,
        playfairDisplay.variable,
      )}
    >
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
