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
