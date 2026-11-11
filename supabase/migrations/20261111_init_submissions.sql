-- ============================================================================
-- AMBIKA HIGH SCHOOL TONKI — SECURE SUBMISSION SYSTEM SCHEMA
-- File: supabase/migrations/20261111_init_submissions.sql
-- Description: PostgreSQL schema, private storage bucket, RLS policies, 
--              and reference generator for Ambika Digital Submission Portal.
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create reference sequence (e.g. AMB-2026-00001)
CREATE SEQUENCE IF NOT EXISTS submission_ref_seq START WITH 1 INCREMENT BY 1;

-- 3. Reference number generator function
CREATE OR REPLACE FUNCTION generate_submission_ref()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  seq_num TEXT;
BEGIN
  IF NEW.submission_reference IS NULL OR NEW.submission_reference = '' THEN
    seq_num := LPAD(NEXTVAL('submission_ref_seq')::TEXT, 5, '0');
    NEW.submission_reference := 'AMB-' || current_year || '-' || seq_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Submissions master table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_reference TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2 AND char_length(full_name) <= 120),
  student_name TEXT CHECK (student_name IS NULL OR char_length(student_name) <= 120),
  class_name TEXT CHECK (class_name IS NULL OR class_name IN (
    'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
  )),
  scholar_number TEXT CHECK (scholar_number IS NULL OR char_length(scholar_number) <= 40),
  category TEXT NOT NULL CHECK (category IN (
    'Student Project',
    'Homework',
    'School Activity',
    'Student Photograph',
    'Certificate',
    'Other'
  )),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  consent_status BOOLEAN NOT NULL DEFAULT false,
  submission_status TEXT NOT NULL DEFAULT 'Pending' CHECK (submission_status IN ('Pending', 'Approved', 'Rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for reference number generation
DROP TRIGGER IF EXISTS trg_submission_ref ON public.submissions;
CREATE TRIGGER trg_submission_ref
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION generate_submission_ref();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_submissions_updated_at ON public.submissions;
CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Submission files table
CREATE TABLE IF NOT EXISTS public.submission_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Authorized Admin Users table (Links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'reviewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Rate limits tracking table (Used by Edge Functions to prevent flood attacks)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  first_request TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_request TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ip_endpoint UNIQUE (ip_hash, endpoint)
);

-- 8. Helper function to check if the current user is an active administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Indexes for lightning-fast queries and admin filtering
CREATE INDEX IF NOT EXISTS idx_submissions_reference ON public.submissions(submission_reference);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON public.submissions(category);
CREATE INDEX IF NOT EXISTS idx_submissions_class ON public.submissions(class_name);
CREATE INDEX IF NOT EXISTS idx_submissions_student_name ON public.submissions(student_name);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id ON public.submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON public.rate_limits(ip_hash, endpoint);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Submissions Table Policies:
-- Anonymous users: NO DIRECT READ, NO DIRECT WRITE, NO DIRECT UPDATE/DELETE.
-- Only authenticated administrators can view, update status, or delete.
-- Service role (Edge Function) bypasses RLS to safely insert validated records.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
CREATE POLICY "Admins can view all submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update submission status" ON public.submissions;
CREATE POLICY "Admins can update submission status"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete submissions" ON public.submissions;
CREATE POLICY "Admins can delete submissions"
  ON public.submissions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- Submission Files Table Policies:
-- Anonymous users: NO ACCESS.
-- Only authenticated admins can read file records.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view submission files" ON public.submission_files;
CREATE POLICY "Admins can view submission files"
  ON public.submission_files
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete submission files" ON public.submission_files;
CREATE POLICY "Admins can delete submission files"
  ON public.submission_files
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- Admin Users Table Policies:
-- Authenticated users can view their own record to verify admin status.
-- Superadmins can manage all admin records.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view own admin profile" ON public.admin_users;
CREATE POLICY "Admins can view own admin profile"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 11. SUPABASE STORAGE BUCKET CONFIGURATION (Private)
-- ============================================================================

-- Insert private bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ambika-submissions',
  'ambika-submissions',
  false, -- NEVER PUBLIC!
  10485760, -- 10MB maximum
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage RLS: Deny public access; allow authenticated admins to view/download
DROP POLICY IF EXISTS "Admins can read submission storage" ON storage.objects;
CREATE POLICY "Admins can read submission storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ambika-submissions'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete submission storage" ON storage.objects;
CREATE POLICY "Admins can delete submission storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ambika-submissions'
    AND public.is_admin()
  );

-- ============================================================================
-- 12. HELPER PROCEDURE TO ENROLL FIRST ADMIN USER
-- Run this in Supabase SQL Editor after creating the user in Supabase Auth:
-- SELECT public.enroll_admin('admin@ambikaschool.in', 'School Administrator');
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enroll_admin(admin_email TEXT, admin_display_name TEXT DEFAULT 'Administrator')
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = lower(trim(admin_email));
  IF target_user_id IS NULL THEN
    RETURN 'ERROR: User with email ' || admin_email || ' not found in Supabase Auth. Create the user in Auth > Users first.';
  END IF;

  INSERT INTO public.admin_users (user_id, email, full_name, role, is_active)
  VALUES (target_user_id, lower(trim(admin_email)), admin_display_name, 'admin', true)
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    full_name = EXCLUDED.full_name;

  RETURN 'SUCCESS: Enrolled ' || admin_email || ' as Ambika School Administrator.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
