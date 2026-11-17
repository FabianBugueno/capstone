"""trazabilidad de incidencias: quien y cuando reconoce o resuelve

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-11-16 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("incidencias", sa.Column("reconocida_por", sa.String(150)))
    op.add_column("incidencias", sa.Column("reconocida_en", sa.DateTime(timezone=True)))
    op.add_column("incidencias", sa.Column("resuelta_por", sa.String(150)))
    op.add_column("incidencias", sa.Column("resuelta_en", sa.DateTime(timezone=True)))
    op.add_column("incidencias", sa.Column("nota_resolucion", sa.String(500)))


def downgrade() -> None:
    for columna in ("nota_resolucion", "resuelta_en", "resuelta_por", "reconocida_en", "reconocida_por"):
        op.drop_column("incidencias", columna)
