import React, { createContext, useContext, useMemo } from "react";
import { isWebMCPAvailable, isWebMCPTestingAvailable } from "./utils/modelContext";

interface WebMCPContextValue {
  /** Whether document.modelContext (or the legacy navigator.modelContext) is available. */
  available: boolean;
  /**
   * Whether the legacy navigator.modelContextTesting API is available.
   * @deprecated Removed in Chrome 152; always false on current browsers.
   */
  testingAvailable: boolean;
}

const WebMCPReactContext = createContext<WebMCPContextValue>({
  available: false,
  testingAvailable: false,
});

/**
 * Provides WebMCP availability information to the component tree.
 *
 * Wrap your application (or a subtree) with `<WebMCPProvider>` to let
 * child components check WebMCP availability via the `useWebMCPStatus` hook.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <WebMCPProvider>
 *       <MyComponent />
 *     </WebMCPProvider>
 *   );
 * }
 * ```
 */
export function WebMCPProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<WebMCPContextValue>(
    () => ({
      available: isWebMCPAvailable(),
      testingAvailable: isWebMCPTestingAvailable(),
    }),
    [],
  );

  return (
    <WebMCPReactContext.Provider value={value}>
      {children}
    </WebMCPReactContext.Provider>
  );
}

/**
 * Returns the current WebMCP availability status.
 *
 * Must be used within a `<WebMCPProvider>`.
 *
 * @example
 * ```tsx
 * function StatusBadge() {
 *   const { available } = useWebMCPStatus();
 *   return <span>{available ? "WebMCP Ready" : "WebMCP Not Available"}</span>;
 * }
 * ```
 */
export function useWebMCPStatus(): WebMCPContextValue {
  return useContext(WebMCPReactContext);
}
