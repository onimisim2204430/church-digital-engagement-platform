"""
Tests for Daily Word and Weekly Event models and APIs
"""
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import date, timedelta

from apps.content.models import Post, PostContentType, PostStatus, WeeklyEvent

User = get_user_model()


# ============================================================================
# MODEL TESTS
# ============================================================================

class DailyWordModelTests(APITestCase):
    """Test Daily Word model validation and behavior"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Create or get devotional content type
        self.devotional_type, _ = PostContentType.objects.get_or_create(
            slug='devotional',
            defaults={
                'name': 'Devotional',
                'is_system': True
            }
        )
    
    def test_create_daily_word(self):
        """Test creating a basic daily word post"""
        today = timezone.now().date()
        
        post = Post.objects.create(
            title='Today\'s Devotion',
            content='<p>Some devotional content</p>',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=today,
            status=PostStatus.DRAFT
        )
        
        self.assertEqual(post.title, 'Today\'s Devotion')
        self.assertEqual(post.scheduled_date, today)
        self.assertEqual(post.status, PostStatus.DRAFT)
    
    def test_unique_scheduled_date_constraint(self):
        """Test that only one devotional post per date is allowed"""
        today = timezone.now().date()
        
        # Create first post
        post1 = Post.objects.create(
            title='Devotion 1',
            content='Content 1',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=today,
            status=PostStatus.DRAFT
        )
        
        # Attempt to create second post for same date - should raise validation error
        post2 = Post(
            title='Devotion 2',
            content='Content 2',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=today,
            status=PostStatus.DRAFT
        )
        
        with self.assertRaises(DjangoValidationError) as context:
            post2.full_clean()
        
        self.assertIn('scheduled_date', context.exception.error_dict)
    
    def test_publish_daily_word(self):
        """Test publishing a daily word"""
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        post = Post.objects.create(
            title='Future Word',
            content='Content',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=tomorrow,
            status=PostStatus.DRAFT
        )
        
        # Publish the post
        post.publish()
        
        self.assertEqual(post.status, PostStatus.PUBLISHED)
        self.assertTrue(post.is_published)
        self.assertIsNotNone(post.published_at)
    
    def test_scheduled_date_optional_for_non_devotional(self):
        """Test that non-devotional posts don't require scheduled_date"""
        # Create a regular post without scheduled_date
        post = Post.objects.create(
            title='Regular Post',
            content='Some content',
            author=self.user,
            post_type='ARTICLE',
            status=PostStatus.DRAFT
        )
        
        # Should not raise any validation error
        post.full_clean()
        
        self.assertIsNone(post.scheduled_date)


