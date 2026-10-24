/** Static site settings, overridable at build time with VITE_* variables. */
export const site = {
  name: import.meta.env.VITE_SITE_NAME || "SolPay",
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || "sandydummy69@gmail.com",
  contactAddress: import.meta.env.VITE_CONTACT_ADDRESS || "Sanidhya Madeshia, Sector Q, Lucknow, UP, India",
  githubUrl: import.meta.env.VITE_GITHUB_URL || "https://github.com/SanidhyaMadheshia/solanaPaymentsStripe",
};

/** Base URL of the API. Empty means same origin (nginx / Vite dev server proxy /api to the backend). */
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api/v1`;
