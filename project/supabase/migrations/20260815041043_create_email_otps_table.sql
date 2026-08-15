/*
# Create email_otps table for custom OTP verification

1. New Tables
- `email_otps`
  - `id` (uuid, primary key)
  - `email` (text, not null) — the email being verified
  - `code` (text, not null) — 6-digit numeric code
  - `expires_at` (timestamptz, not null) — code expires 10 minutes after creation
  - `used` (boolean, default false) — marks code as consumed after verification
  - `created_at` (timestamptz, default now())
  - `context` (text, default 'signup') — distinguishes signup vs recruiter verification
2. Security
  - Enable RLS on `email_otps`.
  - No direct access from anon/authenticated — all access goes through edge functions using the service role key.
3. Indexes
  - Index on `email` for lookup by email
  - Index on `code` for verification lookup
*/

CREATE TABLE IF NOT EXISTS email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  context text NOT NULL DEFAULT 'signup'
);

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- No policies: all access is via edge functions using the service role key (which bypasses RLS)

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_code ON email_otps(code);