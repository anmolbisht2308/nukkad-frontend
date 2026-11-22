"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, getToken, setToken, type User } from "@/lib/api";

type Ctx = {
  user: User | null;
  ready: boolean;
  /** Runs `then` right away if logged in, otherwise after a successful login. */
  withLogin: (then?: () => void) => void;
  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => useContext(AuthCtx)!;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const check = getToken()
      ? api<{ user: User }>("/api/auth/me")
          .then((r) => setUser(r.user))
          .catch(() => setToken(null))
      : Promise.resolve();
    check.finally(() => setReady(true));
  }, []);

  const withLogin = useCallback(
    (then?: () => void) => {
      if (user) return then?.();
      pending.current = then;
      setOpen(true);
    },
    [user]
  );

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, ready, withLogin, logout }}>
      {children}
      <LoginSheet
        open={open}
        onClose={() => setOpen(false)}
        onDone={(u) => {
          setUser(u);
          setOpen(false);
          const fn = pending.current;
          pending.current = undefined;
          // let state settle so the callback sees the logged-in token
          setTimeout(() => fn?.(), 50);
        }}
      />
    </AuthCtx.Provider>
  );
}

function LoginSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (u: User) => void }) {
  return <AnimatePresence>{open && <LoginForm onClose={onClose} onDone={onDone} />}</AnimatePresence>;
}

/** Mounted fresh each time the sheet opens, so its state starts clean. */
function LoginForm({ onClose, onDone }: { onClose: () => void; onDone: (u: User) => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ devCode?: string }>("/api/auth/otp", { body: { phone }, auth: false });
      setDevCode(r.devCode ?? null);
      setStep("code");
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ token: string; user: User }>("/api/auth/verify", { body: { phone, code, name: name || undefined }, auth: false });
      setToken(r.token);
      onDone(r.user);
    } catch (e) {
      setErr((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
        <>
          <motion.div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="Log in"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto w-full max-w-md rounded-t-3xl bg-cream p-6 pb-10 text-ink shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
            <h2 className="font-display text-3xl font-bold">{step === "phone" ? "Log in with your number" : "Enter the code"}</h2>
            <p className="mt-1 text-sm text-ink/60">{step === "phone" ? "We'll send a 6-digit code. No passwords." : `Sent to +91 ${phone.replace(/\D/g, "").slice(-10)}`}</p>

            <AnimatePresence mode="wait" initial={false}>
              {step === "phone" ? (
                <motion.form
                  key="p"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="mt-6 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <label className="flex items-center gap-2 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 focus-within:border-saffron">
                    <span className="font-semibold text-ink/50">+91</span>
                    <input autoFocus inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent text-lg outline-none" />
                  </label>
                  <input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 outline-none focus:border-saffron" />
                  <button disabled={busy} className="btn-primary w-full">{busy ? "Sending…" : "Send code"}</button>
                </motion.form>
              ) : (
                <motion.form
                  key="c"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="mt-6 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    verify();
                  }}
                >
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-center text-3xl tracking-[0.5em] outline-none focus:border-saffron"
                  />
                  {devCode && (
                    <p className="rounded-xl bg-saffron/10 px-3 py-2 text-xs text-ink/70">
                      Dev mode: no SMS is sent. Your code is <button type="button" onClick={() => setCode(devCode)} className="font-mono font-bold underline">{devCode}</button>
                    </p>
                  )}
                  <button disabled={busy || code.length !== 6} className="btn-primary w-full">{busy ? "Checking…" : "Verify & continue"}</button>
                  <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-ink/60 underline">Change number</button>
                </motion.form>
              )}
            </AnimatePresence>
            {err && <p className="mt-3 text-sm font-medium text-chili">{err}</p>}
          </motion.div>
        </>
  );
}
