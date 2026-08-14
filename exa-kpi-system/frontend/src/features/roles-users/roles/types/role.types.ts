export type RoleStatus = "Active" | "Inactive";

export type Role = {
  id: string;
  name: "Admin" | "Manager" | "Analyst" | "Viewer";
  description: string;
  status: RoleStatus;
  isProtected: boolean;
  permissionCodes: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type RoleWithUserCount = Role & { usersCount: number };
