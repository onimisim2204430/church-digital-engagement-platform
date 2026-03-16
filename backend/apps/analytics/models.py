from django.db import models
from django.contrib.sessions.models import Session
from django.utils import timezone
import hashlib


class PageView(models.Model):
    """Track individual page views with visitor identification"""
    
    PAGES = [
        ('home', 'Home'),
        ('posts', 'Posts'),
        ('series', 'Series'),
        ('devotional', 'Devotional'),
        ('give', 'Giving'),
        ('other', 'Other'),
    ]
    
    page = models.CharField(max_length=50, choices=PAGES, default='other')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=40, null=True, blank=True)
    
    # Device fingerprint for identifying unique visitors (IP + User-Agent hash)
    device_fingerprint = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'analytics_pageview'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'page']),
            models.Index(fields=['device_fingerprint', 'timestamp']),
        ]
    
    def save(self, *args, **kwargs):
        """Generate device fingerprint before saving"""
        if not self.device_fingerprint and self.ip_address:
            # Create fingerprint from IP + User-Agent
            fingerprint_string = f"{self.ip_address}:{self.user_agent or 'unknown'}"
            self.device_fingerprint = hashlib.sha256(
                fingerprint_string.encode()
            ).hexdigest()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_page_display()} - {self.timestamp}"


class AnalyticsSnapshot(models.Model):
    """Pre-calculated analytics snapshots for performance"""
    
    date = models.DateField(auto_now_add=True, db_index=True)
    total_page_views = models.IntegerField(default=0)
    unique_visitors = models.IntegerField(default=0)
    page_breakdown = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'analytics_snapshot'
        ordering = ['-date']
    
    def __str__(self):
        return f"Analytics - {self.date}"
