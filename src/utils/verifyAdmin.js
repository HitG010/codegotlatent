import api from "../api/axios";

// Common admin verification function.
// Assumes backend exposes GET /admin/verify returning 200 if user is whitelisted admin.
// Returns true if authorized, false otherwise.
export async function verifyAdmin() {
  try {
    const res = await api.get("/admin/verify", { validateStatus: () => true });
    return res.status === 200;
  } catch (e) {
    console.error("Admin verify failed", e);
    return false;
  }
}
