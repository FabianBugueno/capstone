"""retencion de mediciones: 7 dias

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-10-23 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El simulador genera ~1 medicion/s por equipo; TimescaleDB borra por chunks completos
    # las mediciones de mas de 7 dias. Las incidencias no se tocan (quedan para consulta).
    op.execute("SELECT add_retention_policy('mediciones', INTERVAL '7 days', if_not_exists => TRUE);")


def downgrade() -> None:
    op.execute("SELECT remove_retention_policy('mediciones', if_exists => TRUE);")
