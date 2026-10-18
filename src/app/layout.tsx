import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rental Platform",
  description: "Rent payments, identity verification, and maintenance requests for a small landlord.",
};
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" href="/">Rental Platform</Link>
            <nav className="nav">
              {user?.role === "landlord" && <Link href="/dashboard">Landlord dashboard</Link>}
              {user?.role === "tenant" && <Link href="/tenant">Tenant home</Link>}
              {user ? (
                <>
                  <span className="small muted">{user.name} ({user.role})</span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
