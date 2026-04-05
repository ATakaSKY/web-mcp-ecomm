import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBase } from "../lib/apiBase";
import { formatInr } from "../lib/formatPrice";
import { useStore } from "../store/StoreContext";
import { BannerDot } from "./BannerDot";
import btn from "./buttons.module.css";
import forms from "./forms.module.css";
import pc from "./ProductCard.module.css";
import views from "./views.module.css";
import styles from "./QuickBuyModal.module.css";

const SHIPPING_STANDARD_INR = 499;
const SHIPPING_EXPRESS_INR = 1299;
const GIFT_WRAP_INR = 399;

/**
 * QuickBuyModal — A modal with a complex multi-step checkout form.
 *
 * KEY WEBMCP CONCEPT: Dynamic tool registration via the Declarative API.
 *
 * Because this component only renders when `quickBuyProductId` is set,
 * the <form toolname="complete_quick_buy"> only exists in the DOM while
 * the modal is open. Chrome's WebMCP implementation:
 *   - Auto-registers the tool when the form enters the DOM
 *   - Auto-unregisters the tool when the form is removed from the DOM
 *
 * This pairs with an imperative `open_quick_buy` tool (registered in
 * useWebMCP.ts) that lets the agent open this modal programmatically.
 * The two-tool pattern: imperative opens UI → declarative fills form.
 */
