# M1Autoposter Multi-Platform Testing Guide

## Quick Start Testing

### 1. **Basic Functionality Test**
```bash
# Test core multi-platform functionality
python scripts/test_multi_platform_simple.py
```

### 2. **Database Initialization Test**
```bash
# Initialize multi-platform database
python scripts/setup_multi_platform.py --init-db
```

### 3. **Platform Capabilities Test**
```bash
# Test platform capabilities
python scripts/setup_multi_platform.py --list-platforms
```

## Step-by-Step Testing Process

### Step 1: Install Dependencies
```bash
# Install required packages
pip install -r requirements.txt
```

### Step 2: Initialize Multi-Platform Database
```bash
# Initialize the database schema
python scripts/setup_multi_platform.py --init-db
```

### Step 3: Test Platform Capabilities
```bash
# Test what platforms are available
python scripts/test_multi_platform_simple.py
```

### Step 4: Create Test Client (Optional)
```bash
# Create a test client with Instagram only
python scripts/setup_multi_platform.py --create-client "TestClient" --platforms instagram
```

### Step 5: Test Content Structure
```bash
# Create content directories
python scripts/setup_multi_platform.py --create-content-structure "TestClient"
```

## Advanced Testing

### Test Individual Components

#### 1. **Platform Abstraction Test**
```python
# Test platform poster creation
python -c "
from scripts.platform_abstraction import get_available_platforms, get_platform_capabilities
print('Available platforms:', get_available_platforms())
for platform in get_available_platforms():
    print(f'{platform}: {get_platform_capabilities(platform)}')
"
```

#### 2. **Database Operations Test**
```python
# Test database operations
python -c "
from scripts.db_multi_platform import init_multi_platform_db, get_platform_post_stats
init_multi_platform_db()
stats = get_platform_post_stats()
print('Database stats:', stats)
"
```

#### 3. **Multi-Platform Manager Test**
```python
# Test manager creation
python -c "
from scripts.multi_platform_manager import MultiPlatformManager, get_available_platforms
print('Available platforms:', get_available_platforms())
config = {'platforms': {'instagram': True}, 'IG_USERNAME': 'test', 'IG_PASSWORD': 'test'}
manager = MultiPlatformManager('test', config)
print('Manager created successfully')
"
```

## Testing with Real Content

### 1. **Create Test Content**
```bash
# Create a simple test image
python -c "
from PIL import Image
import os
img = Image.new('RGB', (100, 100), color='red')
os.makedirs('test_content', exist_ok=True)
img.save('test_content/test_image.jpg')
print('Test image created: test_content/test_image.jpg')
"
```

### 2. **Test Content Validation**
```python
# Test content validation
python -c "
from scripts.multi_platform_manager import MultiPlatformManager
config = {'platforms': {'instagram': True, 'twitter': True}}
manager = MultiPlatformManager('test', config)
results = manager.validate_content('test_content/test_image.jpg', 'photo')
print('Validation results:', results)
"
```

## API Testing

### 1. **Start API Server**
```bash
# Start the API server
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 2. **Test API Endpoints**
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test multi-platform endpoints
curl http://localhost:8000/api/v1/multi-platform/platforms
```

### 3. **Test with Browser**
Open your browser and go to:
- `http://localhost:8000/docs` - API documentation
- `http://localhost:8000/redoc` - Alternative API docs

## Production Testing

### 1. **Docker Testing**
```bash
# Build and test with Docker
docker-compose build
docker-compose up -d
docker-compose ps
```

### 2. **Health Monitoring**
```bash
# Check application health
python scripts/health_check.py
```

### 3. **Database Health**
```bash
# Check database status
python -c "
from scripts import db
conn = db._conn()
cursor = conn.execute('SELECT COUNT(*) FROM jobs')
print('Jobs in database:', cursor.fetchone()[0])
"
```

## Troubleshooting Tests

### Common Issues and Solutions

#### 1. **Import Errors**
```bash
# If you get import errors, check Python path
python -c "import sys; print('Python path:', sys.path)"
```

#### 2. **Database Errors**
```bash
# Check if database exists
ls -la data/autoposter.db
```

