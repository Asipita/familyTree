import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FamilyTree — A living record of where you come from",
  description:
    "Preserve the stories, wisdom, and lives that made your family possible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
