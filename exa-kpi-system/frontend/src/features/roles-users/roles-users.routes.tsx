import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { UsersOverviewPage } from "./users/pages/UsersOverviewPage";
import { AddNewUserPage } from "./users/pages/AddNewUserPage";
import { UserDetailPage } from "./users/pages/UserDetailPage";
import { UserEditPage } from "./users/pages/UserEditPage";
import { YourProfilePage } from "./users/pages/YourProfilePage";
import { RolesOverviewPage } from "./roles/pages/RolesOverviewPage";
import { RolePermissionsPage } from "./roles/pages/RolePermissionsPage";
import { UserActionLogPage } from "./audit/pages/UserActionLogPage";
import "./roles-users.css";
import "./roles-users-refresh.css";

export const rolesUsersRoutes: RouteObject[] = [
  { path: "roles-users", element: <Navigate to="/app/roles-users/users" replace /> },
  { path: "roles-users/users", element: <UsersOverviewPage /> },
  { path: "roles-users/users/new", element: <AddNewUserPage /> },
  { path: "roles-users/users/:userId", element: <UserDetailPage /> },
  { path: "roles-users/users/:userId/edit", element: <UserEditPage /> },
  { path: "roles-users/profile", element: <YourProfilePage /> },
  { path: "roles-users/roles", element: <RolesOverviewPage /> },
  { path: "roles-users/roles/:roleId/permissions", element: <RolePermissionsPage /> },
  { path: "roles-users/audit-log", element: <UserActionLogPage /> },
];
