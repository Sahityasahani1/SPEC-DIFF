"""Initial schema with pgvector extension and HNSW indexing.

Revision ID: 0001_initial_pgvector
Revises: 
Create Date: 2026-09-21 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = '0001_initial_pgvector'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Enable pgvector extension on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='laptop'),
        sa.Column('brand', sa.String(length=50), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('ram_gb', sa.Integer(), nullable=False),
        sa.Column('storage_gb', sa.Integer(), nullable=False),
        sa.Column('processor', sa.String(length=150), nullable=False),
        sa.Column('gpu', sa.String(length=150), nullable=False),
        sa.Column('battery_hours', sa.Float(), nullable=False, server_default='6.0'),
        sa.Column('weight_kg', sa.Float(), nullable=False, server_default='1.6'),
        sa.Column('rating', sa.Float(), nullable=False, server_default='4.0'),
        sa.Column('ram_expandability', sa.String(length=100), nullable=False, server_default='Soldered'),
        sa.Column('bundled_software', sa.String(length=100), nullable=False, server_default='None'),
        sa.Column('display_tech', sa.String(length=150), nullable=False, server_default='FHD IPS Anti-Glare'),
        sa.Column('retail_source', sa.String(length=100), nullable=False, server_default='Amazon India'),
        sa.Column('product_url', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('pros', sa.Text(), nullable=False),
        sa.Column('cons', sa.Text(), nullable=False),
        sa.Column('in_stock', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('source', sa.String(length=100), nullable=False, server_default='laptops_india_catalog.csv'),
        sa.Column('catalog_updated_at', sa.String(length=50), nullable=False, server_default='2026-09-13'),
        sa.Column('embedding', Vector(384), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_products_id', 'products', ['id'], unique=False)
    op.create_index('ix_products_brand', 'products', ['brand'], unique=False)
    op.create_index('ix_products_category', 'products', ['category'], unique=False)
    op.create_index('ix_products_price', 'products', ['price'], unique=False)
    op.create_index('ix_products_ram_gb', 'products', ['ram_gb'], unique=False)
    op.create_index('ix_products_storage_gb', 'products', ['storage_gb'], unique=False)
    op.create_index('ix_products_in_stock', 'products', ['in_stock'], unique=False)

    # 3. Create HNSW Cosine Index for pgvector on PostgreSQL
    if bind.dialect.name == "postgresql":
        op.create_index(
            'product_embedding_hnsw_idx',
            'products',
            ['embedding'],
            unique=False,
            postgresql_using='hnsw',
            postgresql_with={'m': 16, 'ef_construction': 64},
            postgresql_ops={'embedding': 'vector_cosine_ops'}
        )

    # 4. Create recommendations table
    op.create_table(
        'recommendations',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('request_json', sa.Text(), nullable=False),
        sa.Column('result_json', sa.Text(), nullable=False),
        sa.Column('latency_ms', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_recommendations_id', 'recommendations', ['id'], unique=False)

    # 5. Create feedback table
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('recommendation_id', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['recommendation_id'], ['recommendations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_feedback_id', 'feedback', ['id'], unique=False)

    # 6. Create click_logs table
    op.create_table(
        'click_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.String(length=100), nullable=False),
        sa.Column('retail_source', sa.String(length=100), nullable=False),
        sa.Column('target_url', sa.String(length=2000), nullable=False),
        sa.Column('client_ip', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_click_logs_product_id', 'click_logs', ['product_id'], unique=False)

def downgrade() -> None:
    op.drop_table('click_logs')
    op.drop_table('feedback')
    op.drop_table('recommendations')
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_index('product_embedding_hnsw_idx', table_name='products')
    op.drop_table('products')
