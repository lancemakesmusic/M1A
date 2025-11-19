#!/usr/bin/env python3
"""
Backend Health Check Script
Verifies all dependencies and configuration
"""
import sys
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

print("Checking M1A Backend Setup...\n")

# Check Python version
print(f"[OK] Python: {sys.version.split()[0]}")

# Check required packages
required_packages = [
    "fastapi",
    "uvicorn",
    "pydantic",
    "stripe",
    "python-dotenv",
]

missing_packages = []
for package in required_packages:
    try:
        __import__(package.replace("-", "_"))
        print(f"[OK] {package}")
    except ImportError:
        print(f"[MISSING] {package} - MISSING")
        missing_packages.append(package)

if missing_packages:
    print(f"\n[WARN] Missing packages: {', '.join(missing_packages)}")
    print("   Run: pip install -r requirements.txt")
else:
    print("\n[OK] All required packages installed")

# Check environment variables
print("\nEnvironment Variables:")
env_vars = {
    "STRIPE_SECRET_KEY": "Stripe API key (optional for mock payments)",
    "API_PORT": "Backend port (default: 8001)",
    "API_HOST": "Backend host (default: 0.0.0.0)",
    "GOOGLE_APPLICATION_CREDENTIALS": "Firebase credentials (optional)",
}

for var, desc in env_vars.items():
    value = os.getenv(var)
    if value:
        if "SECRET" in var or "KEY" in var or "CREDENTIALS" in var:
            print(f"[OK] {var}: {'*' * 20} (set)")
        else:
            print(f"[OK] {var}: {value}")
    else:
        print(f"[WARN] {var}: Not set ({desc})")

# Check API files
print("\nAPI Files:")
api_files = [
    "api/main.py",
    "api/payments.py",
    "robust_api.py",
]

for file in api_files:
    if (PROJECT_ROOT / file).exists():
        print(f"[OK] {file}")
    else:
        print(f"[MISSING] {file} - MISSING")

# Check if we can import the app
print("\nAPI Import Test:")
try:
    from api.main import app
    print("[OK] api/main.py imports successfully")
except ImportError as e:
    print(f"[WARN] api/main.py import failed: {e}")
    try:
        from robust_api import app
        print("[OK] robust_api.py imports successfully (fallback)")
    except ImportError as e2:
        print(f"[ERROR] Both APIs failed to import: {e2}")

print("\n" + "="*50)
print("[OK] Backend check complete!")
if not missing_packages:
    print("Ready to start: python start_backend.py")
print("="*50)

