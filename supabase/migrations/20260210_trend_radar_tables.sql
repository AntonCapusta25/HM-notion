-- Content Ideas Table
CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP DEFAULT NOW(),
  title TEXT NOT NULL,
  format TEXT,
  concept TEXT,
  execution_steps JSONB,
  platform TEXT,
  why_it_works TEXT,
  cultural_tie_in TEXT,
  target_audience TEXT, -- 'B2C' or 'B2B'
  viral_score FLOAT,
  week_number INT,
  year INT
);

-- Events Calendar Table with Deduplication
CREATE TABLE IF NOT EXISTS events_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  event_name TEXT NOT NULL,
  event_type TEXT, -- 'sports', 'holiday', 'entertainment', 'viral_meme'
  event_date DATE,
  opportunity TEXT,
  urgency TEXT,
  source TEXT,
  
  -- Deduplication: unique constraint on event name + date
  CONSTRAINT unique_event UNIQUE (event_name, event_date)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_ideas_week ON content_ideas(week_number, year);
CREATE INDEX IF NOT EXISTS idx_content_ideas_audience ON content_ideas(target_audience);
CREATE INDEX IF NOT EXISTS idx_events_date ON events_calendar(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events_calendar(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_events_calendar_updated_at BEFORE UPDATE
    ON events_calendar FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
