from django.urls import path
from . import views

urlpatterns = [
    # List all translations
    path("translations/",
         views.TranslationsListView.as_view(),
         name="bible-translations"),

    # All books + chapter counts for all translations (downloaded once)
    path("meta/",
         views.BibleMetaView.as_view(),
         name="bible-meta"),

    # Single chapter (flexible, for lazy loading)
    path("<str:translation_code>/<int:book_number>/<int:chapter_number>/",
         views.ChapterView.as_view(),
         name="bible-chapter"),

    # Server-side search (fallback only)
    path("search/",
         views.search_verses,
         name="bible-search"),
]
