"""crear tabla mediciones

Revision ID: 3144b78988b7
Revises: f469bf3fe3ec
Create Date: 2026-09-14 23:27:25.104760

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3144b78988b7'
down_revision: Union[str, Sequence[str], None] = 'f469bf3fe3ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('mediciones',
        sa.Column('equipo_id', sa.Integer(), sa.ForeignKey('equipos.id'), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('voltaje_l1', sa.Numeric(10, 2)),
        sa.Column('voltaje_l2', sa.Numeric(10, 2)),
        sa.Column('voltaje_l3', sa.Numeric(10, 2)),
        sa.Column('corriente_l1', sa.Numeric(10, 2)),
        sa.Column('corriente_l2', sa.Numeric(10, 2)),
        sa.Column('corriente_l3', sa.Numeric(10, 2)),
        sa.Column('thd', sa.Numeric(5, 2)),
        sa.Column('frecuencia', sa.Numeric(6, 2)),
        sa.Column('factor_potencia', sa.Numeric(4, 3)),
        sa.Column('temperatura_gabinete', sa.Numeric(5, 2)),
        sa.Column('estado_medicion', sa.String(20)),
        sa.PrimaryKeyConstraint('timestamp', 'equipo_id')
    )
    #op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
    #op.execute("SELECT create_hypertable('mediciones', 'timestamp');")


def downgrade() -> None:
    op.drop_table('mediciones')

