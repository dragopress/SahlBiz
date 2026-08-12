import express from "express";
import { z } from "zod";
import { Employee, PayrollSlip } from "../types";
import { validateRequest } from "../middleware/validation";

export const hrRouter = express.Router();

// HR Zod Schemas
const employeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1, "Role is required"),
  cin: z.string().min(3, "CIN must be at least 3 characters").max(15),
  cnssNumber: z.string().max(20).optional(),
  phone: z.string().max(30),
  baseSalary: z.number().positive("Base salary must be positive")
});

const generatePayrollSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM")
});

// Employees & Payroll Service Boundary
export class HRService {
  private static employees: Map<string, Employee[]> = new Map();
  private static payrolls: Map<string, PayrollSlip[]> = new Map();

  static async getEmployees(orgId: string): Promise<Employee[]> {
    if (!this.employees.has(orgId)) {
      this.employees.set(orgId, [
        { id: "emp_1", name: "Anass Benjelloun", role: "Manager des Ventes", cin: "BK654321", cnssNumber: "189283741", phone: "+212622334455", baseSalary: 7500, orgId },
        { id: "emp_2", name: "Khadija Filali", role: "Caissière Principale", cin: "F432109", cnssNumber: "298374102", phone: "+212644556677", baseSalary: 4200, orgId }
      ]);
    }
    return this.employees.get(orgId) || [];
  }

  static async createEmployee(orgId: string, data: Partial<Employee>): Promise<Employee> {
    const list = await this.getEmployees(orgId);
    const newEmployee: Employee = {
      id: `emp_${Math.random().toString(36).substring(2, 9)}`,
      name: data.name || "Employee",
      role: data.role || "Staff",
      cin: data.cin || "CN123456",
      cnssNumber: data.cnssNumber,
      phone: data.phone || "",
      baseSalary: data.baseSalary || 3500,
      orgId
    };
    list.push(newEmployee);
    this.employees.set(orgId, list);
    return newEmployee;
  }

  static async getPayrollSlips(orgId: string): Promise<PayrollSlip[]> {
    if (!this.payrolls.has(orgId)) {
      this.payrolls.set(orgId, []);
    }
    return this.payrolls.get(orgId) || [];
  }

  static async generateSlip(orgId: string, employeeId: string, month: string): Promise<PayrollSlip> {
    const employees = await this.getEmployees(orgId);
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} does not exist.`);
    }

    const base = employee.baseSalary;

    // --- Standard Moroccan Social Security Deductions (CNSS / AMO) ---
    // CNSS: 4.48% (capped at 6000 MAD salary ceiling for pension benefits, i.e., max 268.80 MAD)
    const cnssDeduction = Math.round(Math.min(base, 6000) * 0.0448 * 100) / 100;
    
    // AMO: 2.26% (no salary cap)
    const amoDeduction = Math.round(base * 0.0226 * 100) / 100;

    // Standard simulated income tax (IR) bracket deduction (approximate simplification)
    let irDeduction = 0;
    if (base > 6666) {
      irDeduction = Math.round((base - 6666) * 0.30 * 100) / 100;
    } else if (base > 4166) {
      irDeduction = Math.round((base - 4166) * 0.10 * 100) / 100;
    }

    const netSalary = Math.round((base - cnssDeduction - amoDeduction - irDeduction) * 100) / 100;

    const list = await this.getPayrollSlips(orgId);
    const slip: PayrollSlip = {
      id: `pay_${Math.random().toString(36).substring(2, 9)}`,
      employeeId,
      employeeName: employee.name,
      month,
      baseSalary: base,
      cnssDeduction,
      amoDeduction,
      irDeduction,
      netSalary,
      status: "draft",
      orgId
    };

    list.push(slip);
    this.payrolls.set(orgId, list);
    return slip;
  }
}

// Routes
hrRouter.get("/employees", validateRequest({}), async (req: any, res) => {
  const list = await HRService.getEmployees(req.user.orgId);
  return res.json({ success: true, data: list });
});

hrRouter.post("/employees", validateRequest({
  body: employeeSchema,
  businessConstraints: (req: any) => {
    // Moroccan Compliance: Check that base salary meets the legal SMIG limit of 3,120 MAD per month.
    const { baseSalary } = req.body;
    if (baseSalary < 3120) {
      return `SMIG_VIOLATION: Base salary of ${baseSalary} MAD is below the Moroccan legal SMIG limit of 3,120 MAD per month.`;
    }
    return null;
  }
}), async (req: any, res) => {
  const employee = await HRService.createEmployee(req.user.orgId, req.body);
  return res.status(201).json({ success: true, data: employee });
});

hrRouter.get("/payroll", validateRequest({}), async (req: any, res) => {
  const list = await HRService.getPayrollSlips(req.user.orgId);
  return res.json({ success: true, data: list });
});

hrRouter.post("/payroll/generate", validateRequest({
  body: generatePayrollSchema
}), async (req: any, res) => {
  try {
    const { employeeId, month } = req.body;
    const slip = await HRService.generateSlip(req.user.orgId, employeeId, month);
    return res.status(201).json({ success: true, data: slip });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: "PAYROLL_ERROR",
        message: err.message,
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`
      }
    });
  }
});
