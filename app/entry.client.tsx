/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// Global error handling for unhandled client errors
window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error);
  
  // Prevent the app from crashing by handling errors gracefully
  event.preventDefault();
  
  // Optionally show a user-friendly error message
  if (!document.getElementById("global-error-banner")) {
    const errorBanner = document.createElement("div");
    errorBanner.id = "global-error-banner";
    errorBanner.style.position = "fixed";
    errorBanner.style.bottom = "0";
    errorBanner.style.left = "0";
    errorBanner.style.right = "0";
    errorBanner.style.padding = "10px";
    errorBanner.style.backgroundColor = "rgba(220, 38, 38, 0.9)";
    errorBanner.style.color = "white";
    errorBanner.style.textAlign = "center";
    errorBanner.style.zIndex = "9999";
    errorBanner.innerHTML = `
      <p>Something went wrong. <button id="reload-btn" style="text-decoration: underline; margin-left: 5px;">Reload</button></p>
    `;
    document.body.appendChild(errorBanner);
    
    document.getElementById("reload-btn")?.addEventListener("click", () => {
      window.location.reload();
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      const banner = document.getElementById("global-error-banner");
      if (banner && banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 10000);
  }
});

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

// Add a custom reconnect handler for WebSocket connections
window.reconnectWebSocket = (url, options = {}) => {
  const { maxAttempts = 5, delay = 2000, backoff = 1.5 } = options;
  
  let attempts = 0;
  let currentDelay = delay;
  
  const connect = () => {
    attempts++;
    console.log(`WebSocket reconnect attempt ${attempts}/${maxAttempts}`);
    
    const socket = new WebSocket(url);
    
    socket.onopen = () => {
      console.log("WebSocket reconnected successfully");
      attempts = 0;
      currentDelay = delay;
      
      if (options.onReconnect) {
        options.onReconnect(socket);
      }
    };
    
    socket.onclose = (event) => {
      if (event.code === 1000) {
        console.log("WebSocket closed cleanly");
        return;
      }
      
      if (attempts < maxAttempts) {
        console.log(`WebSocket closed, reconnecting in ${currentDelay}ms...`);
        setTimeout(() => {
          currentDelay = Math.min(currentDelay * backoff, 30000); // Cap at 30 seconds
          connect();
        }, currentDelay);
      } else {
        console.error("Max reconnect attempts reached, giving up");
        if (options.onFail) {
          options.onFail();
        }
      }
    };
    
    return socket;
  };
  
  return connect();
};

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
