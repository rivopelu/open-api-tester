import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Spinner, Typography } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const completeGoogleSignIn = useAuthStore((state) => state.completeGoogleSignIn);
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const oauthError = params.get('error');
    window.history.replaceState(null, '', '/auth');

    if (oauthError || !token) {
      setError(oauthError || 'Google did not return a valid session.');
      return;
    }

    void completeGoogleSignIn(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('The session could not be verified. Please try again.'));
  }, [completeGoogleSignIn, navigate]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(137,180,250,0.13),transparent_38%)]" />
      <Card variant="featured" padding="lg" className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          {error ? <span className="text-xl text-danger">!</span> : <Spinner size="md" />}
        </div>
        <Typography variant="heading-md">
          {error ? 'Sign-in could not be completed' : 'Finishing your sign-in'}
        </Typography>
        <Typography tone="secondary" className="mt-3">
          {error || 'Verifying your Google account and preparing your workspace.'}
        </Typography>
        {error && (
          <Button className="mt-6 w-full" onClick={() => navigate('/auth/sign-in', { replace: true })}>
            Back to sign in
          </Button>
        )}
      </Card>
    </main>
  );
}
