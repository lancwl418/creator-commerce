-- ============================================================
-- 011: Allow creators to insert their own profile if missing
-- ============================================================

CREATE POLICY "profiles_insert_own" ON creator_profiles
    FOR INSERT WITH CHECK (
        creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())
    );
