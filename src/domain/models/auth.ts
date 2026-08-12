import { UserRole, Permission as RbacPermission } from "../../lib/rbac";

export type Permission = RbacPermission;

export interface Role {
  name: UserRole;
  description: string;
  permissions: Permission[];
}

export interface User {
  uid: string;
  email: string;
  orgId: string;
  role: UserRole;
  name?: string;
  createdAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  orgId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  deviceInfo?: {
    deviceId: string;
    userAgent?: string;
    ip?: string;
  };
}
