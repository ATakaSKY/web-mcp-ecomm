import { useState } from "react";
import { authClient } from "../lib/authClient";
import styles from "./AuthPanel.module.css";

type Mode = "signIn" | "signUp";

export function AuthPanel({ onClose }: { onClose: () => void }) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    await authClient.signOut();
    setBusy(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "signUp") {
      const { error: err } = await authClient.signUp.email({
        name: name.trim() || "User",
        email: email.trim(),
        password,
      });
      if (err) setError(err.message ?? "Sign up failed");
    } else {
      const { error: err } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (err) setError(err.message ?? "Sign in failed");
    }
    setBusy(false);
  }

  return (
    <div
      className={styles.backdrop}
      onClick={onBackdropClick}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Account</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {isPending ? (
          <p>Loading…</p>
        ) : session?.user ? (
          <div className={styles.signedIn}>
            <p className={styles.signedInName}>
              Signed in as <strong>{session.user.name}</strong>
              <br />
              <span style={{ opacity: 0.85 }}>{session.user.email}</span>
            </p>
            <button
              type="button"
              className={styles.signOut}
              disabled={busy}
              onClick={() => void handleSignOut()}
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={styles.tab}
                data-active={mode === "signIn"}
                onClick={() => {
                  setMode("signIn");
                  setError(null);
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={styles.tab}
                data-active={mode === "signUp"}
                onClick={() => {
                  setMode("signUp");
                  setError(null);
                }}
              >
                Sign up
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
              {mode === "signUp" && (
                <label className={styles.label}>
                  Name
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}
              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className={styles.label}>
                Password
                <input
                  className={styles.input}
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                />
              </label>
              <button className={styles.submit} type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "signUp" ? "Create account" : "Sign in"}
              </button>
            </form>
            <p className={styles.hint}>
              Phase 4 uses email & password. Sessions are cookie-based; use{" "}
              <code>vercel dev</code> or your deployed URL so <code>/api/auth</code> is on the same
              site (or set <code>VITE_API_BASE</code>).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
