from django.contrib import admin
from .models import Translation, Book, Verse


@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display  = ["code", "name", "language", "direction", "is_active"]
    list_filter   = ["is_active", "language"]
    search_fields = ["code", "name"]


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display  = ["number", "name", "abbreviation", "testament", "chapter_count", "translation"]
    list_filter   = ["testament", "translation"]
    search_fields = ["name", "abbreviation"]
    ordering      = ["translation", "number"]


@admin.register(Verse)
class VerseAdmin(admin.ModelAdmin):
    list_display  = ["translation", "book_number", "chapter", "verse", "text_preview"]
    list_filter   = ["translation"]
    search_fields = ["text"]
    ordering      = ["translation", "book_number", "chapter", "verse"]

    def text_preview(self, obj):
        return obj.text[:80] + "..." if len(obj.text) > 80 else obj.text
    text_preview.short_description = "Text Preview"
