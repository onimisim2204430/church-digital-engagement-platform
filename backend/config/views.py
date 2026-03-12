"""
Views for serving the React frontend application.
"""
from django.views.generic import TemplateView
from django.conf import settings
import os


class ReactAppView(TemplateView):
    """
    Serves the React application's index.html for all non-API routes.
    
    This view enables React Router to handle client-side routing while
    Django serves the API endpoints. All requests that don't match an
    API route will be forwarded to React's index.html.
    """
    template_name = 'index.html'
    
    def get_template_names(self):
        """Explicitly tell Django where to find index.html"""
        # First try the default template loading
        return ['index.html']