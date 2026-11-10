import type { ReactNode } from "react";

/** Keep the storefront responsive; do not block every navigation with a timed splash screen. */
export default function AppContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
