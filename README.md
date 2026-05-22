# NeuroPath 🧠

A web‑based AI‑driven system to assist Special Education (SPED) teachers in creating and implementing Individualized Education Plans (IEPs) for learners with Autism Spectrum Disorder (ASD).

## 🛠️ Prerequisites
Before you start, make sure you have the following installed on your machine:
* Python 3.11+
* Node.js (LTS version)
* Git

---

## 🚀 Local Setup Instructions

### Step 1: Clone the Repository
Open your terminal and clone this project to your local machine:

git clone [YOUR_GITHUB_REPO_LINK_HERE]
cd neuropath-system

### Step 2: Backend Setup (Django)
Open a terminal and set up the Python environment:

1. Navigate to the backend folder:
cd neuropath-backend

2. Create and activate a virtual environment:
Windows:
python -m venv venv
venv\Scripts\activate

Mac/Linux:
python3 -m venv venv
source venv/bin/activate

3. Install the required Python packages:
pip install -r requirements.txt

4. Set up the Environment Variables:
* Create a file named exactly .env inside the neuropath-backend folder.
* Ask the lead developer (Zyla) for the database connection string.
* Paste the string inside the .env file. (Note: DO NOT push this file to GitHub!)

5. Run the database migrations and start the server:
python manage.py migrate
python manage.py runserver

(The backend is now running on http://localhost:8000)

### Step 3: Frontend Setup (React/Vite & Tailwind)
Open a second, separate terminal (keep the Django server running in the first one):

1. Navigate to the frontend folder:
cd neuropath-frontend

2. Install the Node dependencies:
npm install

3. Start the frontend development server:
npm run dev

(The frontend is now running on http://localhost:5173)

---

## ⚠️ Important Rules for the Team
* NEVER upload the .env file to GitHub. It contains sensitive database passwords.
* Always make sure your virtual environment (venv) is active before running any python manage.py commands.
* If someone adds a new Python library, they must run "pip freeze > requirements.txt" and push the updated text file. You will then need to run "pip install -r requirements.txt" to get their updates.
* If someone adds a new Node package, you will need to run "npm install" again after pulling their code.
