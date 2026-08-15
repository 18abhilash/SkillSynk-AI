/*
# Fix RLS policies for campaign_candidates and company_members

## Problems Fixed
1. campaign_candidates INSERT/SELECT/UPDATE policies had overly complex subqueries
   that could be blocked by nested RLS on hiring_campaigns and company_members.
2. company_members SELECT policy only allowed seeing your own row — recruiters
   couldn't see other members of their company (needed for team views).
3. No DELETE policy on campaign_candidates (recruiters couldn't remove candidates).

## Changes
1. Simplified campaign_candidates policies to use a clean EXISTS check.
2. Added company_members SELECT policy so company members can see all members
   of companies they belong to (needed for recruiter dashboard queries).
3. Added campaign_candidates DELETE policy for company members.
4. Added company_members UPDATE policy for company members.
*/

-- ============ company_members: allow seeing all members of your companies ============
DROP POLICY IF EXISTS "company_members_select_own" ON company_members;
DROP POLICY IF EXISTS "company_members_select_company" ON company_members;

CREATE POLICY "company_members_select_company" ON company_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM company_members cm2
      WHERE cm2.company_id = company_members.company_id
      AND cm2.user_id = auth.uid()
    )
  );

-- Allow company members to update their own membership
DROP POLICY IF EXISTS "company_members_update_own" ON company_members;
CREATE POLICY "company_members_update_own" ON company_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members cm2
      WHERE cm2.company_id = company_members.company_id
      AND cm2.user_id = auth.uid()
    )
  );

-- ============ campaign_candidates: clean rewrite of all policies ============

-- SELECT: company members can see all candidates for their campaigns;
-- candidates can see rows matching their user id or email
DROP POLICY IF EXISTS "campaign_candidates_select_company" ON campaign_candidates;
DROP POLICY IF EXISTS "campaign_candidates_select" ON campaign_candidates;

CREATE POLICY "campaign_candidates_select" ON campaign_candidates FOR SELECT
  TO authenticated USING (
    -- Company member check: is the user a member of the campaign's company?
    EXISTS (
      SELECT 1
      FROM company_members cm
      JOIN hiring_campaigns hc ON hc.company_id = cm.company_id
      WHERE hc.id = campaign_candidates.campaign_id
      AND cm.user_id = auth.uid()
    )
    -- Self: candidate is the logged-in user
    OR candidate_id = auth.uid()
    -- Self: candidate email matches logged-in user's email
    OR candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- INSERT: company members can invite anyone; users can self-join from marketplace
DROP POLICY IF EXISTS "campaign_candidates_insert_company" ON campaign_candidates;
DROP POLICY IF EXISTS "campaign_candidates_insert" ON campaign_candidates;

CREATE POLICY "campaign_candidates_insert" ON campaign_candidates FOR INSERT
  TO authenticated WITH CHECK (
    -- Company member: can invite any candidate to their campaign
    EXISTS (
      SELECT 1
      FROM company_members cm
      JOIN hiring_campaigns hc ON hc.company_id = cm.company_id
      WHERE hc.id = campaign_candidates.campaign_id
      AND cm.user_id = auth.uid()
    )
    -- Self-join: user joins from marketplace
    OR candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    -- Self-join: user joins with their own user_id
    OR candidate_id = auth.uid()
  );

-- UPDATE: company members can update candidate results; candidates can update their own
DROP POLICY IF EXISTS "campaign_candidates_update_company" ON campaign_candidates;
DROP POLICY IF EXISTS "campaign_candidates_update" ON campaign_candidates;

CREATE POLICY "campaign_candidates_update" ON campaign_candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM company_members cm
      JOIN hiring_campaigns hc ON hc.company_id = cm.company_id
      WHERE hc.id = campaign_candidates.campaign_id
      AND cm.user_id = auth.uid()
    )
    OR candidate_id = auth.uid()
    OR candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM company_members cm
      JOIN hiring_campaigns hc ON hc.company_id = cm.company_id
      WHERE hc.id = campaign_candidates.campaign_id
      AND cm.user_id = auth.uid()
    )
    OR candidate_id = auth.uid()
    OR candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- DELETE: company members can remove candidates from their campaigns
DROP POLICY IF EXISTS "campaign_candidates_delete" ON campaign_candidates;
CREATE POLICY "campaign_candidates_delete" ON campaign_candidates FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM company_members cm
      JOIN hiring_campaigns hc ON hc.company_id = cm.company_id
      WHERE hc.id = campaign_candidates.campaign_id
      AND cm.user_id = auth.uid()
    )
  );
