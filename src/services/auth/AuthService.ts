import { User, Organization, Session, Role } from "../../domain/models";
import { UserRole, hasPermission, Permission } from "../../lib/rbac";

export class AuthService {
  private static users: Map<string, User & { passHash: string }> = new Map([
    [
      "usr_demo",
      {
        uid: "usr_demo",
        email: "demo@sahlbiz.ma",
        orgId: "org_demo",
        role: "owner",
        name: "Youssef El Amrani",
        passHash: "8515c0a3bd2b1236113b5d3a51f28bc6fb7f2e185c7d8123bf04505f6e80bcae" // hash of "sahlbiz123"
      }
    ]
  ]);

  private static organizations: Map<string, Organization> = new Map([
    [
      "org_demo",
      {
        id: "org_demo",
        name: "Épicerie Al Massira",
        type: "retail",
        plan: "starter"
      }
    ]
  ]);

  private static sessions: Map<string, Session> = new Map();

  /**
   * Helper to hash password securely using Web Crypto API SHA-256
   */
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "sahlbiz_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Authenticate a user by email and password
   */
  public static async authenticate(email: string, pass: string): Promise<User | null> {
    const passHash = await this.hashPassword(pass);
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase() && user.passHash === passHash) {
        const { passHash: _, ...userWithoutPass } = user;
        return userWithoutPass;
      }
    }
    return null;
  }

  /**
   * Register a new user and a corresponding tenant organization
   */
  public static async register(data: {
    email: string;
    pass: string;
    displayName: string;
    orgName: string;
    plan: "free" | "starter" | "pro" | "business";
  }): Promise<{ user: User; organization: Organization }> {
    // Check email uniqueness
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === data.email.toLowerCase()) {
        throw new Error("EMAIL_ALREADY_IN_USE: Cet e-mail est déjà utilisé.");
      }
    }

    const orgId = `org_${Math.random().toString(36).substring(2, 9)}`;
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const passHash = await this.hashPassword(data.pass);

    const organization: Organization = {
      id: orgId,
      name: data.orgName,
      type: "retail",
      plan: data.plan
    };

    const user: User = {
      uid: userId,
      email: data.email,
      orgId: orgId,
      role: "owner", // First user registering the organization is the owner
      name: data.displayName,
      createdAt: new Date().toISOString()
    };

    this.organizations.set(orgId, organization);
    this.users.set(userId, { ...user, passHash });

    return { user, organization };
  }

  /**
   * Retrieve a user by their unique ID
   */
  public static async getUserById(uid: string): Promise<User | null> {
    const found = this.users.get(uid);
    if (!found) return null;
    const { passHash: _, ...userWithoutPass } = found;
    return userWithoutPass;
  }

  /**
   * Update a user's role with rigorous checks
   */
  public static async updateUserRole(
    actorId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<User> {
    const actor = await this.getUserById(actorId);
    if (!actor) {
      throw new Error("ACTOR_NOT_FOUND: Acteur non trouvé.");
    }

    // Role management constraint: Only Owner or Admin can manage team roles
    if (actor.role !== "owner" && actor.role !== "admin") {
      throw new Error("INSUFFICIENT_PERMISSIONS: Seuls les administrateurs et propriétaires peuvent modifier les rôles.");
    }

    const targetUser = this.users.get(targetUserId);
    if (!targetUser) {
      throw new Error("USER_NOT_FOUND: Utilisateur cible non trouvé.");
    }

    // Tenant check: Gating to prevent cross-tenant role updates
    if (actor.role !== "admin" && actor.orgId !== targetUser.orgId) {
      throw new Error("CROSS_TENANT_VIOLATION: Vous ne pouvez pas modifier les rôles d'une autre entreprise.");
    }

    // Protection: Block demoting the last owner of the organization
    if (targetUser.role === "owner" && newRole !== "owner") {
      let otherOwners = 0;
      for (const u of this.users.values()) {
        if (u.orgId === targetUser.orgId && u.role === "owner" && u.uid !== targetUserId) {
          otherOwners++;
        }
      }
      if (otherOwners === 0) {
        throw new Error("ROLE_CONSTRAINT_VIOLATION: Impossible de rétrograder le dernier propriétaire de l'organisation.");
      }
    }

    targetUser.role = newRole;
    this.users.set(targetUserId, targetUser);

    const { passHash: _, ...updatedWithoutPass } = targetUser;
    return updatedWithoutPass;
  }

  /**
   * Verify permissions for a specific action
   */
  public static checkPermission(role: UserRole, permission: Permission): boolean {
    return hasPermission(role, permission);
  }

  /**
   * Create a new session for a user
   */
  public static async createSession(userId: string, orgId: string, deviceInfo?: { deviceId: string, userAgent?: string, ip?: string }): Promise<Session> {
    const sessionId = `sess_${Math.random().toString(36).substring(2, 11)}`;
    const token = `token_${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const session: Session = {
      id: sessionId,
      userId,
      orgId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      deviceInfo
    };

    this.sessions.set(token, session);
    return session;
  }

  /**
   * Verify an active session token
   */
  public static async verifySession(token: string): Promise<Session | null> {
    const session = this.sessions.get(token);
    if (!session) return null;

    const isExpired = new Date(session.expiresAt).getTime() < Date.now();
    if (isExpired) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Lookup role definitions and permissions
   */
  public static async lookupRole(roleName: UserRole): Promise<Role | null> {
    const { ROLE_PERMISSIONS } = await import("../../lib/rbac");
    const permissions = ROLE_PERMISSIONS[roleName];
    if (!permissions) return null;

    return {
      name: roleName,
      description: `SahlBiz standard ${roleName} role mapping.`,
      permissions: permissions
    };
  }

  /**
   * Assign organizational context to a user
   */
  public static async assignOrganizationalContext(userId: string, orgId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND: Utilisateur non trouvé.");
    }

    const org = this.organizations.get(orgId);
    if (!org) {
      throw new Error("ORGANIZATION_NOT_FOUND: Entreprise non trouvée.");
    }

    user.orgId = orgId;
    this.users.set(userId, user);

    // Update active sessions to reflect the new organizational context
    for (const [token, sess] of this.sessions.entries()) {
      if (sess.userId === userId) {
        this.sessions.set(token, {
          ...sess,
          orgId: orgId
        });
      }
    }

    const { passHash: _, ...userWithoutPass } = user;
    return userWithoutPass;
  }
}
