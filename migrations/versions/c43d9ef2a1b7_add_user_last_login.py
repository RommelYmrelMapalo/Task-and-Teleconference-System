"""Add user last_login

Revision ID: c43d9ef2a1b7
Revises: 574d86030f04
Create Date: 2026-03-05 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c43d9ef2a1b7'
down_revision = '574d86030f04'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('last_login')
