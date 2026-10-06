from datetime import date

from django.contrib.gis.db import models
from django.contrib.gis.geos import Polygon
from django.contrib.gis.measure import D


class CityQuerySet(models.QuerySet):
    def within_radius(self, point, radius_km):
        return self.filter(location__distance_lte=(point, D(km=radius_km)))

    def in_bounding_box(self, bbox):
        """bbox is (min_longitude, min_latitude, max_longitude, max_latitude)."""
        return self.filter(location__within=Polygon.from_bbox(bbox))


class City(models.Model):
    name = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    region = models.CharField(max_length=100, blank=True)
    population = models.PositiveIntegerField()
    location = models.PointField(srid=4326)
    founded_year = models.IntegerField(null=True, blank=True)
    is_capital = models.BooleanField(default=False)
    timezone = models.CharField(max_length=50, blank=True)
    elevation_m = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CityQuerySet.as_manager()

    class Meta:
        verbose_name_plural = 'cities'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['name', 'country'], name='unique_city_per_country'),
        ]

    def __str__(self):
        return f'{self.name}, {self.country}'

    @property
    def latitude(self):
        return self.location.y if self.location else None

    @property
    def longitude(self):
        return self.location.x if self.location else None

    @property
    def coordinates(self):
        """[longitude, latitude], matching GeoJSON order."""
        return [self.longitude, self.latitude] if self.location else None

    @property
    def population_category(self):
        if self.population >= 10_000_000:
            return 'Megacity'
        if self.population >= 1_000_000:
            return 'Large'
        if self.population >= 100_000:
            return 'Medium'
        return 'Small'

    @property
    def age_years(self):
        if self.founded_year is None:
            return None
        return date.today().year - self.founded_year
