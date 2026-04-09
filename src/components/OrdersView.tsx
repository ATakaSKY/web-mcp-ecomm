import { useEffect, useState } from "react";
import { useStore } from "../store/StoreContext";
import { authClient } from "../lib/authClient";
import { getApiBase } from "../lib/apiBase";
import { formatInr } from "../lib/formatPrice";
import type { UserOrder } from "../types";
import btn from "./buttons.module.css";
import styles from "./OrdersView.module.css";
import views from "./views.module.css";

function formatOrderedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(status: UserOrder["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "fulfilled":
      return "Fulfilled";
    default:
      return status;
  }
}

export function OrdersView() {
  const { dispatch } = useStore();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const [orders, setOrders] = useState<UserOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (sessionPending || !userId) {
      setOrders(null);
      setErr(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${getApiBase()}/api/orders`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          error?: string;
          orders?: unknown;
        };
        if (!res.ok) {
          if (!cancelled)
            setErr(data.error ?? `Could not load orders (${res.status})`);
          return;
        }
        if (!Array.isArray(data.orders)) {
          if (!cancelled) setErr("Invalid response from server");
          return;
        }
        if (!cancelled) setOrders(data.orders as UserOrder[]);
      } catch {
        if (!cancelled)
          setErr(
            "Network error. Use vercel dev with DATABASE_URL, or check your connection.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionPending, userId]);

  if (sessionPending) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>Your orders</h2>
        <p>Loading…</p>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>Your orders</h2>
        <p>Sign in to see orders linked to your account.</p>
        <button
          type="button"
          className={btn.btnPrimary}
          onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}
        >
          Back to shop
        </button>
      </section>
    );
  }

  if (loading || orders === null) {
    return (
      <section className={`${views.viewSection} ${styles.ordersSection}`}>
        <h2 className={views.viewTitle}>Your orders</h2>
        <p className={styles.hint}>Loading your orders…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className={`${views.viewSection} ${styles.ordersSection}`}>
        <h2 className={views.viewTitle}>Your orders</h2>
        <p className={views.errorText}>{err}</p>
        <button
          type="button"
          className={btn.btnPrimary}
          onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}
        >
          Back to shop
        </button>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section
        className={`${views.viewSection} ${views.emptyState} ${styles.ordersSection}`}
      >
        <h2 className={views.viewTitle}>Your orders</h2>
        <p>You have not placed any orders yet while signed in.</p>
        <button
          type="button"
          className={btn.btnPrimary}
          onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}
        >
          Browse products
        </button>
      </section>
    );
  }

  return (
    <section className={`${views.viewSection} ${styles.ordersSection}`}>
      <h2 className={views.viewTitle}>Your orders</h2>
      <p className={styles.hint}>
        Orders placed while signed in are listed here. Guest checkouts are not
        shown.
      </p>
      <ul className={styles.orderList}>
        {orders.map((order) => (
          <li key={order.id} className={styles.orderCard}>
            <div className={styles.orderHeader}>
              <div>
                <span className={styles.orderMetaLabel}>Order</span>
                <code className={styles.orderId}>{order.id}</code>
              </div>
              <span
                className={`${styles.status} ${styles[`status_${order.status}`]}`}
              >
                {statusLabel(order.status)}
              </span>
            </div>
            <p className={styles.orderDate}>
              {formatOrderedAt(order.createdAt)}
            </p>
            <ul className={styles.lineList}>
              {order.lines.map((line, idx) => (
                <li key={`${order.id}-${line.product.id}-${idx}`} className={styles.lineRow}>
                  <img
                    src={line.product.image}
                    alt=""
                    className={styles.lineImg}
                  />
                  <div className={styles.lineInfo}>
                    <span className={styles.lineName}>{line.product.name}</span>
                    <span className={styles.lineQty}>
                      {line.quantity} × {formatInr(line.unitPrice)}
                    </span>
                  </div>
                  <span className={styles.lineSubtotal}>
                    {formatInr(line.unitPrice * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.orderTotal}>
              <span>Total</span>
              <span>{formatInr(order.totalPaise / 100)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
