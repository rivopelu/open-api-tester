import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button, Card, GoogleIcon, Spinner, Typography } from "../../components/ui";
import { useAuthStore } from "../../store/useAuthStore";

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
    window.location.assign("/api/auth/google");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,color-mix(in_srgb,var(--color-primary)_13%,transparent),transparent_38%)]"
      />
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <Card variant="featured" padding="lg">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="glow-blue mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-primary to-purple">
              <Zap className="h-6 w-6 text-base" />
            </div>
            <Typography variant="heading-md" as="h1">
              Max API Studio
            </Typography>
            <Typography tone="secondary" className="mt-1">
              Sign in to access your office API projects
            </Typography>
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={startGoogle}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <Typography
            variant="caption"
            tone="muted"
            className="mt-5 block text-center"
          >
            Only Google accounts with an approved domain can sign in.
          </Typography>
        </Card>
      </motion.div>
    </main>
  );
}
