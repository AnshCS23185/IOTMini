from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .sites import router as sites_router
from .sites import org_router
from .panels import router as panels_router
from .iot import router as iot_router
from .weather import router as weather_router
from .performance import router as performance_router
from .diagnostics import router as diagnostics_router
from .control import router as control_router
from .solar_insights import router as solar_insights_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(org_router)
api_router.include_router(sites_router)
api_router.include_router(panels_router)
api_router.include_router(iot_router)
api_router.include_router(weather_router)
api_router.include_router(performance_router)
api_router.include_router(diagnostics_router)
api_router.include_router(control_router)
api_router.include_router(solar_insights_router)
