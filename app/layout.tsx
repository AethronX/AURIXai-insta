import type { Metadata } from "next";
import { satoshi } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURIX Social AI",
  description: "AI-powered Instagram content operations platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${satoshi.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
