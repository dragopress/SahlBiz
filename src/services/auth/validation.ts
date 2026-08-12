import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Format d'e-mail incorrect"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
});

export const registerSchema = z.object({
  email: z.string().email("Format d'e-mail incorrect"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  displayName: z.string().min(2, "Le nom d'affichage doit contenir au moins 2 caractères"),
  orgName: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  plan: z.enum(["free", "starter", "pro", "business"]).optional().default("pro")
});

export const roleUpdateSchema = z.object({
  targetUserId: z.string().min(1, "L'ID de l'utilisateur cible est requis"),
  newRole: z.enum([
    "owner",
    "admin",
    "manager",
    "accountant",
    "cashier",
    "salesperson",
    "inventory_manager",
    "hr_manager",
    "viewer"
  ])
});
