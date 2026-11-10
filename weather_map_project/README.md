# Real-Time Weather Map

Interactive Leaflet map of major world cities. Clicking a marker shows the current temperature, humidity, wind, and conditions, plus a 3-day forecast. The browser never calls XWeather directly. Django adds the API credentials on the server and returns a safe JSON response.

## Setup

Docker Desktop must be running. From this folder:

```bash
cp .env.example .env
```

Edit `.env` and set the database password, Django secret, and your XWeather credentials:

```text
XWEATHER_CLIENT_ID=your-client-id
XWEATHER_CLIENT_SECRET=your-client-secret
```

A new XWeather key can take from a few minutes to a couple of hours to become active. Get one from the XWeather dashboard.

Then build and load the sample cities:

```bash
docker compose build
docker compose up -d db pgadmin
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py populate_cities
docker compose up -d web
```

Open http://localhost:8000/. pgAdmin is at http://localhost:5051 because port 5050 was already in use on this machine.

Create an admin user with:

```bash
docker compose run --rm web python manage.py createsuperuser
```

Run the tests with:

```bash
docker compose run --rm web python manage.py test weathermap
```

Stop the stack without deleting the database:

```bash
docker compose down
```

## API keys

`XWEATHER_CLIENT_ID` and `XWEATHER_CLIENT_SECRET` live only in `.env`. Compose passes them into the `web` container as environment variables, and `weathermap_config/settings.py` reads them with `os.environ`. `.env` is listed in `.gitignore`. `.env.example` has the same variable names with placeholders and is safe to commit.

The map JavaScript calls `/api/weather/<id>/` and `/api/forecast/<id>/`. Those views add the secret and call `https://data.api.xweather.com`. Error responses use fixed messages, so a rejected key is not copied into the JSON sent to the browser.

## Features

- Leaflet map with city markers loaded from `/api/cities/`
- Current weather popup (temperature, feels-like, humidity, wind, pressure)
- 3-day forecast tab
- 10-minute cache of successful weather and forecast responses
- City search that zooms to the selected marker
- Celsius/Fahrenheit toggle in the browser (the server stays on metric units)
- Cold and heat alerts below 0°C and above 35°C
- Django admin for adding cities

## Technologies

- Docker Compose: Django (`web`), PostGIS (`db`), pgAdmin
- Django 5, GeoDjango, the Python `requests` library
- Leaflet 1.9 and OpenStreetMap tiles
- XWeather conditions and daily forecast endpoints
- Django's local-memory cache

## Challenges

The Week 5 Compose file started Gunicorn with the old `hello_map` project and did not pass an API key. This project serves the new `weathermap` app with `runserver`, runs migrations on startup, and passes `XWEATHER_CLIENT_ID` and `XWEATHER_CLIENT_SECRET` into the container. Django's default referrer policy would strip the header OpenStreetMap needs, so `SECURE_REFERRER_POLICY` is set to `strict-origin-when-cross-origin`.

## Future improvements

A shared Redis cache would keep weather data if several web containers were running. User accounts, saved cities, and stored historical observations would be the next product features. A production deploy would replace `runserver` with Gunicorn and stop mounting the source tree into the container.
