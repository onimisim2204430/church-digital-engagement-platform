from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Translation, Book, Verse
from django.test.utils import override_settings

# Use local memory cache for tests instead of Redis
TEST_CACHE = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}


def create_test_data():
    """Creates minimal test data: KJV, Genesis, 3 verses."""
    t = Translation.objects.create(code="KJV", name="King James Version", language="English")
    b = Book.objects.create(
        translation=t, number=1, name="Genesis",
        abbreviation="Gen", testament="OT", chapter_count=50
    )
    Verse.objects.create(translation=t, book=b, book_number=1, chapter=1, verse=1,
                         text="In the beginning God created the heaven and the earth.")
    Verse.objects.create(translation=t, book=b, book_number=1, chapter=1, verse=2,
                         text="And the earth was without form, and void.")
    Verse.objects.create(translation=t, book=b, book_number=1, chapter=1, verse=3,
                         text="And God said, Let there be light: and there was light.")
    return t, b


class TranslationModelTest(TestCase):
    def test_str_returns_code(self):
        t = Translation(code="KJV", name="King James Version", language="English")
        self.assertEqual(str(t), "KJV")


@override_settings(CACHES=TEST_CACHE)
class ChapterViewTest(APITestCase):
    def setUp(self):
        cache.clear()
        create_test_data()

    def test_chapter_returns_correct_verse_count(self):
        res = self.client.get("/api/bible/KJV/1/1/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json()["verses"]), 3)


@override_settings(CACHES=TEST_CACHE)
class MetaViewTest(APITestCase):
    def setUp(self):
        cache.clear()
        create_test_data()

    def test_meta_contains_translation(self):
        res = self.client.get("/api/bible/meta/")
        self.assertIn("KJV", res.json())


@override_settings(CACHES=TEST_CACHE)
class SearchTest(APITestCase):
    def setUp(self):
        create_test_data()

    def test_search_returns_results(self):
        res = self.client.get("/api/bible/search/?q=beginning&translation=KJV")
        results = res.json()["results"]
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("beginning", results[0]["text"])

    def test_short_query_returns_empty(self):
        res = self.client.get("/api/bible/search/?q=a&translation=KJV")
        self.assertEqual(res.json()["results"], [])
