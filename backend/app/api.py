from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import concert_controller, ticket_controller
from app.database import engine, Base  # Add these imports
import uvicorn
from app.controllers import user_controller


app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(concert_controller.router, prefix="/api/v1")
app.include_router(ticket_controller.router, prefix="/api/v1")
app.include_router(user_controller.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Mahaleo API"}

@app.on_event("startup")
async def startup_event():
    print("Application startup")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)