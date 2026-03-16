from django.contrib import admin
from .models import Post, PostContentType, Interaction, Draft, WeeklyEvent, HeroSection


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'post_type', 'status', 'is_published', 'scheduled_date', 'created_at']
    list_filter = ['post_type', 'status', 'is_published', 'is_featured', 'scheduled_date']
    search_fields = ['title', 'content', 'author__email']
    date_hierarchy = 'created_at'
    readonly_fields = ['published_at', 'views_count', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'content', 'author', 'post_type', 'content_type', 'category')
        }),
        ('Publishing', {
            'fields': ('status', 'is_published', 'published_at', 'scheduled_date')
        }),
        ('Featured', {
            'fields': ('is_featured', 'featured_priority', 'featured_image')
        }),
        ('Media', {
            'fields': ('video_url', 'audio_url')
        }),
        ('Series', {
            'fields': ('series', 'series_order')
        }),
        ('Engagement', {
            'fields': ('comments_enabled', 'reactions_enabled', 'views_count')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(PostContentType)
class PostContentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_system', 'is_enabled', 'sort_order']
    list_filter = ['is_system', 'is_enabled']
    search_fields = ['name', 'slug']


@admin.register(Interaction)
class InteractionAdmin(admin.ModelAdmin):
    list_display = ['user', 'post', 'type', 'status', 'is_flagged', 'created_at']
    list_filter = ['type', 'status', 'is_flagged', 'is_question']
    search_fields = ['content', 'user__email', 'post__title']
    date_hierarchy = 'created_at'


@admin.register(Draft)
class DraftAdmin(admin.ModelAdmin):
    list_display = ['draft_title', 'user', 'content_type', 'version', 'last_autosave_at']
    list_filter = ['content_type', 'is_published_draft']
    search_fields = ['draft_title', 'user__email', 'post__title']
    date_hierarchy = 'last_autosave_at'
    readonly_fields = ['version', 'created_at', 'last_autosave_at']


@admin.register(WeeklyEvent)
class WeeklyEventAdmin(admin.ModelAdmin):
    list_display = ['get_day_display', 'title', 'time', 'linked_post', 'sort_order']
    list_filter = ['day_of_week']
    search_fields = ['title', 'description', 'linked_post__title']
    ordering = ['day_of_week', 'sort_order']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Event Details', {
            'fields': ('day_of_week', 'title', 'time', 'description')
        }),
        ('Linking', {
            'fields': ('linked_post',)
        }),
        ('Display', {
            'fields': ('sort_order',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_day_display(self, obj):
        """Display the day name"""
        return obj.get_day_of_week_display()
    get_day_display.short_description = 'Day'


@admin.register(HeroSection)
class HeroSectionAdmin(admin.ModelAdmin):
    list_display = ['label', 'title', 'hero_type', 'is_active', 'display_order', 'updated_at']
    list_filter = ['hero_type', 'is_active', 'display_order']
    search_fields = ['title', 'label', 'description']
    ordering = ['-display_order', '-updated_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Content', {
            'fields': ('label', 'title', 'description')
        }),
        ('Image', {
            'fields': ('image', 'image_alt_text')
        }),
        ('Primary Button', {
            'fields': ('button1_label', 'button1_url', 'button1_icon'),
            'description': 'Main call-to-action button'
        }),
        ('Secondary Button', {
            'fields': ('button2_label', 'button2_url', 'button2_icon'),
            'description': 'Optional secondary action'
        }),
        ('Display Settings', {
            'fields': ('hero_type', 'is_active', 'display_order')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        })
    )
