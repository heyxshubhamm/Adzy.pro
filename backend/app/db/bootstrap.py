from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


async def _get_table_columns(engine: AsyncEngine, table_name: str) -> set[str]:
    async with engine.connect() as conn:
        dialect = conn.dialect.name

        if dialect == "sqlite":
            result = await conn.execute(text(f"PRAGMA table_info({table_name})"))
            return {row[1] for row in result.fetchall()}

        result = await conn.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :table_name
                """
            ),
            {"table_name": table_name},
        )
        return {row[0] for row in result.fetchall()}


async def ensure_market_schema(engine: AsyncEngine) -> None:
    user_columns = await _get_table_columns(engine, "users")
    gig_columns = await _get_table_columns(engine, "gigs")

    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS weight_policy (
                    weight_name VARCHAR(30) PRIMARY KEY,
                    weight_pct NUMERIC(5,2) NOT NULL,
                    min_pct NUMERIC(5,2),
                    max_pct NUMERIC(5,2),
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(50)
                )
                """
            )
        )

        if "adzy_choice" not in user_columns:
            await conn.execute(text("ALTER TABLE users ADD COLUMN adzy_choice BOOLEAN DEFAULT FALSE"))
        if "seller_score" not in user_columns:
            await conn.execute(text("ALTER TABLE users ADD COLUMN seller_score NUMERIC(5,2) DEFAULT 0"))

        if "gig_level" not in gig_columns:
            await conn.execute(text("ALTER TABLE gigs ADD COLUMN gig_level VARCHAR(20) DEFAULT 'standard'"))
        if "orders_last_7d" not in gig_columns:
            await conn.execute(text("ALTER TABLE gigs ADD COLUMN orders_last_7d INTEGER DEFAULT 0"))
        if "ctr_7d" not in gig_columns:
            await conn.execute(text("ALTER TABLE gigs ADD COLUMN ctr_7d NUMERIC(6,4) DEFAULT 0"))
        if "conversion_7d" not in gig_columns:
            await conn.execute(text("ALTER TABLE gigs ADD COLUMN conversion_7d NUMERIC(6,4) DEFAULT 0"))
