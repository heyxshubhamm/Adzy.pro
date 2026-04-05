"""Industrial Upgrade: Hashing, Risk, Fraud, Compliance

Revision ID: ab5edbfa1f90
Revises: 0003
Create Date: 2026-04-04 19:56:11.697213

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import Text, JSON
from sqlalchemy.dialects import postgresql
import pgvector

# revision identifiers, used by Alembic.
revision: str = 'ab5edbfa1f90'
down_revision: Union[str, Sequence[str], None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── [NEW] Tables ──
    op.create_table('commission_rules',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('seller_tier', sa.String(length=50), nullable=True),
    sa.Column('rate', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('min_amount', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('ip_reputation',
    sa.Column('ip_address', sa.String(length=45), nullable=False),
    sa.Column('is_vpn', sa.Boolean(), nullable=True),
    sa.Column('is_tor', sa.Boolean(), nullable=True),
    sa.Column('is_proxy', sa.Boolean(), nullable=True),
    sa.Column('is_blocked', sa.Boolean(), nullable=True),
    sa.Column('risk_score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('country', sa.String(length=3), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.PrimaryKeyConstraint('ip_address')
    )
    op.create_table('system_alerts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('severity', sa.String(length=10), nullable=False),
    sa.Column('source', sa.String(length=100), nullable=False),
    sa.Column('is_resolved', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('compliance_records',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('record_type', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('data', JSON(), nullable=True),
    sa.Column('handled_by_id', sa.UUID(), nullable=True),
    sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['handled_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('fraud_alerts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('alert_type', sa.String(length=50), nullable=False),
    sa.Column('severity', sa.Integer(), nullable=True),
    sa.Column('details', JSON(), nullable=True),
    sa.Column('resolved', sa.Boolean(), nullable=True),
    sa.Column('resolved_by_id', sa.UUID(), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('support_tickets',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('subject', sa.String(length=255), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('priority', sa.String(length=10), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('assigned_to_id', sa.UUID(), nullable=True),
    sa.Column('sentiment', sa.Numeric(precision=3, scale=2), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('refunds',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('payment_id', sa.UUID(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('reason', sa.String(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('approved_by_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # ── [ADD] Columns ──
    # admin_audit_log - [Skipped: already exist]
    # op.add_column('admin_audit_log', sa.Column('payload', JSON(), nullable=True))
    # op.add_column('admin_audit_log', sa.Column('chain_hash', sa.String(length=64), nullable=True))
    
    # categories - [Skipped: already exist]
    # op.add_column('categories', sa.Column('icon', sa.String(length=50), nullable=True))
    # op.add_column('categories', sa.Column('color', sa.String(length=20), nullable=True))
    # op.add_column('categories', sa.Column('sort_order', sa.Integer(), nullable=True))
    # op.add_column('categories', sa.Column('level', sa.Integer(), nullable=True))
    # op.add_column('categories', sa.Column('is_active', sa.Boolean(), nullable=True))
    # op.add_column('categories', sa.Column('gig_count', sa.Integer(), nullable=True))
    
    # disputes - [Skipped: already exist]
    # with op.batch_alter_table('disputes') as batch_op:
    #     batch_op.add_column(sa.Column('assigned_to_id', sa.UUID(), nullable=True))
    #     batch_op.add_column(sa.Column('sla_deadline', sa.DateTime(timezone=True), nullable=True))
    #     batch_op.add_column(sa.Column('sentiment', sa.Numeric(precision=3, scale=2), nullable=True))
    #     batch_op.create_foreign_key('fk_dispute_assigned', 'users', ['assigned_to_id'], ['id'])
    
    # gigs
    op.add_column('gigs', sa.Column('nsfw_score', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('gigs', sa.Column('spam_score', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('gigs', sa.Column('quality_score', sa.Numeric(precision=5, scale=2), nullable=True))

    # users
    op.add_column('users', sa.Column('two_fa_enabled', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('two_fa_secret', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('ip_whitelist', JSON(), nullable=True))
    op.add_column('users', sa.Column('risk_score', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('users', sa.Column('trust_score', sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column('users', sa.Column('kyc_verified', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('country', sa.String(length=3), nullable=True))
    op.add_column('users', sa.Column('wallet_frozen', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('freeze_reason', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('refunds')
    op.drop_table('support_tickets')
    op.drop_table('fraud_alerts')
    op.drop_table('compliance_records')
    op.drop_table('system_alerts')
    op.drop_table('ip_reputation')
    op.drop_table('commission_rules')

    op.drop_column('users', 'freeze_reason')
    op.drop_column('users', 'wallet_frozen')
    op.drop_column('users', 'country')
    op.drop_column('users', 'kyc_verified')
    op.drop_column('users', 'trust_score')
    op.drop_column('users', 'risk_score')
    op.drop_column('users', 'ip_whitelist')
    op.drop_column('users', 'two_fa_secret')
    op.drop_column('users', 'two_fa_enabled')

    op.drop_column('gigs', 'quality_score')
    op.drop_column('gigs', 'spam_score')
    op.drop_column('gigs', 'nsfw_score')

    op.drop_constraint('fk_dispute_assigned', 'disputes', type_='foreignkey')
    op.drop_column('disputes', 'sentiment')
    op.drop_column('disputes', 'sla_deadline')
    op.drop_column('disputes', 'assigned_to_id')

    op.drop_column('categories', 'gig_count')
    op.drop_column('categories', 'is_active')
    op.drop_column('categories', 'level')
    op.drop_column('categories', 'sort_order')
    op.drop_column('categories', 'color')
    op.drop_column('categories', 'icon')

    op.drop_column('admin_audit_log', 'chain_hash')
    op.drop_column('admin_audit_log', 'payload')
    op.alter_column('orders', 'status',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'PENDING'"),
               existing_nullable=True)
    op.alter_column('orders', 'package_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('orders', 'gig_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('orders', 'buyer_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('orders', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.create_index(op.f('idx_oauth_provider'), 'oauth_accounts', ['provider', 'provider_id'], unique=1)
    op.alter_column('oauth_accounts', 'user_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('oauth_accounts', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.create_index(op.f('idx_messages_order'), 'messages', ['order_id', 'created_at'], unique=False)
    op.alter_column('messages', 'is_read',
               existing_type=sa.BOOLEAN(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('messages', 'sender_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('messages', 'order_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('messages', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.create_index(op.f('idx_thread_seller'), 'message_threads', ['seller_id', 'last_msg_at'], unique=False)
    op.create_index(op.f('idx_thread_order'), 'message_threads', ['order_id'], unique=False)
    op.create_index(op.f('idx_thread_buyer'), 'message_threads', ['buyer_id', 'last_msg_at'], unique=False)
    op.alter_column('message_threads', 'is_archived',
               existing_type=sa.BOOLEAN(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('message_threads', 'seller_unread',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('message_threads', 'buyer_unread',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('message_threads', 'gig_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('message_threads', 'order_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('message_threads', 'seller_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('message_threads', 'buyer_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('message_threads', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.create_index(op.f('idx_inbox_msg_thread'), 'inbox_messages', ['thread_id', 'created_at'], unique=False)
    op.alter_column('inbox_messages', 'is_read',
               existing_type=sa.BOOLEAN(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('inbox_messages', 'sender_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('inbox_messages', 'thread_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('inbox_messages', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'gigs', type_='foreignkey')
    op.drop_constraint(None, 'gigs', type_='foreignkey')
    op.create_foreign_key(None, 'gigs', 'categories', ['category_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key(None, 'gigs', 'users', ['seller_id'], ['id'], ondelete='CASCADE')
    op.drop_index(op.f('ix_gigs_slug'), table_name='gigs')
    op.create_index(op.f('idx_gigs_slug'), 'gigs', ['slug'], unique=1)
    op.create_index(op.f('idx_gigs_seller_status'), 'gigs', ['seller_id', 'status'], unique=False)
    op.create_index(op.f('idx_gigs_category_status'), 'gigs', ['category_id', 'status'], unique=False)
    op.alter_column('gigs', 'conversion_7d',
               existing_type=sa.NUMERIC(precision=6, scale=4),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gigs', 'ctr_7d',
               existing_type=sa.NUMERIC(precision=6, scale=4),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gigs', 'orders_last_7d',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gigs', 'gig_level',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'standard'"),
               existing_nullable=True)
    op.alter_column('gigs', 'risk_score',
               existing_type=sa.NUMERIC(precision=5, scale=2),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gigs', 'views',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               nullable=False)
    op.alter_column('gigs', 'reviews_count',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               nullable=False)
    op.alter_column('gigs', 'status',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'draft'"),
               nullable=False)
    op.alter_column('gigs', 'seller_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('gigs', 'tags',
               existing_type=postgresql.JSON(astext_type=Text()),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('gigs', 'category_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('gigs', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_column('gigs', 'embedding')
    op.drop_column('gigs', 'quality_score')
    op.drop_column('gigs', 'spam_score')
    op.drop_column('gigs', 'nsfw_score')
    op.alter_column('gig_stats', 'orders_count',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_stats', 'impressions_count',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_stats', 'clicks_count',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_stats', 'views_count',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_stats', 'gig_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('gig_stats', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'gig_requirements', type_='foreignkey')
    op.create_foreign_key(None, 'gig_requirements', 'gigs', ['gig_id'], ['id'], ondelete='CASCADE')
    op.alter_column('gig_requirements', 'sort_order',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_requirements', 'is_required',
               existing_type=sa.BOOLEAN(),
               server_default=sa.text("'1'"),
               existing_nullable=True)
    op.alter_column('gig_requirements', 'choices',
               existing_type=postgresql.JSON(astext_type=Text()),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('gig_requirements', 'input_type',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'text'"),
               existing_nullable=True)
    op.alter_column('gig_requirements', 'gig_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('gig_requirements', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'gig_packages', type_='foreignkey')
    op.create_foreign_key(None, 'gig_packages', 'gigs', ['gig_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('idx_gig_packages_gig'), 'gig_packages', ['gig_id'], unique=False)
    op.alter_column('gig_packages', 'features',
               existing_type=postgresql.JSON(astext_type=Text()),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('gig_packages', 'revisions',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'1'"),
               existing_nullable=True)
    op.alter_column('gig_packages', 'gig_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('gig_packages', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'gig_media', type_='foreignkey')
    op.create_foreign_key(None, 'gig_media', 'gigs', ['gig_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('idx_gig_media_gig'), 'gig_media', ['gig_id'], unique=False)
    op.alter_column('gig_media', 'is_cover',
               existing_type=sa.BOOLEAN(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_media', 'sort_order',
               existing_type=sa.INTEGER(),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('gig_media', 'status',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'processing'"),
               existing_nullable=True)
    op.alter_column('gig_media', 'processed_urls',
               existing_type=postgresql.JSON(astext_type=Text()),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('gig_media', 'gig_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('gig_media', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'disputes', type_='foreignkey')
    op.alter_column('disputes', 'resolved_by_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('disputes', 'status',
               existing_type=sa.VARCHAR(length=20),
               server_default=sa.text("'open'"),
               existing_nullable=True)
    op.alter_column('disputes', 'opened_by_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('disputes', 'order_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               nullable=False)
    op.alter_column('disputes', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_column('disputes', 'sentiment')
    op.drop_column('disputes', 'sla_deadline')
    op.drop_column('disputes', 'assigned_to_id')
    op.alter_column('coupons', 'id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.drop_constraint(None, 'categories', type_='foreignkey')
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.create_index(op.f('idx_categories_slug'), 'categories', ['slug'], unique=1)
    op.alter_column('categories', 'parent_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('categories', 'id',
               existing_type=sa.UUID(),
               server_default=sa.text("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_column('categories', 'gig_count')
    op.drop_column('categories', 'is_active')
    op.drop_column('categories', 'level')
    op.drop_column('categories', 'sort_order')
    op.drop_column('categories', 'color')
    op.drop_column('categories', 'icon')
    op.alter_column('buyer_profiles', 'total_spent',
               existing_type=sa.NUMERIC(precision=12, scale=2),
               server_default=sa.text("'0'"),
               existing_nullable=True)
    op.alter_column('buyer_profiles', 'user_id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('buyer_profiles', 'id',
               existing_type=sa.UUID(),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('automation_rules', 'id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.alter_column('admin_audit_log', 'admin_id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.alter_column('admin_audit_log', 'id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.drop_column('admin_audit_log', 'chain_hash')
    op.drop_column('admin_audit_log', 'payload')
    op.drop_table('refunds')
    op.drop_table('support_tickets')
    op.drop_table('fraud_alerts')
    op.drop_table('compliance_records')
    op.drop_table('system_alerts')
    op.drop_table('ip_reputation')
    op.drop_table('commission_rules')
    # ### end Alembic commands ###
