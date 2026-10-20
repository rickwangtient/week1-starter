# dashboard/views.py
from django.db.models import Avg, Count, Max, Min, Sum
from django.shortcuts import render

from cities.models import City
from regions.models import Region


def index(request):
    """Main dashboard view"""
    context = {
        'total_cities': City.objects.count(),
        'total_regions': Region.objects.count(),
        'countries': City.objects.values_list('country', flat=True).distinct().order_by('country'),
        'region_types': Region.objects.values_list('region_type', flat=True).distinct(),
        'city_types': [choice[0] for choice in City._meta.get_field('city_type').choices],
    }
    return render(request, 'dashboard/index.html', context)


def analytics(request):
    """Analytics page with detailed statistics"""
    city_queryset = City.objects.all()
    # Put your code here in analytics view that will aggregately calculate 
    # total_cities, total_population, min_population, max_population, avg_area
    # fill in the '...' with the respective ORM query
    city_stats = {
        'total_cities':...,
        'total_population': ... ,
        'avg_population': ... ,
        'max_population': ... ,
        'min_population': ... ,
        'avg_area': ... ,
    }

    region_queryset = Region.objects.all()
    region_stats = {
        # Put your code here in analytics view that will aggregately calculate 
        # total_regions, total_population, avg_population, min_population, max_population, avg_)area, avg_gdp_per_capita
        # fill in the '...' with the respective ORM query
        'total_regions':  ...,
        'total_population': ..., 
        'avg_population': ..., 
        'max_population': ...,
        'min_population': ...,
        'avg_area': ...,
        'avg_gdp_per_capita': ...,
    }

    context = {
        'city_stats': city_stats,
        'region_stats': region_stats,
    }
    return render(request, 'dashboard/analytics.html', context)