from fastapi import APIRouter, HTTPException
from backend.utils.errors import server_error
from typing import Dict
import httpx
import json
from datetime import datetime, timedelta
import os

router = APIRouter()

# Currency codes with display names and country codes for fallback
SUPPORTED_CURRENCIES = {
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "🇺🇸", "countryCode": "US"},
    "EUR": {"name": "Euro", "symbol": "€", "flag": "🇪🇺", "countryCode": "EU"},
    "GBP": {"name": "British Pound", "symbol": "£", "flag": "🇬🇧", "countryCode": "GB"},
    "CAD": {"name": "Canadian Dollar", "symbol": "C$", "flag": "🇨🇦", "countryCode": "CA"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "flag": "🇦🇺", "countryCode": "AU"},
    "MYR": {"name": "Malaysian Ringgit", "symbol": "RM", "flag": "🇲🇾", "countryCode": "MY"},
    "AED": {"name": "UAE Dirham", "symbol": "د.إ", "flag": "🇦🇪", "countryCode": "AE"},
    "SAR": {"name": "Saudi Riyal", "symbol": "ر.س", "flag": "🇸🇦", "countryCode": "SA"},
    "KWD": {"name": "Kuwaiti Dinar", "symbol": "د.ك", "flag": "🇰🇼", "countryCode": "KW"},
    "QAR": {"name": "Qatari Riyal", "symbol": "ر.ق", "flag": "🇶🇦", "countryCode": "QA"},
    "BHD": {"name": "Bahraini Dinar", "symbol": "د.ب", "flag": "🇧🇭", "countryCode": "BH"},
    "OMR": {"name": "Omani Rial", "symbol": "ر.ع.", "flag": "🇴🇲", "countryCode": "OM"}
}

# Cache for exchange rates (simple in-memory cache)
exchange_rate_cache = {
    "rates": {},
    "last_updated": None,
    "cache_duration": timedelta(minutes=15)  # Cache for 15 minutes
}

async def fetch_exchange_rates() -> Dict[str, float]:
    """Fetch real-time exchange rates from a free API service"""
    try:
        # Using exchangerate-api.com (free tier allows 1500 requests/month)
        async with httpx.AsyncClient() as client:
            # Base currency is USD
            url = "https://api.exchangerate-api.com/v4/latest/USD"
            response = await client.get(url, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("rates", {})
            else:
                # Fallback rates if API fails
                return get_fallback_rates()
                
    except Exception as e:
        print(f"Error fetching exchange rates: {e}")
        return get_fallback_rates()

def get_fallback_rates() -> Dict[str, float]:
    """Fallback exchange rates if API is unavailable"""
    return {
        "USD": 1.0,
        "EUR": 0.92,
        "GBP": 0.79,
        "CAD": 1.36,
        "AUD": 1.52,
        "AED": 3.67,
        "SAR": 3.75,
        "KWD": 0.31,
        "QAR": 3.64,
        "BHD": 0.38,
        "OMR": 0.38,
        "MYR": 4.72
    }

async def get_cached_exchange_rates() -> Dict[str, float]:
    """Get exchange rates from cache or fetch new ones"""
    now = datetime.now()
    
    # Check if cache is valid
    if (exchange_rate_cache["last_updated"] is None or 
        now - exchange_rate_cache["last_updated"] > exchange_rate_cache["cache_duration"]):
        
        # Fetch new rates
        rates = await fetch_exchange_rates()
        exchange_rate_cache["rates"] = rates
        exchange_rate_cache["last_updated"] = now
        
    return exchange_rate_cache["rates"]

@router.get("/supported-currencies")
async def get_supported_currencies():
    """Get list of supported currencies with their details"""
    return {
        "currencies": SUPPORTED_CURRENCIES
    }

@router.get("/exchange-rates")
async def get_exchange_rates():
    """Get current exchange rates for all supported currencies"""
    try:
        rates = await get_cached_exchange_rates()
        
        # Filter rates to only include supported currencies
        filtered_rates = {}
        for currency_code in SUPPORTED_CURRENCIES.keys():
            if currency_code in rates:
                filtered_rates[currency_code] = rates[currency_code]
            elif currency_code == "USD":
                filtered_rates[currency_code] = 1.0  # Base currency
        
        return {
            "base_currency": "USD",
            "rates": filtered_rates,
            "last_updated": exchange_rate_cache["last_updated"].isoformat() if exchange_rate_cache["last_updated"] else None
        }
        
    except Exception as e:
        raise server_error(e, "Error fetching exchange rates")

@router.post("/convert")
async def convert_currency(
    amount: float,
    from_currency: str = "USD",
    to_currency: str = "USD"
):
    """Convert amount from one currency to another"""
    try:
        if from_currency not in SUPPORTED_CURRENCIES or to_currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail="Unsupported currency")
        
        if from_currency == to_currency:
            return {
                "original_amount": amount,
                "converted_amount": amount,
                "from_currency": from_currency,
                "to_currency": to_currency,
                "exchange_rate": 1.0
            }
        
        rates = await get_cached_exchange_rates()
        
        # Convert from base currency (USD) to target currency
        if from_currency == "USD":
            exchange_rate = rates.get(to_currency, 1.0)
            converted_amount = amount * exchange_rate
        elif to_currency == "USD":
            exchange_rate = 1.0 / rates.get(from_currency, 1.0)
            converted_amount = amount * exchange_rate
        else:
            # Convert via USD: from_currency -> USD -> to_currency
            usd_amount = amount / rates.get(from_currency, 1.0)
            exchange_rate = rates.get(to_currency, 1.0) / rates.get(from_currency, 1.0)
            converted_amount = usd_amount * rates.get(to_currency, 1.0)
        
        return {
            "original_amount": amount,
            "converted_amount": round(converted_amount, 2),
            "from_currency": from_currency,
            "to_currency": to_currency,
            "exchange_rate": round(exchange_rate, 4)
        }
        
    except Exception as e:
        raise server_error(e, "Error converting currency") 