import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { ReduxProvider } from "@/components/Providers/ReduxProvider";

export const metadata: Metadata = {
  title: "Adzy.pro | Buy Quality Backlinks with Real Traffic",
  description: "Performance-driven backlink marketplace. High-quality backlinks from websites with real organic traffic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <ReduxProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </ReduxProvider>
      </body>
    </html>
  );
}
