from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import (
    concert_controller, 
    ticket_controller,
    user_controller, # Add new controller
    backup_controller
)
from app.database import engine, Base
from app.auth.auth_bearer import JWTBearer  # Import JWTBearer

#app = FastAPI(docs_url=None, redoc_url=None)
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user_controller.router, prefix="/api/v1")  # Add user routes
app.include_router(concert_controller.router, prefix="/api/v1")
app.include_router(ticket_controller.router, prefix="/api/v1")
app.include_router(backup_controller.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "Concert Project API"}

@app.on_event("startup")
async def startup_event():
    print(" Application startup")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
