-- Create research_reports table
CREATE TABLE IF NOT EXISTS research_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  strategy_data JSONB,
  pdf_url TEXT
);

-- Enable RLS for the table
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access to the reports (so the frontend can display them)
CREATE POLICY "Public read access to research_reports"
  ON research_reports FOR SELECT
  USING (true);

-- Allow service role / authenticated to insert and update
CREATE POLICY "Authenticated can insert research_reports"
  ON research_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated can update research_reports"
  ON research_reports FOR UPDATE
  USING (true);

-- Create the research_reports bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('research_reports', 'research_reports', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow public read access
CREATE POLICY "Public Access Research Reports"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'research_reports' );

-- Allow authenticated uploads
CREATE POLICY "Authenticated Uploads Research Reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'research_reports' );

-- Allow authenticated updates
CREATE POLICY "Authenticated Updates Research Reports"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'research_reports' );

-- Allow authenticated deletes
CREATE POLICY "Authenticated Deletes Research Reports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'research_reports' );
