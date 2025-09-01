import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "@/styles/globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard operacional e gerencial para fábrica de pães",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Google Material Icons */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <style>{`
          /* Evitar FOUC - esconder conteúdo até CSS carregar */
          body {
            visibility: hidden;
            opacity: 0;
            background: #090c12 !important;
            color: #f2f4f7 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif !important;
            margin: 0;
            transition: opacity 0.3s ease;
          }
          
          /* Mostrar quando CSS estiver carregado */
          body.css-loaded {
            visibility: visible;
            opacity: 1;
          }
          
          /* Loading inicial simples */
          .initial-loading {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #090c12 0%, #0f1420 60%, #090c12 100%);
            z-index: 9999;
          }
          
          .initial-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,.1);
            border-top-color: #e67e22;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Mostrar body quando DOM estiver pronto
            document.addEventListener('DOMContentLoaded', function() {
              document.body.classList.add('css-loaded');
            });
            
            // Fallback para casos extremos
            window.addEventListener('load', function() {
              document.body.classList.add('css-loaded');
            });
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="initial-loading" id="initial-loading">
          <div className="initial-spinner"></div>
        </div>
        <SessionProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </SessionProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Esconder loading inicial quando React inicializar
            setTimeout(function() {
              const loader = document.getElementById('initial-loading');
              if (loader) loader.style.display = 'none';
            }, 100);
          `
        }} />
      </body>
    </html>
  );
}
