import { CreditCard, Receipt, ThumbsUp, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { AuditEntry, Payment, PublicUser } from '../../shared/types';
import { api, tokenStore } from '../lib/api';
import { fmtDateTime } from '../lib/format';
import { useSession } from '../lib/session';
import { Button, Card, ErrorBox, FadeIn, Loading, Modal, PageHeader, PasswordField, Pill, Ring, Tabs, useConfirm, useLoad, useToast } from '../components/ui';

interface OverviewData {
  feedback: { recommendYes: number; totalLearners: number; answered: number; ease: number | null; startedWithoutAssistance: number };
  stats: {
    learners: number;
    instructors: number;
    publishedCourses: number;
    totalEnrollments: number;
    courseStartRate: number;
    courseCompletionRate: number;
    revenue: number;
    paidEnrollments: number;
  };
  comments: { id: string; name: string; comment: string; recommend: boolean; createdAt: string }[];
  payments: Payment[];
  audit: AuditEntry[];
}

const METHOD_LABEL: Record<Payment['method'], string> = { stripe: 'Card · Stripe', paypal: 'PayPal', gpay: 'Google Pay' };
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function BigRing({ title, value, label, color }: { title: string; value: number | null; label: string; color: string }) {
  return (
    <Card className="flex flex-col items-center py-7 text-center" hover>
      <Ring value={value} size={140} stroke={12} label={label} color={color} />
      <div className="mt-4 font-display text-[17px] font-bold leading-snug">{title}</div>
    </Card>
  );
}

function Tile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card className="relative overflow-hidden !p-5" hover>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="text-sm font-semibold text-ink-soft">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
    </Card>
  );
}

