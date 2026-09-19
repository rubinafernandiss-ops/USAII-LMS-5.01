import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicUser } from '../shared/types';
import { api, setUnauthorizedHandler, tokenStore } from './lib/api';
import { SessionCtx, type Session } from './lib/session';
import Login from './components/Login';
import { ChangePasswordModal } from './components/Shell';
import { ConfirmProvider, Loading, Logo, ToastProvider, useRoute } from './components/ui';
import { PrefsProvider } from './learner/prefs';
import { VerifyPage } from './learner/Credential';
import LearnerApp from './learner/LearnerApp';
import Onboarding from './learner/Onboarding';
import About from './public/About';
import Checkout from './public/Checkout';
import PublicCatalog from './public/PublicCatalog';
import StaffApp from './staff/StaffApp';

function Authed({ user }: { user: PublicUser }) {
  if (user.mustChangePassword)
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="aurora">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="absolute left-6 top-5">
          <Logo />
        </div>
        <ChangePasswordModal open forced onClose={() => undefined} />
      </div>
    );
  if (user.role === 'learner' && !user.onboarded) return <Onboarding />;
  return user.role === 'learner' ? <LearnerApp key={user.id} /> : <StaffApp key={user.id} />;
}

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [booting, setBooting] = useState(!!tokenStore.get());
  const route = useRoute();

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    window.location.hash = '';
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.set(null);
      setUser(null);
    });
    if (!tokenStore.get()) return;
    api<{ user: PublicUser }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setBooting(false));
  }, []);

  const session: Session | null = useMemo(() => (user ? { user, setUser, logout } : null), [user, logout]);

  const enter = useCallback((u: PublicUser) => {
    // Always land on the role's home after sign-in.
    window.location.hash = u.role === 'learner' ? '#/dashboard' : '#/overview';
    setUser(u);
  }, []);

  let content;
  if (route.view === 'verify' && route.params[0]) content = <VerifyPage certId={route.params[0]} />;
  else if (booting) content = <Loading label="Signing you in…" />;
  // Explore Courses, About USAII® and checkout are open to everyone, signed in or not.
  else if (!session && route.view === 'explore-courses') content = <PublicCatalog />;
  else if (!session && route.view === 'about') content = <About />;
  else if (!session && route.view === 'enroll' && route.params[0]) content = <Checkout courseId={route.params[0]} onAuthed={enter} />;
  else if (!session) content = <Login onAuthed={enter} />;
  else
    content = (
      <SessionCtx.Provider value={session}>
        <Authed user={session.user} />
      </SessionCtx.Provider>
    );

  return (
    <PrefsProvider>
      <ToastProvider>
        <ConfirmProvider>{content}</ConfirmProvider>
      </ToastProvider>
    </PrefsProvider>
  );
}
