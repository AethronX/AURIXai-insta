import localFont from "next/font/local";

/**
 * Satoshi — the AURIX Command Center design system's primary typeface. Extracted from the
 * approved design (public/fonts/Satoshi-*.woff2) and loaded locally so the whole app renders
 * with the exact typography the design was built around, no external font request.
 */
export const satoshi = localFont({
  src: [
    { path: "../public/fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});
