-- ============================================================
-- AI GESTION AE — Migration Supabase
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- 1. TABLE PROFILES (liée à auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'user',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. TABLE STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'B',
  klaxo_id     TEXT,
  agency       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE CATALOG_PRICES
CREATE TABLE IF NOT EXISTS catalog_prices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  price_ht     NUMERIC(10,2) NOT NULL,
  valid_from   DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE AI_ANALYSES (table centrale)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                UUID REFERENCES students(id) ON DELETE SET NULL,
  created_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name                 TEXT NOT NULL,
  file_type                 TEXT NOT NULL DEFAULT 'pdf',
  student_name_input        TEXT,
  agency                    TEXT,
  instructor_type           TEXT NOT NULL DEFAULT 'salarie',
  user_comments             TEXT,
  -- Résultats IA
  ai_extracted_name         TEXT,
  total_hours_recorded      NUMERIC(8,2),
  driven_hours              NUMERIC(8,2),
  planned_hours             NUMERIC(8,2),
  total_expected_amount     NUMERIC(10,2),
  total_amount_paid         NUMERIC(10,2),
  remaining_due             NUMERIC(10,2),
  calculated_unit_price     NUMERIC(10,2),
  theoretical_catalog_total NUMERIC(10,2),
  revenue_gap               NUMERIC(10,2),
  report_status             TEXT NOT NULL DEFAULT 'UNCERTAIN',
  summary                   TEXT,
  discrepancies             JSONB NOT NULL DEFAULT '[]',
  recommendations           JSONB NOT NULL DEFAULT '[]',
  catalog_snapshot          JSONB,
  -- Statut traitement
  status                    TEXT NOT NULL DEFAULT 'processing',
  is_validated              BOOLEAN NOT NULL DEFAULT FALSE,
  validated_at              TIMESTAMPTZ,
  validated_by              UUID REFERENCES profiles(id),
  error_message             TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE SCHOOL_SETTINGS
CREATE TABLE IF NOT EXISTS school_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name  TEXT NOT NULL DEFAULT 'Mon Auto-École',
  logo_url     TEXT,
  tva_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  siret        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- STUDENTS
CREATE POLICY "Authenticated users can read students" ON students
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert students" ON students
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update students" ON students
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete students" ON students
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CATALOG_PRICES
CREATE POLICY "Authenticated can read catalog" ON catalog_prices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage catalog" ON catalog_prices
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- AI_ANALYSES
CREATE POLICY "Auth users can read analyses" ON ai_analyses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert analyses" ON ai_analyses
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creator or admin can update" ON ai_analyses
  FOR UPDATE TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete analyses" ON ai_analyses
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SCHOOL_SETTINGS
CREATE POLICY "Auth read school settings" ON school_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage school settings" ON school_settings
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- STORAGE BUCKETS (à créer dans Storage > New bucket)
-- ============================================================
-- Bucket "school-assets" (Public) pour les logos
-- Bucket "uploaded-files" (Private) pour les fichiers uploadés

-- Insérer les paramètres par défaut
INSERT INTO school_settings (school_name) VALUES ('Mon Auto-École')
ON CONFLICT DO NOTHING;
