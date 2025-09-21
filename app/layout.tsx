import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TabProvider } from "@/contexts/tab-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ideate - Collaborative Intelligence Canvas",
  description: "A multi-pane, interactive workspace for AI-human collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased paper-surface`}>
        <TabProvider>
        {children}
        </TabProvider>
      </body>
    </html>
  );
}
