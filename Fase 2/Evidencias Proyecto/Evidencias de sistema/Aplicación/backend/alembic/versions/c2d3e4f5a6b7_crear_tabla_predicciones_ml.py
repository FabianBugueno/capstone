"""crear tabla predicciones_ml

Revision ID: c2d3e4f5a6b7
Revises: b7c8d9e0f1a2
Create Date: 2026-11-09 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "predicciones_ml",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("equipo_id", sa.Integer(), sa.ForeignKey("equipos.id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("clase_predicha", sa.String(50), nullable=True),
        sa.Column("probabilidad", sa.Numeric(5, 4), nullable=True),
        sa.Column("riesgo_falla", sa.Numeric(5, 4), nullable=True),
        sa.Column("horizonte_estimado_min", sa.Integer(), nullable=True),
        sa.Column("modelo_version", sa.String(20), nullable=True),
    )
    op.create_index("ix_predicciones_ml_equipo_id", "predicciones_ml", ["equipo_id"])
    op.create_index("ix_predicciones_ml_timestamp", "predicciones_ml", ["timestamp"])
    op.create_index("ix_predicciones_ml_equipo_timestamp", "predicciones_ml", ["equipo_id", "timestamp"])


def downgrade() -> None:
    op.drop_index("ix_predicciones_ml_equipo_timestamp", table_name="predicciones_ml")
    op.drop_index("ix_predicciones_ml_timestamp", table_name="predicciones_ml")
    op.drop_index("ix_predicciones_ml_equipo_id", table_name="predicciones_ml")
    op.drop_table("predicciones_ml")

