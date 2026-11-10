document.addEventListener('DOMContentLoaded', function () {
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        alert('Error: Leaflet mapping library not loaded. Please check your internet connection.');
        return;
    }

    const CITIES_URL = '/api/cities/';
    const weatherUrl = (cityId) => `/api/weather/${cityId}/`;
    const forecastUrl = (cityId) => `/api/forecast/${cityId}/`;

    const map = L.map('map').setView([30, 10], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    const markers = {};
    let cities = [];
    let useFahrenheit = false;

    const cityIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background-color: #667eea;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            cursor: pointer;
        "></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[character]));
    }

    function formatTemp(celsius) {
        const number = Number(celsius);
        if (!Number.isFinite(number)) {
            return 'n/a';
        }
        const value = useFahrenheit ? (number * 9 / 5) + 32 : number;
        return `${value.toFixed(1)}°${useFahrenheit ? 'F' : 'C'}`;
    }

    function temperatureAlert(celsius) {
        const number = Number(celsius);
        if (!Number.isFinite(number)) {
            return '';
        }
        if (number < 0) {
            return '<div class="weather-alert">Cold alert: temperature is below 0°C.</div>';
        }
        if (number > 35) {
            return '<div class="weather-alert">Heat alert: temperature is above 35°C.</div>';
        }
        return '';
    }

    async function loadCities() {
        try {
            const response = await fetch(CITIES_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch cities (HTTP ${response.status})`);
            }
            cities = await response.json();
            if (cities.length === 0) {
                showMapMessage('No cities found. Run: docker compose run --rm web python manage.py populate_cities');
                return;
            }
            cities.forEach(addCityMarker);
        } catch (error) {
            console.error('Error loading cities:', error);
            showMapMessage(`Failed to load cities: ${error.message}`);
        }
    }

    function showMapMessage(message) {
        L.popup()
            .setLatLng(map.getCenter())
            .setContent(`<div class="error-message">${escapeHtml(message)}</div>`)
            .openOn(map);
    }

    function addCityMarker(city) {
        const marker = L.marker([city.latitude, city.longitude], {
            icon: cityIcon,
            title: `${city.name}, ${city.country}`
        }).addTo(map);
        marker.on('click', () => openCity(city));
        markers[city.id] = marker;
    }

    async function openCity(city) {
        const marker = markers[city.id];
        showLoading();
        try {
            const [weatherResponse, forecastResponse] = await Promise.all([
                fetch(weatherUrl(city.id)),
                fetch(forecastUrl(city.id)),
            ]);
            const weather = await weatherResponse.json().catch(() => ({}));
            const forecast = await forecastResponse.json().catch(() => ({}));
            if (!weatherResponse.ok) {
                throw new Error(weather.error || `Request failed (HTTP ${weatherResponse.status})`);
            }
            marker.weatherData = weather;
            marker.forecastData = forecastResponse.ok ? forecast : { error: forecast.error || 'Forecast unavailable' };
            displayWeatherPopup(marker);
            map.setView([city.latitude, city.longitude], 5);
        } catch (error) {
            console.error('Error fetching weather:', error);
            displayErrorPopup(marker, error.message);
        } finally {
            hideLoading();
        }
    }

    function displayWeatherPopup(marker) {
        const data = marker.weatherData;
        const iconUrl = data.icon
            ? `https://cdn.aerisapi.com/wxblox/icons/${encodeURIComponent(data.icon)}`
            : '';
        const description = escapeHtml(data.description);
        const forecastPanel = renderForecast(marker.forecastData);

        const popupContent = `
            <div class="weather-popup">
                <h3>${escapeHtml(data.city)}, ${escapeHtml(data.country)}</h3>
                <div class="popup-tabs">
                    <button type="button" class="is-active" data-tab="current">Current</button>
                    <button type="button" data-tab="forecast">Forecast</button>
                </div>
                <div data-panel="current">
                    <div class="weather-icon-container">
                        ${iconUrl ? `<img src="${iconUrl}" alt="${description}">` : ''}
                        <div class="weather-description">${description}</div>
                    </div>
                    <div class="weather-info">
                        ${weatherItem('Temperature', formatTemp(data.temperature))}
                        ${weatherItem('Feels Like', formatTemp(data.feels_like))}
                        ${weatherItem('Humidity', `${Number(data.humidity)}%`)}
                        ${weatherItem('Wind Speed', `${Number(data.wind_speed)} m/s`)}
                        ${weatherItem('Pressure', `${Number(data.pressure)} hPa`)}
                    </div>
                    ${temperatureAlert(data.temperature)}
                </div>
                <div data-panel="forecast" hidden>${forecastPanel}</div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 340,
            className: 'weather-popup-container'
        }).openPopup();

        const popupElement = marker.getPopup().getElement();
        popupElement.querySelectorAll('[data-tab]').forEach((button) => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                popupElement.querySelectorAll('[data-tab]').forEach((item) => {
                    item.classList.toggle('is-active', item === button);
                });
                popupElement.querySelector('[data-panel="current"]').hidden = tab !== 'current';
                popupElement.querySelector('[data-panel="forecast"]').hidden = tab !== 'forecast';
            });
        });
    }

    function weatherItem(label, value) {
        return `
            <div class="weather-item">
                <div>
                    <strong>${label}</strong>
                    <span>${escapeHtml(value)}</span>
                </div>
            </div>
        `;
    }

    function renderForecast(forecast) {
        if (!forecast || forecast.error) {
            return `<div class="error-message">${escapeHtml(forecast?.error || 'Forecast unavailable')}</div>`;
        }
        return forecast.days.map((day) => `
            <div class="forecast-day">
                <strong>${escapeHtml(day.date || '')}</strong>
                <div>${escapeHtml(day.description || '')}</div>
                <div>${formatTemp(day.min_temp)} – ${formatTemp(day.max_temp)}</div>
            </div>
        `).join('');
    }

    function displayErrorPopup(marker, errorMessage = 'Unknown error') {
        const errorContent = `
            <div class="weather-popup">
                <h3>Error</h3>
                <div class="error-message">
                    Unable to fetch weather data: ${escapeHtml(errorMessage)}
                    <br><br>
                    Please try again later.
                </div>
            </div>
        `;
        marker.bindPopup(errorContent).openPopup();
    }

    function setupSearch() {
        const input = document.getElementById('city-search');
        const results = document.getElementById('search-results');
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            if (!query) {
                results.hidden = true;
                results.innerHTML = '';
                return;
            }
            const matches = cities.filter((city) =>
                city.name.toLowerCase().includes(query) ||
                city.country.toLowerCase().includes(query)
            ).slice(0, 8);
            results.innerHTML = matches.map((city) =>
                `<button type="button" data-city-id="${city.id}">${escapeHtml(city.name)}, ${escapeHtml(city.country)}</button>`
            ).join('');
            results.hidden = matches.length === 0;
            results.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => {
                    const city = cities.find((item) => String(item.id) === button.dataset.cityId);
                    results.hidden = true;
                    input.value = city.name;
                    openCity(city);
                });
            });
        });
    }

    function setupUnitToggle() {
        const button = document.getElementById('unit-toggle');
        button.addEventListener('click', () => {
            useFahrenheit = !useFahrenheit;
            button.textContent = useFahrenheit ? 'Show °C' : 'Show °F';
            button.setAttribute('aria-pressed', String(useFahrenheit));
            Object.values(markers).forEach((marker) => {
                if (marker.isPopupOpen() && marker.weatherData) {
                    displayWeatherPopup(marker);
                }
            });
        });
    }

    function showLoading() {
        document.getElementById('loading')?.classList.add('active');
    }

    function hideLoading() {
        document.getElementById('loading')?.classList.remove('active');
    }

    setupSearch();
    setupUnitToggle();
    loadCities();
    window.debugMap = { map, markers, loadCities };
});
