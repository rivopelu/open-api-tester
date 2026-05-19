-- ─── Workspace Invites ────────────────────────────────────────────────────────
-- A single invite token that gives access to ALL projects owned by a user.

CREATE TABLE IF NOT EXISTS workspace_invites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT        UNIQUE NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  expires_at TIMESTAMPTZ,
  max_uses   INT,
  use_count  INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own workspace invites
CREATE POLICY "owner_manages_workspace_invites" ON workspace_invites
  FOR ALL
  USING  (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ─── RPC: accept_workspace_invite ─────────────────────────────────────────────
-- Accepts a workspace invite token: adds the caller to every project
-- owned by the invite's owner. Returns the list of project ids joined.
CREATE OR REPLACE FUNCTION accept_workspace_invite(p_token TEXT)
RETURNS TABLE(
  project_id   UUID,
  project_name TEXT,
  role         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite   workspace_invites%ROWTYPE;
  v_user_id  UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the invite
  SELECT * INTO v_invite FROM workspace_invites WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND';
  END IF;

  -- Check expiry
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'INVITE_EXPIRED';
  END IF;

  -- Check max uses
  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'INVITE_MAXED';
  END IF;

  -- Prevent owner from joining their own workspace
  IF v_invite.owner_id = v_user_id THEN
    RAISE EXCEPTION 'INVITE_SELF';
  END IF;

  -- Insert membership for every project owned by the invite owner
  INSERT INTO project_members (project_id, user_id, role, joined_at)
  SELECT p.id, v_user_id, v_invite.role, NOW()
  FROM   projects p
  WHERE  p.user_id = v_invite.owner_id
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Increment use count
  UPDATE workspace_invites SET use_count = use_count + 1 WHERE id = v_invite.id;

  -- Return projects that were joined
  RETURN QUERY
  SELECT p.id, p.name, v_invite.role::TEXT
  FROM   projects p
  WHERE  p.user_id = v_invite.owner_id;
END;
$$;

-- ─── RPC: create_workspace_invite ─────────────────────────────────────────────
-- Creates a workspace invite and returns the new record.
-- Uses SECURITY DEFINER to bypass PostgREST schema cache issues.
CREATE OR REPLACE FUNCTION create_workspace_invite(
  p_role       TEXT,
  p_token      TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  id         UUID,
  token      TEXT,
  role       TEXT,
  expires_at TIMESTAMPTZ,
  max_uses   INT,
  use_count  INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id      UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO workspace_invites (owner_id, token, role, expires_at)
  VALUES (v_user_id, p_token, p_role, p_expires_at)
  RETURNING workspace_invites.id INTO v_id;

  RETURN QUERY
  SELECT wi.id, wi.token, wi.role, wi.expires_at, wi.max_uses, wi.use_count, wi.created_at
  FROM workspace_invites wi WHERE wi.id = v_id;
END;
$$;

-- ─── RPC: get_my_workspace_invites ────────────────────────────────────────────
-- Returns all workspace invites created by the current user.
CREATE OR REPLACE FUNCTION get_my_workspace_invites()
RETURNS TABLE(
  id         UUID,
  token      TEXT,
  role       TEXT,
  expires_at TIMESTAMPTZ,
  max_uses   INT,
  use_count  INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT wi.id, wi.token, wi.role, wi.expires_at, wi.max_uses, wi.use_count, wi.created_at
  FROM workspace_invites wi
  WHERE wi.owner_id = auth.uid()
  ORDER BY wi.created_at DESC;
END;
$$;

-- ─── RPC: revoke_workspace_invite ─────────────────────────────────────────────
-- Deletes a workspace invite owned by the current user.
CREATE OR REPLACE FUNCTION revoke_workspace_invite(p_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM workspace_invites
  WHERE id = p_invite_id AND owner_id = auth.uid();
END;
$$;
