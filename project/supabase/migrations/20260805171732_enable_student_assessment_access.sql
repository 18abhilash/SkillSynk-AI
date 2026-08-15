/*
# SkillSynk AI — Enable student access to recruiter assessments

## Changes
1. Updates campaign_candidates SELECT policy to also match by candidate_email
   so students can see campaigns they've been invited to via email.
2. Updates campaign_candidates UPDATE policy to also allow candidates matching
   by email to claim and complete their assessments.
3. Updates INSERT policy to allow candidates to self-claim their invitation
   (set candidate_id when they start the test).

## Security
- Students can only see campaigns where their registered email matches the invited email.
- Students can only update their own candidate entries (by email match or candidate_id).
- Company members retain full access as before.
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "campaign_candidates_select_company" ON campaign_candidates;

-- New SELECT policy: company members OR candidate by email OR candidate by id
CREATE POLICY "campaign_candidates_select_company" ON campaign_candidates FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM hiring_campaigns hc
      JOIN company_members cm ON cm.company_id = hc.company_id
      WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
    )
    OR campaign_candidates.candidate_id = auth.uid()
    OR campaign_candidates.candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "campaign_candidates_update_company" ON campaign_candidates;

-- New UPDATE policy: company members OR candidate by email OR candidate by id
CREATE POLICY "campaign_candidates_update_company" ON campaign_candidates FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM hiring_campaigns hc
      JOIN company_members cm ON cm.company_id = hc.company_id
      WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
    )
    OR campaign_candidates.candidate_id = auth.uid()
    OR campaign_candidates.candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM hiring_campaigns hc
      JOIN company_members cm ON cm.company_id = hc.company_id
      WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
    )
    OR campaign_candidates.candidate_id = auth.uid()
    OR campaign_candidates.candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Allow candidates to INSERT (self-claim their invitation by setting candidate_id)
DROP POLICY IF EXISTS "campaign_candidates_insert_company" ON campaign_candidates;
CREATE POLICY "campaign_candidates_insert_company" ON campaign_candidates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM hiring_campaigns hc
      JOIN company_members cm ON cm.company_id = hc.company_id
      WHERE hc.id = campaign_candidates.campaign_id AND cm.user_id = auth.uid()
    )
    OR candidate_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
