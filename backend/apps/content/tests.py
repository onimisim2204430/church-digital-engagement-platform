"""
Content Management Tests
Tests for published_at vs updated_at timestamp behavior
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
import time

from apps.content.models import Post, PostStatus, PostType


User = get_user_model()


class PublishTimestampTestCase(TestCase):
    """Test correct behavior of published_at and updated_at timestamps"""
    
    def setUp(self):
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@church.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
    
    def test_first_publish_sets_published_at(self):
        """Test that first publish sets published_at"""
        post = Post.objects.create(
            title='Test Post',
            content='Test content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        
        # Verify published_at is None for draft
        self.assertIsNone(post.published_at)
        self.assertEqual(post.status, PostStatus.DRAFT)
        
        # Publish the post
        post.publish()
        post.refresh_from_db()
        
        # Verify published_at is now set
        self.assertIsNotNone(post.published_at)
        self.assertEqual(post.status, PostStatus.PUBLISHED)
        self.assertTrue(post.is_published)
    
    def test_republish_preserves_published_at(self):
        """Test that re-publishing does not change published_at"""
        post = Post.objects.create(
            title='Test Post',
            content='Test content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        
        # First publish
        post.publish()
        post.refresh_from_db()
        original_published_at = post.published_at
        original_updated_at = post.updated_at
        
        # Wait to ensure timestamp difference
        time.sleep(0.1)
        
        # Update and save (simulating re-publish after edit)
        post.content = 'Updated content'
        post.save()
        post.refresh_from_db()
        
        # Verify published_at unchanged, updated_at changed
        self.assertEqual(post.published_at, original_published_at)
        self.assertGreater(post.updated_at, original_updated_at)
    
    def test_draft_edit_does_not_set_published_at(self):
        """Test that editing a draft doesn't set published_at"""
        post = Post.objects.create(
            title='Draft Post',
            content='Draft content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        
        # Verify no published_at
        self.assertIsNone(post.published_at)
        
        # Edit the draft
        post.content = 'Updated draft content'
        post.save()
        post.refresh_from_db()
        
        # Verify published_at still None
        self.assertIsNone(post.published_at)
        self.assertEqual(post.status, PostStatus.DRAFT)
    
    def test_unpublish_preserves_published_at(self):
        """Test that unpublishing keeps published_at for audit trail"""
        post = Post.objects.create(
            title='Test Post',
            content='Test content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        
        # Publish
        post.publish()
        post.refresh_from_db()
        original_published_at = post.published_at
        
        # Unpublish
        post.unpublish()
        post.refresh_from_db()
        
        # Verify published_at preserved for audit trail
        self.assertEqual(post.published_at, original_published_at)
        self.assertEqual(post.status, PostStatus.DRAFT)
        self.assertFalse(post.is_published)
    
    def test_create_published_post_via_api(self):
        """Test creating a post with status=PUBLISHED via API sets published_at"""
        response = self.client.post('/api/v1/admin/content/posts/', {
            'title': 'Published Post',
            'content': 'Content here',
            'post_type': 'ARTICLE',
            'status': 'PUBLISHED',
            'comments_enabled': True,
            'reactions_enabled': True
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        post = Post.objects.get(id=response.data['id'])
        self.assertEqual(post.status, PostStatus.PUBLISHED)
        self.assertIsNotNone(post.published_at)
        self.assertTrue(post.is_published)
    
    def test_create_draft_post_via_api(self):
        """Test creating a draft post via API doesn't set published_at"""
        response = self.client.post('/api/v1/admin/content/posts/', {
            'title': 'Draft Post',
            'content': 'Content here',
            'post_type': 'ARTICLE',
            'status': 'DRAFT',
            'comments_enabled': True,
            'reactions_enabled': True
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        post = Post.objects.get(id=response.data['id'])
        self.assertEqual(post.status, PostStatus.DRAFT)
        self.assertIsNone(post.published_at)
        self.assertFalse(post.is_published)
    
    def test_update_post_preserves_published_at(self):
        """Test that updating a published post doesn't change published_at"""
        # Create and publish post
        post = Post.objects.create(
            title='Original Title',
            content='Original content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        post.publish()
        post.refresh_from_db()
        original_published_at = post.published_at
        
        # Wait to ensure timestamp difference
        time.sleep(0.1)
        
        # Update via API
        response = self.client.patch(f'/api/v1/admin/content/posts/{post.id}/', {
            'title': 'Updated Title',
            'content': 'Updated content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        post.refresh_from_db()
        # Verify published_at unchanged
        self.assertEqual(post.published_at, original_published_at)
        # Verify content updated
        self.assertEqual(post.title, 'Updated Title')
        self.assertEqual(post.content, 'Updated content')
    
    def test_publish_action_endpoint(self):
        """Test /publish/ endpoint sets published_at correctly"""
        post = Post.objects.create(
            title='Test Post',
            content='Test content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        
        # Publish via API endpoint
        response = self.client.post(f'/api/v1/admin/content/posts/{post.id}/publish/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        post.refresh_from_db()
        self.assertIsNotNone(post.published_at)
        self.assertEqual(post.status, PostStatus.PUBLISHED)
    
    def test_published_at_immutable_on_multiple_publishes(self):
        """Test that calling publish() multiple times doesn't change published_at"""
        post = Post.objects.create(
            title='Test Post',
            content='Test content',
            author=self.admin,
            status=PostStatus.DRAFT
        )
        
        # First publish
        post.publish()
        post.refresh_from_db()
        first_published_at = post.published_at
        
        time.sleep(0.1)
        
        # Second publish (simulating re-publish)
        post.publish()
        post.refresh_from_db()
        
        # Verify published_at unchanged
        self.assertEqual(post.published_at, first_published_at)