/**
 * USAII checkout.
 *
 * This build ships a self-contained gateway simulator so the whole enrollment
 * journey can be demonstrated offline. It validates the payment details the way
 * a real gateway would (Luhn check, expiry, CVC, wallet token) and writes a
 * receipt into the database, but it never contacts Stripe, PayPal or Google.
 *
 * To go live, replace `chargeCard` / `chargeWallet` with a real server-side call
 * (Stripe PaymentIntents, PayPal Orders v2, Google Pay via your PSP) and keep
 * `recordPayment` exactly as it is: the rest of the LMS only reads the receipt.
 */
import crypto from 'node:crypto';
import type { Course, Payment, PaymentMethod, UserRecord } from '../shared/types';
import { db, nowIso, save, uid } from './db';
import { fail } from './services';

export const METHODS: PaymentMethod[] = ['stripe', 'paypal', 'gpay'];

export const methodLabel = (m: PaymentMethod) => (m === 'stripe' ? 'Card (Stripe)' : m === 'paypal' ? 'PayPal' : 'Google Pay');

export function readMethod(v: unknown): PaymentMethod {
  const m = String(v ?? '').toLowerCase() as PaymentMethod;
  if (!METHODS.includes(m)) fail(400, 'Choose Stripe, PayPal or Google Pay.');
  return m;
}

/** Standard Luhn checksum, the same test every card processor runs first. */
function luhnOk(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

const ref = (prefix: string) => `${prefix}_${crypto.randomBytes(9).toString('hex')}`;

export interface ChargeInput {
  method: PaymentMethod;
  amount: number;
  cardNumber?: string;
  cardName?: string;
  expiry?: string; // MM/YY
  cvc?: string;
  email?: string; // PayPal account
  walletToken?: string; // Google Pay
}

export interface ChargeResult {
  reference: string;
  last4?: string;
}

/** Run the gateway's validations and return a transaction reference. */
export function charge(input: ChargeInput): ChargeResult {
  if (input.amount <= 0) return { reference: ref('free') };

  if (input.method === 'stripe') {
    const digits = String(input.cardNumber ?? '').replace(/\D/g, '');
    if (!luhnOk(digits)) fail(400, 'That card number is not valid. Check the digits and try again.');
    if (!String(input.cardName ?? '').trim()) fail(400, 'Enter the name printed on the card.');
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(input.expiry ?? '').trim());
    if (!m) return fail(400, 'Enter the expiry date as MM/YY.');
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) fail(400, 'That expiry month does not exist.');
    const endOfMonth = new Date(year, month, 1).getTime();
    if (endOfMonth < Date.now()) fail(402, 'That card has expired. Try another card.');
    if (!/^\d{3,4}$/.test(String(input.cvc ?? ''))) fail(400, 'Enter the 3 or 4 digit security code.');
    // A card ending 0000 is the simulator's declined test card.
    if (digits.endsWith('0000')) fail(402, 'Your bank declined this card. Try another card or pay with PayPal.');
    return { reference: ref('pi'), last4: digits.slice(-4) };
  }

  if (input.method === 'paypal') {
    const email = String(input.email ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter the email on your PayPal account.');
    return { reference: `PAYID-${crypto.randomBytes(8).toString('hex').toUpperCase()}` };
  }

  const token = String(input.walletToken ?? '').trim();
  if (token.length < 6) fail(400, 'Google Pay did not return a payment token. Try again.');
  return { reference: `GPAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`, last4: token.slice(-4) };
}

/** Write the receipt. Everything else in the LMS reads payments from here. */
export function recordPayment(user: UserRecord, course: Course, method: PaymentMethod, result: ChargeResult): Payment {
  const d = db();
  if (!d.payments) d.payments = [];
  const payment: Payment = {
    id: uid('pay'),
    receiptId: `USAII-R-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    userId: user.id,
    learnerName: user.name,
    learnerEmail: user.email,
    courseId: course.id,
    courseTitle: course.title,
    amount: Math.round(course.price * 100) / 100,
    currency: 'USD',
    method,
    status: course.price > 0 ? 'paid' : 'free',
    reference: result.reference,
    last4: result.last4,
    createdAt: nowIso(),
  };
  d.payments.unshift(payment);
  if (d.payments.length > 5000) d.payments.length = 5000;
  save();
  return payment;
}
