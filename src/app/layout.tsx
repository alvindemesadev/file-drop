import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Upload } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FileDrop - Simple File Sharing",
  description: "Upload files and share them instantly with a link",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme:dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `
          }} />
        </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
                <Link href="/" className="flex items-center gap-2 font-semibold hover:text-muted-foreground transition-colors">
                  <Upload className="size-5" />
                  FileDrop
                </Link>
                <ModeToggle />
              </div>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center">{children}</main>
          </div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
