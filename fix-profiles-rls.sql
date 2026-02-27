-- ============================================================
-- FIX : Infinite recursion on profiles RLS policies
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- 1. Supprimer TOUTES les politiques existantes sur profiles
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Recréer des politiques propres (sans auto-référence, basées sur JWT)
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins full access profiles" ON profiles
  FOR ALL USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');
