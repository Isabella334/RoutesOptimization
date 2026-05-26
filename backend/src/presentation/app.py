from fastapi import FastAPI
from .controllers.route_controller import router

app = FastAPI(title="Route Optimizer API")
app.include_router(router)
