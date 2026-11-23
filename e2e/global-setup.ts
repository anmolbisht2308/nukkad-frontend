import fs from "node:fs";
import path from "node:path";
import { ACCOUNTS, API, AUTH_DIR, WEB, freshPhone, login, type Role } from "./env";

/** Logs every role in once (the API allows one OTP a minute per phone) and saves a browser state per role. */
export default async function globalSetup() {
  const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.db) throw new Error(`API not reachable at ${API}. Start Mongo + API and run \`npm run seed\` in api/.`);

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const people: [Role, string, string][] = [
    ["merchant", ACCOUNTS.merchant, "Demo Merchant"],
    ["organiser", ACCOUNTS.organiser, "Demo Organiser"],
    ["admin", ACCOUNTS.admin, "Admin"],
    ["player", freshPhone(), "Test Player"],
    ["friend", freshPhone(), "Test Friend"],
  ];
  for (const [role, phone, name] of people) {
    const token = await login(phone, name);
    fs.writeFileSync(path.join(AUTH_DIR, `${role}.token`), JSON.stringify(token));
    fs.writeFileSync(
      path.join(AUTH_DIR, `${role}.json`),
      JSON.stringify({ cookies: [], origins: [{ origin: WEB, localStorage: [{ name: "nukkad.token", value: token }] }] })
    );
  }
}
