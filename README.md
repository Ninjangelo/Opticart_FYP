# Opticart_FYP
Final Year Project towards creating a chatbot-based web application to demonstrate a full stack, conversational AI, and recommendation system that will assist the process of understanding your needs for meal planning, formulating a shopping list and taking into account the current pricing for individual grocery items for price comparison.

# <ins>Running the application Locally</ins>

## <ins>1. Prerequisites</ins>
<ins>Install the following:</ins> 
- [Visual Studio Code](https://code.visualstudio.com/Download)

- [Python](https://www.python.org/downloads/) (Click the version displayed on the yellow button)

- [Node.js and npm](https://nodejs.org/en/download) (Note: Download the LTS version)

- <ins>Git</ins>
  - <ins>Windows</ins> - Download and run the [Official Git](https://git-scm.com/install/windows) for Windows Installer.

  - <ins>Mac</ins> - Open terminal and enter the following command: ``` brew install git ```

  - <ins>Linux (Ubtunu/Debian)</ins> - Open the terminal and enter the following command: ``` sudo apt-get install git ```

## <ins>2. Cloning to Local Storage</ins>
Open VS Code and open a new terminal and run these set of commands:
```
git clone https://github.com/Ninjangelo/Opticart_FYP.git
cd Opticart_FYP
```
The GitHub repository is most likely cloned into the specific "Users" folder in which case the User your logged into at the moment (e.g. ```C:\Users\JohnDoe``` or ```~/Users/JohnDoe``` if Mac).

## <ins>3. Backend Setup</ins>
Ensuring that your within the ```Opticart_FYP``` folder (e.g. ```C:\Users\JohnDoe\Opticart_FYP``` or ```~/Users/JohnDoe/Opticart_FYP```), navigate to the ```backend``` folder by entering the following command:
```
cd backend
```

Afterwards, create the virtual environment by entering the following commands:
  - <ins>Windows:</ins>
```
python -m venv venv
.\venv\Scripts\activate
```

- <ins>Mac or Linux:</ins>
```
python3 -m venv venv
source venv/bin/activate
```

### <ins>Installing Dependencies</ins>
Ensuring that your still in the ```backend``` folder directory, run the following command to install everything listed inside the ```requirements.txt``` file:
```
pip install -r requirements.txt
```

### <ins>Environment Variables</ins>
Within the root of your ```backend``` folder, locate the ```.env.example```file and rename it to ```.env```.
</br>
</br>
For those examining or grading my the artefact prototype, I have inserted the API keys and URLs within the zipped folder submission for the artefact submission point.

For those publically trying out my project, please contact lagdameoangelo@gmail.com so that I can supervise you and give you the necessary API keys and connection credentials to the database accossiated to the artefact prototype.

### <ins>Startup Backend Server</ins>
Ensuring that your terminal is still pointing to the ```backend``` folder directory, run the following command:
```
uvicorn main:app --reload
```
To confirm the backend server is running, you should see the terminal outputting a series of messages and the last message output saying:
```
INFO:     Application startup complete.
```

## <ins>4. Frontend Setup</ins>
While keeping the terminal for backend server running, open a new terminal in the same VS Code window and enter the following command to navigate into the frontend where the project is located inside:
```
cd frontend/Opticart
```

### <ins>Installing Dependencies</ins>
Run the following command to read the ```package.json``` file and generate the ```node_modules``` folder:
```
npm install
```

### <ins>Environment Variables</ins>


### <ins>#. Server Startup</ins>
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