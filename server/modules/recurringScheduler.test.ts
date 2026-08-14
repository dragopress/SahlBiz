import { describe, it, expect, beforeEach } from 'vitest';
import { RecurringExpenseScheduler } from './recurringScheduler';

describe('RecurringExpenseScheduler Backend Service', () => {
  beforeEach(() => {
    RecurringExpenseScheduler.resetState();
  });

  it('computes next due date correctly for monthly, weekly, quarterly, yearly frequencies', () => {
    expect(RecurringExpenseScheduler.computeNextDueDate('2026-08-01', 'monthly')).toBe('2026-09-01');
    expect(RecurringExpenseScheduler.computeNextDueDate('2026-08-01', 'weekly')).toBe('2026-08-08');
    expect(RecurringExpenseScheduler.computeNextDueDate('2026-08-01', 'quarterly')).toBe('2026-11-01');
    expect(RecurringExpenseScheduler.computeNextDueDate('2026-08-01', 'yearly')).toBe('2027-08-01');
    expect(RecurringExpenseScheduler.computeNextDueDate('2026-08-01', 'daily')).toBe('2026-08-02');
  });

  it('registers a recurring expense template and advances next due date when due', async () => {
    const orgId = 'org_test_123';
    
    // Register monthly template starting 2026-08-01
    const template = await RecurringExpenseScheduler.registerTemplate(orgId, {
      title: 'Loyer Bureau Casablanca',
      category: 'loyer',
      amountHt: 5000,
      tvaRate: 20,
      vendorName: 'Atlas Immobilier',
      paymentMethod: 'transfer',
      frequency: 'monthly',
      startDate: '2026-08-01'
    });

    expect(template.nextDueDate).toBe('2026-08-01');
    expect(template.amountTtc).toBe(6000);
    expect(template.totalOccurrencesGenerated).toBe(0);

    // Simulate backend cron run on 2026-08-14
    const runResult = await RecurringExpenseScheduler.processDueRecurringExpenses({
      orgIdFilter: orgId,
      overrideCurrentDate: '2026-08-14'
    });

    expect(runResult.expensesGenerated).toBe(1);
    expect(runResult.templatesAdvanced).toBe(1);
    expect(runResult.failures).toBe(0);

    const generated = await RecurringExpenseScheduler.getGeneratedExpenses(orgId);
    expect(generated.length).toBe(1);
    expect(generated[0].title).toBe('Loyer Bureau Casablanca');
    expect(generated[0].date).toBe('2026-08-01');
    expect(generated[0].generatedByScheduler).toBe(true);

    const templates = await RecurringExpenseScheduler.getTemplates(orgId);
    expect(templates[0].nextDueDate).toBe('2026-09-01');
    expect(templates[0].totalOccurrencesGenerated).toBe(1);
  });

  it('enforces idempotency and prevents duplicate expense generation on subsequent runs', async () => {
    const orgId = 'org_test_456';
    
    await RecurringExpenseScheduler.registerTemplate(orgId, {
      title: 'Abonnement Fibre IAM',
      category: 'electricite',
      amountHt: 500,
      tvaRate: 20,
      vendorName: 'Maroc Telecom',
      paymentMethod: 'transfer',
      frequency: 'monthly',
      startDate: '2026-08-01'
    });

    // First execution
    const run1 = await RecurringExpenseScheduler.processDueRecurringExpenses({
      orgIdFilter: orgId,
      overrideCurrentDate: '2026-08-14'
    });
    expect(run1.expensesGenerated).toBe(1);

    // Immediate second execution for the exact same date
    const run2 = await RecurringExpenseScheduler.processDueRecurringExpenses({
      orgIdFilter: orgId,
      overrideCurrentDate: '2026-08-14'
    });
    expect(run2.expensesGenerated).toBe(0); // Duplicate prevented

    const generated = await RecurringExpenseScheduler.getGeneratedExpenses(orgId);
    expect(generated.length).toBe(1); // Still exactly one record
  });

  it('records structured audit logs for schedule creation, generation, and status changes', async () => {
    const orgId = 'org_test_789';
    
    const template = await RecurringExpenseScheduler.registerTemplate(orgId, {
      title: 'Assurance Multirisque',
      category: 'divers',
      amountHt: 1200,
      tvaRate: 14,
      vendorName: 'Wafa Assurance',
      paymentMethod: 'check',
      frequency: 'quarterly',
      startDate: '2026-08-01'
    });

    await RecurringExpenseScheduler.processDueRecurringExpenses({
      orgIdFilter: orgId,
      overrideCurrentDate: '2026-08-14'
    });

    await RecurringExpenseScheduler.updateTemplateStatus(orgId, template.id, 'cancelled');

    const logs = await RecurringExpenseScheduler.getAuditLogs(orgId);
    expect(logs.length).toBeGreaterThanOrEqual(3);
    
    const actions = logs.map(l => l.action);
    expect(actions).toContain('SCHEDULE_CREATED');
    expect(actions).toContain('EXPENSE_GENERATED');
    expect(actions).toContain('SCHEDULE_CANCELLED');
  });
});
