#!/usr/bin/env python3
"""
Backend Setup Script
Verifies and sets up the backend environment
"""
import os
import sys
from pathlib import Path

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("[X] Python 3.8+ required")
        return False
    print(f"[OK] Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_dependencies():
    """Check required packages"""
    required = ['fastapi', 'uvicorn', 'stripe', 'pydantic']
    missing = []
    
    for package in required:
        try:
            __import__(package)
            print(f"[OK] {package}")
        except ImportError:
            print(f"[X] {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n[!] Missing packages: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
        return False
    return True

def check_env_vars():
    """Check environment variables"""
    print("\nEnvironment Variables:")
    
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
    if stripe_key:
        print(f"[OK] STRIPE_SECRET_KEY: {'*' * 20}...{stripe_key[-4:]}")
    else:
        print("[!] STRIPE_SECRET_KEY: Not set (will use mock payments)")
    
    api_port = os.getenv("API_PORT", "8001")
    print(f"[OK] API_PORT: {api_port}")
    
    api_host = os.getenv("API_HOST", "0.0.0.0")
    print(f"[OK] API_HOST: {api_host}")
    
    firebase_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if firebase_creds:
        print(f"[OK] GOOGLE_APPLICATION_CREDENTIALS: Set")
    else:
        print("[!] GOOGLE_APPLICATION_CREDENTIALS: Not set (Firebase will use mock)")
    
    return True

def check_api_files():
    """Check API files exist"""
    print("\nAPI Files:")
    files = [
        "api/main.py",
        "api/payments.py",
        "robust_api.py",
        "start_backend.py"
    ]
    
    all_exist = True
    for file in files:
        path = Path(file)
        if path.exists():
            print(f"[OK] {file}")
        else:
            print(f"[X] {file} - MISSING")
            all_exist = False
    
    return all_exist

def main():
    print("M1A Backend Setup Check\n")
    print("=" * 50)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment Variables", check_env_vars),
        ("API Files", check_api_files),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n{name}:")
        print("-" * 50)
        result = check_func()
        results.append((name, result))
    
    print("\n" + "=" * 50)
    print("\nSummary:")
    
    all_passed = True
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} - {name}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\n[OK] All checks passed! Backend is ready to start.")
        print("\nTo start the backend:")
        print("  python start_backend.py")
        return 0
    else:
        print("\n[!] Some checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

