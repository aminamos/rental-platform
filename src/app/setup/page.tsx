import { redirect } from "next/navigation";
import { readStore } from "@/lib/store";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const store = await readStore();
  if (store.users.some((u) => u.role === "landlord")) redirect("/login");
  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Set up your rental platform</h1>
      <p className="muted">
        Create the landlord account. You can then add units and tenant accounts from the
        dashboard. This page stops working once a landlord account exists.
      </p>
      <SetupForm />
    </div>
  );
}
