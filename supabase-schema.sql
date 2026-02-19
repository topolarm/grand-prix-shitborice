-- Grand Prix Šitbořice - Tipovací soutěž
-- Spusť tento SQL v Supabase SQL Editoru (supabase.com → tvůj projekt → SQL Editor)

CREATE TABLE IF NOT EXISTS tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_club TEXT NOT NULL,
  guessed_speed NUMERIC NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vypni Row Level Security (jednoduchá turnajová appka, bezpečnost řešíme v aplikaci)
ALTER TABLE tips DISABLE ROW LEVEL SECURITY;
