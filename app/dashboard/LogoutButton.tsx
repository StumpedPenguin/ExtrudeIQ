"use client";

import { logoutAction } from "./actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="aurora-btn-danger px-4 py-2 text-xs"
      >
        Sign Out
      </button>
    </form>
  );
}
