import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, BadgeCheck, CheckCircle2, CreditCard, Loader2, Lock, Mail, ShieldCheck, Smartphone, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Payment, PublicUser } from '../../shared/types';
import { api, tokenStore } from '../lib/api';
import { ACCENT } from '../lib/format';
import { Button, Card, cx, ErrorBox, Input, Label, Loading, navigate, PasswordField, useLoad } from '../components/ui';
import PublicShell from './PublicShell';
import { money, type CatalogCourse } from './catalog';

type Method = 'stripe' | 'paypal' | 'gpay';

const METHODS: { id: Method; label: string; hint: string; icon: typeof CreditCard; color: string }[] = [
  { id: 'stripe', label: 'Card', hint: 'Visa, Mastercard, Amex — secured by Stripe', icon: CreditCard, color: '#635BFF' },
  { id: 'paypal', label: 'PayPal', hint: 'Pay with your PayPal balance or linked bank', icon: ShieldCheck, color: '#0070BA' },
  { id: 'gpay', label: 'Google Pay', hint: 'One tap with a card saved to your Google account', icon: Smartphone, color: '#1F6BFF' },
];

const groupCard = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};

/**
 * One page, one job: take the payment and drop the learner straight into their
 * course. Guests get an account created for them as part of the same step.
 */
