import uvicorn
import robust_api

if __name__ == '__main__':
    # Run the FastAPI app programmatically to avoid shell/uvicorn path issues
    uvicorn.run(robust_api.app, host='127.0.0.1', port=8001)
