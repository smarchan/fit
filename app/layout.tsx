import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fit",
  description: "Calorías que se ajustan a tus pasos y entrenos. Escanea lo que comes.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Fit", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#09090b", width: "device-width", initialScale: 1, viewportFit: "cover" };

const appearance = {
  variables: {
    colorPrimary: "#d4ff3a",
    colorPrimaryForeground: "#0b0d00",
    colorBackground: "#121215",
    colorForeground: "#f4f4f5",
    colorMutedForeground: "#9d9da7",
    colorInput: "#09090b",
    colorInputForeground: "#f4f4f5",
    colorNeutral: "#f4f4f5",
    borderRadius: "12px",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
};

const fakeAuth = process.env.NODE_ENV === "development" && process.env.DEV_FAKE_AUTH === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = <body>{children}</body>;
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {fakeAuth ? (
        body
      ) : (
        <ClerkProvider localization={esES} appearance={appearance} signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/sign-in">
          {body}
        </ClerkProvider>
      )}
    </html>
  );
}
