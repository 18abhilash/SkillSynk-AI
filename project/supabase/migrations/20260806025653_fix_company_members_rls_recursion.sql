/*
# Fix recursive RLS on company_members + ensure marketplace visibility

## Root Cause
The company_members SELECT policy "company_members_select_company" was self-referential:
  EXISTS (SELECT 1 FROM company_members cm2 WHERE cm2.company_id = ... AND cm2.user_id = auth.uid())
This creates infinite RLS recursion because reading company_members triggers the policy
which reads company_members again. PostgreSQL detects this and returns 0 rows (or errors),
which breaks EVERY downstream query that depends on company membership:
  - Creating a campaign (INSERT policy checks company_members) -> fails
  - Viewing campaigns in marketplace (SELECT policy checks company_members) -> fails
  - Inviting candidates -> fails

## Fix
1. Create a SECURITY DEFINER function `is_company_member(company_uuid)` that checks
   membership WITHOUT RLS (SECURITY DEFINER runs as the owner, bypassing RLS).
   This breaks the recursion.
2. Rewrite ALL company_members-dependent policies to use this function instead of
   subquerying company_members directly.
3. Keep company_members' own SELECT policy simple: a user can see rows where they
   are the member (auth.uid() = user_id) — no recursion needed.

## Tables Affected
- company_members (SELECT, UPDATE policies simplified)
- hiring_campaigns (SELECT, INSERT, UPDATE, DELETE policies use the new function)
- campaign_candidates (SELECT, INSERT, UPDATE, DELETE policies use the new function)
*/

-- ============ SECURITY DEFINER helper: breaks RLS recursion ============
CREATE OR REPLACE FUNCTION is_company_member(target_company uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_members.company_id = target_company
    AND company_members.user_id = auth.uid()
  );
$$;

-- ============ company_members: non-recursive policies ============
-- A user can see their own membership rows (no recursion)
DROP POLICY IF EXISTS "company_members_select_company" ON company_members;
DROP POLICY IF EXISTS "company_members_select_own" ON company_members;
CREATE POLICY "company_members_select_own" ON company_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Keep insert as-is (self-insert is fine, no recursion)
DROP POLICY IF EXISTS "company_members_insert_own" ON company_members;
CREATE POLICY "company_members_insert_own" ON company_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Update own membership
DROP POLICY IF EXISTS "company_members_update_own" ON company_members;
CREATE POLICY "company_members_update_own" ON company_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete own membership
DROP POLICY IF EXISTS "company_members_delete_own" ON company_members;
CREATE POLICY "company_members_delete_own" ON company_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ hiring_campaigns: use is_company_member() ============
DROP POLICY IF EXISTS "hiring_campaigns_select_visible" ON hiring_campaigns;
DROP POLICY IF EXISTS "hiring_campaigns_select_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_select_visible" ON hiring_campaigns FOR SELECT
  TO authenticated USING (
    is_company_member(hiring_campaigns.company_id)
    OR hiring_campaigns.status = 'active'
  );

DROP POLICY IF EXISTS "hiring_campaigns_insert_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_insert_company" ON hiring_campaigns FOR INSERT
  TO authenticated WITH CHECK (
    is_company_member(hiring_campaigns.company_id)
  );

DROP POLICY IF EXISTS "hiring_campaigns_update_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_update_company" ON hiring_campaigns FOR UPDATE
  TO authenticated
  USING (is_company_member(hiring_campaigns.company_id))
  WITH CHECK (is_company_member(hiring_campaigns.company_id));

DROP POLICY IF EXISTS "hiring_campaigns_delete_company" ON hiring_campaigns;
CREATE POLICY "hiring_campaigns_delete_company" ON hiring_campaigns FOR DELETE
  TO authenticated USING (is_company_member(hiring_campaigns.company_id));

-- ============ campaign_candidates: use is_company_member() ============
DROP POLICY IF EXISTS "campaign_candidates_select" ON campaign_candidates;
CREATE POLICY "campaign_candidates_select" ON campaign_candidates FOR SELECT
  TO authenticated USING (
    is_company_member((
      SELECT hc.company_id FROM hiring_campaigns hc WHERE hc.id = campaign_candidates.campaign_id
    ))
    OR candidate_id = auth.uid()
    OR candidate_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_candidates_insert" ON campaign_candidates;
CREATE POLICY "campaign_candidates_insert" ON campaign_candidates FOR INSERT
  TO authenticated WITH CHECK (
    is_company_member((
      SELECT hc.company_id FROM hiring_campaigns hc WHERE hc.id = campaign_candidates.campaign_id
    ))
    OR candidate_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR candidate_id = auth.uid()
  );

DROP POLICY IF EXISTS "campaign_candidates_update" ON campaign_candidates;
CREATE POLICY "campaign_candidates_update" ON campaign_candidates FOR UPDATE
  TO authenticated
  USING (
    is_company_member((
      SELECT hc.company_id FROM hiring_campaigns hc WHERE hc.id = campaign_candidates.campaign_id
    ))
    OR candidate_id = auth.uid()
    OR candidate_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    is_company_member((
      SELECT hc.company_id FROM hiring_campaigns hc WHERE hc.id = campaign_candidates.campaign_id
    ))
    OR candidate_id = auth.uid()
    OR candidate_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_candidates_delete" ON campaign_candidates;
CREATE POLICY "campaign_candidates_delete" ON campaign_candidates FOR DELETE
  TO authenticated USING (
    is_company_member((
      SELECT hc.company_id FROM hiring_campaigns hc WHERE hc.id = campaign_candidates.campaign_id
    ))
  );