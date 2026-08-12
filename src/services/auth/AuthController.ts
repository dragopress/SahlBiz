import { loginSchema, registerSchema, roleUpdateSchema } from "./validation";
import { AuthService } from "./AuthService";
import { UserRole } from "../../lib/rbac";

export interface StandardResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
}

export class AuthController {
  /**
   * Handle user login request
   */
  public static async login(payload: any): Promise<StandardResponse<{ user: any; token: string; session?: any }>> {
    const validation = loginSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: "INVALID_BODY",
          message: "La validation du corps de la requête a échoué.",
          details: validation.error.issues.map(issue => ({
            field: issue.path.join("."),
            issue: issue.message
          }))
        }
      };
    }

    try {
      const user = await AuthService.authenticate(validation.data.email, validation.data.password);
      if (!user) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Identifiants de connexion invalides."
          }
        };
      }

      // Generate a robust session and store it in memory
      const session = await AuthService.createSession(user.uid, user.orgId);

      return {
        success: true,
        message: "Connexion réussie.",
        data: { user, token: session.token, session }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Une erreur inattendue est survenue."
        }
      };
    }
  }

  /**
   * Handle registration of user and organization
   */
  public static async register(payload: any): Promise<StandardResponse<{ user: any; organization: any }>> {
    const validation = registerSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: "INVALID_BODY",
          message: "La validation de l'inscription a échoué.",
          details: validation.error.issues.map(issue => ({
            field: issue.path.join("."),
            issue: issue.message
          }))
        }
      };
    }

    try {
      const result = await AuthService.register({
        email: validation.data.email,
        pass: validation.data.password,
        displayName: validation.data.displayName,
        orgName: validation.data.orgName,
        plan: validation.data.plan
      });

      return {
        success: true,
        message: "Inscription et provisionnement de l'organisation complétés avec succès.",
        data: result
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message?.startsWith("EMAIL_ALREADY_IN_USE") ? "EMAIL_ALREADY_IN_USE" : "REGISTRATION_FAILED",
          message: err.message || "L'inscription a échoué."
        }
      };
    }
  }

  /**
   * Update a team member's role
   */
  public static async updateRole(
    actorId: string,
    payload: any
  ): Promise<StandardResponse<{ updatedUser: any }>> {
    const validation = roleUpdateSchema.safeParse(payload);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: "INVALID_BODY",
          message: "La validation du rôle de l'utilisateur a échoué.",
          details: validation.error.issues.map(issue => ({
            field: issue.path.join("."),
            issue: issue.message
          }))
        }
      };
    }

    try {
      const updatedUser = await AuthService.updateUserRole(
        actorId,
        validation.data.targetUserId,
        validation.data.newRole as UserRole
      );

      return {
        success: true,
        message: "Le rôle de l'utilisateur a été mis à jour avec succès.",
        data: { updatedUser }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message?.split(":")[0] || "ROLE_UPDATE_FAILED",
          message: err.message || "La mise à jour du rôle a échoué."
        }
      };
    }
  }

  /**
   * Verify an active session token
   */
  public static async verifySession(token: string): Promise<StandardResponse<{ session: any }>> {
    if (!token) {
      return {
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Le jeton de session est requis."
        }
      };
    }

    try {
      const session = await AuthService.verifySession(token);
      if (!session) {
        return {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "La session est invalide ou a expiré."
          }
        };
      }

      return {
        success: true,
        message: "Session valide.",
        data: { session }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: "VERIFICATION_ERROR",
          message: err.message || "Impossible de vérifier la session."
        }
      };
    }
  }

  /**
   * Look up role details and core permissions
   */
  public static async getRoleDetails(roleName: string): Promise<StandardResponse<{ role: any }>> {
    try {
      const role = await AuthService.lookupRole(roleName as UserRole);
      if (!role) {
        return {
          success: false,
          error: {
            code: "ROLE_NOT_FOUND",
            message: `Le rôle '${roleName}' n'existe pas.`
          }
        };
      }

      return {
        success: true,
        message: "Rôle récupéré avec succès.",
        data: { role }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: "ROLE_LOOKUP_ERROR",
          message: err.message || "Erreur lors de la récupération du rôle."
        }
      };
    }
  }

  /**
   * Assign organizational context to a user
   */
  public static async updateOrganizationalContext(
    userId: string,
    orgId: string
  ): Promise<StandardResponse<{ updatedUser: any }>> {
    if (!userId || !orgId) {
      return {
        success: false,
        error: {
          code: "INVALID_PARAMS",
          message: "L'identifiant de l'utilisateur et l'entreprise sont requis."
        }
      };
    }

    try {
      const updatedUser = await AuthService.assignOrganizationalContext(userId, orgId);
      return {
        success: true,
        message: "Le contexte de l'entreprise a été attribué avec succès.",
        data: { updatedUser }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.message?.startsWith("USER_NOT_FOUND") ? "USER_NOT_FOUND" : "ASSIGN_CONTEXT_FAILED",
          message: err.message || "L'attribution du contexte de l'entreprise a échoué."
        }
      };
    }
  }
}
