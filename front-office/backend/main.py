from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import concert_controller, ticket_controller


app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(concert_controller.router, prefix="/api/v1")
app.include_router(ticket_controller.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "Mahaleo API"}

@app.on_event("startup")
async def startup_event():
    print("🚀 Application startup")
    