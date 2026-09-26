-- ==============================================================================
-- MANUSCRIPT BUDDY - SUPABASE POSTGRESQL SCHEMA DDL
-- Paste this script into your Supabase Dashboard -> SQL Editor and run it!
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'author',
    hashed_password VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_email ON public.users(email);

-- 2. MANUSCRIPTS TABLE
CREATE TABLE IF NOT EXISTS public.manuscripts (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    user_id VARCHAR(36) REFERENCES public.users(id) ON DELETE SET NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'Draft',
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_editor VARCHAR(255),
    genre VARCHAR(100) NOT NULL,
    secondary_genre VARCHAR(100),
    audience VARCHAR(100),
    keywords JSONB DEFAULT '[]'::jsonb,
    abstract TEXT,
    synopsis TEXT,
    page_count INT,
    launch_date VARCHAR(50),
    file_name VARCHAR(255),
    file_size INT,
    file_url VARCHAR(500),
    rejection_reason TEXT,
    legal_declaration BOOLEAN DEFAULT FALSE,
    legal_accepted_at TIMESTAMPTZ,
    ai_score INT,
    ai_readability INT,
    ai_marketability INT,
    ai_detected_pages INT,
    ai_title_matched BOOLEAN DEFAULT TRUE,
    ai_summary TEXT,
    ai_genre_confidence JSONB,
    ai_pacing JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_manuscripts_title ON public.manuscripts(title);

-- 3. CHAPTERS TABLE
CREATE TABLE IF NOT EXISTS public.chapters (
    id VARCHAR(36) PRIMARY KEY,
    manuscript_id VARCHAR(36) NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL DEFAULT 1,
    chapter_title VARCHAR(255) NOT NULL,
    chapter_content TEXT DEFAULT '',
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. TIMELINE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id VARCHAR(36) PRIMARY KEY,
    manuscript_id VARCHAR(36) NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. EDITOR NOTES TABLE
CREATE TABLE IF NOT EXISTS public.editor_notes (
    id VARCHAR(36) PRIMARY KEY,
    manuscript_id VARCHAR(36) NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
    note_author VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SUCCESS NOTICE
-- Tables: users, manuscripts, chapters, timeline_events, editor_notes created!
-- ==============================================================================
