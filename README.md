# Opticart_FYP
Final Year Project towards creating a chatbot-based web application to demonstrate a full stack, conversational AI, and recommendation system that will assist the process of understanding your needs for meal planning, formulating a shopping list and taking into account the current pricing for individual grocery items for price comparison.

### <ins>Running the Application Locally</ins>
- <ins>Local Server run Commands:</ins>
  - <ins>Uvicorn:</ins>
  - cd backend
  - .\venv\Scripts\activate
  - uvicorn main:app --reload
  - <ins>React Application:</ins>
  - cd frontend/Opticart
  - npm run dev (for React Application)

- <ins>Testing FastAPI Calls for retreiving Backend Responses</ins>
  - <ins>Uvicorn:</ins>
  - cd backend
  - .\venv\Scripts\activate
  - uvicorn main:app --reload
  - Visit http://localhost:8000/docs