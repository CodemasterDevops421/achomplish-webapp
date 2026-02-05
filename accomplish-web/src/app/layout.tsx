import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PostHogProvider } from "@/lib/posthog";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Accomplish - Remember What You Did",
  description: "Never struggle with performance reviews again. A simple daily work diary that captures your accomplishments.",
  keywords: ["productivity", "work diary", "performance review", "accomplishments", "journal"],
  authors: [{ name: "Accomplish" }],
  openGraph: {
    title: "Accomplish - Remember What You Did",
    description: "Never struggle with performance reviews again.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Toaster position="bottom-right" richColors />
      </body>
      </html>
    </ClerkProvider>
  );
}
