import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, Languages, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";

type AppHeaderProps = {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onMenuClick: () => void;
};

export function AppHeader({
  theme,
  onThemeChange,
  onMenuClick,
}: AppHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="ems-app-header">
      <button
        type="button"
        className="ems-header-icon ems-mobile-menu"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu size={21} />
      </button>

      <nav className="ems-header-actions" aria-label="Application controls">
        <button type="button" className="ems-header-icon" aria-label="Language">
          <Languages size={18} />
          <span className="ems-header-language">EN</span>
        </button>
        <button
          type="button"
          className="ems-header-icon"
          aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}
          onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button type="button" className="ems-header-icon ems-notification" aria-label="Notifications">
          <Bell size={18} />
          <span />
        </button>
        <div className="ems-header-divider" />
        <div className="ems-header-user-menu" ref={profileRef}>
          <button
            type="button"
            className="ems-header-user"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="ems-header-user-copy">
              <strong>Carlos Gomez</strong>
              <span>Administrator</span>
            </span>
            <span className="ems-user-avatar"><UserRound size={18} /></span>
            <ChevronDown size={15} />
          </button>
          {profileOpen && (
            <div className="ems-header-user-dropdown" role="menu">
              <Link role="menuitem" to="/app/roles-users/profile" onClick={() => setProfileOpen(false)}>
                <UserRound size={16} /> My Profile
              </Link>
              <Link role="menuitem" to="/app/logout" onClick={() => setProfileOpen(false)}>
                <LogOut size={16} /> Log Out
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
