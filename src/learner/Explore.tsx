import { BookOpen, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import { Empty, ErrorBox, Loading, navigate, PageHeader, useLoad, useToast } from '../components/ui';
import { CourseGrid, StudyPlanModal, type CatalogCourse } from '../public/catalog';
import { useLearner } from './context';

/** The signed-in learner's catalog: same cards as the public page, same one-tap enrollment. */
export default function Explore() {
  const { reload: reloadHome, setActiveId, readOnly, home } = useLearner();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api<{ courses: CatalogCourse[] }>('/public/courses'), []);
  const [plan, setPlan] = useState<CatalogCourse | null>(null);
  const [busy, setBusy] = useState('');

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void reload()} />;

  const enrolledIds = new Set(home.items.map((i) => i.course.id));
  const courses = (data?.courses ?? []).map((c) => ({ ...c, enrolled: enrolledIds.has(c.id) }));

  const open = (c: CatalogCourse) => {
    setActiveId(c.id);
    navigate('dashboard');
  };

  const enroll = async (c: CatalogCourse) => {
    if (readOnly) return;
    if (c.access === 'invite') {
      setBusy(c.id);
      try {
        await api(`/learner/request-access/${c.id}`, { body: {} });
        toast('success', 'Request sent. Your instructor will respond soon.');
      } catch (e) {
        toast('error', (e as Error).message);
      } finally {
        setBusy('');
      }
      return;
    }
    if (c.price > 0) {
      navigate(`enroll/${c.id}`);
      return;
    }
    setBusy(c.id);
    try {
      await api(`/learner/enroll/${c.id}`, { body: {} });
      await reloadHome();
      setActiveId(c.id);
      toast('success', `You are enrolled in ${c.title}.`);
      navigate('dashboard');
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Explore Courses"
        eyebrow="USAII® Micro-Credentials"
        subtitle="Short, practical AI credentials. Read the full study plan first, then enroll and start the same day."
      />
      {courses.length === 0 ? (
        <Empty icon={<BookOpen className="h-6 w-6" />} title="No courses published yet" text="Please check back soon." />
      ) : (
        <CourseGrid courses={courses} onPlan={setPlan} onEnroll={(c) => void enroll(c)} onOpen={open} busyId={busy} disabled={readOnly} />
      )}
      <StudyPlanModal
        course={plan}
        onClose={() => setPlan(null)}
        onEnroll={(c) => {
          setPlan(null);
          void enroll(c);
        }}
      />
      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-faint">
        <Sparkles className="h-3.5 w-3.5" /> One fee per credential. Nothing to upgrade, no subscription.
      </p>
    </div>
  );
}
