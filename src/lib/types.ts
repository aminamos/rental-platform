export type Role = "landlord" | "tenant";
export type IdentityStatus =
  | "not_started"
  | "pending_review"
  | "requires_input"
  | "processing"
  | "verified"
  | "rejected";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  unitId?: string;
  passwordHash: string;
  identityStatus: IdentityStatus;
}
export interface Unit {
  id: string;
  label: string;
  address: string;
  monthlyRentCents: number;
}
export interface Due {
  id: string;
  tenantId: string;
  unitId: string;
  label: string;
  amountCents: number;
  dueDate: string;
  status: "unpaid" | "paid";
}
export interface Payment {
  id: string;
  dueId: string;
  tenantId: string;
  amountCents: number;
  status: "pending" | "succeeded" | "failed";
  mode: "stripe" | "mock";
  stripeSessionId?: string;
  createdAt: string;
  paidAt?: string;
}
export interface Verification {
  id: string;
  tenantId: string;
  provider: "stripe" | "manual";
  status: IdentityStatus;
  stripeId?: string;
  url?: string;
  documentType?: string;
  documentName?: string;
  createdAt: string;
  reviewedAt?: string;
}
export type MaintenanceStatus = "open" | "in_progress" | "resolved";
export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  unitId: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: MaintenanceStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Store {
  users: User[];
  units: Unit[];
  dues: Due[];
  payments: Payment[];
  verifications: Verification[];
  maintenance: MaintenanceRequest[];
}
