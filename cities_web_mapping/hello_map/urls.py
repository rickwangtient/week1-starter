from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.views.static import serve
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('cities_api.urls')),  # Week 3 REST API
    path('map/', TemplateView.as_view(template_name='map.html'), name='map'),  # NEW
    path('', TemplateView.as_view(template_name='map.html'), name='map_home'),  # Root redirect
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.BASE_DIR / 'static'}),
]