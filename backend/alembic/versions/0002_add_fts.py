"""Add full-text search column and indexes to gigs

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-31
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # pg_trgm is needed for trigram index and similarity() — idempotent
    if op.get_context().dialect.name == "postgresql": op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Generated tsvector column — auto-updates with title/description/tags
    # tags is stored as JSON; translate() strips array notation characters
    # (immutable, so safe to use in GENERATED ALWAYS AS ... STORED)
    if op.get_context().dialect.name == "postgresql": op.execute("""
        ALTER TABLE gigs
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
            setweight(to_tsvector('english',
                translate(coalesce(tags::text, '[]'), '[],"', '    ')
            ), 'C')
        ) STORED
    """)

    # GIN index on the generated column — makes @@ queries use index scan
    if op.get_context().dialect.name == "postgresql": op.execute("""
        CREATE INDEX IF NOT EXISTS idx_gigs_search_vector
        ON gigs USING gin(search_vector)
    """)

    # Trigram index on title — used by ILIKE prefix matches and similarity()
    if op.get_context().dialect.name == "postgresql": op.execute("""
        CREATE INDEX IF NOT EXISTS idx_gigs_title_trgm
        ON gigs USING gin(title gin_trgm_ops)
    """)

    # Composite partial index for filtered search — only active gigs
    if op.get_context().dialect.name == "postgresql": op.execute("""
        CREATE INDEX IF NOT EXISTS idx_gigs_search_composite
        ON gigs(status, category_id, rating DESC NULLS LAST)
        WHERE status = 'active'
    """)


def downgrade() -> None:
    if op.get_context().dialect.name == "postgresql": op.execute("DROP INDEX IF EXISTS idx_gigs_search_composite")
    if op.get_context().dialect.name == "postgresql": op.execute("DROP INDEX IF EXISTS idx_gigs_title_trgm")
    if op.get_context().dialect.name == "postgresql": op.execute("DROP INDEX IF EXISTS idx_gigs_search_vector")
    if op.get_context().dialect.name == "postgresql": op.execute("ALTER TABLE gigs DROP COLUMN IF EXISTS search_vector")
