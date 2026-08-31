from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
import sys

# Charger les variables d'environnement
load_dotenv()

# Lecture des variables d'environnement avec valeurs par défaut sécurisées
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "db")  # Docker Compose service name en prod
DB_NAME = os.getenv("DB_NAME", "billet_mahaleo")
DB_PORT = int(os.getenv("DB_PORT", 5432))

# Construire l'URL SQLAlchemy async pour PostgreSQL
SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Créer le moteur async
try:
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
except Exception as e:
    print("❌ Failed to create SQLAlchemy engine:", e, file=sys.stderr)
    sys.exit(1)

# Session factory pour FastAPI
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Base pour les modèles
Base = declarative_base()

# Dépendance FastAPI pour récupérer la session DB
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
