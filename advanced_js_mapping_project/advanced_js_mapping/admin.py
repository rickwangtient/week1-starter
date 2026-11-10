from django.contrib import admin

from .models import AdvancedCity, PolygonAnalysis, SearchSession


@admin.register(AdvancedCity)
class AdvancedCityAdmin(admin.ModelAdmin):
    list_display = ("name", "country", "population", "city_type", "gdp_per_capita")
    list_filter = ("country", "city_type")
    search_fields = ("name", "country")


@admin.register(PolygonAnalysis)
class PolygonAnalysisAdmin(admin.ModelAdmin):
    list_display = ("analysis_timestamp", "cities_count", "total_population", "query_duration_ms")
    readonly_fields = ("analysis_timestamp",)


@admin.register(SearchSession)
class SearchSessionAdmin(admin.ModelAdmin):
    list_display = ("session_id", "total_analyses", "total_cities_found", "start_timestamp")
