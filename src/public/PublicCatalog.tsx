import { motion } from 'motion/react';
import { BookOpen, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import { Empty, ErrorBox, Loading, navigate, useLoad } from '../components/ui';
import PublicShell from './PublicShell';
import { CourseGrid, StudyPlanModal, type CatalogCourse } from './catalog';

/** Explore Courses, open to anyone: browse, read the study plan, enroll, pay, start. */
export default function PublicCatalog() {
  const { data, error, loading, reload } = useLoad(() => api<{ courses: CatalogCourse[] }>('/public/courses'), []);
  const [plan, setPlan] = useState<CatalogCourse | null>(null);
  const courses = data?.courses ?? [];

  return (
    <PublicShell current="explore-courses" wide>
      <div className="py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-npurple-soft px-3.5 py-1.5 text-[13px] font-bold text-npurple">
            <Sparkles className="h-3.5 w-3.5" /> USAII® Micro-Credentials
          </span>
          <h1 className="mt-4 font-display text-[40px] font-extrabold leading-[1.08] sm:text-[52px]">
            Explore <span className="grad-text">Courses</span>
          </h1>
          <p className="mt-4 text-[18px] leading-relaxed text-ink-soft">
            Short, practical AI credentials for every career stage. No coding required. Read the full study plan before you pay, enroll in a minute, and start the same day.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ngreen" /> ANSI &amp; I.C.E. member institute
            </span>
            <span className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-nblue" /> One fair fee, nothing to upgrade
            </span>
          </div>
        </motion.div>

        <div className="mt-10">
          {loading && <Loading label="Loading the catalog…" />}
          {error && <ErrorBox message={error} onRetry={() => void reload()} />}
          {!loading && !error && courses.length === 0 && <Empty icon={<BookOpen className="h-6 w-6" />} title="No courses published yet" text="Please check back soon." />}
          {!loading && !error && courses.length > 0 && (
            <CourseGrid courses={courses} onPlan={setPlan} onEnroll={(c) => navigate(`enroll/${c.id}`)} />
          )}
        </div>
      </div>

      <StudyPlanModal
        course={plan}
        onClose={() => setPlan(null)}
        onEnroll={(c) => {
          setPlan(null);
          navigate(`enroll/${c.id}`);
        }}
      />
    </PublicShell>
  );
}
