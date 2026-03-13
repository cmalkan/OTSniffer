import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OT Blast Radius Simulator MVP",
  description: "Netlify-deployable OT cyber risk simulation demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