async function postQuickBuyOrder(productId: string, quantity: number): Promise<string> {
  const res = await fetch(`${getApiBase()}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: [{ productId, quantity }] }),
  });
  const data = (await res.json()) as { error?: string; orderId?: string };
  if (!res.ok) throw new Error(data.error ?? "Checkout failed");
  if (!data.orderId) throw new Error("Invalid response from server");
  return data.orderId;
}

export function QuickBuyModal() {
  const { state, dispatch } = useStore();
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const product = state.products?.find((p) => p.id === state.quickBuyProductId);

  const close = useCallback(() => {
    setOrderSuccess(false);
    setSubmitErr(null);
    setSubmitBusy(false);
    dispatch({ type: "CLOSE_QUICK_BUY" });
  }, [dispatch]);

  // Close on Escape key (only while modal is open)
  useEffect(() => {
    if (!state.quickBuyProductId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.quickBuyProductId, close]);

  if (!product) return null;

  // Close on backdrop click
  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) close();
  }

  if (orderSuccess) {
    return (
      <div className={styles.backdrop} ref={backdropRef} onClick={onBackdropClick}>
        <div className={`${styles.modal} ${styles.modalSuccess}`}>
          <div className={styles.modalSuccessIcon}>✓</div>
          <h2>Order Confirmed!</h2>
          <p>
            Your Quick Buy order for <strong>{product.name}</strong> has been placed.
          </p>
          {state.lastOrderId && (
            <p className={styles.orderIdLine}>
              Order ID: <code>{state.lastOrderId}</code>
            </p>
          )}
          <button type="button" className={btn.btnPrimary} onClick={close}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop} ref={backdropRef} onClick={onBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2>Quick Buy</h2>
            <p className={styles.modalSubtitle}>
              Complete your purchase of <strong>{product.name}</strong>
            </p>
          </div>
          <button type="button" className={styles.modalClose} onClick={close}>
            ✕
          </button>
        </div>

        {/* WebMCP annotation callout */}
        <div className={styles.modalWebmcpNote}>
          <BannerDot />
          <span>
            This form is registered as <code>complete_quick_buy</code> via the Declarative API. It{" "}
            <strong>only exists while this modal is open</strong> — Chrome auto-registers/unregisters it with the
            DOM lifecycle.
          </span>
        </div>

        {/* Product preview */}
        <div className={styles.modalProductPreview}>
          <img src={product.image} alt={product.name} />
          <div>
            <h3>{product.name}</h3>
            <p className={`${pc.productDesc} ${styles.previewDesc}`}>{product.description}</p>
            <span className={`${pc.productPrice} ${styles.previewPrice}`}>{formatInr(product.price)}</span>
          </div>
        </div>

        {submitErr && <p className={views.errorText}>{submitErr}</p>}

        {/*
          THE DECLARATIVE FORM
          - toolname: registers this as a callable tool
          - tooldescription: describes intent for the agent
          - NO toolautosubmit: user must confirm the purchase
          - toolparamdescription: overrides label text for agent clarity
        */}
        <form
          toolname="complete_quick_buy"
          tooldescription={
            `Complete a Quick Buy checkout for "${product.name}" (${formatInr(product.price)}). ` +
            "Fill in the shipping address, choose a shipping method, optionally add gift wrapping, " +
            "select a payment method, then submit. The user must click Confirm to finalize."
          }
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);

            const se = e.nativeEvent as SubmitEvent & {
              agentInvoked?: boolean;
              respondWith?: (v: unknown) => void;
            };

            const orderData = {
              product: product.name,
              price: product.price,
              quantity: Math.min(99, Math.max(1, Number(fd.get("quantity")) || 1)),
              fullName: fd.get("full_name"),
              address: fd.get("address"),
              city: fd.get("city"),
              zipCode: fd.get("zip_code"),
              shipping: fd.get("shipping_method"),
              giftWrap: fd.get("gift_wrap") === "on",
              giftMessage: fd.get("gift_message") || null,
              paymentMethod: fd.get("payment_method"),
            };

            const total =
              orderData.price * orderData.quantity +
              (orderData.shipping === "express"
                ? SHIPPING_EXPRESS_INR
                : orderData.shipping === "standard"
                  ? SHIPPING_STANDARD_INR
                  : 0) +
              (orderData.giftWrap ? GIFT_WRAP_INR : 0);

            const run = async () => {
              const orderId = await postQuickBuyOrder(product.id, orderData.quantity);
              dispatch({ type: "QUICK_BUY_ORDER_SUCCESS", orderId });
              return orderId;
            };

            const onFailure = (message: string) => {
              if (se.agentInvoked && se.respondWith) {
                se.respondWith(Promise.resolve({ status: "error" as const, message }));
                return;
              }
              setSubmitErr(message);
            };

            if (se.agentInvoked && se.respondWith) {
              se.respondWith(
                run()
                  .then((orderId) => {
                    setTimeout(() => setOrderSuccess(true), 100);
                    return {
                      status: "success" as const,
                      orderId,
                      order: { ...orderData, total: total.toFixed(2) },
                      message: `Order confirmed! Order id: ${orderId}. ${orderData.quantity}x ${product.name} shipping to ${orderData.fullName} at ${orderData.address}, ${orderData.city} ${orderData.zipCode}. Total: ${formatInr(total)}.`,
                    };
                  })
                  .catch((err: unknown) => ({
                    status: "error" as const,
                    message:
                      err instanceof Error
                        ? err.message
                        : "Network error. Use vercel dev with DATABASE_URL for orders.",
                  })),
              );
              return;
            }

            setSubmitErr(null);
            setSubmitBusy(true);
            run()
              .then(() => setOrderSuccess(true))
              .catch((err: unknown) => {
                onFailure(
                  err instanceof Error
                    ? err.message
                    : "Network error. Use vercel dev with DATABASE_URL for orders.",
                );
              })
              .finally(() => setSubmitBusy(false));
          }}
          className={forms.modalForm}
        >
          {/* Quantity */}
          <div className={forms.formRow}>
            <div className={forms.formField}>
              <label htmlFor="qb-qty">Quantity</label>
              <input
                type="number"
                name="quantity"
                id="qb-qty"
                min={1}
                max={10}
                defaultValue={1}
                required
                toolparamdescription="Number of items to purchase (1–10)"
              />
            </div>
          </div>

          {/* Shipping address */}
          <fieldset className={forms.formFieldset}>
            <legend>Shipping Address</legend>
            <div className={forms.formRow}>
              <div className={`${forms.formField} ${forms.grow}`}>
                <label htmlFor="qb-name">Full name</label>
                <input
                  type="text"
                  name="full_name"
                  id="qb-name"
                  required
                  placeholder="Jane Smith"
                  toolparamdescription="Recipient's full legal name for shipping label"
                />
              </div>
            </div>
            <div className={forms.formRow}>
              <div className={`${forms.formField} ${forms.grow}`}>
                <label htmlFor="qb-addr">Street address</label>
                <input
                  type="text"
                  name="address"
                  id="qb-addr"
                  required
                  placeholder="123 Main St, Apt 4B"
                  toolparamdescription="Full street address including apartment/unit number"
                />
              </div>
            </div>
            <div className={forms.formRow}>
              <div className={`${forms.formField} ${forms.grow}`}>
                <label htmlFor="qb-city">City</label>
                <input type="text" name="city" id="qb-city" required placeholder="Mumbai" />
              </div>
              <div className={forms.formField}>
                <label htmlFor="qb-zip">PIN code</label>
                <input
                  type="text"
                  name="zip_code"
                  id="qb-zip"
                  required
                  placeholder="400001"
                  toolparamdescription="6-digit Indian PIN code"
                />
              </div>
            </div>
          </fieldset>

          {/* Shipping method — radio group */}
          <fieldset className={forms.formFieldset}>
            <legend>Shipping Method</legend>
            <div className={`${forms.radioGroup} ${forms.radioGroupVertical}`}>
              <label className={forms.radioLabel}>
                <input
                  type="radio"
                  name="shipping_method"
                  value="standard"
                  defaultChecked
                  toolparamdescription={`Shipping speed. 'standard' = 5-7 days (${formatInr(SHIPPING_STANDARD_INR)}), 'express' = 1-2 days (${formatInr(SHIPPING_EXPRESS_INR)}), 'pickup' = free store pickup`}
                />
                <div>
                  <strong>Standard</strong>
                  <span className={forms.radioDetail}>
                    5–7 business days — {formatInr(SHIPPING_STANDARD_INR)}
                  </span>
                </div>
              </label>
              <label className={forms.radioLabel}>
                <input type="radio" name="shipping_method" value="express" />
                <div>
                  <strong>Express</strong>
                  <span className={forms.radioDetail}>
                    1–2 business days — {formatInr(SHIPPING_EXPRESS_INR)}
                  </span>
                </div>
              </label>
              <label className={forms.radioLabel}>
                <input type="radio" name="shipping_method" value="pickup" />
                <div>
                  <strong>Store Pickup</strong>
                  <span className={forms.radioDetail}>Ready in 2 hours — Free</span>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Gift wrap — checkbox */}
          <fieldset className={forms.formFieldset}>
            <legend>Gift Options</legend>
            <label className={forms.checkboxLabel}>
              <input
                type="checkbox"
                name="gift_wrap"
                toolparamdescription={`Set to true to add gift wrapping for ${formatInr(GIFT_WRAP_INR)}`}
              />
              <span>Add gift wrapping (+{formatInr(GIFT_WRAP_INR)})</span>
            </label>
            <div className={forms.formField} style={{ marginTop: "0.5rem" }}>
              <label htmlFor="qb-gift-msg">Gift message (optional)</label>
              <input
                type="text"
                name="gift_message"
                id="qb-gift-msg"
                placeholder="Happy birthday!"
                toolparamdescription="Optional personal message to include with gift wrapping"
              />
            </div>
          </fieldset>

          {/* Payment method */}
          <div className={forms.formField}>
            <label htmlFor="qb-payment">Payment method</label>
            <select
              name="payment_method"
              id="qb-payment"
              required
              toolparamdescription="Payment method to use for checkout"
            >
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="paypal">PayPal</option>
              <option value="apple_pay">Apple Pay</option>
              <option value="google_pay">Google Pay</option>
            </select>
          </div>

          {/* Submit */}
          <div className={styles.modalFormFooter}>
            <button type="button" className={btn.btnSecondary} onClick={close} disabled={submitBusy}>
              Cancel
            </button>
            <button
              type="submit"
              className={`${btn.btnPrimary} ${btn.btnCheckout}`}
              disabled={submitBusy}
            >
              {submitBusy ? "Placing order…" : "Confirm Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
