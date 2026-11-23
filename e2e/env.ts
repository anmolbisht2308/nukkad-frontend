import fs from "node:fs";
import path from "node:path";

export const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3200";
export const API = process.env.E2E_API_URL ?? "http://localhost:4000";
export const AUTH_DIR = path.join(__dirname, ".auth");

/** Seeded demo accounts (see api/src/seed.ts). */
export const ACCOUNTS = {
  merchant: "9999999999",
  organiser: "9888888888",
  admin: "9000000001",
} as const;
export type Role = keyof typeof ACCOUNTS | "player" | "friend";

export const statePath = (role: Role) => path.join(AUTH_DIR, `${role}.json`);
export const tokenOf = (role: Role): string => JSON.parse(fs.readFileSync(path.join(AUTH_DIR, `${role}.token`), "utf8"));

/** A fresh valid Indian mobile number per run, so tests never share state with old runs. */
export const freshPhone = () => `7${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

export async function apiCall<T = unknown>(p: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}${p}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

/** Logs in through the API using the dev-mode OTP and returns the token. */
export async function login(phone: string, name?: string) {
  const otp = await apiCall<{ devCode?: string; error?: string }>("/api/auth/otp", { body: { phone } });
  if (!otp.data.devCode) throw new Error(`No dev OTP for ${phone}: ${otp.status} ${otp.data.error ?? ""}. Is OTP_DEV_MODE on?`);
  const v = await apiCall<{ token: string }>("/api/auth/verify", { body: { phone, code: otp.data.devCode, name } });
  if (!v.data.token) throw new Error(`Login failed for ${phone}: ${v.status}`);
  return v.data.token;
}

/** IST calendar date `offset` days from today, as YYYY-MM-DD. */
export const istDate = (offset = 0) => new Date(Date.now() + 330 * 60_000 + offset * 86_400_000).toISOString().slice(0, 10);
