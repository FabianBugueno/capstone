from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


engine = create_engine(settings.DATABASE_URL)

Sessionlocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = Sessionlocal()
    try:
        yield db
    finally:
        db.close()
