import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import render

from .models import City

CONDITIONS_URL = "https://data.api.xweather.com/conditions/closest"
FORECAST_URL = "https://data.api.xweather.com/forecasts/closest"
CACHE_SECONDS = 600


def map_view(request):
    """Render the main map page."""
    return render(request, 'weathermap/map.html')


def get_cities_json(request):
    """Return all cities as JSON."""
    cities = City.objects.all().values('id', 'name', 'country', 'latitude', 'longitude')
    return JsonResponse(list(cities), safe=False)


def get_weather(request, city_id):
    """Fetch current weather for a city. The XWeather secret stays on the server."""
    city, error = _get_city(city_id)
    if error:
        return error

    cache_key = f'weather_{city_id}'
    cached_data = cache.get(cache_key)
    if cached_data:
        return JsonResponse(cached_data)

    params, error = _credential_params(city)
    if error:
        return error

    try:
        weather_data = _fetch_json(CONDITIONS_URL, params)
        period = weather_data['response'][0]['periods'][0]
        result = {
            'city': city.name,
            'country': city.country,
            'temperature': period.get('tempC'),
            'feels_like': period.get('feelslikeC'),
            'humidity': period.get('humidity'),
            'pressure': period.get('pressureMB'),
            'wind_speed': period.get('windSpeedMPS'),
            'description': period.get('weather'),
            'icon': period.get('icon'),
        }
    except requests.exceptions.RequestException as exc:
        return _request_error(exc)
    except (KeyError, IndexError, TypeError):
        return JsonResponse({'error': 'Unexpected response format from XWeather'}, status=502)

    cache.set(cache_key, result, CACHE_SECONDS)
    return JsonResponse(result)


def get_forecast(request, city_id):
    """Return the next three daily forecast periods for a city."""
    city, error = _get_city(city_id)
    if error:
        return error

    cache_key = f'forecast_{city_id}'
    cached_data = cache.get(cache_key)
    if cached_data:
        return JsonResponse(cached_data)

    params, error = _credential_params(city)
    if error:
        return error
    params['filter'] = 'day'
    params['plimit'] = 3

    try:
        forecast_data = _fetch_json(FORECAST_URL, params)
        periods = forecast_data['response'][0]['periods'][:3]
        days = [_forecast_day(period) for period in periods]
        if not days:
            raise IndexError('No forecast periods')
        result = {
            'city': city.name,
            'country': city.country,
            'days': days,
        }
    except requests.exceptions.RequestException as exc:
        return _request_error(exc)
    except (KeyError, IndexError, TypeError):
        return JsonResponse({'error': 'Unexpected response format from XWeather'}, status=502)

    cache.set(cache_key, result, CACHE_SECONDS)
    return JsonResponse(result)


def _get_city(city_id):
    try:
        return City.objects.get(id=city_id), None
    except City.DoesNotExist:
        return None, JsonResponse({'error': 'City not found'}, status=404)


def _credential_params(city):
    client_id = getattr(settings, 'XWEATHER_CLIENT_ID', None)
    client_secret = getattr(settings, 'XWEATHER_CLIENT_SECRET', None)
    if not client_id or not client_secret:
        return None, JsonResponse(
            {'error': 'XWeather API credentials (XWEATHER_CLIENT_ID and XWEATHER_CLIENT_SECRET) are not configured'},
            status=503,
        )
    return {
        'p': f"{city.latitude},{city.longitude}",
        'client_id': client_id,
        'client_secret': client_secret,
        'units': 'metric',
    }, None


def _fetch_json(url, params):
    response = requests.get(url, params=params, timeout=5)
    response.raise_for_status()
    return response.json()


def _request_error(exc):
    # Never return str(exc): an HTTP error includes the request URL and the secret.
    if isinstance(exc, requests.exceptions.HTTPError):
        status = exc.response.status_code if exc.response is not None else None
        if status == 401:
            message = 'XWeather rejected the API credentials'
        else:
            message = f'XWeather returned HTTP {status}'
        return JsonResponse({'error': message}, status=502)
    return JsonResponse({'error': 'Could not get a response from XWeather'}, status=502)


def _forecast_day(period):
    return {
        'date': period.get('dateTimeISO'),
        'max_temp': period.get('maxTempC'),
        'min_temp': period.get('minTempC'),
        'humidity': period.get('humidity'),
        'wind_speed': period.get('windSpeedMPS') or period.get('windSpeedMaxMPS'),
        'description': period.get('weather') or period.get('weatherPrimary'),
        'icon': period.get('icon'),
    }
