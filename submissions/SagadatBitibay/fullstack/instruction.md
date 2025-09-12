# Quick Start

## Setup

1. **Backend:**
```bash
cd backend
npm install
npm run start:dev
```


2. **Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Default Login
- Email: `saga@gmail.com`
- Password: `admin123`

## URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Swagger: http://localhost:3001/swagger


## API Endpoints

### Public:
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `POST /auth/refresh` - Refresh tokens

### Protected:
- `POST /auth/logout` - Logout
- `GET /auth/profile` - Get profile
- `GET /api/*` - All telemetry endpoints
