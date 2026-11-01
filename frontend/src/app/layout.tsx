import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: "RUTA RIDES — Muévete a tu manera",
    template: "%s · RUTA RIDES",
  },
  description:
    "Movilidad real en Lara, Venezuela: solicita tu viaje, sigue a tu conductor y muévete a tu manera.",
  applicationName: "RUTA RIDES",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RUTA RIDES",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FD7624",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <AuthProvider>
          <LocationProvider>
            <PwaRegister />
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                style: { background: "#0B0B0B", color: "#FFFFFF" },
                success: {
                  iconTheme: { primary: "#FD7624", secondary: "#0B0B0B" },
                },
                error: {
                  iconTheme: { primary: "#FD7624", secondary: "#0B0B0B" },
                },
              }}
            />
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
