import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Study",
  description: "Academic research study",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
