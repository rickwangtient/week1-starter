# Week 6 reflection: real-time weather map

## Architecture

1. The browser loads `http://localhost:8000/`, which is the Django `web` container. The page includes Leaflet from a CDN and this app's CSS and JavaScript.
2. `map.js` requests `/api/cities/`. Django reads the `City` rows from the PostGIS container (`db`) and returns JSON. The browser draws one marker per city.
3. A click, or a search selection, sends `/api/weather/<id>/` and `/api/forecast/<id>/` to Django.
4. The `web` container looks up the city coordinates, adds `XWEATHER_CLIENT_ID` and `XWEATHER_CLIENT_SECRET`, and calls `https://data.api.xweather.com`. The browser never makes that outbound request and never sees the credentials.
5. Django returns a small JSON document. The popup renders current conditions and a 3-day forecast. The unit toggle converts Celsius to Fahrenheit in the browser only.

## Security

The API credentials exist in `.env` on the host and in the `web` container environment. They are not in source code, HTML, JavaScript, or API responses. `.env` is gitignored. `.env.example` documents the names with placeholders.

Failed XWeather calls return a fixed sentence. `str(exception)` is not returned, because `requests` puts the full URL, including `client_secret`, in that text.

Further measures: HTTPS in front of Django, a short-lived proxy token instead of long-lived credentials, rate limiting on `/api/weather/`, and not running with `DEBUG=True` outside this lab.

## Performance

Each new city click can make two external HTTP calls. With 1000 cities the marker layer and the cities JSON would get heavy, and uncached clicks would queue requests to XWeather. Caching successful responses for 10 minutes removes repeat calls for the same city. Marker clustering, a bounding-box cities endpoint, and a shared cache would be the next steps. The current `LocMemCache` is emptied when the container restarts and is not shared by multiple web processes.

## Error handling

Handled cases: unknown city (404), missing credentials (503), HTTP errors including a rejected key (502, no secret in the body), timeouts and connection errors (502), and a JSON shape that is not the expected `response[0].periods` structure (502). The browser shows that message in the marker popup.

Not handled as a separate case: XWeather returning `success: false` with an empty `response` still becomes the unexpected-format 502. A quota or rate-limit message from XWeather could be mapped to its own status later.

## Scalability

User accounts would be Django's auth models, already installed because of the admin. Favourite cities would be a table linking a user to `City`. Historical weather would be a new model written when a live response is fetched, then charted from the database instead of from XWeather. Several web containers would need Redis (or another shared cache) in `compose.yaml`, because `LocMemCache` is private to one process.

## Deployment

Replace `runserver` with Gunicorn, stop mounting the source directory, and set `DEBUG` false. Collect static files in the image and serve them with WhiteNoise or a web server. Pass secrets from the host environment or a secret store, not from a copied `.env` inside the image. Add a Redis service and point `CACHES` at it so cached weather survives a web-container restart.
