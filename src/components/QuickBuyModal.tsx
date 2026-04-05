import { useCallback, useEffect, useRef, useState } from "react";
import { formatInr } from "../lib/formatPrice";
import { useStore } from "../store/StoreContext";

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
export function QuickBuyModal() {
  const { state, dispatch } = useStore();
  const [orderSuccess, setOrderSuccess] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const product = state.products?.find((p) => p.id === state.quickBuyProductId);

  const close = useCallback(() => {
    setOrderSuccess(false);
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
      <div className="modal-backdrop" ref={backdropRef} onClick={onBackdropClick}>
        <div className="modal modal-success">
          <div className="modal-success-icon">✓</div>
          <h2>Order Confirmed!</h2>
          <p>
            Your Quick Buy order for <strong>{product.name}</strong> has been placed.
          </p>
          <button className="btn-primary" onClick={close}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={onBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Quick Buy</h2>
            <p className="modal-subtitle">
              Complete your purchase of <strong>{product.name}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={close}>✕</button>
        </div>

        {/* WebMCP annotation callout */}
        <div className="modal-webmcp-note">
          <span className="banner-dot" />
          <span>
            This form is registered as <code>complete_quick_buy</code> via the
            Declarative API. It <strong>only exists while this modal is open</strong> —
            Chrome auto-registers/unregisters it with the DOM lifecycle.
          </span>
        </div>

        {/* Product preview */}
        <div className="modal-product-preview">
          <img src={product.image} alt={product.name} />
          <div>
            <h3>{product.name}</h3>
            <p className="product-desc">{product.description}</p>
            <span className="product-price">{formatInr(product.price)}</span>
          </div>
        </div>

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
              quantity: Number(fd.get("quantity")) || 1,
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

            console.log("[QuickBuy] Order placed:", orderData);

            if (se.agentInvoked && se.respondWith) {
              // respondWith expects a Promise per the WebMCP spec.
              // We must NOT unmount the form until the promise resolves,
              // otherwise Chrome's renderer crashes since it's still
              // reading the form element during respondWith processing.
              const resultPromise = Promise.resolve({
                status: "success",
                order: { ...orderData, total: total.toFixed(2) },
                message: `Order confirmed! ${orderData.quantity}x ${product.name} shipping to ${orderData.fullName} at ${orderData.address}, ${orderData.city} ${orderData.zipCode}. Total: ${formatInr(total)}.`,
              });
              se.respondWith(resultPromise);
              // Delay the UI transition so the form stays in the DOM
              // while Chrome processes the respondWith promise.
              resultPromise.then(() => {
                setTimeout(() => setOrderSuccess(true), 100);
              });
              return;
            }

            setOrderSuccess(true);
          }}
          className="modal-form"
        >
          {/* Quantity */}
          <div className="form-row">
            <div className="form-field">
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
          <fieldset className="form-fieldset">
            <legend>Shipping Address</legend>
            <div className="form-row">
              <div className="form-field grow">
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
            <div className="form-row">
              <div className="form-field grow">
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
            <div className="form-row">
              <div className="form-field grow">
                <label htmlFor="qb-city">City</label>
                <input
                  type="text"
                  name="city"
                  id="qb-city"
                  required
                  placeholder="Mumbai"
                />
              </div>
              <div className="form-field">
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
          <fieldset className="form-fieldset">
            <legend>Shipping Method</legend>
            <div className="radio-group vertical">
              <label className="radio-label">
                <input
                  type="radio"
                  name="shipping_method"
                  value="standard"
                  defaultChecked
                  toolparamdescription={`Shipping speed. 'standard' = 5-7 days (${formatInr(SHIPPING_STANDARD_INR)}), 'express' = 1-2 days (${formatInr(SHIPPING_EXPRESS_INR)}), 'pickup' = free store pickup`}
                />
                <div>
                  <strong>Standard</strong>
                  <span className="radio-detail">
                    5–7 business days — {formatInr(SHIPPING_STANDARD_INR)}
                  </span>
                </div>
              </label>
              <label className="radio-label">
                <input type="radio" name="shipping_method" value="express" />
                <div>
                  <strong>Express</strong>
                  <span className="radio-detail">
                    1–2 business days — {formatInr(SHIPPING_EXPRESS_INR)}
                  </span>
                </div>
              </label>
              <label className="radio-label">
                <input type="radio" name="shipping_method" value="pickup" />
                <div>
                  <strong>Store Pickup</strong>
                  <span className="radio-detail">Ready in 2 hours — Free</span>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Gift wrap — checkbox */}
          <fieldset className="form-fieldset">
            <legend>Gift Options</legend>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="gift_wrap"
                toolparamdescription={`Set to true to add gift wrapping for ${formatInr(GIFT_WRAP_INR)}`}
              />
              <span>Add gift wrapping (+{formatInr(GIFT_WRAP_INR)})</span>
            </label>
            <div className="form-field" style={{ marginTop: "0.5rem" }}>
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
          <div className="form-field">
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
          <div className="modal-form-footer">
            <button type="button" className="btn-secondary" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-checkout">
              Confirm Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
