import type { Metadata } from "next";
import { Poppins, Inter, Montserrat } from "next/font/google";
import "@/lib/themes/globals.css"
import "@/lib/themes/space-theme.css";
import StoreProvider from "./StoreProvider";

// Define fonts
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "MCP Space - No Code MCP Platform",
  description: "Build and deploy MCP servers with chat in a single click",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} ${montserrat.variable}  font-sans antialiased`}
      >
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
