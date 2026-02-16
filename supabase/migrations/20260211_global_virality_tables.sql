-- Global Viral Trends Table
-- Stores metadata and deep AI analysis of viral videos (IG Reels, YT Shorts)

CREATE TABLE IF NOT EXISTS global_viral_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Platform Metadata
  platform TEXT NOT NULL,       -- 'instagram', 'youtube'
  source_id TEXT NOT NULL,      -- Video ID (to prevent duplicates)
  url TEXT NOT NULL,
  
  -- Raw Data
  title TEXT,
  description TEXT,
  duration_seconds INT,
  thumbnail_url TEXT,
  
  -- Engagement Metrics (Snapshot at time of scraping)
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  
  -- DEEP AI Analysis (JSONB for flexibility with Gemini 2.0 output)
  analysis_json JSONB,
  -- Structure example:
  -- {
  --   "hook": { "rating": 9, "technique": "Visual disruption", "description": "..." },
  --   "audio": { "type": "Voiceover", "mood": "Energetic", "transcript": "..." },
  --   "pacing": { "cuts_per_minute": 24, "style": "Fast-paced" },
  --   "visuals": { "aesthetic": "Lo-fi", "text_overlay": "Heavy" },
  --   "virality_factors": ["Relatability", "Plot Twist"],
  --   "replica_potential": 8
  -- }
  
  -- Metadata
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint to prevent duplicate videos
  CONSTRAINT unique_global_source UNIQUE (platform, source_id)
);

-- Index for faster analysis queries
CREATE INDEX IF NOT EXISTS idx_global_platform ON global_viral_trends(platform);
CREATE INDEX IF NOT EXISTS idx_global_created_at ON global_viral_trends(created_at);
CREATE INDEX IF NOT EXISTS idx_global_views ON global_viral_trends(views);
