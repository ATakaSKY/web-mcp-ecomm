import type { Product } from "../types/index.js";

/** Demo catalog — prices are in Indian Rupees (INR). */
export const products: Product[] = [
  {
    id: "mech-kb-1",
    name: "Mechanical Keyboard TKL",
    description: "Compact tenkeyless mechanical keyboard with hot-swappable switches and RGB backlighting.",
    price: 10999,
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=300&fit=crop",
    category: "Peripherals",
  },
  {
    id: "monitor-1",
    name: '27" 4K IPS Monitor',
    description: "Ultra-sharp 27-inch 4K IPS display with USB-C connectivity and 99% sRGB coverage.",
    price: 42999,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop",
    category: "Displays",
  },
  {
    id: "mouse-1",
    name: "Ergonomic Wireless Mouse",
    description: "Lightweight ergonomic mouse with 20K DPI sensor and 70-hour battery life.",
    price: 6499,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop",
    category: "Peripherals",
  },
  {
    id: "headphones-1",
    name: "Studio Headphones",
    description: "Over-ear studio headphones with active noise cancellation and 40mm drivers.",
    price: 19999,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    category: "Audio",
  },
  {
    id: "webcam-1",
    name: "4K Streaming Webcam",
    description: "Ultra HD webcam with auto-focus, built-in ring light, and noise-cancelling mic.",
    price: 13999,
    image: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=300&fit=crop",
    category: "Peripherals",
  },
  {
    id: "usb-hub-1",
    name: "USB-C Docking Station",
    description: "12-in-1 USB-C dock with dual HDMI, Ethernet, SD reader, and 100W pass-through charging.",
    price: 7499,
    image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&h=300&fit=crop",
    category: "Accessories",
  },
];
