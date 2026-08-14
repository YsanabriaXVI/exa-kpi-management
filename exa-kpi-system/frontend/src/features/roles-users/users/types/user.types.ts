export type UserStatus = "Active" | "Inactive";

export type Department = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: string;
  roleName: string;
  status: UserStatus;
  departments: Department[];
  accessScopes: string[];
  isGlobalScope: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sendAccountEmail?: boolean;
};

export type UserFilters = {
  search?: string;
  roleIds?: string[];
  statuses?: UserStatus[];
  departmentIds?: string[];
  includeDeleted?: boolean;
};

export type CreateUserInput = {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  departmentIds: string[];
  isGlobalScope: boolean;
  sendAccountEmail: boolean;
};

export type UpdateUserInput = Omit<CreateUserInput, "password" | "confirmPassword" | "sendAccountEmail">;
