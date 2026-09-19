/**
 * The public face of USAII: the course catalog anyone can browse before they
 * sign in, and the checkout that turns a visitor into an enrolled learner.
 */
import { Router } from 'express';
import type { Course, UserRecord } from '../../shared/types';
import { hashPassword, initials, issueToken, requireAuth, requireRole, toPublic, validatePassword } from '../auth';
import { db, nowIso, save, uid } from '../db';
import { charge, methodLabel, readMethod, recordPayment } from '../payments';
import { audit, fail, getCourse, getEnrollment, notifyStaff, recordEvent } from '../services';
import { me, wrap } from './util';

export const catalogRouter = Router();

const minutesOf = (c: Course) => c.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.estimatedMinutes, 0), 0);
const lessonsOf = (c: Course) => c.modules.reduce((a, m) => a + m.lessons.length, 0);

/** Everything the public catalog card and detail page need. No answers, no learner data. */
export function publicCourse(c: Course) {
  const d = db();
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    credentialName: c.credentialName,
    durationLabel: c.durationLabel,
    level: c.level,
    price: c.price,
    access: c.access,
    accent: c.accent,
    coverImage: c.coverImage,
    passMark: c.passMark,
    studyPlanUrl: c.studyPlan?.url,
    studyPlanName: c.studyPlan?.name,
    modules: c.modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, topic: l.topic, minutes: l.estimatedMinutes, summary: l.summary })),
    })),
    moduleCount: c.modules.length,
    lessons: lessonsOf(c),
    minutes: minutesOf(c),
    hasFinal: !!c.finalExam?.questions.length,
    learners: d.enrollments.filter((e) => e.courseId === c.id).length,
  };
}

const published = () => db().courses.filter((c) => c.status === 'published');

catalogRouter.get('/courses', wrap(() => ({ courses: published().map(publicCourse) })));

catalogRouter.get(
  '/courses/:id',
  wrap((req) => {
    const c = published().find((x) => x.id === req.params.id) ?? fail(404, 'Course not found.');
    return { course: publicCourse(c!) };
  }),
);

/** A short, human summary of the institute for the About page. */
catalogRouter.get(
  '/institute',
  wrap(() => {
    const d = db();
    return {
      learners: d.users.filter((u) => u.role === 'learner').length,
      courses: d.courses.filter((c) => c.status === 'published').length,
      credentials: d.enrollments.filter((e) => e.certificateIssuedAt).length,
    };
  }),
);

/* ------------------------------------------------------------------ */
/* Checkout                                                            */
/* ------------------------------------------------------------------ */

/** Run the gateway first. Nothing is written until the money clears. */
function authorize(course: Course, methodRaw: unknown, body: any, fallbackEmail: string) {
  const method = readMethod(methodRaw);
  const result = charge({
    method,
    amount: course.price,
    cardNumber: body?.cardNumber,
    cardName: body?.cardName,
    expiry: body?.expiry,
    cvc: body?.cvc,
    email: body?.paypalEmail || fallbackEmail,
    walletToken: body?.walletToken ?? (method === 'gpay' ? `gpay-tok-${uid('t')}` : undefined),
  });
  return { method, result };
}

/** Write the receipt and open the course. Only ever called after a successful charge. */
function completeEnrollment(user: UserRecord, course: Course, method: ReturnType<typeof authorize>['method'], result: ReturnType<typeof authorize>['result']) {
  const payment = recordPayment(user, course, method, result);
  if (!getEnrollment(user.id, course.id)) {
    db().enrollments.push({ id: uid('enr'), userId: user.id, courseId: course.id, enrolledAt: nowIso(), lessons: {} });
  }
  audit(user, 'ENROLL', `${user.name} enrolled in ${course.title} — ${course.price > 0 ? `$${course.price} via ${methodLabel(method)}` : 'free'} (receipt ${payment.receiptId}).`);
  notifyStaff({
    kind: 'access',
    title: course.price > 0 ? `New paid enrollment: ${user.name}` : `New enrollment: ${user.name}`,
    body: `${user.name} joined ${course.title}${course.price > 0 ? ` for $${course.price}` : ''}.`,
    link: { view: 'learners' },
  });
  recordEvent(user.id, 'login', course.id);
  save();
  return payment;
}

/** A visitor pays, gets an account, and is signed in — all in one step. */
catalogRouter.post(
  '/checkout',
  wrap((req) => {
    const d = db();
    const b = req.body ?? {};
    const course = published().find((c) => c.id === String(b.courseId ?? '')) ?? fail(404, 'Course not found.');
    if (course!.access !== 'open') fail(403, 'This credential is by invitation. Please contact USAII® to request a place.');
    const name = String(b.name ?? '').trim().slice(0, 100);
    const email = String(b.email ?? '').trim().toLowerCase();
    if (name.length < 2) fail(400, 'Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');

    let user = d.users.find((u) => u.email.toLowerCase() === email);
    if (user && user.role !== 'learner') fail(409, 'That email belongs to a staff account. Please sign in first.');
    if (user && getEnrollment(user.id, course!.id)) fail(409, 'You are already enrolled in this course. Please sign in.');
    if (user) fail(409, 'You already have a USAII® account. Please sign in, then enroll from Explore Courses.');

    const password = String(b.password ?? '');
    const pwErr = validatePassword(password);
    if (pwErr) fail(400, pwErr);

    // Take the payment BEFORE creating anything, so a declined card never
    // leaves a half-made account behind.
    const { method, result } = authorize(course!, b.method, b, email);

    user = {
      id: uid('u'),
      name,
      email,
      role: 'learner',
      initials: initials(name),
      active: true,
      createdAt: nowIso(),
      onboarded: false,
      mustChangePassword: false,
      ...hashPassword(password),
    };
    d.users.push(user);

    const payment = completeEnrollment(user, course!, method, result);
    return { token: issueToken(user.id), user: toPublic(user), payment };
  }),
);

/** A learner who is already signed in pays for another credential. */
catalogRouter.post(
  '/checkout/:courseId',
  requireAuth,
  requireRole('learner'),
  wrap((req) => {
    const u = me(req);
    const course = published().find((c) => c.id === req.params.courseId) ?? fail(404, 'Course not found.');
    if (course!.access !== 'open') fail(403, 'This credential is by invitation. Use “Request access” instead.');
    if (getEnrollment(u.id, course!.id)) fail(409, 'You are already enrolled in this course.');
    const { method, result } = authorize(course!, req.body?.method, req.body ?? {}, u.email);
    const payment = completeEnrollment(u, course!, method, result);
    return { payment };
  }),
);

/** Receipts a learner can look back at. */
catalogRouter.get(
  '/receipts',
  requireAuth,
  wrap((req) => {
    const u = me(req);
    return { payments: (db().payments ?? []).filter((p) => p.userId === u.id) };
  }),
);
