from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, convocatorias, bookmarks, saved_searches

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portal de Convocatorias Públicas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(convocatorias.router)
app.include_router(bookmarks.router)
app.include_router(saved_searches.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
