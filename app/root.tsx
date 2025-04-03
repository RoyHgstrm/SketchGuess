import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse
} from "@remix-run/react";
import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import { WebSocketProvider } from "./context/WebSocketContext";
import ConnectionStatus from "./components/ConnectionStatus";

import "./tailwind.css";
import animationsStyle from "~/styles/animations.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: animationsStyle },
];

// Add Error Boundary component
export function ErrorBoundary() {
  const error = useRouteError();
  let status = 500;
  let message = "Something went wrong! Please try refreshing the page.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = error.data || error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Check if it's a network error
  const isNetworkError = 
    error instanceof Error && 
    (error.message.includes('network') || 
     error.message.includes('connection') || 
     error.message.toLowerCase().includes('failed to fetch'));

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{status === 404 ? 'Page Not Found' : 'Application Error'} | SketchGuess</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen flex flex-col">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{status === 404 ? 'Page Not Found' : 'Application Error'}</h1>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {message}
            </p>
            
            <div className="space-y-4">
              {status === 404 ? (
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  Go to Home
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                  >
                    Refresh Page
                  </button>
                  
                  {isNetworkError && (
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                      <p>It looks like you may be having connection issues. Please check your internet connection and try again.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <WebSocketProvider>
          {children}
          <ConnectionStatus />
        </WebSocketProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
