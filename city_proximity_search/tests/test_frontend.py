from django.test import TestCase, Client
from django.urls import reverse

class MapViewTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_map_view_loads(self):
        """Test that the map page loads successfully"""
        response = self.client.get('/map/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Leaflet', response.content.decode())

    def test_static_files_served(self):
        """Test that static files are accessible"""
        response = self.client.get('/static/js/map.js')
        self.assertEqual(response.status_code, 200)

        response = self.client.get('/static/css/styles.css')
        self.assertEqual(response.status_code, 200)