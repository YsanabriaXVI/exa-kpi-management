import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Moon, MoreVertical, Sun } from "lucide-react";
import {
  NavigationItem,
  navigationItems,
  sessionItems,
} from "../navigation/sidebar.config";

type ExpandedMap = Record<string, boolean>;
type SidebarProps = {
  theme: "light" | "dark";
  mobileOpen: boolean;
  onThemeChange: (theme: "light" | "dark") => void;
  onNavigate: () => void;
};

function pathMatches(itemPath: string, pathname: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function hasExactActiveChild(item: NavigationItem, pathname: string): boolean {
  return (
    item.children?.some((child) => {
      if (pathMatches(child.path, pathname)) return true;
      return hasExactActiveChild(child, pathname);
    }) ?? false
  );
}

function isExactSelected(item: NavigationItem, pathname: string): boolean {
  if (!pathMatches(item.path, pathname)) return false;

  /*
    Evita que se marquen padre e hijo como "selected" exacto
    cuando ambos usan la misma ruta, por ejemplo:
    Pool KPIs -> KPI Pool Overview.
  */
  return !hasExactActiveChild(item, pathname);
}

function isBranchActive(item: NavigationItem, pathname: string): boolean {
  if (pathMatches(item.path, pathname)) return true;

  return item.children?.some((child) => isBranchActive(child, pathname)) ?? false;
}

function getInitialExpandedItems(pathname: string): ExpandedMap {
  const expanded: ExpandedMap = {};

  function visit(item: NavigationItem) {
    if (item.children?.length && isBranchActive(item, pathname)) {
      expanded[item.id] = true;
    }

    item.children?.forEach(visit);
  }

  navigationItems.forEach(visit);

  return expanded;
}

function getDescendantIds(item: NavigationItem): string[] {
  const ids: string[] = [];

  function visit(node: NavigationItem) {
    node.children?.forEach((child) => {
      ids.push(child.id);
      visit(child);
    });
  }

  visit(item);

  return ids;
}

type SidebarNodeProps = {
  item: NavigationItem;
  siblings: NavigationItem[];
  level?: number;
  expanded: ExpandedMap;
  onToggle: (item: NavigationItem, siblings: NavigationItem[]) => void;
  onNavigate: () => void;
};

function SidebarNode({
  item,
  siblings,
  level = 0,
  expanded,
  onToggle,
  onNavigate,
}: SidebarNodeProps) {
  const location = useLocation();

  const hasChildren = Boolean(item.children?.length);
  const isOpen = Boolean(expanded[item.id]);

  const selected = isExactSelected(item, location.pathname);
  const childSelected = hasExactActiveChild(item, location.pathname);
  const branchActive = isBranchActive(item, location.pathname);

  const Icon = item.icon;

  const rowClassName = [
    "sidebar-row",
    selected ? "sidebar-row-selected" : "",
    childSelected && !selected ? "sidebar-row-parent-selected" : "",
    isOpen && !selected && !childSelected ? "sidebar-row-open" : "",
    branchActive && !selected ? "sidebar-row-branch-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={`sidebar-node sidebar-node-level-${level}`}>
      <div className="sidebar-row-wrapper">
        <Link
          to={item.path}
          className={rowClassName}
          onClick={() => {
            if (hasChildren) {
              onToggle(item, siblings);
            } else {
              onNavigate();
            }
          }}
        >
          <span className="sidebar-icon-slot">
            {Icon ? <Icon size={18} /> : null}
          </span>

          <span className="sidebar-label">{item.label}</span>

          {hasChildren ? (
            <ChevronDown
              size={14}
              className={`sidebar-chevron ${isOpen ? "open" : ""}`}
            />
          ) : null}
        </Link>
      </div>

      {hasChildren ? (
        <ul className={`sidebar-children ${isOpen ? "is-open" : "is-closed"}`}>
          {item.children!.map((child) => (
            <SidebarNode
              key={child.id}
              item={child}
              siblings={item.children!}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function Sidebar({ theme, mobileOpen, onThemeChange, onNavigate }: SidebarProps) {
  const location = useLocation();

  const initialExpanded = useMemo(
    () => getInitialExpandedItems(location.pathname),
    [],
  );

  const [expanded, setExpanded] = useState<ExpandedMap>(initialExpanded);

  function toggleItem(item: NavigationItem, siblings: NavigationItem[]) {
    setExpanded((current) => {
      const next: ExpandedMap = { ...current };
      const isCurrentlyOpen = Boolean(current[item.id]);

      function closeBranch(node: NavigationItem) {
        delete next[node.id];

        for (const descendantId of getDescendantIds(node)) {
          delete next[descendantId];
        }
      }

      if (isCurrentlyOpen) {
        closeBranch(item);
        return next;
      }

      /*
        Comportamiento acordeón:
        si se abre otro item del mismo nivel,
        se cierra el anterior.
      */
      siblings.forEach((sibling) => {
        if (sibling.id !== item.id) {
          closeBranch(sibling);
        }
      });

      next[item.id] = true;
      return next;
    });
  }

  return (
    <aside className={`sidebar-shell ${mobileOpen ? "mobile-open" : ""}`}>
      <header className="sidebar-header">
        <Link to="/app/kpi-management" className="sidebar-brand" onClick={onNavigate}>
          <span className="sidebar-brand-copy">
            <strong>EXA Management</strong>
            <small>KPI System</small>
          </span>
        </Link>

        <button className="sidebar-icon-button" aria-label="More options">
          <MoreVertical size={18} />
        </button>
      </header>

      <div className="sidebar-scroll-area">
        <nav className="sidebar-section" aria-label="Main navigation">
          <p className="sidebar-section-title">MAIN</p>

          <ul className="sidebar-list">
            {navigationItems.map((item) => (
              <SidebarNode
                key={item.id}
                item={item}
                siblings={navigationItems}
                expanded={expanded}
                onToggle={toggleItem}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </nav>

        <nav
          className="sidebar-section sidebar-session"
          aria-label="Session navigation"
        >
          <p className="sidebar-section-title">SESSION</p>

          <ul className="sidebar-list sidebar-session-list">
            {sessionItems.map((item) => {
              const Icon = item.icon;
              const selected = location.pathname === item.path;

              return (
                <li key={item.id}>
                  <Link
                    className={`sidebar-row session-row ${
                      selected ? "sidebar-row-selected" : ""
                    }`}
                    to={item.path}
                    onClick={onNavigate}
                  >
                    <span className="sidebar-icon-slot">
                      {Icon ? <Icon size={18} /> : null}
                    </span>

                    <span className="sidebar-label">{item.label}</span>

                    {item.id === "notifications" ? (
                      <ChevronDown size={14} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <footer className="sidebar-footer">
        <div className="theme-toggle" role="group" aria-label="Theme selector">
          <button
            className={theme === "light" ? "theme-option active" : "theme-option"}
            onClick={() => onThemeChange("light")}
          >
            <Sun size={14} /> Light
          </button>

          <button
            className={theme === "dark" ? "theme-option active" : "theme-option"}
            onClick={() => onThemeChange("dark")}
          >
            <Moon size={14} /> Dark
          </button>
        </div>
      </footer>
    </aside>
  );
}
