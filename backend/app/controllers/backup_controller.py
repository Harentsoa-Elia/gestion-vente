import os
import uuid
import subprocess
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.auth.auth_bearer import JWTBearer

router = APIRouter()

PG_USER = os.getenv("DB_USER", "postgres")
PG_PASSWORD = os.getenv("DB_PASSWORD", "")
PG_HOST = os.getenv("DB_HOST", "db")
PG_PORT = os.getenv("DB_PORT", "5432")
PG_DATABASE = os.getenv("DB_NAME", "")

os.environ["PGPASSWORD"] = PG_PASSWORD


@router.get("/backup-db", summary="Telecharger un backup SQL de la base (admin uniquement)")
async def backup_database(auth_data: dict = Depends(JWTBearer())):
    if auth_data.get("concert_id") != 0:
        raise HTTPException(status_code=403, detail="Only admin can access database backups.")

    try:
        file_name = f"backup_{uuid.uuid4().hex}.sql"
        file_path = f"/tmp/{file_name}"

        command = [
            "pg_dump",
            "-h", PG_HOST,
            "-p", str(PG_PORT),
            "-U", PG_USER,
            "-F", "p",
            PG_DATABASE,
            "-f", file_path
        ]

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"pg_dump error: {result.stderr}"
            )

        return FileResponse(
            path=file_path,
            filename=file_name,
            media_type="application/sql"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))