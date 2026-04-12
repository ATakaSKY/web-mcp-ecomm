import { useEffect, useLayoutEffect, useRef } from "react";
import type { Dispatch } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase } from "../lib/apiBase";
import { formatInr } from "../lib/formatPrice";
import type { CartItem, Product } from "../types";
import type { StoreAction } from "../types";

/**
 * Registers WebMCP tools when the catalog is loaded. Tool definitions use
 * string `product_id` (no enum) so they stay valid as the API catalog changes;
 * agents should call get_products or list_products for current IDs.
 */
export function useWebMCP(
  cart: CartItem[],
  wishlist: string[],
  dispatch: Dispatch<StoreAction>,
  products: Product[] | null,
  checkoutPath: string,
) {
  const navigate = useNavigate();
  const cartRef = useRef(cart);
  const wishlistRef = useRef(wishlist);
  const productsRef = useRef(products);
  const navigateRef = useRef(navigate);
  const checkoutPathRef = useRef(checkoutPath);

  useLayoutEffect(() => {
    navigateRef.current = navigate;
    checkoutPathRef.current = checkoutPath;
  }, [navigate, checkoutPath]);

  useLayoutEffect(() => {
    cartRef.current = cart;
    wishlistRef.current = wishlist;
    productsRef.current = products;
  }, [cart, wishlist, products]);

  useEffect(() => {
    const mc = navigator.modelContext;
    if (!mc) {
      console.warn(
        "[WebMCP] navigator.modelContext not available. " +
          "Enable the flag in chrome://flags/#enable-webmcp-testing (Chrome 146+).",
      );
      return;
    }

    const catalog = productsRef.current;
    if (!catalog?.length) return;

    const toolNames: string[] = [];
    const controller = new AbortController();
    const categories = [...new Set(catalog.map((p) => p.category))];

    function register(tool: ModelContextToolDefinition) {
      mc!.registerTool(tool, { signal: controller.signal });
      toolNames.push(tool.name);
      console.log(`[WebMCP] Registered tool: ${tool.name}`);
    }

    register({
      name: "add_to_cart",
      description:
        "Add a product to the shopping cart. Use product_id from get_products or list_products.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: {
            type: "string",
            description: "Product id from the current catalog.",
          },
          quantity: {
            type: "number",
            description: "How many units to add. Defaults to 1.",
          },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const list = productsRef.current ?? [];
        const id = args.product_id as string;
        const qty = (args.quantity as number) || 1;
        const product = list.find((p) => p.id === id);
        if (!product) {
          return {
            content: [
              {
                type: "text",
                text: `Error: product "${id}" not found. Call get_products for valid IDs.`,
              },
            ],
          };
        }
        if (qty < 1 || qty > 99) {
          return {
            content: [{ type: "text", text: `Error: quantity must be between 1 and 99.` }],
          };
        }
        dispatch({ type: "ADD_TO_CART", productId: id, quantity: qty });
        return {
          content: [
            {
              type: "text",
                text: `Added ${qty}x "${product.name}" to cart. Price: ${formatInr(product.price * qty)}`,
            },
          ],
        };
      },
    });

    register({
      name: "remove_from_cart",
      description: "Remove a product entirely from the shopping cart by its product ID.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product ID to remove from the cart." },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const list = productsRef.current ?? [];
        const id = args.product_id as string;
        if (!cartRef.current.some((i) => i.product.id === id)) {
          return {
            content: [{ type: "text", text: `Error: product "${id}" is not in the cart.` }],
          };
        }
        dispatch({ type: "REMOVE_FROM_CART", productId: id });
        const product = list.find((p) => p.id === id)!;
        return {
          content: [{ type: "text", text: `Removed "${product.name}" from cart.` }],
        };
      },
    });

    register({
      name: "toggle_wishlist",
      description:
        "Add a product to the wishlist if it's not there, or remove it if it already is.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product ID to toggle in the wishlist." },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const list = productsRef.current ?? [];
        const id = args.product_id as string;
        const product = list.find((p) => p.id === id);
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

    register({
      name: "purchase",
      description:
        "Place an order for all items in the cart via POST /api/orders (requires DATABASE_URL on the server). " +
        "Clears the cart and shows checkout on success. Only call when the user explicitly wants to check out.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const currentCart = cartRef.current;
        if (currentCart.length === 0) {
          return {
            content: [{ type: "text", text: "Error: cart is empty. Add items before purchasing." }],
          };
        }
        const total = currentCart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        const summary = currentCart.map((i) => `${i.quantity}x ${i.product.name}`).join(", ");
        try {
          const res = await fetch(`${getApiBase()}/api/orders`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lines: currentCart.map((i) => ({
                productId: i.product.id,
                quantity: i.quantity,
              })),
            }),
          });
          const data = (await res.json()) as { error?: string; orderId?: string };
          if (!res.ok) {
            return {
              content: [
                {
                  type: "text",
                  text: `Order failed: ${data.error ?? res.statusText}. Is the API running with DATABASE_URL?`,
                },
              ],
            };
          }
          if (!data.orderId) {
            return {
              content: [{ type: "text", text: "Order failed: invalid server response." }],
            };
          }
          dispatch({ type: "PURCHASE_SUCCESS", orderId: data.orderId });
          navigateRef.current(checkoutPathRef.current, { replace: true });
          return {
            content: [
              {
                type: "text",
                text: `Order placed! Order id: ${data.orderId}. Items: ${summary}. Total: ${formatInr(total)}`,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "Network error placing order. Use vercel dev with DATABASE_URL for local API.",
              },
            ],
          };
        }
      },
    });

    register({
      name: "get_cart",
      description: "View the current shopping cart with quantities and prices.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        const currentCart = cartRef.current;
        if (currentCart.length === 0) {
          return { content: [{ type: "text", text: "The cart is empty." }] };
        }
        const lines = currentCart.map(
          (i) =>
            `• ${i.quantity}x ${i.product.name} — ${formatInr(i.product.price * i.quantity)}`,
        );
        const total = currentCart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        lines.push(`\nTotal: ${formatInr(total)}`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      },
    });

    register({
      name: "get_products",
      description:
        "List all products with IDs, names, and prices in INR. Use these IDs with other tools.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Optional category filter.",
            ...(categories.length > 0 ? { enum: categories } : {}),
          },
        },
      },
      execute: (args) => {
        const list = productsRef.current ?? [];
        const category = args.category as string | undefined;
        const filtered = category ? list.filter((p) => p.category === category) : list;
        const lines = filtered.map(
          (p) => `• [${p.id}] ${p.name} — ${formatInr(p.price)} (${p.category})`,
        );
        return { content: [{ type: "text", text: lines.join("\n") }] };
      },
    });

    register({
      name: "list_products",
      description:
        "Compact catalog listing (same data as get_products). Use when you only need IDs and names.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        const list = productsRef.current ?? [];
        const lines = list.map(
          (p) => `• [${p.id}] ${p.name} — ${formatInr(p.price)} (${p.category})`,
        );
        return { content: [{ type: "text", text: lines.join("\n") }] };
      },
    });

    register({
      name: "open_quick_buy",
      description:
        "Open the Quick Buy modal for a product. When open, declarative tool complete_quick_buy is available.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product ID for Quick Buy." },
        },
        required: ["product_id"],
      },
      execute: (args) => {
        const list = productsRef.current ?? [];
        const id = args.product_id as string;
        const product = list.find((p) => p.id === id);
        if (!product) {
          return {
            content: [
              {
                type: "text",
                text: `Error: product "${id}" not found. Call get_products for valid IDs.`,
              },
            ],
          };
        }
        dispatch({ type: "OPEN_QUICK_BUY", productId: id });
        return {
          content: [
            {
              type: "text",
              text:
                `Quick Buy opened for "${product.name}" (${formatInr(product.price)}). ` +
                `Use complete_quick_buy to fill the form.`,
            },
          ],
        };
      },
    });

    return () => {
      for (const name of toolNames) {
        try {
          mc!.unregisterTool?.(name);
          console.log(`[WebMCP] Unregistered tool: ${name}`);
        } catch {
          // ignore
        }
      }
      controller.abort();
    };
  }, [dispatch, products, checkoutPath]);
}
