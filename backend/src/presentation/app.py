import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .controllers.route_controller import router as route_router
from .controllers.place_controller import router as place_router

app = FastAPI(title="Route Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def ip_restriction(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    allowed_raw = os.environ.get("ALLOWED_IPS", "").strip()
    if allowed_raw:
        forwarded = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
        if client_ip not in {ip.strip() for ip in allowed_raw.split(",") if ip.strip()}:
            return JSONResponse({"error": "Forbidden: IP not allowed"}, status_code=403)
    return await call_next(request)

app.include_router(route_router)
app.include_router(place_router)
