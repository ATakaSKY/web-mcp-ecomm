import { useEffect, useRef } from "react";
import { products } from "../data/products";
import type { CartItem } from "../types";

/**
 * Registers WebMCP tools with navigator.modelContext so AI agents
 * can interact with the shop programmatically.
 *
 * Each tool follows the imperative API pattern:
 *   navigator.modelContext.registerTool({ name, description, inputSchema, execute })
 *
 * We pass the current state + dispatch via refs so the execute callbacks
 * always see fresh values without re-registering on every render.
 */
export function useWebMCP(
  cart: CartItem[],
  wishlist: string[],
  dispatch: React.Dispatch<any>
) {
  const cartRef = useRef(cart);
  const wishlistRef = useRef(wishlist);
  cartRef.current = cart;
  wishlistRef.current = wishlist;

  useEffect(() => {
    const mc = navigator.modelContext;
    if (!mc) {
      console.warn(
        "[WebMCP] navigator.modelContext not available. " +
        "Enable the flag in chrome://flags/#enable-webmcp-testing (Chrome 146+)."
      );
      return;
    }

    const toolNames: string[] = [];

    function register(tool: ModelContextToolDefinition) {
      mc!.registerTool(tool);
      toolNames.push(tool.name);
      console.log(`[WebMCP] Registered tool: ${tool.name}`);
    }

    // ─── TOOL 1: add_to_cart ────────────────────────────────────────
    register({
      name: "add_to_cart",
      description:
        "Add a product to the shopping cart. Use a product ID from the catalog. " +
        "Optionally specify quantity (defaults to 1).",
      inputSchema: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "The product ID to add to the cart.",
            enum: products.map((p) => p.id),
          },
          quantity: {
            type: "number",
            description: "How many units to add. Defaults to 1.",
          },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const id = args.product_id as string;
        const qty = (args.quantity as number) || 1;
        const product = products.find((p) => p.id === id);

        if (!product) {
          return {
            content: [{ type: "text", text: `Error: product "${id}" not found. Valid IDs: ${products.map((p) => p.id).join(", ")}` }],
          };
        }

        if (qty < 1 || qty > 99) {
          return {
            content: [{ type: "text", text: `Error: quantity must be between 1 and 99.` }],
          };
        }

        dispatch({ type: "ADD_TO_CART", productId: id, quantity: qty });

        return {
          content: [{ type: "text", text: `Added ${qty}x "${product.name}" to cart. Price: $${(product.price * qty).toFixed(2)}` }],
        };
      },
    });

    // ─── TOOL 2: remove_from_cart ───────────────────────────────────
    register({
      name: "remove_from_cart",
      description:
        "Remove a product entirely from the shopping cart by its product ID.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "The product ID to remove from the cart.",
            enum: products.map((p) => p.id),
          },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const id = args.product_id as string;
        const inCart = cartRef.current.some((i) => i.product.id === id);

        if (!inCart) {
          return {
            content: [{ type: "text", text: `Error: product "${id}" is not in the cart.` }],
          };
        }

        dispatch({ type: "REMOVE_FROM_CART", productId: id });

        const product = products.find((p) => p.id === id)!;
        return {
          content: [{ type: "text", text: `Removed "${product.name}" from cart.` }],
        };
      },
    });

    // ─── TOOL 3: toggle_wishlist ────────────────────────────────────
    register({
      name: "toggle_wishlist",
      description:
        "Add a product to the wishlist if it's not there, or remove it if it already is. " +
        "Works as a toggle.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "The product ID to toggle in the wishlist.",
            enum: products.map((p) => p.id),
          },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const id = args.product_id as string;
        const product = products.find((p) => p.id === id);

        if (!product) {
          return {
            content: [{ type: "text", text: `Error: product "${id}" not found.` }],
          };
        }

        const wasWishlisted = wishlistRef.current.includes(id);
        dispatch({ type: "TOGGLE_WISHLIST", productId: id });

        const action = wasWishlisted ? "Removed from" : "Added to";
        return {
          content: [{ type: "text", text: `${action} wishlist: "${product.name}".` }],
        };
      },
    });

    // ─── TOOL 4: purchase ───────────────────────────────────────────
    register({
      name: "purchase",
      description:
        "Complete the purchase of all items currently in the cart. " +
        "Clears the cart and places the order. " +
        "Only call this when the user explicitly wants to check out.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: () => {
        const currentCart = cartRef.current;

        if (currentCart.length === 0) {
          return {
            content: [{ type: "text", text: "Error: cart is empty. Add items before purchasing." }],
          };
        }

        const total = currentCart.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        );
        const summary = currentCart
          .map((i) => `${i.quantity}x ${i.product.name}`)
          .join(", ");

        dispatch({ type: "PURCHASE" });

        return {
          content: [{
            type: "text",
            text: `Order placed! Items: ${summary}. Total: $${total.toFixed(2)}. Thank you for your purchase!`,
          }],
        };
      },
    });

    // ─── TOOL 5: get_cart ───────────────────────────────────────────
    register({
      name: "get_cart",
      description:
        "View the current contents of the shopping cart, including quantities and prices.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: () => {
        const currentCart = cartRef.current;

        if (currentCart.length === 0) {
          return {
            content: [{ type: "text", text: "The cart is empty." }],
          };
        }

        const lines = currentCart.map(
          (i) =>
            `• ${i.quantity}x ${i.product.name} — $${(i.product.price * i.quantity).toFixed(2)}`
        );
        const total = currentCart.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        );
        lines.push(`\nTotal: $${total.toFixed(2)}`);

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      },
    });

    // ─── TOOL 6: get_products ───────────────────────────────────────
    register({
      name: "get_products",
      description:
        "List all available products in the catalog with their IDs, names, and prices. " +
        "Use the returned product IDs with other tools.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Optional category filter.",
            enum: [...new Set(products.map((p) => p.category))],
          },
        },
      },
      execute: (args) => {
        const category = args.category as string | undefined;
        const filtered = category
          ? products.filter((p) => p.category === category)
          : products;

        const lines = filtered.map(
          (p) => `• [${p.id}] ${p.name} — $${p.price.toFixed(2)} (${p.category})`
        );

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      },
    });

    // ─── TOOL 7: open_quick_buy ────────────────────────────────────
    // This tool opens a modal with a complex checkout form.
    // The modal contains a DECLARATIVE tool (complete_quick_buy) that
    // only registers when the modal is in the DOM — demonstrating
    // dynamic tool lifecycle tied to UI state.
    register({
      name: "open_quick_buy",
      description:
        "Open the Quick Buy modal for a specific product. This shows a checkout " +
        "form where the user (or agent) can fill in shipping address, shipping method, " +
        "gift options, and payment. Once open, a separate tool called 'complete_quick_buy' " +
        "becomes available to fill and submit the checkout form.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "The product ID to open the Quick Buy modal for.",
            enum: products.map((p) => p.id),
          },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const id = args.product_id as string;
        const product = products.find((p) => p.id === id);

        if (!product) {
          return {
            content: [{
              type: "text",
              text: `Error: product "${id}" not found. Valid IDs: ${products.map((p) => p.id).join(", ")}`,
            }],
          };
        }

        dispatch({ type: "OPEN_QUICK_BUY", productId: id });

        return {
          content: [{
            type: "text",
            text: `Quick Buy modal opened for "${product.name}" ($${product.price.toFixed(2)}). ` +
              `A new tool "complete_quick_buy" is now available to fill in the checkout form.`,
          }],
        };
      },
    });

    // Cleanup: unregister all tools on unmount
    return () => {
      for (const name of toolNames) {
        try {
          mc.unregisterTool(name);
          console.log(`[WebMCP] Unregistered tool: ${name}`);
        } catch {
          // tool may already be gone
        }
      }
    };
  }, [dispatch]);
}
