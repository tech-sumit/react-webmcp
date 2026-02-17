import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./index.css";
import { seedDatabase } from "./lib/db/seed";
import { waitForDb } from "./lib/db/database";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create router instance
const router = createRouter({ routeTree });

// Register the router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Initialize app
(async () => {
  try {
    await waitForDb();
    await seedDatabase();

    const rootElement = document.getElementById("root");
    if (!rootElement) throw new Error("Root element not found");

    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Failed to initialize application:", error);
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem;font-family:system-ui">
          <h1 style="color:#ef4444;margin-bottom:1rem">Failed to Initialize</h1>
          <p style="color:#666">${error instanceof Error ? error.message : "Unknown error"}</p>
          <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid #ddd;cursor:pointer">
            Reload Page
          </button>
        </div>
      `;
    }
  }
})();
