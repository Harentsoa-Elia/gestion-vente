"""ajout table notifications

Revision ID: a1b2c3d4e5f6
Revises: f005d730cee6
Create Date: 2026-09-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f005d730cee6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organisateur_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('lu', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('date_creation', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('reservation_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['organisateur_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reservation_id'], ['reservations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_organisateur_id'), 'notifications', ['organisateur_id'], unique=False)
    op.create_index(op.f('ix_notifications_lu'), 'notifications', ['lu'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_notifications_lu'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_organisateur_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')