import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NavigationLoader from "@/components/ui/NavigationLoader";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Aptitude Arc | AI Interview Suite",
  description: "End-to-end interview readiness powered by AI. Master resumes, study logic, and mock interviews all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${sourceSerif.variable} ${jetbrains.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            {/* Aptitude Arc branded loader — shows on first load & every navigation */}
            <NavigationLoader />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
