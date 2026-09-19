# USAII® Intuitive LMS 5.0

Written in US English. The official USAII® logo is `public/usaii-logo.png`.

A learning platform built on the CEO's vision: every learner always knows **where they are, what to do next, and how to improve**, with nothing extra in the way.

## Start it (Windows)

1. Install **Node.js 20 or newer** from https://nodejs.org (the LTS button). You only do this once.
2. Unzip this folder (right-click → **Extract All…**).
3. Open the extracted folder and double-click **`START.bat`**.

The first start installs packages (1–3 minutes, internet needed). The browser then opens by itself on the sign-in page, normally at **http://localhost:4600**. Keep the black window open while you use the LMS; close it to stop.

> **Seeing an old version?** Older prototypes run on port 3000. This LMS uses its own port (4600) and moves to the next free port if that one is busy; the window shows the exact address. The browser tab says **USAII® Intuitive LMS 5.0**.

macOS or Linux: run `./start.sh` in a terminal.

## Sign in

| Role | Email | Password |
|---|---|---|
| Learner | alex.rivera@enterprise.com | `Learner@2026` |
| Instructor | instructor@usaii.org | `Instructor@2026` |

There are **two roles**. The instructor account also runs the institute: courses, fees, payments and reports. There is no administrator.

- **Other learners:** the learner password also works for `jordan.lee@enterprise.com` (needs support; sees the first-time goal setup) and `morgan.chen@enterprise.com`.
- **New learners create their own accounts** by enrolling and paying on **Explore Courses**. Nobody has to add them.

## Before you sign in

Three pages are open to everyone, from the header on the sign-in page:

- **Explore Courses:** every published micro-credential with its name, description, fee, duration, level, lesson count and the credential earned.
- **View Study Plan:** the whole course laid out module by module, with each lesson and its minutes, before anyone pays. If a PDF study plan was uploaded, it downloads from here too.
- **About USAII®:** who the institute is, plus its ANSI and I.C.E. memberships.

**Enroll Now!** opens a checkout with **Card (Stripe)**, **PayPal** and **Google Pay**. Paying creates the learner's account, enrolls them and drops them straight into their dashboard.

> **Test cards:** any Luhn-valid number works (for example `4242 4242 4242 4242`). A number ending in `0000` is always declined, so you can demonstrate the failure path.

## Learner

The menu is My Dashboard, Learning, Progress, Explore Courses, Ask, and Milestone Vault.

**First sign-in:** two quick questions (your goal and your weekly study time), then a one-minute tour of the five main areas.

**My Dashboard** has five parts, top to bottom:

1. **Your next step:** one action with one button.
2. **How you are doing:**
   - course completed, understanding, and chance of passing
   - your course path, module by module ("You are here")
   - expected grade, expected finish date, and certificate status
3. **Your study habits:** days signed in this week, study time, day streak, average quiz score, and engagement.
4. **Improve next:** the specific things that will raise your score.
5. **Plan ahead:** two sliders (minutes a day, days a week) that show the new finish date and grade.

**Progress** shows the same summary, plus:
- **Your learning metrics:** Study consistency, Focused study time, Cumulative quiz score, and Interaction depth, each with a goal and a status
- understanding by topic
- quiz scores with letter grades
- how the grade is made
- study time
- a "How to read this page" guide

**Learning** lists every lesson in order and ends with **Resources**: a downloadable study guide plus every link, video, and audio item in the course.

**Lessons** follow one simple path: Learn → Check → Apply → Reflect → Complete.
- **Checks:** practice checks can be retaken. Timed quizzes submit automatically when time runs out and show the answer key afterwards.
- **Help while studying:** a study coach answers from the course material. **Ask** sends a question to **Everyone** or **Just instructor**.
- **What's next button:** a floating button, which you can drag anywhere, always shows the next step.

## Instructor

The menu is Overview, Cohort, Learners & Access, Assessments, Activity Metrics, Questions, Courses and Payments. One instructor runs everything, so every course in the catalog is theirs to manage, price and publish.

