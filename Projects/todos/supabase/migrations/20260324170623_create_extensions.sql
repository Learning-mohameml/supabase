-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable trigram for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;