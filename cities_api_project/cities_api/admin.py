from django.contrib.gis import admin

from .models import City


@admin.register(City)
class CityAdmin(admin.GISModelAdmin):
    list_display = ('name', 'country', 'region', 'population', 'is_capital')
    list_filter = ('country', 'is_capital')
    search_fields = ('name', 'country', 'region')
