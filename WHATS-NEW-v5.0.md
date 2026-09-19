# What's new in USAII® Intuitive LMS 5.0

This release makes the platform simpler in one specific way: **a learner can now find a course, read its plan, pay for it and start studying without anyone helping them.** Everything that existed only to support the old manual process has been removed.

## The public front door

The sign-in page now has a real header: **Explore Courses**, **About USAII®**, and **Sign In**. Those first two pages are open to anyone — no account needed.

**Explore Courses** shows every published micro-credential with its name, one-line description, full description, **fee**, **duration**, level, module and lesson counts, how many people have enrolled, and the exact credential earned.

**View Study Plan** opens the whole course before a cent is spent: every module, every lesson, every lesson's length, the pass mark, and the final assessment. If a study plan PDF was uploaded in the course builder, it downloads from the same place.

**About USAII®** introduces the institute and its **ANSI** and **Institute for Credentialing Excellence** memberships, with live counts of credentials and learners.

## Enroll Now! and real checkout

**Enroll Now!** opens a checkout with an order summary and three payment methods: **Card (Stripe)**, **PayPal** and **Google Pay**.

Paying does four things in one step: takes the payment, creates the learner's account, enrolls them, and drops them straight into their dashboard. There is no separate sign-up form and nothing to wait for.

The gateway in `server/payments.ts` validates the way a real one does — Luhn checksum on the card number, expiry in the past, CVC shape, PayPal email, wallet token — and writes a numbered receipt. **A failed payment creates nothing**: no account, no enrollment, no receipt. Swap `charge()` for a real Stripe, PayPal or Google Pay call and the rest of the LMS does not change.

> Test card `4242 4242 4242 4242` succeeds. Any number ending `0000` is declined, so the failure path can be demonstrated.

## One role instead of two

**The administrator is gone.** The instructor account now runs the institute as well as the classroom: every course, course fees, publishing, payments, revenue and the activity log. Signing in has two doors, not three.

Removed with it: the **Ask Admin** page, the instructor-to-administrator message channel, the separate **Review Live Sessions** view, and the **Accounts** page. Course pricing, which only an administrator could set before, is now a normal field in the course builder alongside **duration** and **level**.

**Instructors no longer add learners.** Learners create their own accounts by enrolling and paying. **Learners & Access** still lists everyone who has enrolled, and still grants, removes or resets access — it simply no longer has an **Add Learner** button.

## Live sessions removed

**Live Learning**, **Live Sessions** and **Office Hours** are gone from both the learner and the instructor side, along with the scheduling, registration, reminder and attendance-review screens.

The analytics engine was left intact rather than cut apart, so engagement scores and pass-confidence predictions still behave exactly as before. Where the learner dashboard used to suggest booking a session, it now suggests asking the instructor a direct question — which was always the faster route.

Learner study habits show a **day streak** where they used to show sessions attended.

## Instructor: Overview and Payments

**Overview** gains **Paid Enrollments** and **Revenue Collected**, plus a **Recent payments** tab beside learner comments and the activity log.

**Payments** is a new page: every receipt taken through the checkout, newest first, with totals broken out by Stripe, PayPal and Google Pay, and each learner's name, course, method, card hint, receipt number and gateway reference.

## Smaller things

- **USAII®** is written with the registered symbol everywhere it appears to a person — headings, body copy, the certificate badge, credential names, error messages and the logo's alt text.
- Notifications tell the instructor when a paid enrollment lands.
- The demo database version was bumped, so an older `data/db.json` re-seeds cleanly rather than leaving an orphaned administrator account behind.
