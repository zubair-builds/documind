import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/Header";
import FloatingGlobalChat from "@/components/FloatingGlobalChat";

export const metadata: Metadata = {
  title: "DocuMind - Unlock & Chat with PDFs",
  description: "Securely unlock password-protected PDF files and analyze them with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
        <Providers>
          <Header />
          {children}
          <FloatingGlobalChat />
        </Providers>
      </body>
    </html>
  );
}

