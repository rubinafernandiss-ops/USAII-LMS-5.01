import { motion } from 'motion/react';
import { ArrowRight, Award, BadgeCheck, Building2, Globe2, ShieldCheck } from 'lucide-react';
import { Button, Card, navigate } from '../components/ui';
import PublicShell from './PublicShell';

const MEMBERSHIPS = [
  {
    name: 'American National Standards Institute (ANSI)',
    short: 'ANSI',
    icon: Building2,
    color: '#1F6BFF',
    text:
      'One of America’s oldest institutions, ANSI is a private, non-profit organization that has administered and coordinated the U.S. voluntary standards system since 1918. USAII®, under EdTechDigit Innovations, is a member of ANSI.',
  },
  {
    name: 'Institute for Credentialing Excellence (I.C.E.)',
    short: 'I.C.E.',
    icon: Award,
    color: '#8B3DFF',
    text:
      'I.C.E. is a leading developer of standards for certification and certificate programs, and a clearing house for trends in test development, delivery and assessment-based credentials. USAII®, under EdTechDigit Innovations, is a proud member of I.C.E.',
  },
];

export default function About() {
  return (
    <PublicShell current="about">
      <div className="py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-nblue-soft px-3.5 py-1.5 text-[13px] font-bold text-nblue">
            <Globe2 className="h-3.5 w-3.5" /> About the Institute
          </span>
          <h1 className="mt-4 font-display text-[40px] font-extrabold leading-[1.08] sm:text-[52px]">
            About <span className="grad-text">USAII®</span>
          </h1>
          <p className="mt-5 text-[19px] leading-relaxed text-ink-soft">
            The <span className="font-bold text-ink">United States Artificial Intelligence Institute (USAII®)</span> is the world’s leading provider of Artificial Intelligence
            certifications — for professionals and leaders at any career stage, and for organizations, institutions, academia and governments looking to upskill and reskill in an
            ever-evolving AI domain.
          </p>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-12">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-ngreen" />
            <h2 className="font-display text-2xl font-extrabold">American Standards &amp; Excellence Membership</h2>
          </div>
          <p className="mt-2 max-w-2xl text-[16px] text-ink-soft">
            USAII® is a distinguished member of the American National Standards Institute and the Institute for Credentialing Excellence.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {MEMBERSHIPS.map((m) => (
              <Card key={m.short} hover className="flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: m.color }}>
                    <m.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="font-display text-[17px] font-bold leading-snug">{m.name}</div>
                    <div className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: m.color }}>
                      <BadgeCheck className="h-3.5 w-3.5" /> Member
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{m.text}</p>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-npurple/25 bg-gradient-to-r from-nblue-soft via-npurple-soft to-npink-soft p-7"
        >
          <div>
            <div className="font-display text-2xl font-extrabold">Ready to earn your credential?</div>
            <p className="mt-1 text-ink-soft">Browse the catalog, read the study plan, and enroll in minutes.</p>
          </div>
          <Button size="lg" onClick={() => navigate('explore-courses')}>
            Explore Courses <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </PublicShell>
  );
}
