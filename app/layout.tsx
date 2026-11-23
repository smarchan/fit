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
  appleWebApp: { capable: true, title: "Fit", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#f4f6fb", width: "device-width", initialScale: 1, viewportFit: "cover" };

const appearance = {
  variables: {
    colorPrimary: "#2563eb",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#ffffff",
    colorForeground: "#0e1525",
    colorMutedForeground: "#5d6679",
    colorInput: "#ffffff",
    colorInputForeground: "#0e1525",
    colorNeutral: "#0e1525",
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
