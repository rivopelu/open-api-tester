import { ArrowLeft, Mail, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, PageContainer, Typography } from '../../components/ui';
import { router } from '../../routes';
import useProfileSettingsPage from './use-profile-settings-page';

export default function ProfileSettingsPage() {
  const page = useProfileSettingsPage();
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-base py-6">
      <PageContainer size="md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(router.dashboard())}
          className="mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Projects
        </Button>

        <Typography variant="heading-lg" as="h1" className="mb-1">
          {page.title}
        </Typography>
        <Typography tone="muted" variant="body-sm" className="mb-6">
          {page.subtitle}
        </Typography>

        <Card padding="lg" className="flex items-center gap-4">
          <Avatar src={page.avatarSrc} alt={page.name} fallback={page.initials} size="lg" />
          <div className="min-w-0">
            <Typography variant="heading-sm" as="h2">
              {page.name}
            </Typography>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-[13px] text-text-muted">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {page.email}
              </span>
              <span className="flex items-center gap-1.5 text-[13px] text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Signed in
              </span>
            </div>
          </div>
        </Card>

        <Card className="mt-4 flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <Typography tone="muted" variant="body-sm">
            Account editing and avatar upload are not yet available. More profile
            controls will be added here.
          </Typography>
        </Card>
      </PageContainer>
    </div>
  );
}