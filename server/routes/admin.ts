import { Router } from 'express';
import type { UserRecord } from '../../shared/types';
import { hashPassword, initials, requireAuth, requireRole, toPublic, validatePassword } from '../auth';
import { db, nowIso, replaceDb, save, uid } from '../db';
import { seedDatabase } from '../seed';
import { audit, fail } from '../services';
import { me, wrap } from './util';

/**
 * Institute routes. There is no separate administrator any more: the instructor
 * runs the institute as well as their own teaching, so these live behind the
 * instructor role.
 */
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('instructor'));

adminRouter.get(
  '/overview',
  wrap(() => {
    const d = db();
    const learnerIds = new Set(d.users.filter((u) => u.role === 'learner').map((u) => u.id));
    const enrs = d.enrollments.filter((e) => learnerIds.has(e.userId));
    const started = enrs.filter((e) => Object.values(e.lessons).some((p) => p.status !== 'not_started'));
    const completed = enrs.filter((e) => e.certificateIssuedAt);
    // A learner can rate several things (each course, plus the portal itself), so
    // count people, not entries: one learner is one voice, using their latest rating.
    const answers = d.feedback.filter((f) => learnerIds.has(f.userId));
    const latestOf = (list: typeof answers) => {
      const m = new Map<string, (typeof answers)[number]>();
      for (const f of list) {
        const held = m.get(f.userId);
        if (!held || Date.parse(f.createdAt) > Date.parse(held.createdAt)) m.set(f.userId, f);
      }
      return [...m.values()];
    };
    // "Would you recommend USAII® courses?" is its own Yes/No question. Where a
    // learner has answered it, that is their answer; otherwise their star rating
    // stands in for it (four stars or more counts as a yes).
    const votes = latestOf(answers.filter((f) => f.kind === 'recommend'));
    const voted = new Set(votes.map((f) => f.userId));
    const rated = latestOf(answers.filter((f) => f.kind !== 'recommend'));
    const voices = [...votes, ...rated.filter((f) => !voted.has(f.userId))];
    // Ease comes from star ratings only: a Yes/No vote carries no score.
    const ease = rated.length ? Math.round((rated.reduce((a, f) => a + f.ease, 0) / rated.length) * 10) / 10 : null;
    // Started without assistance: first lesson opened within 36 hours of getting access.
    const selfStarted = started.filter((e) => {
      const first = Object.values(e.lessons).map((p) => p.startedAt).filter(Boolean).sort()[0];
      return first && Date.parse(first) - Date.parse(e.enrolledAt) < 36 * 3_600_000;
    }).length;
    const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
    return {
      feedback: {
        recommendYes: voices.filter((f) => f.recommend).length,
        totalLearners: learnerIds.size,
        answered: voices.length,
        ease,
        startedWithoutAssistance: pct(selfStarted, started.length),
      },
      stats: {
        learners: learnerIds.size,
        instructors: d.users.filter((u) => u.role === 'instructor').length,
        publishedCourses: d.courses.filter((c) => c.status === 'published').length,
        totalEnrollments: enrs.length,
        courseStartRate: pct(started.length, enrs.length),
        courseCompletionRate: pct(completed.length, enrs.length),
        revenue: Math.round((d.payments ?? []).filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0) * 100) / 100,
        paidEnrollments: (d.payments ?? []).filter((p) => p.status === 'paid').length,
      },
      payments: (d.payments ?? []).slice(0, 25),
      comments: answers
        .filter((f) => f.comment)
        .slice(0, 6)
        .map((f) => ({ id: f.id, name: d.users.find((u) => u.id === f.userId)?.name ?? 'Learner', comment: f.comment, recommend: f.recommend, createdAt: f.createdAt })),
      audit: d.audit.slice(0, 50),
    };
  }),
);

adminRouter.post(
  '/reset-demo',
  wrap(() => {
    replaceDb(seedDatabase());
    return { ok: true };
  }),
);

/** Every payment taken through the USAII checkout. */
adminRouter.get('/payments', wrap(() => ({ payments: db().payments ?? [] })));
