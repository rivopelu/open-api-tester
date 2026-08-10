import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Button, Card, Spinner, Typography } from '../../components/ui';
import { useAuthStore } from '../../store/useAuthStore';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
} as const;

export default function SignInPage() {
  const { user, initializing, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base">
        <Spinner size="lg" />
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const startGoogle = () => {
    window.location.assign('/api/auth/google');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(137,180,250,0.13),transparent_38%)]" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <Card variant="featured" padding="lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple shadow-[0_0_20px_rgba(137,180,250,0.3)]">
              <Zap className="h-6 w-6 text-base" />
            </div>
            <Typography variant="heading-md" as="h1">Max API Studio</Typography>
            <Typography tone="secondary" className="mt-1">
              Sign in to access your office API projects
            </Typography>
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={startGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>

          <Typography variant="caption" tone="muted" className="mt-5 block text-center">
            Only Google accounts with an approved domain can sign in.
          </Typography>
        </Card>
      </motion.div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.34 0-4.33-1.58-5.04-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34L15 2.36A8.58 8.58 0 0 0 9 0 9 9 0 0 0 .96 4.95l3 2.33c.71-2.12 2.7-3.7 5.04-3.7Z" />
    </svg>
  );
}