-- ====================================================================
-- LEARNOVA Database Schema & Row-Level Security (RLS) Migrations
-- Phase 8: Supabase Integration & Multi-Entity Persistence
-- Safe, additive migration.
-- ====================================================================

-- 1. Users Profile
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    display_name TEXT,
    education_level TEXT DEFAULT 'undergraduate',
    learning_level TEXT DEFAULT 'intermediate',
    preferred_style TEXT DEFAULT 'visual_first',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own profile"
    ON public.users
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- 2. Learning Documents
CREATE TABLE IF NOT EXISTS public.learning_documents (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    filename TEXT,
    file_type TEXT,
    language TEXT DEFAULT 'en',
    chunk_count INT DEFAULT 0,
    concept_count INT DEFAULT 0,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.learning_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own learning documents or public demo"
    ON public.learning_documents
    FOR ALL
    USING (auth.uid() = user_id OR is_demo = TRUE)
    WITH CHECK (auth.uid() = user_id);


-- 3. Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES public.learning_documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Classroom Session',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
    ON public.conversations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 4. Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('student', 'teacher', 'system')),
    content TEXT NOT NULL,
    spoken_text TEXT,
    intent TEXT,
    pedagogical_phase TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access messages for their conversations"
    ON public.messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
        )
    );


-- 5. Learner Progress & Concept Mastery
CREATE TABLE IF NOT EXISTS public.learner_progress (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    mastery_score FLOAT DEFAULT 0.0,
    review_count INT DEFAULT 0,
    last_reviewed TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    misconceptions_resolved INT DEFAULT 0
);

ALTER TABLE public.learner_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress records"
    ON public.learner_progress
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 6. Website Knowledge Bases (Aparsoft-Inspired)
CREATE TABLE IF NOT EXISTS public.website_knowledge_bases (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    base_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    pages_crawled INT DEFAULT 0,
    chunk_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.website_knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own website knowledge bases"
    ON public.website_knowledge_bases
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 7. Website Indexed Pages
CREATE TABLE IF NOT EXISTS public.website_pages (
    id TEXT PRIMARY KEY,
    kb_id TEXT REFERENCES public.website_knowledge_bases(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    content TEXT,
    chunk_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access pages from their website knowledge bases"
    ON public.website_pages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.website_knowledge_bases kb
            WHERE kb.id = website_pages.kb_id AND kb.user_id = auth.uid()
        )
    );


-- 8. Screen Guidance Sessions (Zero screenshot data stored)
CREATE TABLE IF NOT EXISTS public.screen_guidance_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    workflow TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    steps_completed INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.screen_guidance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their screen guidance records"
    ON public.screen_guidance_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
