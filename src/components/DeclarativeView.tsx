import { useEffect, useRef, useState } from "react";
import { formatInr } from "../lib/formatPrice";
import { useStore } from "../store/StoreContext";
import btn from "./buttons.module.css";
import decl from "./DeclarativeView.module.css";
import forms from "./forms.module.css";
import views from "./views.module.css";

interface LogEntry {
  time: string;
  event: string;
  detail: string;
}

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export function DeclarativeView() {
  const { state, dispatch } = useStore();
  const catalog = state.products ?? [];
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [feedbackResult, setFeedbackResult] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  function addLog(event: string, detail: string) {
    setLogs((prev) => [
      ...prev.slice(-49),
      { time: timestamp(), event, detail },
    ]);
  }

  // Listen for WebMCP declarative events on window
  useEffect(() => {
    function onToolActivated(e: Event) {
      const toolName =
        (e as CustomEvent & { toolName?: string }).toolName ?? "unknown";
      addLog(
        "toolactivated",
        `Agent activated tool "${toolName}" — form fields were auto-filled.`,
      );
    }

    function onToolCancel(e: Event) {
      const toolName =
        (e as CustomEvent & { toolName?: string }).toolName ?? "unknown";
      addLog("toolcancel", `Agent cancelled tool "${toolName}".`);
    }

    window.addEventListener("toolactivated", onToolActivated);
    window.addEventListener("toolcancel", onToolCancel);
    return () => {
      window.removeEventListener("toolactivated", onToolActivated);
      window.removeEventListener("toolcancel", onToolCancel);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (state.productsLoading || catalog.length === 0) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>Declarative API — Live Examples</h2>
        <p>Loading product catalog for form demos…</p>
      </section>
    );
  }

  return (
    <section className={views.viewSection}>
      <h2 className={views.viewTitle}>Declarative API — Live Examples</h2>
      <p className={decl.intro}>
        The Declarative API lets you turn <strong>existing HTML forms</strong>{" "}
        into WebMCP tools by adding a few attributes —{" "}
        <strong>no JavaScript required</strong> for registration. Below are
        three forms, each demonstrating different features. Open the{" "}
        <em>Model Context Tool Inspector</em> extension to see these tools
        appear automatically.
      </p>

      <div className={decl.grid}>
        {/* ─── FORM 1: Quick Add (toolautosubmit) ─── */}
        <div className={decl.card}>
          <div className={decl.cardHeader}>
            <span className={`${decl.badge} ${decl.badgeAuto}`}>Auto-submit</span>
            <h3>Quick Add to Cart</h3>
          </div>
          <div className={decl.annotation}>
            <div className={decl.annotationTitle}>Attributes used</div>
            <code className={decl.annotationCode}>
              {`<form\n  toolname="quick_add_to_cart"\n  tooldescription="Quickly add a product to the cart by selecting\n    the product and quantity."\n  toolautosubmit\n>`}
            </code>
            <ul className={decl.annotationNotes}>
              <li>
                <code>toolname</code> — registers this form as a tool the agent
                can call
              </li>
              <li>
                <code>tooldescription</code> — tells the agent what this tool
                does
              </li>
              <li>
                <code>toolautosubmit</code> — form submits automatically after
                the agent fills fields (no human click needed)
              </li>
            </ul>
          </div>

          <form
            toolname="quick_add_to_cart"
            tooldescription="Quickly add a product to the shopping cart by selecting a product and quantity. Use this when a user wants to add items to their cart."
            toolautosubmit=""
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const productId = fd.get("product") as string;
              const qty = fd.get("quantity") as string;
              const product = catalog.find((p) => p.id === productId);
              const quantityNum = Math.min(99, Math.max(1, Number(qty) || 1));
              if (product) {
                dispatch({ type: "ADD_TO_CART", productId, quantity: quantityNum });
              }

              const se = e.nativeEvent as SubmitEvent & {
                agentInvoked?: boolean;
                respondWith?: (v: unknown) => void;
              };
              const source = se.agentInvoked ? "Agent" : "Human";

              addLog(
                `submit (${source})`,
                `quick_add_to_cart → ${qty}x "${product?.name ?? productId}"`,
              );

              if (se.agentInvoked && se.respondWith) {
                se.respondWith(
                  Promise.resolve(
                    product
                      ? `Added ${quantityNum}x "${product.name}" to cart. Subtotal: ${formatInr(product.price * quantityNum)}`
                      : `Unknown product: ${productId}`,
                  ),
                );
              }
            }}
            className={forms.declForm}
          >
            <div className={forms.formField}>
              <label htmlFor="qa-product">Product</label>
              <select
                name="product"
                id="qa-product"
                required
                toolparamdescription="The product to add. Use the product ID."
              >
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatInr(p.price)}
                  </option>
                ))}
              </select>
            </div>
            <div className={forms.formField}>
              <label htmlFor="qa-qty">Quantity</label>
              <input
                type="number"
                name="quantity"
                id="qa-qty"
                min={1}
                max={10}
                defaultValue={1}
                toolparamdescription="Number of items to add (1–10)"
              />
            </div>
            <button type="submit" className={btn.btnPrimary}>
              Add to Cart
            </button>
          </form>
        </div>

        {/* ─── FORM 2: Feedback (agentInvoked + respondWith) ─── */}
        <div className={decl.card}>
          <div className={decl.cardHeader}>
            <span className={`${decl.badge} ${decl.badgeManual}`}>Manual submit</span>
            <h3>Submit Product Feedback</h3>
          </div>
          <div className={decl.annotation}>
            <div className={decl.annotationTitle}>Attributes used</div>
            <code className={decl.annotationCode}>
              {`<form\n  toolname="submit_feedback"\n  tooldescription="Submit feedback or a review\n    for a product."\n>`}
            </code>
            <ul className={decl.annotationNotes}>
              <li>
                No <code>toolautosubmit</code> — agent fills the form, but the{" "}
                <strong>user must click Submit</strong>
              </li>
              <li>
                Uses <code>e.agentInvoked</code> to detect agent vs human
                submission
              </li>
              <li>
                Uses <code>e.respondWith()</code> to return structured data back
                to the agent
              </li>
              <li>
                Demonstrates <code>:tool-form-active</code> and{" "}
                <code>:tool-submit-active</code> CSS pseudo-classes (agent
                highlight)
              </li>
            </ul>
          </div>

          <form
            toolname="submit_feedback"
            tooldescription="Submit a product review or feedback. Collects the product, a star rating, and a comment. The user must click Submit to confirm."
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const productId = fd.get("product") as string;
              const rating = fd.get("rating") as string;
              const comment = fd.get("comment") as string;
              const product = catalog.find((p) => p.id === productId);

              const se = e.nativeEvent as SubmitEvent & {
                agentInvoked?: boolean;
                respondWith?: (v: unknown) => void;
              };
              const source = se.agentInvoked ? "Agent" : "Human";
              const msg = `Feedback for "${product?.name}": ${rating}★ — "${comment}"`;

              addLog(`submit (${source})`, msg);
              setFeedbackResult(msg);

              if (se.agentInvoked && se.respondWith) {
                se.respondWith(
                  Promise.resolve({
                    status: "success",
                    product: product?.name,
                    rating,
                    comment,
                  }),
                );
              }

              e.currentTarget.reset();
            }}
            className={forms.declForm}
          >
            <div className={forms.formField}>
              <label htmlFor="fb-product">Product</label>
              <select name="product" id="fb-product" required>
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={forms.formField}>
              <label htmlFor="fb-rating">Rating</label>
              <select
                name="rating"
                id="fb-rating"
                required
                toolparamdescription="Star rating from 1 (worst) to 5 (best)"
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — Average</option>
                <option value="2">2 — Poor</option>
                <option value="1">1 — Terrible</option>
              </select>
            </div>
            <div className={forms.formField}>
              <label htmlFor="fb-comment">Comment</label>
              <textarea
                name="comment"
                id="fb-comment"
                rows={3}
                placeholder="Write your feedback..."
                toolparamdescription="Free-text review or feedback comment"
              />
            </div>
            <button type="submit" className={btn.btnPrimary}>
              Submit Feedback
            </button>
          </form>
          {feedbackResult && (
            <div className={decl.result}>
              <strong>Last submission:</strong> {feedbackResult}
            </div>
          )}
        </div>

        {/* ─── FORM 3: Gift Card (radio, toolparamdescription) ─── */}
        <div className={decl.card}>
          <div className={decl.cardHeader}>
            <span className={`${decl.badge} ${decl.badgeAuto}`}>Auto-submit</span>
            <h3>Purchase Gift Card</h3>
          </div>
          <div className={decl.annotation}>
            <div className={decl.annotationTitle}>Attributes used</div>
            <code className={decl.annotationCode}>
              {`<input type="radio" name="amount"\n  value="500"\n  toolparamdescription="Gift card amount\n    in INR. Choose 500, 1000, or 2000." />\n\n<!-- toolparamdescription on first radio\n     applies to the entire group -->`}
            </code>
            <ul className={decl.annotationNotes}>
              <li>
                <code>toolparamdescription</code> on the{" "}
                <strong>first radio</strong> in a group applies to the whole
                parameter
              </li>
              <li>
                Radio buttons become an <code>enum</code> in the generated JSON
                schema
              </li>
              <li>
                Text inputs get their description from the{" "}
                <code>&lt;label&gt;</code> by default
              </li>
            </ul>
          </div>

          <form
            toolname="purchase_gift_card"
            tooldescription="Purchase a gift card for a specified amount. Requires a recipient email and amount selection."
            toolautosubmit=""
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const email = fd.get("recipient_email") as string;
              const amount = fd.get("amount") as string;
              const message = fd.get("message") as string;

              const se = e.nativeEvent as SubmitEvent & {
                agentInvoked?: boolean;
                respondWith?: (v: unknown) => void;
              };

              console.log("se", se);

              const source = se.agentInvoked ? "Agent" : "Human";

              addLog(
                `submit (${source})`,
                `purchase_gift_card → ${formatInr(Number(amount))} to ${email}${message ? ` ("${message}")` : ""}`,
              );

              if (se.agentInvoked && se.respondWith) {
                se.respondWith(
                  Promise.resolve({
                    status: "success",
                    giftCard: {
                      amount: Number(amount),
                      recipient: email,
                      message,
                    },
                  }),
                );
              }
            }}
            className={forms.declForm}
          >
            <div className={forms.formField}>
              <label htmlFor="gc-email">Recipient email</label>
              <input
                type="email"
                name="recipient_email"
                id="gc-email"
                required
                placeholder="friend@example.com"
              />
            </div>
            <fieldset className={forms.formFieldset}>
              <legend>Amount</legend>
              <div className={forms.radioGroup}>
                <label className={forms.radioLabel}>
                  <input
                    type="radio"
                    name="amount"
                    value="500"
                    defaultChecked
                    toolparamdescription="Gift card amount in INR. Choose 500, 1000, or 2000."
                  />
                  {formatInr(500)}
                </label>
                <label className={forms.radioLabel}>
                  <input type="radio" name="amount" value="1000" />
                  {formatInr(1000)}
                </label>
                <label className={forms.radioLabel}>
                  <input type="radio" name="amount" value="2000" />
                  {formatInr(2000)}
                </label>
              </div>
            </fieldset>
            <div className={forms.formField}>
              <label htmlFor="gc-msg">Personal message (optional)</label>
              <input
                type="text"
                name="message"
                id="gc-msg"
                placeholder="Happy birthday!"
                toolparamdescription="Optional personal message to include with the gift card"
              />
            </div>
            <button type="submit" className={btn.btnPrimary}>
              Send Gift Card
            </button>
          </form>
        </div>
      </div>

      {/* ─── CSS Pseudo-Classes Reference ─── */}
      <div className={decl.cssSection}>
        <h3>CSS Pseudo-Classes for Agent Interactions</h3>
        <p className={decl.cssIntro}>
          When an agent activates a declarative tool, Chrome applies these
          pseudo-classes so you can visually indicate agent activity:
        </p>
        <div className={decl.cssGrid}>
          <div className={decl.cssCard}>
            <code>form:tool-form-active</code>
            <p>Applied to the form while the agent is interacting with it.</p>
            <pre className={decl.cssCode}>{`form:tool-form-active {\n  outline: light-dark(blue, cyan) dashed 1px;\n  outline-offset: -1px;\n}`}</pre>
          </div>
          <div className={decl.cssCard}>
            <code>[type="submit"]:tool-submit-active</code>
            <p>Applied to the submit button during agent interaction.</p>
            <pre className={decl.cssCode}>{`input:tool-submit-active {\n  outline: light-dark(red, pink) dashed 1px;\n  outline-offset: -1px;\n}`}</pre>
          </div>
        </div>
      </div>

      {/* ─── Event Log ─── */}
      <div className={decl.logSection}>
        <div className={decl.logHeader}>
          <h3>Event Log</h3>
          <button type="button" className={decl.btnClear} onClick={() => setLogs([])}>
            Clear
          </button>
        </div>
        <div className={decl.log}>
          {logs.length === 0 && (
            <div className={decl.logEmpty}>
              No events yet. Submit a form or let an agent interact with the
              tools above.
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className={decl.logEntry}>
              <span className={decl.logTime}>{log.time}</span>
              <span
                className={`${decl.logEvent}${log.event.includes("cancel") ? ` ${decl.logEventCancel}` : ""}`}
              >
                {log.event}
              </span>
              <span className={decl.logDetail}>{log.detail}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* ─── Imperative vs Declarative comparison ─── */}
      <div className={decl.comparison}>
        <h3>When to use which?</h3>
        <div className={decl.comparisonGrid}>
          <div className={`${decl.comparisonCol} ${decl.comparisonImperative}`}>
            <h4>Imperative API</h4>
            <ul>
              <li>Full control over execute logic</li>
              <li>Custom async operations</li>
              <li>No form UI needed</li>
              <li>Complex input transformations</li>
              <li>Dynamic tool registration</li>
            </ul>
          </div>
          <div className={`${decl.comparisonCol} ${decl.comparisonDeclarative}`}>
            <h4>Declarative API</h4>
            <ul>
              <li>Zero JavaScript for registration</li>
              <li>Progressively enhance existing forms</li>
              <li>User sees & confirms agent actions</li>
              <li>Browser auto-generates JSON schema</li>
              <li>CSS pseudo-classes for visual feedback</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