export function Overview() {
  const toast = useToast();
  const confirm = useConfirm();
  const { logout } = useSession();
  const [tab, setTab] = useState<'comments' | 'payments' | 'audit'>('comments');
  const { data, error, loading, reload } = useLoad(() => api<OverviewData>('/admin/overview'), []);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Could not load'} onRetry={() => void reload()} />;
  const f = data.feedback;
  const s = data.stats;
  const resetDemo = async () => {
    const ok = await confirm({ title: 'Reset all data to the demo state?', text: 'All accounts, courses and progress return to the original demo. Everyone is signed out.', confirm: 'Reset everything', danger: true });
    if (!ok) return;
    try {
      await api('/admin/reset-demo', { body: {} });
      toast('success', 'Demo data restored. Please sign in again.');
      tokenStore.set(null);
      setTimeout(logout, 800);
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Your institute at a glance: how learners are doing, what they say, and what they have paid." />
      <FadeIn className="grid gap-4 md:grid-cols-3">
        <BigRing title="Learners Who Would Recommend USAII®" value={f.totalLearners ? (f.recommendYes / f.totalLearners) * 100 : null} label={`${f.recommendYes}/${f.totalLearners}`} color="#FF2E93" />
        <BigRing title="Ease of Knowing the Next Step" value={f.ease === null ? null : (f.ease / 5) * 100} label={f.ease === null ? '—' : `${f.ease}/5`} color="#00C77F" />
        <BigRing title="Learners Who Started Their Course Unaided" value={f.startedWithoutAssistance} label={`${f.startedWithoutAssistance}%`} color="#1F6BFF" />
      </FadeIn>
      <FadeIn delay={0.1} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Tile label="No. of Learners" value={s.learners} color="#1F6BFF" />
        <Tile label="No. of Instructors" value={s.instructors} color="#8B3DFF" />
        <Tile label="Published Courses" value={s.publishedCourses} color="#FF2E93" />
        <Tile label="Course Start Rate" value={`${s.courseStartRate}%`} color="#8B3DFF" />
        <Tile label="Course Completion Rate" value={`${s.courseCompletionRate}%`} color="#00C77F" />
        <Tile label="Paid Enrollments" value={s.paidEnrollments} color="#1F6BFF" />
        <Tile label="Revenue Collected" value={money(s.revenue)} color="#FF2E93" />
      </FadeIn>
      <div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'comments', label: 'Learner comments' },
            { value: 'payments', label: 'Recent payments', count: data.payments.length },
            { value: 'audit', label: 'Activity log' },
          ]}
        />
        {tab === 'comments' ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.comments.length === 0 && <p className="text-sm text-ink-faint">No comments yet.</p>}
            {data.comments.map((c) => (
              <Card key={c.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{c.name}</span>
                  {c.recommend && (
                    <Pill color="green">
                      <ThumbsUp className="h-3 w-3" /> Recommends
                    </Pill>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-soft">“{c.comment}”</p>
              </Card>
            ))}
          </div>
        ) : tab === 'payments' ? (
          <PaymentTable payments={data.payments} />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="max-h-[420px] divide-y divide-line overflow-y-auto scroll-thin">
              {data.audit.map((a) => (
                <div key={a.id} className="grid gap-1 px-5 py-2.5 text-sm sm:grid-cols-[170px_1fr]">
                  <span className="text-xs text-ink-faint">{fmtDateTime(a.at)}</span>
                  <span>
                    <span className="font-semibold">{a.actorName}</span> <span className="text-ink-soft">{a.details}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => void resetDemo()}>
          Reset demo data
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Payments ---------------- */

function PaymentTable({ payments }: { payments: Payment[] }) {
  if (!payments.length)
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <Wallet className="h-6 w-6 text-ink-faint" />
        <div className="font-semibold">No payments yet</div>
        <p className="max-w-sm text-sm text-ink-soft">When someone enrolls from Explore Courses and pays with Stripe, PayPal or Google Pay, the receipt appears here.</p>
      </Card>
    );
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-mist/60 text-left text-xs text-ink-faint">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Learner</th>
              <th className="px-3 py-2.5 font-semibold">Course</th>
              <th className="px-3 py-2.5 font-semibold">Method</th>
              <th className="px-3 py-2.5 font-semibold">Receipt</th>
              <th className="px-3 py-2.5 font-semibold">When</th>
              <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <div className="font-semibold">{p.learnerName}</div>
                  <div className="text-xs text-ink-faint">{p.learnerEmail}</div>
                </td>
                <td className="px-3 text-ink-soft">{p.courseTitle}</td>
                <td className="px-3">
                  <Pill color={p.method === 'stripe' ? 'purple' : p.method === 'paypal' ? 'blue' : 'green'}>
                    <CreditCard className="h-3 w-3" /> {METHOD_LABEL[p.method]}
                    {p.last4 ? ` ····${p.last4}` : ''}
                  </Pill>
                </td>
                <td className="px-3 font-mono text-xs text-ink-faint">{p.receiptId}</td>
                <td className="px-3 text-xs text-ink-faint">{fmtDateTime(p.createdAt)}</td>
                <td className="px-5 text-right font-display font-bold">{p.status === 'free' ? 'Free' : money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Payments() {
  const { data, error, loading, reload } = useLoad(() => api<{ payments: Payment[] }>('/admin/payments'), []);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Could not load'} onRetry={() => void reload()} />;
  const paid = data.payments.filter((p) => p.status === 'paid');
  const total = paid.reduce((a, p) => a + p.amount, 0);
  const byMethod = (m: Payment['method']) => paid.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
  return (
    <div className="space-y-5">
      <PageHeader title="Payments" subtitle="Every enrollment paid through the USAII® checkout, newest first." />
      <FadeIn className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Total Collected" value={money(total)} color="#00C77F" />
        <Tile label="Card · Stripe" value={money(byMethod('stripe'))} color="#8B3DFF" />
        <Tile label="PayPal" value={money(byMethod('paypal'))} color="#1F6BFF" />
        <Tile label="Google Pay" value={money(byMethod('gpay'))} color="#FF2E93" />
      </FadeIn>
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <Receipt className="h-4 w-4 text-npurple" /> {data.payments.length} receipt{data.payments.length === 1 ? '' : 's'}
      </div>
      <PaymentTable payments={data.payments} />
    </div>
  );
}

export function SetPasswordModal({ user, endpoint, onClose }: { user: PublicUser | null; endpoint: string; onClose: () => void }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await api(endpoint, { body: { password: pw } });
      toast('success', `New password set for ${user.name}.`);
      setPw('');
      onClose();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Set password for ${user?.name ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={save}>
            Save password
          </Button>
        </>
      }
    >
      <PasswordField value={pw} onChange={setPw} id="set-pw" label="New password" />
      <p className="mt-3 text-xs text-ink-faint">Share the new password with {user?.name.split(' ')[0]} so they can sign in.</p>
    </Modal>
  );
}
