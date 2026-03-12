from django.db import models


class Translation(models.Model):
    """
    Represents a Bible translation/version.
    Examples: KJV (English), NIV (English), YOR (Yoruba), FLS (French Louis Segond)
    """
    code      = models.CharField(max_length=10, unique=True)   # "KJV"
    name      = models.CharField(max_length=100)               # "King James Version"
    language  = models.CharField(max_length=50)                # "English"
    direction = models.CharField(max_length=3, default="ltr")  # "ltr" or "rtl"
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

    class Meta:
        ordering = ["code"]


class Book(models.Model):
    TESTAMENT_CHOICES = [("OT", "Old Testament"), ("NT", "New Testament")]

    translation   = models.ForeignKey(Translation, on_delete=models.CASCADE, related_name="books")
    number        = models.PositiveSmallIntegerField()   # 1 = Genesis, 66 = Revelation
    name          = models.CharField(max_length=100)     # "Genesis"
    abbreviation  = models.CharField(max_length=10)      # "Gen"
    testament     = models.CharField(max_length=2, choices=TESTAMENT_CHOICES)
    chapter_count = models.PositiveSmallIntegerField()   # How many chapters in this book

    class Meta:
        unique_together = ["translation", "number"]
        ordering = ["number"]

    def __str__(self):
        return f"{self.translation.code} — {self.name}"


class Verse(models.Model):
    """
    Flat verse table. book_number is denormalized from Book.number intentionally
    for query speed. DO NOT remove it.
    """
    translation = models.ForeignKey(Translation, on_delete=models.CASCADE, related_name="verses")
    book        = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="verses")
    book_number = models.PositiveSmallIntegerField()   # 1–66 (denormalized for speed)
    chapter     = models.PositiveSmallIntegerField()   # 1–150
    verse       = models.PositiveSmallIntegerField()   # 1–176
    text        = models.TextField()

    class Meta:
        unique_together = ["translation", "book_number", "chapter", "verse"]
        indexes = [
            # Primary lookup: all verses in a chapter
            models.Index(fields=["translation", "book_number", "chapter"]),
            # Exact verse lookup
            models.Index(fields=["translation", "book_number", "chapter", "verse"]),
        ]

    def __str__(self):
        return f"{self.book.name} {self.chapter}:{self.verse} ({self.translation.code})"