- **Overview:** how many learners would recommend USAII®, how easy it was to know the next step, and started without assistance; then learner and instructor counts, published courses, start and completion rates, **paid enrollments and revenue collected**; then learner comments, recent payments, the activity log, and a small "Reset demo data" link.
- **Payments:** every receipt taken through the checkout, with totals split by Stripe, PayPal and Google Pay.

- **Alerts:** the bell tells instructors when one of their learners may need support, at most once a week per learner. Clicking an alert opens that course in Cohort.
- **Cohort:**
  - Totals at the top: total learners, need support, average pass chance, average quiz score, and average completion.
  - One card per learner: pass chance, quiz average, activities, study days, session length, and module progress.
  - Learners who need support show the reason. Each card has **View portal** (read-only) and **Message** (name and email filled in).
- **Learners & Access:** everyone who has enrolled through Explore Courses. Instructors do not create learner accounts — learners do that themselves at checkout. Each course appears as a chip under the learner: tap it to give access, tap again to remove it. **Password** sets a new password for a learner who is locked out.
- **Assessments:** percent correct per question, activity feedback, and final test results.
- **Activity Metrics:** two tracker buttons, **Active Learners This Week** and **Avg Learning Hours**.
- **Courses:** the list shows each course name with Edit and Publish.

## Creating a course

Go to **Courses → Create course**. There are three steps:

1. **Course details:** course name, one-line description, about text, certificate name, study plan PDF, who can join, pass mark, **course fee**, **duration** and **level**. The fee and duration show on the public catalog card.
2. **Lessons:** a simple list of lesson names. Press **Edit** on a lesson to open it. The **Add to this lesson** bar stays at the top while you scroll:
   - **Heading, Paragraph, List, Quote, Link, Note**
   - **Multimedia → Video, Audio, Image**, each with upload or paste a link (YouTube and Vimeo links play in the lesson)
   - Each lesson also has **Quiz questions** (practice or timed) and an optional **Activity** tab.
   - **Preview as learner** shows the lesson exactly as learners will see it.
3. **Final test (optional):** questions, time limit, and number of attempts.

Press **Save**, then **Publish**. Published courses appear immediately on the public **Explore Courses** page, where anyone can read the study plan and enroll.

## Your data

- **Where it's stored:** everything is saved in `data/db.json`, and uploads are saved in `uploads/`. Both survive restarts.
- **Starting over:** double-click `RESET-DEMO-DATA.bat` while the LMS is stopped, or use **Reset demo data** on the instructor's Overview.

## Connecting a production backend

The screens talk to the server only through `/api/...` routes:

| Route | Used by |
|---|---|
| `/api/auth` | Sign-in, profile, password |
| `/api/learner` | Dashboard data, lessons, checks, activities, final test |
| `/api/staff` | Cohort, learners and access, assessments, activity, course builder |
| `/api/admin` | Overview, payments |
| `/api/public` | Open catalog, study plans, About figures, checkout |
| `/api/threads`, `/api/notifications`, `/api/feedback`, `/api/ai/tutor` | Community and support |
| `/api/uploads` | File uploads |

- **Database:** all data access goes through `server/db.ts`, so replacing the JSON file with PostgreSQL does not change any screen.
- **Analytics:** calculations live in one shared engine, `shared/analytics.ts`, and the data types are in `shared/types.ts`.
- **Payments:** `server/payments.ts` validates and records a charge. It ships as a self-contained simulator (Luhn check, expiry, CVC, wallet token) and never contacts a real gateway. To go live, replace `charge()` with a real server-side call — Stripe PaymentIntents, PayPal Orders v2, or Google Pay through your PSP — and leave `recordPayment()` alone, since the rest of the LMS only reads the receipt it writes.

## Optional settings

Copy `.env.example` to `.env`:
- **`PORT`:** changes the starting port.
- **`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`:** lets the study coach write its own explanations, still limited to course material.

## For developers

```
npm install
npm run dev        # API + app on http://localhost:4600
npm run lint       # strict TypeScript check
npm run prod       # production build served by the same server
```
