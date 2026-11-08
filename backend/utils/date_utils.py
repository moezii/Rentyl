from datetime import date, datetime
from typing import Any, Dict, List, Union

def serialize_date(value: Any) -> Any:
    """
    Serialize a single date or datetime object to ISO format string.
    
    Args:
        value: Any value, will be converted to string if it's a date/datetime
        
    Returns:
        Serialized value or original value if it's not a date/datetime
    """
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value

def serialize_dates(data: Any) -> Any:
    """
    Recursively convert all date/datetime objects to ISO format strings in a 
    complex data structure (dict, list, etc).
    
    Args:
        data: Any data structure (dict, list, scalar, etc.)
        
    Returns:
        Data structure with all dates converted to strings
    """
    if isinstance(data, dict):
        return {key: serialize_dates(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_dates(item) for item in data]
    else:
        return serialize_date(data)

def parse_date(date_str: str) -> Union[date, None]:
    """
    Parse a date string in ISO format (YYYY-MM-DD) to a date object.
    
    Args:
        date_str: Date string in ISO format
        
    Returns:
        Date object or None if parsing fails
    """
    if not date_str:
        return None
        
    try:
        return date.fromisoformat(date_str)
    except (ValueError, TypeError):
        try:
            # Try to parse with datetime if date fails
            dt = datetime.fromisoformat(date_str.split('T')[0])
            return dt.date()
        except (ValueError, TypeError, IndexError):
            return None

def format_date(date_obj: Union[date, datetime, str, None], format_str: str = "%Y-%m-%d") -> str:
    """
    Format a date object or date string to a human-readable string.
    
    Args:
        date_obj: Date object, datetime object, or date string
        format_str: Format string as per datetime.strftime
        
    Returns:
        Formatted date string or empty string if conversion fails
    """
    if not date_obj:
        return ""
        
    # If it's a string, try to parse it first
    if isinstance(date_obj, str):
        date_obj = parse_date(date_obj)
        if not date_obj:
            return ""
    
    try:
        return date_obj.strftime(format_str)
    except (ValueError, TypeError, AttributeError):
        return "" 