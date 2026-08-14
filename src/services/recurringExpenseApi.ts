/**
 * SahlBiz - Client API Service for Backend Recurring Expense Scheduler
 */

export interface RecurringSchedulePayload {
  title: string;
  category: string;
  amountHt: number;
  tvaRate: number;
  vendorName: string;
  vendorIce?: string;
  paymentMethod: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: string;
  endDate?: string;
  maxOccurrences?: number;
  notes?: string;
  timezone?: string;
}

export interface RecurringTemplateResponse {
  id: string;
  orgId: string;
  title: string;
  category: string;
  amountHt: number;
  tvaRate: number;
  tvaAmount: number;
  amountTtc: number;
  vendorName: string;
  vendorIce?: string;
  paymentMethod: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  lastGeneratedDate?: string;
  totalOccurrencesGenerated: number;
  maxOccurrences?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
  timezone: string;
  retryCount: number;
  lastError?: string;
  lastAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerAuditLogResponse {
  id: string;
  orgId: string;
  templateId?: string;
  action: string;
  status: string;
  targetDate: string;
  details: string;
  error?: string;
  timestamp: string;
}

export interface SchedulerRunResultResponse {
  jobId: string;
  executionTimestamp: string;
  timezone: string;
  currentBusinessDate: string;
  totalTemplatesEvaluated: number;
  expensesGenerated: number;
  templatesAdvanced: number;
  templatesCompleted: number;
  retriesAttempted: number;
  failures: number;
  generatedRecords: any[];
  auditLogs: SchedulerAuditLogResponse[];
}

export class RecurringExpenseApiService {
  private static getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetches all registered recurring schedules for the organization
   */
  static async fetchTemplates(token?: string): Promise<RecurringTemplateResponse[]> {
    try {
      const res = await fetch('/api/finance/recurring/templates', {
        headers: this.getHeaders(token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.warn('Failed fetching recurring templates from backend:', err);
      return [];
    }
  }

  /**
   * Registers a new recurring schedule on the trusted backend
   */
  static async createTemplate(payload: RecurringSchedulePayload, token?: string): Promise<RecurringTemplateResponse | null> {
    try {
      const res = await fetch('/api/finance/recurring/templates', {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error('Failed creating recurring template on backend:', err);
      return null;
    }
  }

  /**
   * Cancels or pauses a recurring schedule
   */
  static async updateStatus(templateId: string, status: 'active' | 'paused' | 'cancelled', token?: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/finance/recurring/templates/${templateId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed updating recurring schedule status:', err);
      return false;
    }
  }

  /**
   * Triggers trusted backend scheduler due-date evaluation & generation cycle
   */
  static async triggerSchedulerRun(overrideCurrentDate?: string, token?: string): Promise<SchedulerRunResultResponse | null> {
    try {
      const res = await fetch('/api/finance/recurring/run', {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({ overrideCurrentDate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error('Failed executing backend scheduler:', err);
      return null;
    }
  }

  /**
   * Fetches audit log records for the organization's recurring scheduler
   */
  static async fetchAuditLogs(token?: string): Promise<SchedulerAuditLogResponse[]> {
    try {
      const res = await fetch('/api/finance/recurring/audit-logs', {
        headers: this.getHeaders(token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.warn('Failed fetching recurring audit logs:', err);
      return [];
    }
  }
}
