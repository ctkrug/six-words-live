import type { Metadata } from "next";
import { fraunces, inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Six Words Live",
  description:
    "Everyone gets the same six-word story prompt today. Write yours, drop it into the live wall, and upvote the best before midnight.",
  icons: {
    icon: "favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
