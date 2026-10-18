"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <button type="button" className="btn secondary small-btn" onClick={logout}>
      Sign out
    </button>
  );
}
