import { motion } from 'motion/react';
import { Award, BookOpen, CheckCircle2, Clock, FileText, GraduationCap, Layers, Lock, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { ACCENT, fmtMinutes } from '../lib/format';
import { Button, Card, cx, Modal, Pill } from '../components/ui';

export interface CatalogLesson {
  id: string;
  title: string;
  topic: string;
  minutes: number;
  summary: string;
}
export interface CatalogModule {
  id: string;
  title: string;
  summary: string;
  lessons: CatalogLesson[];
}
export interface CatalogCourse {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  credentialName: string;
  durationLabel: string;
  level: string;
  price: number;
  access: 'open' | 'invite';
  accent: string;
  coverImage?: string;
  passMark: number;
  studyPlanUrl?: string;
  studyPlanName?: string;
  modules: CatalogModule[];
  moduleCount: number;
  lessons: number;
  minutes: number;
  hasFinal: boolean;
  learners: number;
  /** Only present when a learner is signed in. */
  enrolled?: boolean;
}

export const money = (n: number) => (n === 0 ? 'Free' : `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);

/* ------------------------------------------------------------------ */
/* Study plan                                                          */
/* ------------------------------------------------------------------ */

/** The whole course, laid out module by module, before anyone pays a cent. */
export function StudyPlanModal({ course, onClose, onEnroll }: { course: CatalogCourse | null; onClose: () => void; onEnroll?: (c: CatalogCourse) => void }) {
  if (!course) return null;
  const a = ACCENT[course.accent] ?? ACCENT.blue;
  const facts = [
    { icon: Clock, label: 'Duration', value: course.durationLabel || fmtMinutes(course.minutes) },
    { icon: Layers, label: 'Modules', value: `${course.moduleCount}` },
    { icon: BookOpen, label: 'Lessons', value: `${course.lessons}${course.hasFinal ? ' + final' : ''}` },
    { icon: GraduationCap, label: 'Level', value: course.level || 'Everyone' },
    { icon: ShieldCheck, label: 'Pass mark', value: `${course.passMark}%` },
    { icon: Award, label: 'Fee', value: money(course.price) },
  ];
  return (
    <Modal
      open={!!course}
      onClose={onClose}
      wide
      title={`Study plan · ${course.title}`}
      footer={
        <>
          {course.studyPlanUrl && (
            <Button variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={() => window.open(course.studyPlanUrl, '_blank', 'noopener')}>
              Download PDF
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onEnroll && !course.enrolled && (
            <Button onClick={() => onEnroll(course)}>{course.price === 0 ? 'Start for free' : `Enroll Now! · ${money(course.price)}`}</Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[15px] leading-relaxed text-ink-soft">{course.description || course.subtitle}</p>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-2xl border border-line bg-mist/50 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <f.icon className="h-3.5 w-3.5" /> {f.label}
              </div>
              <div className="mt-0.5 font-display text-[15px] font-bold">{f.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-ngreen/35 bg-ngreen-soft/60 px-4 py-3 text-sm">
          <span className="font-semibold">You earn:</span> {course.credentialName}
        </div>

        <div className="space-y-3">
          {course.modules.map((m, mi) => (
            <div key={m.id} className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: `${a.hex}14` }}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white" style={{ background: a.hex }}>
                  {mi + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-bold">{m.title}</div>
                  {m.summary && <div className="truncate text-xs text-ink-faint">{m.summary}</div>}
                </div>
                <span className="ml-auto shrink-0 text-xs font-semibold text-ink-faint">{m.lessons.length} lessons</span>
              </div>
              <ul className="divide-y divide-line">
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                    <span className="flex-1">{l.title}</span>
                    <span className="shrink-0 text-xs text-ink-faint">{l.minutes} min</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {course.hasFinal && (
          <div className="rounded-2xl border border-dashed border-npurple/40 bg-npurple-soft/40 px-4 py-3 text-sm text-ink-soft">
            Finish with a timed final assessment. Score {course.passMark}% or more and your USAII® credential is issued automatically.
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Course card                                                         */
/* ------------------------------------------------------------------ */

export function CourseCard({ c, index = 0, onPlan, onEnroll, onOpen, busy, disabled }: {
  c: CatalogCourse;
  index?: number;
  onPlan: (c: CatalogCourse) => void;
  onEnroll: (c: CatalogCourse) => void;
  onOpen?: (c: CatalogCourse) => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const a = ACCENT[c.accent] ?? ACCENT.blue;
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.07, 0.35), duration: 0.45 }}>
      <Card hover className="flex h-full flex-col !p-0 overflow-hidden">
        <div className="relative h-32 overflow-hidden" style={{ background: c.coverImage ? undefined : `linear-gradient(135deg, ${a.hex}, ${a.hex}88 60%, #ffffff)` }}>
          {c.coverImage && <img src={c.coverImage} alt="" className="h-full w-full object-cover" />}
          <div className="absolute right-3 top-3">
            <span className="on-color rounded-full bg-white/95 px-3 py-1 font-display text-[15px] font-extrabold shadow-sm" style={{ color: a.text }}>
              {money(c.price)}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5">
            <span className="on-color rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">{c.level || 'Everyone'}</span>
            {c.access === 'invite' && (
              <span className="on-color inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                <Lock className="h-3 w-3" /> By invitation
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-[19px] font-bold leading-snug">{c.title}</h3>
          <p className="mt-1 text-sm font-medium text-ink-soft">{c.subtitle}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill color="gray">
              <Clock className="h-3 w-3" /> {c.durationLabel || fmtMinutes(c.minutes)}
            </Pill>
            <Pill color="gray">
              <BookOpen className="h-3 w-3" /> {c.lessons} lessons
            </Pill>
            <Pill color="gray">
              <Users className="h-3 w-3" /> {c.learners}
            </Pill>
          </div>

          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">{c.description}</p>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-faint">
            <Award className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c.credentialName}
          </p>

          <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
            <Button variant="secondary" icon={<FileText className="h-4 w-4" />} onClick={() => onPlan(c)}>
              View Study Plan
            </Button>
            {c.enrolled ? (
              <Button variant="secondary" icon={<CheckCircle2 className="h-4 w-4 text-ngreen" />} onClick={() => onOpen?.(c)}>
                Go to course
              </Button>
            ) : (
              <Button loading={busy} disabled={disabled} onClick={() => onEnroll(c)} className={cx('btn-shine')}>
                Enroll Now!
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/** One grid, used by the public catalog and by the signed-in learner's Explore page. */
export function CourseGrid({ courses, onPlan, onEnroll, onOpen, busyId, disabled }: {
  courses: CatalogCourse[];
  onPlan: (c: CatalogCourse) => void;
  onEnroll: (c: CatalogCourse) => void;
  onOpen?: (c: CatalogCourse) => void;
  busyId?: string;
  disabled?: boolean;
}) {
  const [, force] = useState(0);
  void force;
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((c, i) => (
        <CourseCard key={c.id} c={c} index={i} onPlan={onPlan} onEnroll={onEnroll} onOpen={onOpen} busy={busyId === c.id} disabled={disabled} />
      ))}
    </div>
  );
}
