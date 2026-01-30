"use client";

import { logoutAction } from "./actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
      >
        Sign Out
      </button>
    </form>
  );
}
