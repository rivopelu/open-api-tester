import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, Eye, PenTool, ShieldCheck } from "lucide-react";
import { Button, Card, GoogleIcon, Spinner, Typography } from "../../components/ui";
import { useAuthStore } from "../../store/useAuthStore";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
} as const;

const FEATURES = [
  {
    icon: PenTool,
    title: "Visual API Designer",
    desc: "Model endpoints, params, and bodies visually.",
  },
  {
    icon: Boxes,
    title: "Reusable Schemas",
    desc: "Define components once, reuse them everywhere.",
  },
  {
    icon: Eye,
    title: "Live Preview & Export",
    desc: "Preview and export OpenAPI 3.0 in one click.",
  },
] as const;

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
    <main className="flex min-h-screen items-stretch bg-base text-text-primary">
      {/* ── Left: brand panel ─────────────────────────────────────────────── */}
      <section className="relative hidden overflow-hidden border-r border-border lg:flex lg:w-[46%] xl:w-[52%] flex-col justify-between p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_42%),radial-gradient(circle_at_85%_90%,color-mix(in_srgb,var(--color-purple)_12%,transparent),transparent_40%)]"
        />

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="Max API Studio logo" className="h-10 w-10 rounded-none object-contain" />
          <div className="leading-none">
            <div className="font-bold text-text-primary">Max API Studio</div>
            <div className="mt-1 text-xs text-text-muted">Modern OpenAPI Designer</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <Typography variant="heading-lg" as="h1" className="text-text-primary">
            Design modern APIs,
            <br />
            shipped without friction.
          </Typography>
          <Typography tone="muted" variant="body" className="mt-3 max-w-sm">
            A focused workspace for building OpenAPI specs, validating schemas,
            and previewing documentation for your team.
          </Typography>

          <ul className="mt-8 flex flex-col gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-none border border-border bg-surface text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{f.title}</div>
                    <div className="mt-0.5 text-[13px] text-text-muted">{f.desc}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-text-muted">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
          Secure sign-in · Workspace projects stay private to your organisation.
        </div>
      </section>

      {/* ── Right: sign-in ────────────────────────────────────────────────── */}
      <section className="relative flex flex-1 items-center justify-center p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,color-mix(in_srgb,var(--color-primary)_9%,transparent),transparent_40%)]"
        />

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="relative w-full max-w-100"
        >
          <Card variant="elevated" padding="lg">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <img src="/logo.png" alt="Max API Studio logo" className="mb-4 h-12 w-12 rounded-none object-contain" />
              <Typography variant="heading-md" as="h1">
                Max API Studio
              </Typography>
            </div>

            <div className="mb-6">
              <Typography variant="heading-md" as="h2">
                Welcome back
              </Typography>
              <Typography tone="muted" variant="body-sm" className="mt-1">
                Sign in to access your workspace.
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

            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-text-muted">
                Secure sign-in
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Typography variant="caption" tone="muted" className="block text-center">
              Only Google accounts with an approved domain can sign in.
            </Typography>
          </Card>

          <Typography variant="caption" tone="muted" className="mt-6 block text-center">
            © {new Date().getFullYear()} Max API Studio
          </Typography>
        </motion.div>
      </section>
    </main>
  );
}