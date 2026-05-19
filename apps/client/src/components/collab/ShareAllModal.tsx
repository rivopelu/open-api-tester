import { useEffect, useState } from 'react';
import { useCollabStore, type WorkspaceInvite } from '../../store/useCollabStore';
import toast from 'react-hot-toast';

interface ShareAllModalProps {
  projectCount: number;
  onClose: () => void;
}

type RoleOption = 'editor' | 'viewer';
type ExpiryOption = 0 | 7 | 30;

function inviteUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}?invite_workspace=${token}`;
}

export function ShareAllModal({ projectCount, onClose }: ShareAllModalProps) {
  const { createWorkspaceInvite, revokeWorkspaceInvite, fetchWorkspaceInvites } = useCollabStore();

  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [role, setRole] = useState<RoleOption>('editor');
  const [expiry, setExpiry] = useState<ExpiryOption>(7);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingInvites, setLoadingInvites] = useState(true);

  useEffect(() => {
    fetchWorkspaceInvites().then((data) => {
      setInvites(data);
      setLoadingInvites(false);
    });
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const invite = await createWorkspaceInvite(role, expiry === 0 ? undefined : expiry);
    setGenerating(false);
    if (invite) {
      setInvites((prev) => [invite, ...prev]);
      toast.success('Workspace invite link created!');
    } else {
      toast.error('Failed to create invite link. Check the console for details.');
    }
  };

  const handleCopy = (invite: WorkspaceInvite) => {
    navigator.clipboard.writeText(inviteUrl(invite.token));
    setCopiedId(invite.id);
    toast.success('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this workspace invite link? Anyone who has it won\'t be able to use it anymore.')) return;
    await revokeWorkspaceInvite(id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
    toast.success('Invite revoked');
  };

  const formatExpiry = (inv: WorkspaceInvite) => {
    if (!inv.expiresAt) return 'Never expires';
    const d = new Date(inv.expiresAt);
    return d < new Date() ? '⚠ Expired' : `Expires ${d.toLocaleDateString()}`;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card-elevated"
        style={{
          width: 540, maxWidth: '96vw', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          padding: 28, animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              🔗 Share My Projects
            </h2>
            <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Generate a single link that gives access to <strong style={{ color: 'var(--text-secondary)' }}>all {projectCount} projects</strong> at once.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Generate new invite */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Generate Workspace Link
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Role for invitees</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleOption)}
              >
                <option value="editor">✏️ Editor — can view & save</option>
                <option value="viewer">👁 Viewer — read-only</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Expiry</label>
              <select
                className="input"
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value) as ExpiryOption)}
              >
                <option value={0}>Never</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {generating ? '⟳ Generating…' : '+ Generate Workspace Link'}
          </button>
        </div>

        {/* Active workspace links */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Active Links ({invites.length})
        </div>

        {loadingInvites ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>
            Loading…
          </div>
        ) : invites.length === 0 ? (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
            padding: '20px 0', border: '1px dashed var(--border)', borderRadius: 8,
          }}>
            No active workspace links yet — generate one above
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {/* Role badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                  background: inv.role === 'editor' ? 'rgba(137,180,250,0.15)' : 'rgba(166,227,161,0.15)',
                  color: inv.role === 'editor' ? 'var(--accent-blue)' : 'var(--accent-green)',
                  border: `1px solid ${inv.role === 'editor' ? 'rgba(137,180,250,0.3)' : 'rgba(166,227,161,0.3)'}`,
                  textTransform: 'uppercase',
                }}>
                  {inv.role}
                </span>

                {/* Token snippet + expiry */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    …{inv.token.slice(-20)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatExpiry(inv)} · Used {inv.useCount}×
                  </div>
                </div>

                {/* Copy */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => handleCopy(inv)}
                  data-tooltip="Copy link"
                  style={{ color: copiedId === inv.id ? 'var(--accent-green)' : undefined }}
                >
                  {copiedId === inv.id ? '✓' : '⎘'}
                </button>

                {/* Revoke */}
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={() => handleRevoke(inv.id)}
                  data-tooltip="Revoke"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: 16, padding: '10px 12px',
          background: 'rgba(137,180,250,0.06)', border: '1px solid rgba(137,180,250,0.15)',
          borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          💡 Anyone with this link will be added to <strong>all your projects</strong> with the selected role. Revoke the link any time to stop new joins.
        </div>
      </div>
    </div>
  );
}
