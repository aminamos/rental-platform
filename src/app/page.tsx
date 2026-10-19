import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>Rent collection without the spreadsheet.</h1>
      <p style={{ maxWidth: 640 }}>
        A single-landlord MVP that takes rent payments, verifies tenant identity, and keeps
        maintenance requests from getting lost in text messages. Payments and identity run on
        Stripe in <strong>test mode</strong>; with no keys configured, the app falls back to a
        clearly labeled demo checkout and manual document review so every flow still works locally.
      </p>
      <p className="actions">
        <Link className="btn" href="/login">Sign in to try it</Link>
        <a className="btn secondary" href="#demo-accounts">Demo accounts</a>
      </p>

      <h2>How the three flows work</h2>
      <div className="panel">
        <h3>1. Rental payments</h3>
        <p>
          The landlord adds a charge. The tenant pays it with Stripe Checkout (test card{" "}
          <code>4242 4242 4242 4242</code>, any future expiry and CVC). A signed webhook — and the
          success page as a localhost fallback — marks the charge paid.
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

      <h2 id="demo-accounts">Demo accounts</h2>
      <div className="panel wash">
        <table>
          <thead>
            <tr><th>Role</th><th>Email</th><th>Password</th></tr>
          </thead>
          <tbody>
            <tr><td>Landlord</td><td><code>landlord@demo.local</code></td><td><code>demo1234</code></td></tr>
            <tr><td>Tenant (Unit 4B)</td><td><code>tenant@demo.local</code></td><td><code>demo1234</code></td></tr>
            <tr><td>Tenant (Unit 2A)</td><td><code>jamie@demo.local</code></td><td><code>demo1234</code></td></tr>
          </tbody>
        </table>
        <p className="small muted">
          Demo data reseeds itself when storage is empty (Cloudflare D1 on Workers, a local
          store in development). Change the demo passwords before any real deployment.
        </p>
      </div>
    </>
  );
}
