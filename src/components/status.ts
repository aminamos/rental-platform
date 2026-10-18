export function badgeClass(status: string): string {
  if (["paid", "succeeded", "verified", "resolved"].includes(status)) return "badge ok";
  if (["unpaid", "open", "pending_review", "requires_input", "processing", "pending", "in_progress"].includes(status))
    return "badge warn";
  if (["rejected", "failed"].includes(status)) return "badge bad";
  return "badge";
}

export function pretty(status: string): string {
  return status.replace(/_/g, " ");
}
