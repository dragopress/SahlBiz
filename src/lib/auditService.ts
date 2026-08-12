import { BusinessEvent, BusinessEventType } from '../types';
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

/**
 * Deterministic tamper-evident hash function for event auditing.
 */
export function calculateEventHash(event: Omit<BusinessEvent, 'hash'>): string {
  const content = `${event.id}|${event.eventType}|${event.timestamp}|${event.userId}|${event.orgId}|${JSON.stringify(event.payload)}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'SAHL_AUDIT_' + Math.abs(hash).toString(16).toUpperCase();
}

/**
 * Validates payload fields to ensure the integrity of financial and business objects.
 */
export function validateEventPayload(eventType: BusinessEventType, payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload empty or invalid object structure'] };
  }

  const checkRequired = (fields: string[]) => {
    fields.forEach(field => {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  };

  switch (eventType) {
    case 'SALE_CREATED':
    case 'SALE_CANCELLED':
    case 'SALE_RETURNED':
      checkRequired(['saleId', 'amountTtc', 'paymentMethod']);
      if (typeof payload.amountTtc !== 'number') errors.push('amountTtc must be a number');
      break;
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_REFUNDED':
      checkRequired(['amount', 'paymentMethod']);
      if (typeof payload.amount !== 'number') errors.push('amount must be a number');
      break;
    case 'PURCHASE_CREATED':
    case 'PURCHASE_RECEIVED':
    case 'PURCHASE_RETURNED':
      checkRequired(['purchaseId', 'amountTtc']);
      if (typeof payload.amountTtc !== 'number') errors.push('amountTtc must be a number');
      break;
    case 'EXPENSE_RECORDED':
      checkRequired(['expenseId', 'title', 'amountTtc', 'category']);
      if (typeof payload.amountTtc !== 'number') errors.push('amountTtc must be a number');
      break;
    case 'INVOICE_CREATED':
    case 'INVOICE_CANCELLED':
      checkRequired(['documentId', 'documentNumber', 'amountTtc']);
      if (typeof payload.amountTtc !== 'number') errors.push('amountTtc must be a number');
      break;
    case 'STOCK_RECEIVED':
    case 'STOCK_SOLD':
    case 'STOCK_ADJUSTED':
    case 'STOCK_RETURNED':
      checkRequired(['productId', 'productName', 'quantity']);
      if (typeof payload.quantity !== 'number') errors.push('quantity must be a number');
      break;
    case 'CUSTOMER_CREDIT_CREATED':
    case 'CUSTOMER_PAYMENT_RECEIVED':
      checkRequired(['customerId', 'customerName', 'amount']);
      if (typeof payload.amount !== 'number') errors.push('amount must be a number');
      break;
    case 'EMPLOYEE_CREATED':
      checkRequired(['employeeId', 'employeeName', 'baseSalary']);
      break;
    case 'PAYSLIP_CREATED':
      checkRequired(['payslipId', 'employeeName', 'netPayable', 'month']);
      if (typeof payload.netPayable !== 'number') errors.push('netPayable must be a number');
      break;
    default:
      errors.push(`Unsupported business event type: ${eventType}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates, signs, validates, and logs an event to the ledger.
 */
export async function logBusinessEvent(
  eventType: BusinessEventType,
  payload: any,
  orgId: string
): Promise<BusinessEvent> {
  const user = auth.currentUser;
  const userId = user?.uid || 'system_uid';
  const userName = user?.displayName || user?.email || 'System Automator';

  const baseEvent: Omit<BusinessEvent, 'hash'> = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventType,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    orgId,
    payload,
    status: 'unverified'
  };

  const validation = validateEventPayload(eventType, payload);
  const hash = calculateEventHash(baseEvent);

  const event: BusinessEvent = {
    ...baseEvent,
    hash,
    status: validation.valid ? 'valid' : 'corrupted'
  };

  try {
    const docRef = doc(db, 'organizations', orgId, 'businessEvents', event.id);
    await setDoc(docRef, event);
  } catch (error) {
    console.error('Failed to write business audit event to Firestore:', error);
  }

  return event;
}

/**
 * Retrieves audit events from the ledger.
 */
export async function fetchBusinessEvents(orgId: string, maxLimit = 100): Promise<BusinessEvent[]> {
  try {
    const colRef = collection(db, 'organizations', orgId, 'businessEvents');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);
    
    return snap.docs.map(d => {
      const data = d.data() as BusinessEvent;
      // Re-verify hash dynamically to audit ledger integrity
      const baseObj: Omit<BusinessEvent, 'hash'> = {
        id: data.id,
        eventType: data.eventType,
        timestamp: data.timestamp,
        userId: data.userId,
        userName: data.userName,
        orgId: data.orgId,
        payload: data.payload,
        status: data.status
      };
      const calculated = calculateEventHash(baseObj);
      const isSignatureValid = calculated === data.hash;

      return {
        ...data,
        status: isSignatureValid ? data.status : 'corrupted'
      };
    });
  } catch (error) {
    console.error('Failed to fetch business events:', error);
    return [];
  }
}

/**
 * Generates initial audited demo events for demonstration
 */
export function getDemoEvents(orgId: string): BusinessEvent[] {
  const baseUser = { userId: 'demo_user', userName: 'Directeur Financier' };
  const demoPayloads: { type: BusinessEventType; payload: any; delayMinutes: number }[] = [
    {
      type: 'INVOICE_CREATED',
      payload: { documentId: 'doc-1', documentNumber: 'FAC-2026-081', amountTtc: 14500, customerName: 'Fes Distribution SARL' },
      delayMinutes: 120
    },
    {
      type: 'STOCK_RECEIVED',
      payload: { productId: 'prod-1', productName: 'Huile d\'Olive de Souss 5L', quantity: 200, location: 'magasin' },
      delayMinutes: 90
    },
    {
      type: 'EXPENSE_RECORDED',
      payload: { expenseId: 'exp-1', title: 'Facture d\'électricité Lydec', amountTtc: 1850, category: 'electricite' },
      delayMinutes: 65
    },
    {
      type: 'PAYSLIP_CREATED',
      payload: { payslipId: 'pay-1', employeeName: 'Yassine Benjelloun', netPayable: 6200, month: '2026-07' },
      delayMinutes: 45
    },
    {
      type: 'CUSTOMER_PAYMENT_RECEIVED',
      payload: { customerId: 'cust-1', customerName: 'Comptoir de Marrakech', amount: 5000, paymentMethod: 'check' },
      delayMinutes: 20
    }
  ];

  return demoPayloads.map((demo, idx) => {
    const timestamp = new Date(Date.now() - demo.delayMinutes * 60 * 1000).toISOString();
    const id = `evt-demo-${idx + 1}`;
    
    const baseEvent: Omit<BusinessEvent, 'hash'> = {
      id,
      eventType: demo.type,
      timestamp,
      userId: baseUser.userId,
      userName: baseUser.userName,
      orgId,
      payload: demo.payload,
      status: 'valid'
    };

    return {
      ...baseEvent,
      hash: calculateEventHash(baseEvent),
      status: 'valid'
    };
  });
}
