import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fairway",
  description:
    "Plan, track, and improve your competitive golf. Am I getting there?",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
