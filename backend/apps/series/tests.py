"""
Series app tests.

Covers:
- Featured series selection
- Current series spotlight (admin + public)
- Series subscription flows (authenticated + guest double opt-in)
- Announcement request creation, approval, rejection
- Permission guards: moderator cannot approve; cannot touch another creator's series
- Abuse prevention: throttle (mocked), duplicate idempotency
- Edge cases: expired token, invalid token, double-approval conflict
"""
from unittest.mock import patch
from datetime import timedelta
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User, UserRole
from apps.content.models import Post, PostType
from .models import (
    Series,
    SeriesVisibility,
    SeriesSubscription,
    SeriesSubscriptionStatus,
    SeriesAnnouncementRequest,
    SeriesAnnouncementRequestStatus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_admin(email='admin@example.com', **kwargs):
    return User.objects.create_user(
        email=email,
        password='StrongPass123!',
        first_name='Admin',
        last_name='User',
        role=UserRole.ADMIN,
        is_staff=True,
        is_active=True,
        **kwargs,
    )


def make_moderator(email='mod@example.com', **kwargs):
    return User.objects.create_user(
        email=email,
        password='StrongPass123!',
        first_name='Mod',
        last_name='User',
        role=UserRole.MODERATOR,
        is_staff=True,
        is_active=True,
        **kwargs,
    )


def make_series(author, title='Test Series', **kwargs):
    return Series.objects.create(
        title=title,
        description='Test description',
        visibility=SeriesVisibility.PUBLIC,
        author=author,
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Featured series selection
# ---------------------------------------------------------------------------

class FeaturedSeriesSelectionTests(APITestCase):
    def setUp(self):
        self.url = '/api/v1/admin/series/set-featured/'
        self.admin = make_admin()
        self.other_admin = make_admin(email='admin-alt@example.com')
        self.series = [make_series(self.admin, title=f'Series {i + 1}') for i in range(4)]
        self.other_admin_series = make_series(
            self.other_admin, title='Other Admin Featured',
            is_featured=True, featured_priority=99,
        )

    def test_set_featured_accepts_exactly_three_ids(self):
        self.client.force_authenticate(self.admin)
        payload = {'series_ids': [str(s.id) for s in self.series[:3]]}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get('results', [])), 3)

        for s in self.series:
            s.refresh_from_db()
        self.other_admin_series.refresh_from_db()

        self.assertTrue(self.series[0].is_featured)
        self.assertTrue(self.series[1].is_featured)
        self.assertTrue(self.series[2].is_featured)
        self.assertFalse(self.series[3].is_featured)
        # Admin scope clears all series (including other admin's)
        self.assertFalse(self.other_admin_series.is_featured)

    def test_set_featured_rejects_less_than_three(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.url, {'series_ids': [str(s.id) for s in self.series[:2]]}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('series_ids', response.data)

    def test_set_featured_rejects_more_than_three(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.url, {'series_ids': [str(s.id) for s in self.series]}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('series_ids', response.data)

    def test_set_featured_rejects_duplicate_ids(self):
        self.client.force_authenticate(self.admin)
        dup = str(self.series[0].id)
        response = self.client.post(
            self.url, {'series_ids': [dup, dup, str(self.series[1].id)]}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('series_ids', response.data)

    def test_set_featured_requires_authentication(self):
        response = self.client.post(
            self.url, {'series_ids': [str(s.id) for s in self.series[:3]]}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_set_featured_rejects_unknown_id(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'series_ids': [
                str(self.series[0].id),
                str(self.series[1].id),
                '00000000-0000-0000-0000-000000000000',
            ]
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('series_ids', response.data)


# ---------------------------------------------------------------------------
# Current series spotlight
# ---------------------------------------------------------------------------

class CurrentSeriesSpotlightTests(APITestCase):
    def setUp(self):
        self.admin = make_admin(email='spotlight-admin@example.com')
        self.series = make_series(self.admin, title='Spotlight Series')
        self.admin_url = '/api/v1/admin/series/current-spotlight/'
        self.public_url = '/api/v1/public/series/current-spotlight/'

    def test_admin_can_update_current_spotlight(self):
        self.client.force_authenticate(self.admin)
        payload = {
            'series_id': str(self.series.id),
            'latest_part_number': 6,
            'latest_part_status': 'AVAILABLE',
            'section_label': 'Current Series',
            'description_override': 'Manual description.',
            'cta_label': 'View Series Collection',
            'is_active': True,
        }
        response = self.client.post(self.admin_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['latest_part_label'], 'Part 6 Available')
        self.assertEqual(response.data['latest_part_number'], 6)
        self.assertEqual(str(response.data['series']['id']), str(self.series.id))

    def test_public_current_spotlight_returns_empty_when_not_configured(self):
        response = self.client.get(self.public_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {})

    def test_public_current_spotlight_returns_config_when_active(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            self.admin_url,
            {
                'series_id': str(self.series.id),
                'latest_part_number': 7,
                'latest_part_status': 'AVAILABLE',
                'is_active': True,
            },
            format='json',
        )
        self.client.force_authenticate(user=None)
        response = self.client.get(self.public_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['latest_part_label'], 'Part 7 Available')
        self.assertEqual(str(response.data['series']['id']), str(self.series.id))


# ---------------------------------------------------------------------------
# Series subscription flows
# ---------------------------------------------------------------------------

class SeriesSubscriptionFlowTests(APITestCase):
    def setUp(self):
        self.admin = make_admin(email='sub-admin@example.com')
        self.member = User.objects.create_user(
            email='member@example.com',
            password='StrongPass123!',
            role=UserRole.VIEWER,
            is_active=True,
        )
        self.series = make_series(self.admin, title='Subscription Series')

        self.subscribe_url = '/api/v1/public/series/subscriptions/'
        self.verify_url = '/api/v1/public/series/subscriptions/verify/'
        self.unsubscribe_url = '/api/v1/public/series/subscriptions/unsubscribe/'

    # -- Authenticated user --

    def test_authenticated_user_subscribes_directly_active(self):
        """Authenticated users skip verification and become ACTIVE immediately."""
        self.client.force_authenticate(self.member)
        response = self.client.post(
            self.subscribe_url,
            {'series_slug': self.series.slug},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['verification_required'])
        sub = SeriesSubscription.objects.get(series=self.series, user=self.member)
        self.assertEqual(sub.status, SeriesSubscriptionStatus.ACTIVE)

    def test_authenticated_user_duplicate_subscribe_returns_200(self):
        """Re-subscribing an already-active authenticated user returns 200 and is idempotent."""
        self.client.force_authenticate(self.member)
        self.client.post(self.subscribe_url, {'series_slug': self.series.slug}, format='json')
        response = self.client.post(
            self.subscribe_url, {'series_slug': self.series.slug}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            SeriesSubscription.objects.filter(series=self.series, user=self.member).count(), 1
        )

    # -- Guest double opt-in --

    @patch('apps.series.views.EmailService.send_email')
    def test_guest_subscribe_requires_email_and_sends_verification(self, mock_send):
        payload = {'series_slug': self.series.slug, 'email': 'guest@example.com'}
        response = self.client.post(self.subscribe_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.data['verification_required'])
        self.assertEqual(mock_send.call_count, 1)

        sub = SeriesSubscription.objects.get(series=self.series, email='guest@example.com', user=None)
        self.assertEqual(sub.status, SeriesSubscriptionStatus.PENDING_VERIFICATION)
        self.assertTrue(bool(sub.verification_token_hash))

    def test_guest_subscribe_without_email_returns_400(self):
        response = self.client.post(
            self.subscribe_url, {'series_slug': self.series.slug}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    @patch('apps.series.views.EmailService.send_email')
    def test_guest_duplicate_subscription_is_idempotent(self, _mock):
        """A second subscribe for the same email/series keeps the same record."""
        payload = {'series_slug': self.series.slug, 'email': 'dup@example.com'}
        self.client.post(self.subscribe_url, payload, format='json')
        response = self.client.post(self.subscribe_url, payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_202_ACCEPTED, status.HTTP_200_OK])
        self.assertEqual(
            SeriesSubscription.objects.filter(series=self.series, email='dup@example.com').count(),
            1,
        )

    @patch('apps.series.views.EmailService.send_email')
    def test_guest_verify_then_unsubscribe(self, _mock):
        sub = SeriesSubscription.objects.create(
            series=self.series,
            email='verifyme@example.com',
            status=SeriesSubscriptionStatus.PENDING_VERIFICATION,
        )
        raw_token = sub.create_verification_token()

        verify_resp = self.client.post(self.verify_url, {'token': raw_token}, format='json')
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertIn('series_title', verify_resp.data)

        sub.refresh_from_db()
        self.assertEqual(sub.status, SeriesSubscriptionStatus.ACTIVE)

        unsub_resp = self.client.post(
            self.unsubscribe_url, {'token': str(sub.unsubscribe_token)}, format='json'
        )
        self.assertEqual(unsub_resp.status_code, status.HTTP_200_OK)

        sub.refresh_from_db()
        self.assertEqual(sub.status, SeriesSubscriptionStatus.UNSUBSCRIBED)

    def test_verify_with_invalid_token_returns_400(self):
        response = self.client.post(self.verify_url, {'token': 'not-a-real-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_with_expired_token_returns_400(self):
        """A token past its TTL must be rejected even if the hash matches."""
        from datetime import timedelta
        from django.utils import timezone

        sub = SeriesSubscription.objects.create(
            series=self.series,
            email='expired@example.com',
            status=SeriesSubscriptionStatus.PENDING_VERIFICATION,
        )
        raw_token = sub.create_verification_token(ttl_minutes=1)
        # Manually expire the token
        sub.verification_token_expires_at = timezone.now() - timedelta(minutes=5)
        sub.save(update_fields=['verification_token_expires_at'])

        response = self.client.post(self.verify_url, {'token': raw_token}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_subscribe_to_nonexistent_series_returns_404(self):
        response = self.client.post(
            self.subscribe_url,
            {'series_slug': 'does-not-exist', 'email': 'x@example.com'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Announcement request: creation, approval, rejection, permissions
# ---------------------------------------------------------------------------

class SeriesAnnouncementApprovalTests(APITestCase):
    @patch('apps.users.permissions.HasModulePermission.has_permission', return_value=True)
    def setUp(self, _mock_perm):
        self.admin = make_admin(email='approval-admin@example.com')
        self.moderator = make_moderator(email='creator-mod@example.com')
        self.other_moderator = make_moderator(email='other-mod@example.com')

        self.series = make_series(self.moderator, title='Moderated Series')
        self.other_series = make_series(self.other_moderator, title='Other Mod Series')

        self.request_obj = SeriesAnnouncementRequest.objects.create(
            series=self.series,
            created_by=self.moderator,
            title='New article in 2 weeks',
            message='We are preparing new articles for this series.',
            status=SeriesAnnouncementRequestStatus.PENDING_ADMIN_APPROVAL,
        )

        self.list_url = '/api/v1/admin/series/announcement-requests/'
        self.approve_url = (
            f'/api/v1/admin/series/announcement-requests/{self.request_obj.id}/approve/'
        )
        self.reject_url = (
            f'/api/v1/admin/series/announcement-requests/{self.request_obj.id}/reject/'
        )

    # -- Moderator creates a request --

    @patch('apps.series.views.NotificationService.notify_user')
    def test_moderator_can_create_request_for_own_series(self, _mock_notify):
        self.client.force_authenticate(self.moderator)
        payload = {
            'series': str(self.series.id),
            'request_type': 'ANNOUNCEMENT',
            'title': 'New content incoming',
            'message': 'Big things are coming in this series very soon.',
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch('apps.series.views.NotificationService.notify_user')
    def test_moderator_cannot_create_request_for_other_series(self, _mock_notify):
        """A moderator must not be able to submit announcements for a series they didn't create."""
        self.client.force_authenticate(self.moderator)
        payload = {
            'series': str(self.other_series.id),
            'request_type': 'ANNOUNCEMENT',
            'title': 'Rogue announcement',
            'message': 'This should be rejected by the serializer.',
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

    # -- Admin approves --

    @patch('apps.series.views.deliver_series_announcement_request_task')
    @patch('apps.series.views.NotificationService.notify_user')
    def test_admin_can_approve_pending_request(self, _mock_notify, mock_task):
        mock_task.delay = lambda *a, **kw: None
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.approve_url, {'admin_note': 'Looks good'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, SeriesAnnouncementRequestStatus.APPROVED)
        self.assertEqual(self.request_obj.approved_by, self.admin)
        # Audience snapshot must be captured at approval time
        self.assertIsNotNone(self.request_obj.audience_snapshot_frozen_at)

    def test_moderator_cannot_approve_request(self):
        """Only admins can approve — moderators must receive 403."""
        self.client.force_authenticate(self.moderator)
        response = self.client.post(self.approve_url, {'admin_note': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.series.views.NotificationService.notify_user')
    def test_second_approve_returns_conflict(self, _mock_notify):
        """Double-approving the same request must return 409."""
        self.request_obj.status = SeriesAnnouncementRequestStatus.APPROVED
        self.request_obj.approved_by = self.admin
        self.request_obj.save(update_fields=['status', 'approved_by', 'updated_at'])

        self.client.force_authenticate(self.admin)
        response = self.client.post(self.approve_url, {'admin_note': 'Duplicate'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    # -- Admin rejects --

    @patch('apps.series.views.NotificationService.notify_user')
    def test_admin_can_reject_pending_request(self, _mock_notify):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.reject_url, {'admin_note': 'Not appropriate right now.'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, SeriesAnnouncementRequestStatus.REJECTED)

    @patch('apps.series.views.NotificationService.notify_user')
    def test_second_reject_returns_conflict(self, _mock_notify):
        self.request_obj.status = SeriesAnnouncementRequestStatus.REJECTED
        self.request_obj.save(update_fields=['status', 'updated_at'])

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.reject_url, {'admin_note': 'Already rejected'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_unauthenticated_cannot_access_queue(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MemberRecentSermonsViewTests(APITestCase):
    def setUp(self):
        self.admin = make_admin(email='series-owner@example.com')
        self.member = User.objects.create_user(
            email='member-recent@example.com',
            password='StrongPass123!',
            role=UserRole.MEMBER,
            is_active=True,
        )
        self.url = '/api/v1/public/series/member/recent-sermons/'

        self.series_a = make_series(self.admin, title='Series A')
        self.series_b = make_series(self.admin, title='Series B')
        self.series_c = make_series(self.admin, title='Series C')
        self.series_d = make_series(self.admin, title='Series D')

    def _make_sermon(self, title, series=None, days_ago=0, author=None):
        now = timezone.now()
        return Post.objects.create(
            title=title,
            content=f'{title} content',
            post_type=PostType.SERMON,
            author=author or self.admin,
            series=series,
            is_published=True,
            published_at=now - timedelta(days=days_ago),
            status='PUBLISHED',
        )

    def test_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_latest_one_per_subscribed_series(self):
        SeriesSubscription.objects.create(
            series=self.series_a,
            user=self.member,
            email=self.member.email,
            status=SeriesSubscriptionStatus.ACTIVE,
            verified_at=timezone.now(),
        )
        SeriesSubscription.objects.create(
            series=self.series_b,
            user=self.member,
            email=self.member.email,
            status=SeriesSubscriptionStatus.ACTIVE,
            verified_at=timezone.now(),
        )
        SeriesSubscription.objects.create(
            series=self.series_c,
            user=self.member,
            email=self.member.email,
            status=SeriesSubscriptionStatus.ACTIVE,
            verified_at=timezone.now(),
        )

        old_a = self._make_sermon('A old', series=self.series_a, days_ago=5)
        new_a = self._make_sermon('A new', series=self.series_a, days_ago=1)
        self._make_sermon('B old', series=self.series_b, days_ago=8)
        self._make_sermon('B new', series=self.series_b, days_ago=2)
        self._make_sermon('C old', series=self.series_c, days_ago=7)
        self._make_sermon('C new', series=self.series_c, days_ago=3)
        self._make_sermon('D old', series=self.series_d, days_ago=9)
        self._make_sermon('D new', series=self.series_d, days_ago=0)

        self.client.force_authenticate(self.member)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data['results']
        self.assertEqual(len(results), 3)
        self.assertTrue(any(item['id'] == str(new_a.id) for item in results))
        self.assertFalse(any(item['id'] == str(old_a.id) for item in results))

        seen_series = [item.get('series_id') for item in results if item.get('series_id')]
        self.assertEqual(len(seen_series), len(set(seen_series)))

    def test_fallback_fills_when_subscribed_series_missing_posts(self):
        SeriesSubscription.objects.create(
            series=self.series_a,
            user=self.member,
            email=self.member.email,
            status=SeriesSubscriptionStatus.ACTIVE,
            verified_at=timezone.now(),
        )
        SeriesSubscription.objects.create(
            series=self.series_b,
            user=self.member,
            email=self.member.email,
            status=SeriesSubscriptionStatus.ACTIVE,
            verified_at=timezone.now(),
        )

        self._make_sermon('A old', series=self.series_a, days_ago=5)
        self._make_sermon('A latest', series=self.series_a, days_ago=1)
        self._make_sermon('C old', series=self.series_c, days_ago=6)
        self._make_sermon('C latest', series=self.series_c, days_ago=2)
        self._make_sermon('D old', series=self.series_d, days_ago=7)
        self._make_sermon('D latest', series=self.series_d, days_ago=3)

        self.client.force_authenticate(self.member)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 3)

        seen_series = [item.get('series_id') for item in results if item.get('series_id')]
        self.assertEqual(len(seen_series), len(set(seen_series)))

    def test_no_subscriptions_returns_three_general_random_candidates(self):
        self._make_sermon('A old', series=self.series_a, days_ago=8)
        self._make_sermon('A latest', series=self.series_a, days_ago=1)
        self._make_sermon('B old', series=self.series_b, days_ago=9)
        self._make_sermon('B latest', series=self.series_b, days_ago=2)
        self._make_sermon('C old', series=self.series_c, days_ago=10)
        self._make_sermon('C latest', series=self.series_c, days_ago=3)
        self._make_sermon('D old', series=self.series_d, days_ago=11)
        self._make_sermon('D latest', series=self.series_d, days_ago=4)

        self.client.force_authenticate(self.member)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 3)

        seen_series = [item.get('series_id') for item in results if item.get('series_id')]
        self.assertEqual(len(seen_series), len(set(seen_series)))
