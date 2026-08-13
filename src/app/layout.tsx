import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Sora } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ensureDemoSeeded } from "@/lib/db/ensure-seeded";
import { getDemoSession, listDemoOrgs } from "@/lib/session";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expense Agent",
  description:
    "Enterprise AI travel agent — policy, preferences, proximity, price, and booking.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureDemoSeeded();
  const session = await getDemoSession();
  const orgs = listDemoOrgs();

  return (
    <html
      lang="en"
      className={`${sora.variable} ${dmSans.variable} ${jetbrains.variable} dark h-full`}
    >
      <body className="min-h-full font-sans">
        <AppShell
          organization={session.organization}
          employee={session.employee}
          orgBlurb={session.blurb}
          orgs={orgs}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
