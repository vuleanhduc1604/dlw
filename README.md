# dlw

## Frontend (Vite + React)

Run from project root:

```powershell
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Backend (FastAPI)

Run from project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Backend URLs:
- API root: `http://127.0.0.1:8000/`
- Health check: `http://127.0.0.1:8000/health`
- Docs: `http://127.0.0.1:8000/docs`

## Run frontend + backend together

Open two terminals:

1. Terminal A (frontend)
```powershell
npm run dev
```

2. Terminal B (backend)
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
