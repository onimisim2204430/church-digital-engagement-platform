from rest_framework import serializers
from .models import Translation, Book, Verse


class TranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Translation
        fields = ["code", "name", "language", "direction", "is_active"]


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ["number", "name", "abbreviation", "testament", "chapter_count"]


class VerseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Verse
        fields = ["book_number", "chapter", "verse", "text"]
