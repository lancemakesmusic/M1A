# M1A Backend Startup Guide

## Quick Start

### 1. Activate Virtual Environment (if using one)
```bash
# Windows
.venv\Scripts\activate

# Or if using the project venv
cd C:\Users\admin\M1A
.venv\Scripts\activate
```

### 2. Check Backend Setup
```bash
cd autoposter-backend
python check_backend.py
```

This will verify:
- ✅ Python version
- ✅ Required packages
- ✅ Environment variables
- ✅ API files
- ✅ Import tests

### 3. Start the Backend
```bash
python start_backend.py
```

The backend will start on:
- **Server**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs
- **Payments Health**: http://localhost:8001/api/payments/health

## Environment Variables

Create a `.env` file in `autoposter-backend/` or set these in your system:

```env
# Stripe (optional - will use mock payments if not set)
STRIPE_SECRET_KEY=sk_test_...

# Backend Configuration
API_PORT=8001
API_HOST=0.0.0.0

# Firebase (optional)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

## Features

### Payment API
- `/api/payments/create-intent` - Create Stripe payment intent
- `/api/payments/confirm` - Confirm payment
- `/api/payments/health` - Check payment service status

### AutoPoster API
- `/api/v1/status` - System status
- `/api/v1/clients` - List/create clients
- `/api/v1/queue` - Manage posting queue

## Troubleshooting

### Missing Packages
```bash
pip install -r requirements.txt
```

### Port Already in Use
Change the port:
```bash
set API_PORT=8002
python start_backend.py
```

### Import Errors
Make sure you're in the `autoposter-backend` directory and all dependencies are installed.

## Testing

Test the backend is running:
```bash
curl http://localhost:8001/api/payments/health
```

Or visit in browser:
- http://localhost:8001/docs - Interactive API documentation