class WeeklyEventModelTests(APITestCase):
    """Test Weekly Event model"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.devotional_type, _ = PostContentType.objects.get_or_create(
            slug='devotional',
            defaults={'name': 'Devotional', 'is_system': True}
        )
    
    def test_create_weekly_event(self):
        """Test creating a weekly event"""
        event = WeeklyEvent.objects.create(
            day_of_week=0,  # Monday
            title='Morning Prayer',
            time='8:00 AM'
        )
        
        self.assertEqual(event.day_of_week, 0)
        self.assertEqual(event.title, 'Morning Prayer')
        self.assertEqual(event.get_day_of_week_display(), 'Monday')
    
    def test_weekly_event_link_to_post(self):
        """Test linking a weekly event to a daily word"""
        today = timezone.now().date()
        
        # Create a daily word
        post = Post.objects.create(
            title='Today\'s Word',
            content='Content',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=today,
            status=PostStatus.PUBLISHED
        )
        
        # Create event linked to post
        event = WeeklyEvent.objects.create(
            day_of_week=timezone.now().weekday(),
            title='Daily Devotion',
            time='7:00 AM',
            linked_post=post
        )
        
        self.assertEqual(event.linked_post, post)
        self.assertEqual(event.linked_post.title, 'Today\'s Word')
    
    def test_unique_day_of_week(self):
        """Test that only one event per day is allowed"""
        event1 = WeeklyEvent.objects.create(
            day_of_week=0,
            title='Event 1',
            time='8:00 AM'
        )
        
        # Try creating another for same day - should fail
        with self.assertRaises(Exception):  # IntegrityError
            WeeklyEvent.objects.create(
                day_of_week=0,
                title='Event 2',
                time='9:00 AM'
            )


# ============================================================================
# API TESTS
# ============================================================================

class PublicDailyWordAPITests(APITestCase):
    """Test public daily word API endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User'
        )
        self.user.is_staff = True
        self.user.save()
        
        self.devotional_type, _ = PostContentType.objects.get_or_create(
            slug='devotional',
            defaults={'name': 'Devotional', 'is_system': True}
        )
        
        # Create some daily words
        today = timezone.now().date()
        
        self.today_word = Post.objects.create(
            title='Today\'s Inspiration',
            content='<p>Today\'s message</p>',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=today,
            status=PostStatus.PUBLISHED,
            published_at=timezone.now()
        )
        
        tomorrow = today + timedelta(days=1)
        self.tomorrow_word = Post.objects.create(
            title='Tomorrow\'s Inspiration',
            content='<p>Tomorrow\'s message</p>',
            author=self.user,
            content_type=self.devotional_type,
            scheduled_date=tomorrow,
            status=PostStatus.PUBLISHED,
            published_at=timezone.now()
        )
    
    def test_get_today_word_endpoint(self):
        """Test the /today/ endpoint"""
        response = self.client.get('/api/v1/public/daily-words/today/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Today\'s Inspiration')
        self.assertEqual(response.data['scheduled_date'], str(timezone.now().date()))
    
    def test_get_daily_word_by_date(self):
        """Test getting a word for a specific date"""
        tomorrow = (timezone.now().date() + timedelta(days=1))
        
        response = self.client.get(f'/api/v1/public/daily-words/by-date/{tomorrow}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Tomorrow\'s Inspiration')
    
    def test_no_word_for_future_date(self):
        """Test 404 for date with no published word"""
        future_date = timezone.now().date() + timedelta(days=30)
        
        response = self.client.get(f'/api/v1/public/daily-words/by-date/{future_date}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_calendar_endpoint(self):
        """Test the calendar endpoint"""
        today = timezone.now().date()
        
        response = self.client.get(
            f'/api/v1/public/daily-words/calendar/?month={today.month}&year={today.year}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['month'], today.month)
        self.assertEqual(response.data['year'], today.year)
        
        # Should have days array
        self.assertGreater(len(response.data['days']), 0)


class PublicWeeklyEventAPITests(APITestCase):
    """Test public weekly event API endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        # Create some weekly events
        self.events = []
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        times = ['8:00 AM', '7:00 PM', '12:00 PM', '6:30 PM', 'Sunset', '10:00 AM', '10:00 AM']
        
        for i, (day, time) in enumerate(zip(days, times)):
            event = WeeklyEvent.objects.create(
                day_of_week=i,
                title=f'{day} Event',
                time=time
            )
            self.events.append(event)
    
    def test_list_weekly_events(self):
        """Test listing all weekly events"""
        response = self.client.get('/api/v1/public/weekly-events/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get('results', response.data)), 7)
    
    def test_events_ordered_by_day(self):
        """Test that events are ordered by day of week"""
        response = self.client.get('/api/v1/public/weekly-events/')
        
        results = response.data.get('results', response.data)
        self.assertEqual(results[0]['day_of_week'], 0)  # Monday
        self.assertEqual(results[6]['day_of_week'], 6)  # Sunday


class AdminDailyWordAPITests(APITestCase):
    """Test admin daily word API endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User'
        )
        
        self.devotional_type, _ = PostContentType.objects.get_or_create(
            slug='devotional',
            defaults={'name': 'Devotional', 'is_system': True}
        )
    
    def test_create_daily_word_conflict_detection(self):
        """Test that creating duplicate dates returns conflict response"""
        today = timezone.now().date()
        
        # Create first word
        post1 = Post.objects.create(
            title='Word 1',
            content='Content 1',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=today,
            status=PostStatus.DRAFT
        )
        
        # Login
        self.client.force_authenticate(user=self.admin_user)
        
        # Try to create second word for same date
        response = self.client.post(
            '/api/v1/admin/content/daily-words/',
            {
                'title': 'Word 2',
                'content': 'Content 2',
                'scheduled_date': today
            },
            format='json'
        )
        
        # Should get 409 Conflict
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(response.data['has_conflict'])
        self.assertIsNotNone(response.data['existing_post'])

    def test_create_daily_word_with_published_status_sets_publish_fields(self):
        """Create endpoint should persist published status and publish metadata."""
        self.client.force_authenticate(user=self.admin_user)
        target_date = timezone.now().date() + timedelta(days=14)

        response = self.client.post(
            '/api/v1/admin/content/daily-words/',
            {
                'title': 'Published Word',
                'content': 'Content',
                'scheduled_date': str(target_date),
                'status': PostStatus.PUBLISHED,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Post.objects.get(
            title='Published Word',
            scheduled_date=target_date,
            content_type__slug='devotional',
        )
        self.assertEqual(created.status, PostStatus.PUBLISHED)
        self.assertTrue(created.is_published)
        self.assertIsNotNone(created.published_at)

    def test_update_daily_word_status_to_published_sets_publish_fields(self):
        """Updating draft to published should set publish state and published_at."""
        self.client.force_authenticate(user=self.admin_user)
        target_date = timezone.now().date() + timedelta(days=2)
        post = Post.objects.create(
            title='Draft Word',
            content='Draft content',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=target_date,
            status=PostStatus.DRAFT,
            is_published=False,
            published_at=None,
        )

        response = self.client.patch(
            f'/api/v1/admin/content/daily-words/{post.id}/',
            {
                'status': PostStatus.PUBLISHED,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.status, PostStatus.PUBLISHED)
        self.assertTrue(post.is_published)
        self.assertIsNotNone(post.published_at)

    def test_update_daily_word_status_to_draft_unpublishes_without_erasing_audit(self):
        """Updating published word back to draft should keep published_at and unpublish state."""
        self.client.force_authenticate(user=self.admin_user)
        target_date = timezone.now().date() + timedelta(days=3)
        post = Post.objects.create(
            title='Published Word',
            content='Published content',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=target_date,
            status=PostStatus.PUBLISHED,
            is_published=True,
            published_at=timezone.now(),
        )
        original_published_at = post.published_at

        response = self.client.patch(
            f'/api/v1/admin/content/daily-words/{post.id}/',
            {
                'status': PostStatus.DRAFT,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.status, PostStatus.DRAFT)
        self.assertFalse(post.is_published)
        self.assertEqual(post.published_at, original_published_at)

    def test_update_daily_word_for_elapsed_date_is_locked(self):
        """Published devotionals dated today/past should be non-editable in admin update endpoint."""
        self.client.force_authenticate(user=self.admin_user)
        locked_date = timezone.now().date()

        post = Post.objects.create(
            title='Locked Word',
            content='Locked content',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=locked_date,
            status=PostStatus.PUBLISHED,
            is_published=True,
            published_at=timezone.now(),
        )

        response = self.client.patch(
            f'/api/v1/admin/content/daily-words/{post.id}/',
            {
                'title': 'Should Not Save',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        post.refresh_from_db()
        self.assertEqual(post.title, 'Locked Word')

    def test_update_daily_word_for_elapsed_date_draft_remains_editable(self):
        """Missed devotionals (elapsed date but not public yet) should remain editable."""
        self.client.force_authenticate(user=self.admin_user)
        locked_date = timezone.now().date()

        post = Post.objects.create(
            title='Missed Word',
            content='Missed content',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=locked_date,
            status=PostStatus.DRAFT,
            is_published=False,
        )

        response = self.client.patch(
            f'/api/v1/admin/content/daily-words/{post.id}/',
            {
                'title': 'Missed Word Updated',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.title, 'Missed Word Updated')

    def test_update_daily_word_for_future_date_remains_editable(self):
        """Future-dated devotionals remain editable for draft/ready workflow."""
        self.client.force_authenticate(user=self.admin_user)
        target_date = timezone.now().date() + timedelta(days=5)

        post = Post.objects.create(
            title='Future Word',
            content='Future content',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=target_date,
            status=PostStatus.DRAFT,
            is_published=False,
        )

        response = self.client.patch(
            f'/api/v1/admin/content/daily-words/{post.id}/',
            {
                'title': 'Updated Future Word',
                'status': PostStatus.PUBLISHED,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        post.refresh_from_db()
        self.assertEqual(post.title, 'Updated Future Word')
        self.assertEqual(post.status, PostStatus.PUBLISHED)

    def test_create_published_daily_word_with_empty_content_rejected(self):
        """Publishing should fail when content is empty/whitespace."""
        self.client.force_authenticate(user=self.admin_user)
        target_date = timezone.now().date() + timedelta(days=10)

        response = self.client.post(
            '/api/v1/admin/content/daily-words/',
            {
                'title': 'Valid title',
                'content': '   ',
                'scheduled_date': str(target_date),
                'status': PostStatus.PUBLISHED,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('content', response.data)

    def test_update_to_published_with_empty_title_rejected(self):
        """Publishing from update should fail when title is empty/whitespace."""
        self.client.force_authenticate(user=self.admin_user)
        target_date = timezone.now().date() + timedelta(days=6)
        post = Post.objects.create(
            title='Existing draft',
            content='Existing content',
            author=self.admin_user,
            content_type=self.devotional_type,
            scheduled_date=target_date,
            status=PostStatus.DRAFT,
            is_published=False,
        )

        response = self.client.patch(
            f'/api/v1/admin/content/daily-words/{post.id}/',
            {
                'title': '   ',
                'status': PostStatus.PUBLISHED,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)
