from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY", "AIzaSyB9tcN8Xw1VpvejALrAZCcmszkXR-ZbUaM"))

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase initialized successfully!")
except Exception as e:
    print(f"❌ Firebase initialization failed: {str(e)}")
    db = None

class ChatMessage(BaseModel):
    message: str

@app.get("/")
def root():
    return {"message": "Backend is working with Gemini API!"}

@app.post("/chat")
async def chat_with_ai(chat: ChatMessage):
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        response = model.generate_content(chat.message)
        ai_response = response.text
        return {"response": ai_response}
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        return {"response": error_msg}
