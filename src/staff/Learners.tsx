import { Check, Eye, KeyRound, Mail, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublicUser } from '../../shared/types';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { Avatar, Button, Card, cx, Empty, ErrorBox, Input, Loading, navigate, PageHeader, useConfirm, useLoad, useToast } from '../components/ui';
import { SetPasswordModal } from './Admin';
import { MessageModal } from './Cohort';

interface LearnerRow {
  user: PublicUser;
  courses: { courseId: string; title: string; percent: number; credential: boolean }[];
  lastActive: string;
}
interface LearnersData {
  learners: LearnerRow[];
  courses: { id: string; title: string; status: string }[];
}

export default function Learners() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pwUser, setPwUser] = useState<PublicUser | null>(null);
  const [msgTo, setMsgTo] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const { data, setData, error, loading, reload } = useLoad(() => api<LearnersData>('/staff/learners'), []);
  const rows = useMemo(() => (data?.learners ?? []).filter((r) => `${r.user.name} ${r.user.email}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Could not load learners'} onRetry={() => void reload()} />;

  const toggle = async (r: LearnerRow, c: { id: string; title: string }) => {
    const has = r.courses.some((x) => x.courseId === c.id);
    if (has && !(await confirm({ title: `Remove ${r.user.name} from ${c.title}?`, text: 'Their progress in this course will be deleted.', confirm: 'Remove access', danger: true }))) return;
    const key = `${r.user.id}:${c.id}`;
    setBusy(key);
    try {
      await api('/staff/access', { body: { userId: r.user.id, courseId: c.id, grant: !has } });
      setData((d) =>
        d
          ? {
              ...d,
              learners: d.learners.map((x) =>
                x.user.id !== r.user.id
                  ? x
                  : { ...x, courses: has ? x.courses.filter((y) => y.courseId !== c.id) : [...x.courses, { courseId: c.id, title: c.title, percent: 0, credential: false }] },
              ),
            }
          : d,
      );
      toast('success', has ? `Removed from ${c.title}.` : `${r.user.name.split(' ')[0]} can now open ${c.title}.`);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Learners & Access"
        subtitle="Everyone who has enrolled through Explore Courses. Tap a course to give or remove access."
      />
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search learners" className="!rounded-full pl-10" />
      </div>
      {rows.length === 0 ? (
        <Empty icon={<Users className="h-6 w-6" />} title="No learners yet" text="Learners appear here the moment they enroll and pay on the Explore Courses page." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.user.id} className={cx('!p-4', !r.user.active && 'opacity-50')}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex min-w-[220px] flex-1 items-center gap-3">
                  <Avatar initials={r.user.initials} size={40} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.user.name}</div>
                    <div className="truncate text-xs text-ink-faint">
                      {r.user.email} · active {timeAgo(r.lastActive || null)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} disabled={!r.courses.length} onClick={() => navigate(`learner/${r.user.id}`)}>
                    View
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Mail className="h-4 w-4" />} onClick={() => setMsgTo({ id: r.user.id, name: r.user.name, email: r.user.email })}>
                    Message
                  </Button>
                  <Button size="sm" variant="ghost" icon={<KeyRound className="h-4 w-4" />} onClick={() => setPwUser(r.user)}>
                    Password
                  </Button>
                </div>
              </div>
              <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto border-t border-line pt-3 scroll-thin">
                {data.courses.map((c) => {
                  const enr = r.courses.find((x) => x.courseId === c.id);
                  const key = `${r.user.id}:${c.id}`;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy === key}
                      onClick={() => void toggle(r, c)}
                      title={enr ? 'Has access. Tap to remove.' : 'No access. Tap to give access.'}
                      className={cx(
                        'flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-[13px] font-semibold transition disabled:opacity-50',
                        enr ? 'border-transparent bg-gradient-to-r from-nblue to-npurple text-white shadow-sm' : 'border-dashed border-line text-ink-soft hover:border-nblue hover:text-nblue',
                      )}
                    >
                      {enr ? <Check className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 truncate">{c.title}</span>
                      <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px]', enr ? 'bg-white/25' : 'bg-mist')}>{enr ? (enr.credential ? 'Done' : `${enr.percent}%`) : 'No access'}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
      <SetPasswordModal user={pwUser} endpoint={`/staff/learners/${pwUser?.id}/password`} onClose={() => setPwUser(null)} />
      <MessageModal to={msgTo} onClose={() => setMsgTo(null)} />
    </div>
  );
}
