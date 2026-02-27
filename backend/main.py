from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any

# IMPORTING RAG PIPELINE
from rag_pipeline import run_chat_agent

# API Instance
app = FastAPI()

# THREAD MANAGEMENT
executor = ThreadPoolExecutor()

# CORS CONFIGURATION - Allowing data requests from web app to be made to FastAPI server
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

# DATA MODELS - Defines what the frontend can only send as request
class UserQuery(BaseModel):
    query: str
    # Enables React to send macro/dietary filters
    filters: Optional[Dict[str, Any]] = None 

# ----- API ROUTES -----
# Health Check
@app.get("/")
def read_root():
    return {"status": "Opticart Backend Online"}

# Listener for requests from "/chat"
@app.post("/chat")
async def chat_endpoint(request: UserQuery):
    print(f"--- NEW REQUEST RECEIVED ---")
    print(f"Query: {request.query}")
    print(f"Filters: {request.filters}")

    # Running RAG Pipeline 
    try:
        loop = asyncio.get_event_loop()
        
        response_data = await loop.run_in_executor(
            executor, 
            run_chat_agent, 
            request.query,
            request.filters
        )
        
        # Check for errors from the pipeline
        if "error" in response_data:
             raise HTTPException(status_code=404, detail=response_data["error"])

        return response_data
    
    # Error raise to application if any processes crash
    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))