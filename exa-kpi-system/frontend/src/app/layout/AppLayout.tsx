import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../sidebar/Sidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const keepPaginationControlsInView = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
        '[class*="pagination"] button',
      );
      if (!button || button.disabled) return;
      const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`;
      if (!/previous|next/i.test(label)) return;
      const initialTop = button.getBoundingClientRect().top;

      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const verticalShift = button.getBoundingClientRect().top - initialTop;
          if (verticalShift) window.scrollBy({ top: verticalShift, behavior: "auto" });
          button.focus({ preventScroll: true });
        });
      });
    };

    document.addEventListener("click", keepPaginationControlsInView);
    return () => {
      document.removeEventListener("click", keepPaginationControlsInView);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        theme={theme}
        mobileOpen={mobileNavigationOpen}
        onThemeChange={setTheme}
        onNavigate={() => setMobileNavigationOpen(false)}
      />
      {mobileNavigationOpen && <button className="sidebar-mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavigationOpen(false)} />}
      <div className="app-workspace">
        <AppHeader theme={theme} onThemeChange={setTheme} onMenuClick={() => setMobileNavigationOpen(true)} />
        <section className="app-content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
