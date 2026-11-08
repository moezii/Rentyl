from backend.services.car_service import (
    create_car_service,
    get_all_cars_service,
    get_car_by_id_service,
    update_car_service,
    delete_car_service
)
from backend.models.car import CarCreate
from typing import Optional
from fastapi import HTTPException, Depends
from backend.utils.errors import server_error
from backend.dependencies import get_current_user_with_company
from backend.utils.aes_utils import encrypt_id
import logging

logger = logging.getLogger(__name__)

class CarController:
    @staticmethod
    async def get_all_cars(user_context: dict):
        try:
            cars = await get_all_cars_service(user_context["company_id"])
            for car in cars:
                if 'car_id' in car:
                    # Store both for compatibility
                    car_id = car['car_id']
                    car['encrypted_car_id'] = encrypt_id(car_id)
                    car['car_id'] = car_id  # Keep as integer
            return cars
        except Exception as e:
            raise server_error(e)

    @staticmethod
    async def get_car_by_id(car_id: int, user_context: dict):
        try:
            car = await get_car_by_id_service(car_id, user_context["company_id"])
            if car and 'car_id' in car:
                car['encrypted_car_id'] = encrypt_id(car['car_id'])
                # Keep car_id for internal use
            return car
        except Exception as e:
            raise server_error(e)

    @staticmethod
    async def create_car(car_data: CarCreate, image, user_context: dict, weekly_rate: Optional[float] = None, monthly_rate: Optional[float] = None):
        try:
            return await create_car_service(car_data, image, user_context["company_id"], weekly_rate, monthly_rate)
        except Exception as e:
            raise server_error(e)

    @staticmethod
    async def update_car(car_id: int, car_data: dict, image, user_context: dict):
        try:
            logger.debug("update_car: car_id=%s, image provided=%s", car_id, image is not None)
            
            result = await update_car_service(car_id, car_data, image, user_context["company_id"])
            if result and 'car_id' in result:
                result['encrypted_car_id'] = encrypt_id(result['car_id'])
                # Keep car_id for internal use
            return result
        except Exception as e:
            print(f"Error in controller: {str(e)}")
            raise server_error(e)

    @staticmethod
    async def delete_car(car_id: str, user_context: dict):
        try:
            return await delete_car_service(car_id, user_context["company_id"])
        except Exception as e:
            raise server_error(e) 