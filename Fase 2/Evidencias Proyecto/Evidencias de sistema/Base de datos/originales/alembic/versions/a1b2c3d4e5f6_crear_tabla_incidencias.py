"""crear tabla incidencias

Revision ID: a1b2c3d4e5f6
Revises: 3144b78988b7
Create Date: 2026-09-27 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3144b78988b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incidencias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("equipo_id", sa.Integer(), sa.ForeignKey("equipos.id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("tipo", sa.String(50), nullable=False),
        sa.Column("nivel", sa.String(20), nullable=False),
        sa.Column("estado", sa.String(20), server_default="activa"),
        sa.Column("descripcion", sa.String(500)),
        sa.Column("valor_medido", sa.Numeric(10, 2)),
        sa.Column("umbral_config", sa.Numeric(10, 2)),
        sa.Column("fecha_creacion", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("incidencias")
