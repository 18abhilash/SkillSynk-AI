/*
# SkillSynk AI — Make active hiring campaigns visible in marketplace

## Changes
1. Updates hiring_campaigns SELECT policy to allow ALL authenticated users to see
   active campaigns (not just company members). This makes campaigns discoverable
   in the marketplace so students can find and attempt tests.
2. Company members retain full CRUD (insert/update/delete) as before.
3. Non-company users can only SELECT (read) — they cannot create, edit, or delete campaigns.

## Security
- Only active campaigns are visible to non-company users (status = 'active').
- Company members can still see all their campaigns regardless of status.
- Write operations (insert/update/delete) remain restricted to company members only.
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "hiring_campaigns_select_company" ON hiring_campaigns;

-- New SELECT policy: company members see all their campaigns, others see only active ones
CREATE POLICY "hiring_campaigns_select_visible" ON hiring_campaigns FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = hiring_campaigns.company_id
      AND company_members.user_id = auth.uid()
    )
    OR hiring_campaigns.status = 'active'
  );

-- Allow companies to be visible to all authenticated users (for marketplace display)
DROP POLICY IF EXISTS "companies_read_all" ON companies;
CREATE POLICY "companies_read_all" ON companies FOR SELECT
  TO authenticated USING (true);
