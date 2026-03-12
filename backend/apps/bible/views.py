from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Translation, Book, Verse


CACHE_YEAR = 60 * 60 * 24 * 365  # 365 days — Bible never changes


class TranslationsListView(APIView):
    """
    Returns list of all available translations.
    Cached for 1 year.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "bible_translations_list"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        data = list(
            Translation.objects.filter(is_active=True)
            .values("code", "name", "language", "direction")
        )
        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


class BibleMetaView(APIView):
    """
    Returns ALL books + chapter counts for ALL translations.
    Downloaded once by the frontend and stored in IndexedDB.
    Cached for 1 year in Redis.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "bible_meta_all"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        data = {}
        for translation in Translation.objects.filter(is_active=True):
            books = []
            for book in translation.books.order_by("number"):
                books.append({
                    "number":        book.number,
                    "name":          book.name,
                    "abbreviation":  book.abbreviation,
                    "testament":     book.testament,
                    "chapters":      book.chapter_count,
                })
            data[translation.code] = {
                "name":      translation.name,
                "language":  translation.language,
                "direction": translation.direction,
                "books":     books,
            }

        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


class ChapterView(APIView):
    """
    Returns all verses in one chapter.
    Used for lazy loading individual chapters (optional, but keep for flexibility).
    Cached for 1 year.
    """
    permission_classes = [AllowAny]

    def get(self, request, translation_code, book_number, chapter_number):
        cache_key = f"chapter_{translation_code}_{book_number}_{chapter_number}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            book = Book.objects.select_related("translation").get(
                translation__code=translation_code,
                number=book_number
            )
        except Book.DoesNotExist:
            return Response({"error": "Book not found."}, status=404)

        verses = list(
            Verse.objects.filter(
                translation__code=translation_code,
                book_number=book_number,
                chapter=chapter_number,
            ).order_by("verse").values("verse", "text")
        )

        if not verses:
            return Response({"error": "Chapter not found."}, status=404)

        data = {
            "translation": translation_code,
            "book_number": book_number,
            "book_name":   book.name,
            "chapter":     chapter_number,
            "verses":      verses,
            "total":       len(verses),
        }

        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def search_verses(request):
    """
    Server-side search. Used as fallback only — primary search is local.
    Query params: q (search string), translation (code, default KJV), limit (default 50)
    """
    q           = request.GET.get("q", "").strip()
    translation = request.GET.get("translation", "KJV")
    limit       = min(int(request.GET.get("limit", 50)), 200)

    if len(q) < 2:
        return Response({"results": [], "error": "Query must be at least 2 characters."})

    verses = Verse.objects.filter(
        translation__code=translation,
        text__icontains=q,
    ).select_related("book").values(
        "book__name", "book_number", "chapter", "verse", "text"
    )[:limit]

    results = [
        {
            "book_name":   v["book__name"],
            "book_number": v["book_number"],
            "chapter":     v["chapter"],
            "verse":       v["verse"],
            "text":        v["text"],
        }
        for v in verses
    ]

    return Response({"results": results, "count": len(results)})
