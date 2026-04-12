import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useThemePreference } from "../hooks/useThemePreference";
import { useStore } from "../store/StoreContext";
import { authClient } from "../lib/authClient";
import type { ThemePreference } from "../lib/themePreference";
import { ROUTES } from "../lib/routes";
import { AuthPanel } from "./AuthPanel";
import styles from "./Header.module.css";

function navClass(isActive: boolean) {
  return isActive ? `${styles.navBtn} ${styles.navBtnActive}` : styles.navBtn;
}

export function Header() {
  const { state, cartCount } = useStore();
  const { preference, setPreference } = useThemePreference();
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  return (
    <header className={styles.appHeader}>
      <NavLink to={ROUTES.home} end className={styles.logo}>
        ⚡ WebMCP Shop
      </NavLink>
      <nav>
        <NavLink to={ROUTES.home} end className={({ isActive }) => navClass(isActive)}>
          Products
        </NavLink>
        <NavLink
          to={ROUTES.wishlist}
          className={({ isActive }) => navClass(isActive)}
        >
          ♥ Wishlist
          {state.wishlist.length > 0 && <span className={styles.badge}>{state.wishlist.length}</span>}
        </NavLink>
        <NavLink to={ROUTES.cart} className={({ isActive }) => navClass(isActive)}>
          🛒 Cart
          {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
        </NavLink>
        {session?.user && (
          <NavLink to={ROUTES.orders} className={({ isActive }) => navClass(isActive)}>
            Orders
          </NavLink>
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
        <NavLink
          to={ROUTES.declarative}
          className={({ isActive }) => navClass(isActive)}
        >
          📋 Declarative API
        </NavLink>
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
