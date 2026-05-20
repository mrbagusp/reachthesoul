"use client";
import { useEffect, useCallback, createContext, useContext, useState } from "react";

// ─── Paddle.js Client-Side Integration ─────────────────────────────
// Loads Paddle.js overlay checkout. Works without @paddle/paddle-js
// npm package — we load the script directly for simplicity.
// See: https://developer.paddle.com/paddlejs/overview

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: "sandbox" | "production") => void;
      };
      Setup: (options: { token: string; eventCallback?: (event: any) => void }) => void;
      Checkout: {
        open: (options: {
          transactionId?: string;
          items?: { priceId: string; quantity: number }[];
          customer?: { email?: string };
          customData?: Record<string, string>;
          settings?: {
            allowLogout?: boolean;
            displayMode?: "overlay" | "inline";
            successUrl?: string;
            theme?: "light" | "dark";
          };
        }) => void;
      };
      Initialized: boolean;
    };
  }
}

interface PaddleContextType {
  openCheckout: (options: {
    transactionId?: string;
    priceId?: string;
    customerEmail?: string;
    customData?: Record<string, string>;
    successUrl?: string;
  }) => void;
  isReady: boolean;
}

const PaddleContext = createContext<PaddleContextType>({
  openCheckout: () => {},
  isReady: false,
});

export function usePaddle() {
  return useContext(PaddleContext);
}

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!clientToken) {
      console.warn("[Paddle] No NEXT_PUBLIC_PADDLE_CLIENT_TOKEN set");
      return;
    }

    // Check if already loaded
    if (window.Paddle?.Initialized) {
      setIsReady(true);
      return;
    }

    // Load Paddle.js script
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox";
        if (paddleEnv === "sandbox") {
          window.Paddle.Environment.set("sandbox");
        }
        window.Paddle.Setup({
          token: clientToken,
          eventCallback: (event: any) => {
            if (event.name === "checkout.completed") {
              console.log("[Paddle] Checkout completed:", event.data);
              // Reload page to reflect subscription changes
              setTimeout(() => {
                window.location.href = "/dashboard/billing?upgraded=true";
              }, 2000);
            }
          },
        });
        setIsReady(true);
        console.log("[Paddle] Initialized in", paddleEnv, "mode");
      }
    };
    script.onerror = () => {
      console.error("[Paddle] Failed to load Paddle.js");
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove — Paddle.js is singleton
    };
  }, []);

  const openCheckout = useCallback(
    (options: {
      transactionId?: string;
      priceId?: string;
      customerEmail?: string;
      customData?: Record<string, string>;
      successUrl?: string;
    }) => {
      if (!window.Paddle) {
        console.error("[Paddle] Paddle.js not loaded");
        return;
      }

      const checkoutOpts: any = {
        settings: {
          allowLogout: false,
          displayMode: "overlay",
          theme: "light",
        },
      };

      // Option 1: Open with transactionId (from server-created transaction)
      if (options.transactionId) {
        checkoutOpts.transactionId = options.transactionId;
      }
      // Option 2: Open with priceId (direct client-side)
      else if (options.priceId) {
        checkoutOpts.items = [{ priceId: options.priceId, quantity: 1 }];
      }

      if (options.customerEmail) {
        checkoutOpts.customer = { email: options.customerEmail };
      }

      if (options.customData) {
        checkoutOpts.customData = options.customData;
      }

      if (options.successUrl) {
        checkoutOpts.settings.successUrl = options.successUrl;
      }

      window.Paddle.Checkout.open(checkoutOpts);
    },
    []
  );

  return (
    <PaddleContext.Provider value={{ openCheckout, isReady }}>
      {children}
    </PaddleContext.Provider>
  );
}
