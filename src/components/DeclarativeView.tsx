import { useEffect, useRef, useState } from "react";
import { useStore } from "../store/StoreContext";

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
      <section className="view-section decl-view empty-state">
        <h2 className="view-title">Declarative API — Live Examples</h2>
        <p>Loading product catalog for form demos…</p>
      </section>
    );
  }

  return (
    <section className="view-section decl-view">
      <h2 className="view-title">Declarative API — Live Examples</h2>
      <p className="decl-intro">
        The Declarative API lets you turn <strong>existing HTML forms</strong>{" "}
        into WebMCP tools by adding a few attributes —{" "}
        <strong>no JavaScript required</strong> for registration. Below are
        three forms, each demonstrating different features. Open the{" "}
        <em>Model Context Tool Inspector</em> extension to see these tools
        appear automatically.
      </p>

      <div className="decl-grid">
        {/* ─── FORM 1: Quick Add (toolautosubmit) ─── */}
        <div className="decl-card">
          <div className="decl-card-header">
            <span className="decl-badge auto">Auto-submit</span>
            <h3>Quick Add to Cart</h3>
          </div>
          <div className="decl-annotation">
            <div className="annotation-title">Attributes used</div>
            <code className="annotation-code">
              {`<form\n  toolname="quick_add_to_cart"\n  tooldescription="Quickly add a product to the cart by selecting\n    the product and quantity."\n  toolautosubmit\n>`}
            </code>
            <ul className="annotation-notes">
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
                      ? `Added ${quantityNum}x "${product.name}" to cart. Subtotal: $${(product.price * quantityNum).toFixed(2)}`
                      : `Unknown product: ${productId}`,
                  ),
                );
              }
            }}
            className="decl-form"
          >
            <div className="form-field">
              <label htmlFor="qa-product">Product</label>
              <select
                name="product"
                id="qa-product"
                required
                toolparamdescription="The product to add. Use the product ID."
              >
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
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
            <button type="submit" className="btn-primary">
              Add to Cart
            </button>
          </form>
        </div>

        {/* ─── FORM 2: Feedback (agentInvoked + respondWith) ─── */}
        <div className="decl-card">
          <div className="decl-card-header">
            <span className="decl-badge manual">Manual submit</span>
            <h3>Submit Product Feedback</h3>
          </div>
          <div className="decl-annotation">
            <div className="annotation-title">Attributes used</div>
            <code className="annotation-code">
              {`<form\n  toolname="submit_feedback"\n  tooldescription="Submit feedback or a review\n    for a product."\n>`}
            </code>
            <ul className="annotation-notes">
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
            className="decl-form"
          >
            <div className="form-field">
              <label htmlFor="fb-product">Product</label>
              <select name="product" id="fb-product" required>
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
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
            <div className="form-field">
              <label htmlFor="fb-comment">Comment</label>
              <textarea
                name="comment"
                id="fb-comment"
                rows={3}
                placeholder="Write your feedback..."
                toolparamdescription="Free-text review or feedback comment"
              />
            </div>
            <button type="submit" className="btn-primary">
              Submit Feedback
            </button>
          </form>
          {feedbackResult && (
            <div className="decl-result">
              <strong>Last submission:</strong> {feedbackResult}
            </div>
          )}
        </div>

        {/* ─── FORM 3: Gift Card (radio, toolparamdescription) ─── */}
        <div className="decl-card">
          <div className="decl-card-header">
            <span className="decl-badge auto">Auto-submit</span>
            <h3>Purchase Gift Card</h3>
          </div>
          <div className="decl-annotation">
            <div className="annotation-title">Attributes used</div>
            <code className="annotation-code">
              {`<input type="radio" name="amount"\n  value="25"\n  toolparamdescription="Gift card amount\n    in USD. Choose 25, 50, or 100." />\n\n<!-- toolparamdescription on first radio\n     applies to the entire group -->`}
            </code>
            <ul className="annotation-notes">
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
                `purchase_gift_card → $${amount} to ${email}${message ? ` ("${message}")` : ""}`,
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
            className="decl-form"
          >
            <div className="form-field">
              <label htmlFor="gc-email">Recipient email</label>
              <input
                type="email"
                name="recipient_email"
                id="gc-email"
                required
                placeholder="friend@example.com"
              />
            </div>
            <fieldset className="form-fieldset">
              <legend>Amount</legend>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="amount"
                    value="25"
                    defaultChecked
                    toolparamdescription="Gift card amount in USD. Choose 25, 50, or 100."
                  />
                  $25
                </label>
                <label className="radio-label">
                  <input type="radio" name="amount" value="50" />
                  $50
                </label>
                <label className="radio-label">
                  <input type="radio" name="amount" value="100" />
                  $100
                </label>
              </div>
            </fieldset>
            <div className="form-field">
              <label htmlFor="gc-msg">Personal message (optional)</label>
              <input
                type="text"
                name="message"
                id="gc-msg"
                placeholder="Happy birthday!"
                toolparamdescription="Optional personal message to include with the gift card"
              />
            </div>
            <button type="submit" className="btn-primary">
              Send Gift Card
            </button>
          </form>
        </div>
      </div>

      {/* ─── CSS Pseudo-Classes Reference ─── */}
      <div className="decl-css-section">
        <h3>CSS Pseudo-Classes for Agent Interactions</h3>
        <p className="decl-css-intro">
          When an agent activates a declarative tool, Chrome applies these
          pseudo-classes so you can visually indicate agent activity:
        </p>
        <div className="decl-css-grid">
          <div className="decl-css-card">
            <code>form:tool-form-active</code>
            <p>Applied to the form while the agent is interacting with it.</p>
            <pre className="decl-css-code">{`form:tool-form-active {\n  outline: light-dark(blue, cyan) dashed 1px;\n  outline-offset: -1px;\n}`}</pre>
          </div>
          <div className="decl-css-card">
            <code>[type="submit"]:tool-submit-active</code>
            <p>Applied to the submit button during agent interaction.</p>
            <pre className="decl-css-code">{`input:tool-submit-active {\n  outline: light-dark(red, pink) dashed 1px;\n  outline-offset: -1px;\n}`}</pre>
          </div>
        </div>
      </div>

      {/* ─── Event Log ─── */}
      <div className="decl-log-section">
        <div className="decl-log-header">
          <h3>Event Log</h3>
          <button className="btn-clear" onClick={() => setLogs([])}>
            Clear
          </button>
        </div>
        <div className="decl-log">
          {logs.length === 0 && (
            <div className="log-empty">
              No events yet. Submit a form or let an agent interact with the
              tools above.
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="log-entry">
              <span className="log-time">{log.time}</span>
              <span
                className={`log-event ${log.event.includes("cancel") ? "cancel" : ""}`}
              >
                {log.event}
              </span>
              <span className="log-detail">{log.detail}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* ─── Imperative vs Declarative comparison ─── */}
      <div className="decl-comparison">
        <h3>When to use which?</h3>
        <div className="comparison-grid">
          <div className="comparison-col imperative">
            <h4>Imperative API</h4>
            <ul>
              <li>Full control over execute logic</li>
              <li>Custom async operations</li>
              <li>No form UI needed</li>
              <li>Complex input transformations</li>
              <li>Dynamic tool registration</li>
            </ul>
          </div>
          <div className="comparison-col declarative">
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