#### 3. **Platform API Errors**
```bash
# Test individual platform imports
python -c "
try:
    import instagrapi
    print('Instagram API available')
except ImportError:
    print('Instagram API not available - install with: pip install instagrapi')
"
```

## Test Results Interpretation

### Expected Results

#### ✅ **Successful Tests**
- Platform capabilities loaded
- Database initialized
- Multi-platform manager created
- API endpoints responding

#### ⚠️ **Expected Warnings**
- Instagram API not available (if instagrapi not installed)
- Platform authentication failures (without real credentials)
- Missing platform credentials (normal for testing)

#### ❌ **Actual Errors**
- Import errors (missing dependencies)
- Database connection errors
- File permission errors

## Performance Testing

### 1. **Load Testing**
```python
# Test concurrent posting
import asyncio
from scripts.multi_platform_manager import MultiPlatformManager

async def test_concurrent_posting():
    config = {'platforms': {'instagram': True, 'twitter': True}}
    manager = MultiPlatformManager('test', config)
    
    # Test multiple concurrent posts
    tasks = []
    for i in range(5):
        task = manager.post_to_platforms(
            f'test_content/test_image.jpg',
            'photo',
            f'Test post {i}',
            ['instagram', 'twitter']
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    print(f'Completed {len(results)} concurrent posts')

# Run test
asyncio.run(test_concurrent_posting())
```

### 2. **Database Performance**
```python
# Test database performance
import time
from scripts.db_multi_platform import get_platform_post_stats

start_time = time.time()
for i in range(100):
    stats = get_platform_post_stats()
end_time = time.time()

print(f'100 database queries took: {end_time - start_time:.2f} seconds')
```

## Continuous Testing

### 1. **Automated Test Suite**
```bash
# Create automated test script
cat > run_tests.sh << 'EOF'
#!/bin/bash
echo "Running M1Autoposter tests..."

# Test 1: Basic functionality
echo "Test 1: Basic functionality"
python scripts/test_multi_platform_simple.py

# Test 2: Database operations
echo "Test 2: Database operations"
python -c "from scripts.db_multi_platform import init_multi_platform_db; init_multi_platform_db(); print('Database OK')"

# Test 3: API health
echo "Test 3: API health"
python scripts/health_check.py

echo "All tests completed!"
EOF

chmod +x run_tests.sh
./run_tests.sh
```

### 2. **Monitoring Tests**
```bash
# Monitor system health
watch -n 5 'python scripts/health_check.py'
```

## Test Data Cleanup

### 1. **Clean Test Data**
```bash
# Remove test files
rm -rf test_content/
rm -rf config/clients/TestClient/
```

### 2. **Reset Database**
```bash
# Reset database (WARNING: This deletes all data)
rm data/autoposter.db*
python scripts/db_multi_platform.py
```

## Success Criteria

### ✅ **Tests Should Pass**
1. Platform capabilities loaded (6 platforms)
2. Database initialized successfully
3. Multi-platform manager created
4. API endpoints responding
5. Content validation working
6. Error handling functional

### 📊 **Performance Benchmarks**
- Database queries: < 100ms
- Platform initialization: < 5 seconds
- Content validation: < 1 second
- API response time: < 200ms

### 🔧 **System Requirements**
- Python 3.11+
- SQLite database
- Required Python packages installed
- File system write permissions
- Network access (for API testing)

## Next Steps After Testing

1. **Configure Real Credentials**: Add actual social media API credentials
2. **Create Production Client**: Set up real client configurations
3. **Deploy to Production**: Use Docker or direct deployment
4. **Monitor Performance**: Set up logging and monitoring
5. **Scale Testing**: Test with multiple clients and high volume

## Support

If you encounter issues during testing:

1. **Check Dependencies**: Ensure all packages are installed
2. **Verify Permissions**: Check file and directory permissions
3. **Review Logs**: Check error messages and logs
4. **Test Components**: Test individual components separately
5. **Document Issues**: Note specific error messages and steps to reproduce

The testing process validates that the multi-platform system is working correctly and ready for production use!
