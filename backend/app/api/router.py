from fastapi import APIRouter
from backend.app.api.routes import auth, customers, dashboard, health, products, reports, sales, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboard.router)
api_router.include_router(products.router)
api_router.include_router(customers.router)
api_router.include_router(sales.router)
api_router.include_router(reports.router)
