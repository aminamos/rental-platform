import Link from "next/link";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await readStore();
  const needsSetup = !store.users.some((u) => u.role === "landlord");
  return (
    <>
      <h1>Rent collection without the spreadsheet.</h1>
      <p style={{ maxWidth: 640 }}>
        A single-landlord app that takes rent payments, verifies tenant identity, and keeps
        maintenance requests from getting lost in text messages. Payments and identity run on
        Stripe in <strong>test mode</strong>; with no keys configured, the app falls back to a
        clearly labeled test checkout and manual document review so every flow can be tried
        without moving money.
      </p>
      <p className="actions">
        {needsSetup ? (
          <>
            <Link className="btn" href="/setup">Create the landlord account</Link>
            <Link className="btn secondary" href="/login">Sign in</Link>
          </>
        ) : (
          <Link className="btn" href="/login">Sign in</Link>
        )}
      </p>
      {needsSetup && (
        <p className="small muted">
          This install has no accounts yet. Setup takes a minute: create the landlord account,
          then add units and tenant accounts from the dashboard.
        </p>
      )}

      <h2>How the three flows work</h2>
      <div className="panel">
        <h3>1. Rental payments</h3>
        <p>
          The landlord adds a charge. The tenant pays it with Stripe Checkout (test card{" "}
          <code>4242 4242 4242 4242</code>, any future expiry and CVC). A signed webhook — and the
          success page as a fallback for local development — marks the charge paid.
        </p>
        <h3>2. Identity verification</h3>
        <p>
          Tenants start Stripe Identity from their home page. If Stripe Identity is not enabled,
          they submit document details for the landlord to approve or reject from the dashboard.
        </p>
        <h3>3. Maintenance requests</h3>
        <p>
          Tenants file requests with category and priority. The landlord moves them from open to
          in progress to resolved, then archives them. Archived requests stay searchable in the
          archive view instead of being deleted.
        </p>
      </div>
    </>
  );
}
