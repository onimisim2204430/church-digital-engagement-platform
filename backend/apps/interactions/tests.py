"""
Interaction Tests - Comment and Reaction Toggle Enforcement
Tests that comments and reactions respect post-level enable/disable flags
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.content.models import Post, PostStatus
from apps.interactions.models import Comment, Reaction, ReactionType
from apps.series.models import Series


User = get_user_model()


class CommentToggleTestCase(TestCase):
    """Test comment enable/disable functionality"""
    
    def setUp(self):
        # Create test users
        self.admin = User.objects.create_user(
            email='admin@church.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        self.member = User.objects.create_user(
            email='member@church.com',
            password='testpass123',
            role='MEMBER',
            first_name='Member',
            last_name='User'
        )
        
        # Create post with comments enabled
        self.post_enabled = Post.objects.create(
            title='Post with Comments Enabled',
            content='Test content',
            author=self.admin,
            status=PostStatus.PUBLISHED,
            is_published=True,
            comments_enabled=True,
            reactions_enabled=True
        )
        
        # Create post with comments disabled
        self.post_disabled = Post.objects.create(
            title='Post with Comments Disabled',
            content='Test content',
            author=self.admin,
            status=PostStatus.PUBLISHED,
            is_published=True,
            comments_enabled=False,
            reactions_enabled=True
        )
        
        # Create existing comment on disabled post
        self.existing_comment = Comment.objects.create(
            post=self.post_disabled,
            user=self.member,
            content='This comment was created before disabling'
        )
        
        self.client = APIClient()
    
    def test_create_comment_when_enabled(self):
        """Test that comments can be created when enabled"""
        self.client.force_authenticate(user=self.member)
        
        response = self.client.post('/api/v1/comments/', {
            'post': str(self.post_enabled.id),
            'content': 'New comment'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.filter(post=self.post_enabled).count(), 1)
    
    def test_create_comment_when_disabled(self):
        """Test that new comments are blocked when disabled"""
        self.client.force_authenticate(user=self.member)
        
        response = self.client.post('/api/v1/comments/', {
            'post': str(self.post_disabled.id),
            'content': 'This should be blocked'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('disabled', response.data['error'].lower())
        # Only existing comment should remain
        self.assertEqual(Comment.objects.filter(post=self.post_disabled).count(), 1)
    
    def test_existing_comments_preserved_when_disabled(self):
        """Test that existing comments remain visible when disabled"""
        # Verify existing comment still exists
        self.assertEqual(Comment.objects.filter(post=self.post_disabled).count(), 1)
        self.assertTrue(Comment.objects.filter(id=self.existing_comment.id).exists())
    
    def test_reply_blocked_when_comments_disabled(self):
        """Test that replies are blocked when comments disabled"""
        self.client.force_authenticate(user=self.member)
        
        response = self.client.post(
            f'/api/v1/comments/{self.existing_comment.id}/reply/',
            {'content': 'Reply should be blocked'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('disabled', response.data['error'].lower())
    
    def test_reenable_comments_restores_functionality(self):
        """Test that re-enabling comments allows new comments"""
        self.client.force_authenticate(user=self.member)
        
        # Initially disabled
        response = self.client.post('/api/v1/comments/', {
            'post': str(self.post_disabled.id),
            'content': 'Should be blocked'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Re-enable comments
        self.post_disabled.comments_enabled = True
        self.post_disabled.save()
        
        # Now should work
        response = self.client.post('/api/v1/comments/', {
            'post': str(self.post_disabled.id),
            'content': 'Should work now'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ReactionToggleTestCase(TestCase):
    """Test reaction enable/disable functionality"""
    
    def setUp(self):
        # Create test users
        self.admin = User.objects.create_user(
            email='admin@church.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        self.member = User.objects.create_user(
            email='member@church.com',
            password='testpass123',
            role='MEMBER',
            first_name='Member',
            last_name='User'
        )
        
        # Create post with reactions enabled
        self.post_enabled = Post.objects.create(
            title='Post with Reactions Enabled',
            content='Test content',
            author=self.admin,
            status=PostStatus.PUBLISHED,
            is_published=True,
            comments_enabled=True,
            reactions_enabled=True
        )
        
        # Create post with reactions disabled
        self.post_disabled = Post.objects.create(
            title='Post with Reactions Disabled',
            content='Test content',
            author=self.admin,
            status=PostStatus.PUBLISHED,
            is_published=True,
            comments_enabled=True,
            reactions_enabled=False
        )
        
        # Create existing reaction on disabled post
        self.existing_reaction = Reaction.objects.create(
            post=self.post_disabled,
            user=self.member,
            reaction_type=ReactionType.AMEN,
            emoji='🙏'
        )
        
        self.client = APIClient()
    
    def test_create_reaction_when_enabled(self):
        """Test that reactions can be created when enabled"""
        self.client.force_authenticate(user=self.member)
        
        response = self.client.post(
            f'/api/v1/posts/{self.post_enabled.id}/reaction/',
            {'emoji': '👍'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reaction.objects.filter(post=self.post_enabled).count(), 1)
    
    def test_create_reaction_when_disabled(self):
        """Test that new reactions are blocked when disabled"""
        # Create another user since existing reaction prevents duplicate
        another_member = User.objects.create_user(
            email='another@church.com',
            password='testpass123',
            role='MEMBER',
            first_name='Another',
            last_name='Member'
        )
        self.client.force_authenticate(user=another_member)
        
        response = self.client.post(
            f'/api/v1/posts/{self.post_disabled.id}/reaction/',
            {'emoji': '👍'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('disabled', response.data['error'].lower())
        # Only existing reaction should remain
        self.assertEqual(Reaction.objects.filter(post=self.post_disabled).count(), 1)
    
    def test_existing_reactions_preserved_when_disabled(self):
        """Test that existing reactions remain when disabled"""
        self.assertEqual(Reaction.objects.filter(post=self.post_disabled).count(), 1)
        self.assertTrue(Reaction.objects.filter(id=self.existing_reaction.id).exists())
    
    def test_update_reaction_blocked_when_disabled(self):
        """Test that updating existing reaction is blocked when disabled"""
        self.client.force_authenticate(user=self.member)
        
        # Try to change reaction type
        response = self.client.post(
            f'/api/v1/posts/{self.post_disabled.id}/reaction/',
            {'emoji': '❤️'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('disabled', response.data['error'].lower())
        
        # Original reaction should remain unchanged
        self.existing_reaction.refresh_from_db()
        self.assertEqual(self.existing_reaction.reaction_type, ReactionType.AMEN)
    
    def test_reenable_reactions_restores_functionality(self):
        """Test that re-enabling reactions allows new reactions"""
        another_member = User.objects.create_user(
            email='another@church.com',
            password='testpass123',
            role='MEMBER',
            first_name='Another',
            last_name='Member'
        )
        self.client.force_authenticate(user=another_member)
        
        # Initially disabled
        response = self.client.post(
            f'/api/v1/posts/{self.post_disabled.id}/reaction/',
            {'emoji': '👍'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Re-enable reactions
        self.post_disabled.reactions_enabled = True
        self.post_disabled.save()
        
        # Now should work
        response = self.client.post(
            f'/api/v1/posts/{self.post_disabled.id}/reaction/',
            {'emoji': '👍'}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class SavedPostApiTestCase(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin2@church.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        self.member = User.objects.create_user(
            email='member2@church.com',
            password='testpass123',
            role='MEMBER',
            first_name='Member',
            last_name='User'
        )
        self.member_b = User.objects.create_user(
            email='member3@church.com',
            password='testpass123',
            role='MEMBER',
            first_name='Member',
            last_name='Other'
        )

        self.series = Series.objects.create(
            title='Class A Series',
            description='Test class a series',
            author=self.admin,
        )
        self.series_b = Series.objects.create(
            title='Class A Series B',
            description='Test class a series b',
            author=self.admin,
        )

        # Class A eligible posts (multipart series)
        self.post_a1 = Post.objects.create(
            title='Series A Part 1',
            content='Part one',
            author=self.admin,
            post_type='SERMON',
            series=self.series,
            status=PostStatus.PUBLISHED,
            is_published=True,
        )
        self.post_a2 = Post.objects.create(
            title='Series A Part 2',
            content='Part two',
            author=self.admin,
            post_type='SERMON',
            series=self.series,
            status=PostStatus.PUBLISHED,
            is_published=True,
        )
        self.post_b1 = Post.objects.create(
            title='Series B Part 1',
            content='Part one b',
            author=self.admin,
            post_type='ARTICLE',
            series=self.series_b,
            status=PostStatus.PUBLISHED,
            is_published=True,
        )
        self.post_b2 = Post.objects.create(
            title='Series B Part 2',
            content='Part two b',
            author=self.admin,
            post_type='ARTICLE',
            series=self.series_b,
            status=PostStatus.PUBLISHED,
            is_published=True,
        )

        # Not class A: standalone post
        self.standalone = Post.objects.create(
            title='Standalone',
            content='Standalone content',
            author=self.admin,
            post_type='SERMON',
            status=PostStatus.PUBLISHED,
            is_published=True,
        )

        self.client = APIClient()

    def test_toggle_save_requires_auth(self):
        response = self.client.post(f'/api/v1/posts/{self.post_a2.id}/save/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_toggle_save_and_unsave_class_a_post(self):
        self.client.force_authenticate(user=self.member)

        save_resp = self.client.post(f'/api/v1/posts/{self.post_a2.id}/save/')
        self.assertEqual(save_resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(save_resp.data['saved'])

        unsave_resp = self.client.post(f'/api/v1/posts/{self.post_a2.id}/save/')
        self.assertEqual(unsave_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(unsave_resp.data['saved'])

    def test_toggle_save_rejects_non_class_a_post(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(f'/api/v1/posts/{self.standalone.id}/save/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_saved_posts_is_user_scoped(self):
        self.client.force_authenticate(user=self.member)
        self.client.post(f'/api/v1/posts/{self.post_a1.id}/save/')

        self.client.force_authenticate(user=self.member_b)
        self.client.post(f'/api/v1/posts/{self.post_b2.id}/save/')

        self.client.force_authenticate(user=self.member)
        response = self.client.get('/api/v1/member/saved-posts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['post']['id'], str(self.post_a1.id))
