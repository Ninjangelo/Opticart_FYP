from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor

# IMPORTING RAG PIPELINE
from rag_pipeline import run_chat_agent

app = FastAPI()

# THREAD MANAGEMENT
executor = ThreadPoolExecutor()

# CORS CONFIGURATION
origins = [
    "http://localhost:5173",  # Vite
    "http://localhost:3000",  # Backup Port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DATA MODELS
class UserQuery(BaseModel):
    query: str

# API ROUTES
@app.get("/")
def read_root():
    return {"status": "Opticart Backend Online"}

@app.post("/chat")
async def chat_endpoint(request: UserQuery):
    if not run_chat_agent:
        raise HTTPException(status_code=500, detail="RAG Pipeline not loaded. Check server logs.")

    print(f"Received Query: {request.query}")

    try:
        loop = asyncio.get_event_loop()
        
        response_data = await loop.run_in_executor(
            executor, 
            run_chat_agent, 
            request.query
        )
        
        # Check for errors from the pipeline
        if "error" in response_data:
             raise HTTPException(status_code=404, detail=response_data["error"])

        return response_data
        
    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))