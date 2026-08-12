export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'accountant'
  | 'cashier'
  | 'salesperson'
  | 'inventory_manager'
  | 'hr_manager'
  | 'viewer';

export type Permission =
  | 'dashboard.read'
  | 'customer.read'
  | 'customer.create'
  | 'customer.update'
  | 'customer.delete'
  | 'product.read'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'inventory.adjust'
  | 'sale.read'
  | 'sale.create'
  | 'sale.cancel'
  | 'sale.return'
  | 'invoice.read'
  | 'invoice.create'
  | 'invoice.update'
  | 'invoice.cancel'
  | 'payment.read'
  | 'payment.create'
  | 'payment.refund'
  | 'purchase.read'
  | 'purchase.create'
  | 'purchase.approve'
  | 'expense.read'
  | 'expense.create'
  | 'expense.approve'
  | 'accounting.read'
  | 'accounting.create'
  | 'accounting.adjust'
  | 'employee.read'
  | 'employee.create'
  | 'employee.update'
  | 'payroll.read'
  | 'payroll.create'
  | 'settings.read'
  | 'settings.update'
  | 'team.read'
  | 'team.manage'
  | 'subscription.read'
  | 'subscription.manage'
  | 'audit.read';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'dashboard.read',
    'customer.read', 'customer.create', 'customer.update', 'customer.delete',
    'product.read', 'product.create', 'product.update', 'product.delete',
    'inventory.adjust',
    'sale.read', 'sale.create', 'sale.cancel', 'sale.return',
    'invoice.read', 'invoice.create', 'invoice.update', 'invoice.cancel',
    'payment.read', 'payment.create', 'payment.refund',
    'purchase.read', 'purchase.create', 'purchase.approve',
    'expense.read', 'expense.create', 'expense.approve',
    'accounting.read', 'accounting.create', 'accounting.adjust',
    'employee.read', 'employee.create', 'employee.update',
    'payroll.read', 'payroll.create',
    'settings.read', 'settings.update',
    'team.read', 'team.manage',
    'subscription.read', 'subscription.manage',
    'audit.read'
  ],
  admin: [
    'dashboard.read',
    'customer.read', 'customer.create', 'customer.update', 'customer.delete',
    'product.read', 'product.create', 'product.update', 'product.delete',
    'inventory.adjust',
    'sale.read', 'sale.create', 'sale.cancel', 'sale.return',
    'invoice.read', 'invoice.create', 'invoice.update', 'invoice.cancel',
    'payment.read', 'payment.create', 'payment.refund',
    'purchase.read', 'purchase.create', 'purchase.approve',
    'expense.read', 'expense.create', 'expense.approve',
    'accounting.read', 'accounting.create', 'accounting.adjust',
    'employee.read', 'employee.create', 'employee.update',
    'payroll.read', 'payroll.create',
    'settings.read', 'settings.update',
    'team.read', 'team.manage',
    'subscription.read', 'subscription.manage',
    'audit.read'
  ],
  manager: [
    'dashboard.read',
    'customer.read', 'customer.create', 'customer.update', 'customer.delete',
    'product.read', 'product.create', 'product.update', 'product.delete',
    'inventory.adjust',
    'sale.read', 'sale.create', 'sale.cancel', 'sale.return',
    'invoice.read', 'invoice.create', 'invoice.update', 'invoice.cancel',
    'payment.read', 'payment.create', 'payment.refund',
    'purchase.read', 'purchase.create', 'purchase.approve',
    'expense.read', 'expense.create', 'expense.approve',
    'employee.read', 'employee.create', 'employee.update',
    'payroll.read', 'payroll.create',
    'settings.read', 'settings.update',
    'team.read',
    'subscription.read'
  ],
  accountant: [
    'dashboard.read',
    'customer.read',
    'product.read',
    'sale.read',
    'invoice.read', 'invoice.create', 'invoice.update', 'invoice.cancel',
    'payment.read', 'payment.create', 'payment.refund',
    'purchase.read',
    'expense.read', 'expense.create', 'expense.approve',
    'accounting.read', 'accounting.create', 'accounting.adjust',
    'payroll.read',
    'settings.read',
    'audit.read'
  ],
  cashier: [
    'dashboard.read',
    'customer.read', 'customer.create',
    'product.read',
    'sale.read', 'sale.create',
    'payment.read', 'payment.create',
    'invoice.read'
  ],
  salesperson: [
    'dashboard.read',
    'customer.read', 'customer.create',
    'product.read',
    'sale.read', 'sale.create',
    'invoice.read', 'invoice.create'
  ],
  inventory_manager: [
    'dashboard.read',
    'product.read', 'product.create', 'product.update', 'product.delete',
    'inventory.adjust',
    'purchase.read', 'purchase.create'
  ],
  hr_manager: [
    'dashboard.read',
    'employee.read', 'employee.create', 'employee.update',
    'payroll.read', 'payroll.create'
  ],
  viewer: [
    'dashboard.read',
    'customer.read',
    'product.read',
    'sale.read',
    'invoice.read',
    'payment.read',
    'purchase.read',
    'expense.read',
    'employee.read'
  ]
};

export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as UserRole;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function getRoleLabel(role: string | undefined): string {
  if (!role) return 'Visiteur';
  switch (role.toLowerCase()) {
    case 'owner':
      return 'Propriétaire';
    case 'admin':
      return 'Administrateur';
    case 'manager':
      return 'Gérant';
    case 'accountant':
      return 'Comptable';
    case 'cashier':
      return 'Caissier';
    case 'salesperson':
      return 'Commercial';
    case 'inventory_manager':
      return 'Gestionnaire Stock';
    case 'hr_manager':
      return 'Responsable RH';
    case 'viewer':
      return 'Observateur';
    default:
      return role;
  }
}

export function canAccessModule(role: string | undefined, module: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'owner') return true;

  switch (module) {
    case 'dashboard':
      return hasPermission(role, 'dashboard.read');
    case 'crm':
      return hasPermission(role, 'customer.read');
    case 'invoices':
      return hasPermission(role, 'invoice.read');
    case 'products':
      return hasPermission(role, 'product.read');
    case 'purchases':
      return hasPermission(role, 'purchase.read');
    case 'expenses':
      return hasPermission(role, 'expense.read');
    case 'hr':
      return hasPermission(role, 'employee.read');
    case 'pos':
      return hasPermission(role, 'sale.create');
    case 'accountant':
      return hasPermission(role, 'accounting.read');
    case 'pricing':
      return hasPermission(role, 'subscription.read');
    case 'settings':
      return hasPermission(role, 'settings.read');
    case 'audit':
      return hasPermission(role, 'audit.read');
    case 'admin':
      return normalizedRole === 'admin';
    default:
      return false;
  }
}