export default function Checkout({ courseId, user, onAuthed, bare }: { courseId: string; user?: PublicUser | null; onAuthed?: (u: PublicUser) => void; bare?: boolean }) {
  const Frame = ({ children }: { children: React.ReactNode }) => (bare ? <div>{children}</div> : <PublicShell current="explore-courses">{children}</PublicShell>);
  const { data, error, loading } = useLoad(() => api<{ course: CatalogCourse }>(`/public/courses/${courseId}`), [courseId]);
  const course = data?.course;

  const [method, setMethod] = useState<Method>('stripe');
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Payment | null>(null);

  if (loading) return <Frame><Loading label="Loading your order…" /></Frame>;
  if (error || !course)
    return (
      <Frame>
        <div className="py-16">
          <ErrorBox message={error ?? 'That course is no longer available.'} />
          <div className="mt-5">
            <Button variant="secondary" onClick={() => navigate(bare ? 'explore' : 'explore-courses')} icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Explore Courses
            </Button>
          </div>
        </div>
      </Frame>
    );

  const a = ACCENT[course.accent] ?? ACCENT.blue;
  const free = course.price === 0;

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const body: Record<string, unknown> = { method, cardNumber, cardName, expiry, cvc, paypalEmail, walletToken: `gpay-tok-${Date.now()}` };
    try {
      if (user) {
        const r = await api<{ payment: Payment }>(`/public/checkout/${course.id}`, { body });
        setDone(r.payment);
        setTimeout(() => {
          window.location.hash = '#/dashboard';
          window.dispatchEvent(new Event('lms:reload-home'));
        }, 1500);
      } else {
        const r = await api<{ token: string; user: PublicUser; payment: Payment }>('/public/checkout', { body: { ...body, courseId: course.id, name, email, password } });
        tokenStore.set(r.token);
        setDone(r.payment);
        setTimeout(() => {
          window.location.hash = '#/dashboard';
          onAuthed?.(r.user);
        }, 1600);
      }
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  };

  /* ---------------- Success ---------------- */
  if (done)
    return (
      <Frame>
        <div className="flex min-h-[60vh] items-center justify-center py-10">
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="beam w-full max-w-lg">
            <div className="beam-inner p-9 text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 11 }} className="inline-flex">
                <CheckCircle2 className="h-16 w-16 text-ngreen" />
              </motion.span>
              <h1 className="mt-4 font-display text-3xl font-extrabold">You’re enrolled!</h1>
              <p className="mt-2 text-ink-soft">
                {free ? 'Your place in' : `Payment of ${money(done.amount)} received for`} <span className="font-semibold text-ink">{course.title}</span> is confirmed.
              </p>
              <div className="mt-5 rounded-2xl border border-line bg-mist/60 px-4 py-3 text-left text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-ink-soft">Receipt</span>
                  <code className="font-mono text-xs">{done.receiptId}</code>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="text-ink-soft">Reference</span>
                  <code className="truncate font-mono text-xs">{done.reference}</code>
                </div>
              </div>
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-npurple">
                <Loader2 className="h-4 w-4 animate-spin" /> Opening your learning dashboard…
              </p>
            </div>
          </motion.div>
        </div>
      </Frame>
    );

  /* ---------------- Checkout ---------------- */
  return (
    <Frame>
      <div className="py-8">
        <button onClick={() => navigate(bare ? 'explore' : 'explore-courses')} className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition hover:text-nblue">
          <ArrowLeft className="h-4 w-4" /> Back to Explore Courses
        </button>

        <div className="grid gap-7 lg:grid-cols-[1fr_1.15fr]">
          {/* Order summary */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="!p-0 overflow-hidden">
              <div className="h-24" style={{ background: `linear-gradient(135deg, ${a.hex}, ${a.hex}88 60%, #ffffff)` }} />
              <div className="p-6">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Your order</div>
                <h2 className="mt-1 font-display text-2xl font-extrabold leading-snug">{course.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">{course.subtitle}</p>

                <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm">
                  {[
                    ['Duration', course.durationLabel || `${course.lessons} lessons`],
                    ['Lessons', `${course.lessons}${course.hasFinal ? ' + final assessment' : ''}`],
                    ['Level', course.level || 'Everyone'],
                    ['Credential', course.credentialName],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="shrink-0 text-ink-faint">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex items-end justify-between border-t border-line pt-5">
                  <span className="font-semibold text-ink-soft">Total due today</span>
                  <span className="font-display text-3xl font-extrabold grad-text">{money(course.price)}</span>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-ink-faint">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ngreen" />
                  One fee, lifetime access to this credential. Nothing to upgrade, no subscription.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Payment */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <h1 className="font-display text-2xl font-extrabold">{free ? 'Confirm your place' : 'Secure checkout'}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                {user ? `Signed in as ${user.name}.` : 'Pay once and your USAII® account is created automatically — you’ll land straight in your course.'}
              </p>

              <form onSubmit={pay} className="mt-6 space-y-6" noValidate>
                {!user && (
                  <fieldset className="space-y-4">
                    <legend className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-faint">1 · Your details</legend>
                    <div>
                      <Label htmlFor="co-name">Full name</Label>
                      <div className="group relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" placeholder="Alex Rivera" autoComplete="name" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="co-email">Email</Label>
                      <div className="group relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <Input id="co-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" autoComplete="email" />
                      </div>
                    </div>
                    <PasswordField id="co-pw" value={password} onChange={setPassword} label="Create a password" />
                  </fieldset>
                )}

                {!free && (
                  <fieldset>
                    <legend className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-faint">{user ? '1' : '2'} · Payment method</legend>
                    <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Payment method">
                      {METHODS.map((m) => {
                        const on = method === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => {
                              setMethod(m.id);
                              setErr('');
                            }}
                            className={cx(
                              'relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3.5 text-[13px] font-bold transition',
                              on ? 'text-white shadow-md' : 'border-line text-ink-soft hover:border-nblue hover:text-ink',
                            )}
                            style={on ? { background: m.color, borderColor: m.color } : undefined}
                          >
                            <m.icon className="h-5 w-5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-ink-faint">{METHODS.find((m) => m.id === method)!.hint}</p>

                    <AnimatePresence mode="wait">
                      <motion.div key={method} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 space-y-4">
                        {method === 'stripe' && (
                          <>
                            <div>
                              <Label htmlFor="cc-num">Card number</Label>
                              <Input id="cc-num" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(groupCard(e.target.value))} placeholder="4242 4242 4242 4242" autoComplete="cc-number" />
                            </div>
                            <div>
                              <Label htmlFor="cc-name">Name on card</Label>
                              <Input id="cc-name" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="ALEX RIVERA" autoComplete="cc-name" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="cc-exp">Expiry</Label>
                                <Input id="cc-exp" inputMode="numeric" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" autoComplete="cc-exp" />
                              </div>
                              <div>
                                <Label htmlFor="cc-cvc">Security code</Label>
                                <Input id="cc-cvc" inputMode="numeric" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" autoComplete="cc-csc" />
                              </div>
                            </div>
                          </>
                        )}

                        {method === 'paypal' && (
                          <div>
                            <Label htmlFor="pp-email">PayPal email</Label>
                            <div className="group relative">
                              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                              <Input id="pp-email" type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
                            </div>
                            <p className="mt-2 text-xs text-ink-faint">You will confirm the amount in PayPal before anything is charged.</p>
                          </div>
                        )}

                        {method === 'gpay' && (
                          <div className="rounded-2xl border border-line bg-mist/60 px-4 py-5 text-center">
                            <Smartphone className="mx-auto h-7 w-7 text-nblue" />
                            <p className="mt-2 text-sm font-semibold">Google Pay is ready</p>
                            <p className="mt-1 text-xs text-ink-faint">Your saved card will be used. Confirm below to complete the payment.</p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </fieldset>
                )}

                <AnimatePresence>
                  {err && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert" className="rounded-2xl bg-npink-soft px-4 py-3 text-sm font-medium text-npink">
                      {err}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" size="lg" loading={busy} className="w-full">
                  <Lock className="h-4 w-4" /> {free ? 'Enroll for free' : `Pay ${money(course.price)} and start`}
                </Button>

                <p className="flex items-start gap-2 text-center text-xs text-ink-faint">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ngreen" />
                  Payments are encrypted in transit. USAII® never stores your full card number.
                </p>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </Frame>
  );
}
