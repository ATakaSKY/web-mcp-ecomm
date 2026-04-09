import { useState } from "react";
import { useThemePreference } from "../hooks/useThemePreference";
import { useStore } from "../store/StoreContext";
import { authClient } from "../lib/authClient";
import type { ThemePreference } from "../lib/themePreference";
import type { View } from "../types";
import { AuthPanel } from "./AuthPanel";
import styles from "./Header.module.css";

export function Header() {
  const { state, dispatch, cartCount } = useStore();
  const { preference, setPreference } = useThemePreference();
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const nav = (view: View) => () => dispatch({ type: "SET_VIEW", view });
  const navBtn = (v: View) =>
    state.view === v ? `${styles.navBtn} ${styles.navBtnActive}` : styles.navBtn;

  return (
    <header className={styles.appHeader}>
      <button type="button" className={styles.logo} onClick={nav("shop")}>
        ⚡ WebMCP Shop
      </button>
      <nav>
        <button type="button" className={navBtn("shop")} onClick={nav("shop")}>
          Products
        </button>
        <button type="button" className={navBtn("wishlist")} onClick={nav("wishlist")}>
          ♥ Wishlist
          {state.wishlist.length > 0 && <span className={styles.badge}>{state.wishlist.length}</span>}
        </button>
        <button type="button" className={navBtn("cart")} onClick={nav("cart")}>
          🛒 Cart
          {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
        </button>
        {session?.user && (
          <button type="button" className={navBtn("orders")} onClick={nav("orders")}>
            Orders
          </button>
        )}
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setAuthOpen(true)}
          title="Sign in or account"
        >
          {sessionPending ? "…" : session?.user ? `👤 ${session.user.name}` : "Sign in"}
        </button>
        <span className={styles.navDivider} />
        <button type="button" className={navBtn("declarative")} onClick={nav("declarative")}>
          📋 Declarative API
        </button>
        <span className={styles.navDivider} />
        <label className={styles.themeSelectLabel} htmlFor="header-theme-select">
          <span className={styles.themeSelectSr}>Theme</span>
          <select
            id="header-theme-select"
            className={styles.themeSelect}
            value={preference}
            onChange={(e) => setPreference(e.target.value as ThemePreference)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System theme</option>
          </select>
        </label>
      </nav>
      {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
    </header>
  );
}
