from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .constants import NotificationType, SourceModule
from .models import Notification
from .services import NotificationService


class NotificationServiceTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='member@example.com',
            password='SecurePass123!'
        )

    def test_notify_user_creates_notification(self):
        notification = NotificationService.notify_user(
            user=self.user,
            notification_type=NotificationType.PAYMENT_SUCCESS,
            title='Payment Successful',
            message='Your payment has been successfully processed.',
            metadata={'amount': 5000, 'payment_id': 'pay_123'},
            source_module=SourceModule.PAYMENT,
        )

        self.assertIsNotNone(notification)
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.notification_type, NotificationType.PAYMENT_SUCCESS)

    def test_notify_user_invalid_type_returns_none(self):
        notification = NotificationService.notify_user(
            user=self.user,
            notification_type='INVALID_TYPE',
            title='Invalid',
            message='Invalid',
        )
        self.assertIsNone(notification)
        self.assertEqual(Notification.objects.count(), 0)

    @patch('apps.notifications.models.Notification.objects.create_notification')
    def test_notify_user_failure_is_safe(self, mock_create):
        mock_create.side_effect = RuntimeError('DB failure')

        notification = NotificationService.notify_user(
            user=self.user,
            notification_type=NotificationType.SYSTEM_ALERT,
            title='Alert',
            message='Something happened',
        )

        self.assertIsNone(notification)
        self.assertEqual(Notification.objects.count(), 0)


class NotificationApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='user1@example.com', password='SecurePass123!')
        self.user2 = User.objects.create_user(email='user2@example.com', password='SecurePass123!')

        self.notification = Notification.objects.create(
            user=self.user,
            notification_type=NotificationType.SYSTEM_ALERT,
            title='System Alert',
            message='Important update',
            source_module=SourceModule.SYSTEM,
        )

    def test_user_sees_only_own_notifications(self):
        Notification.objects.create(
            user=self.user2,
            notification_type=NotificationType.ADMIN_MESSAGE,
            title='Other User Message',
            message='Hidden from user1',
            source_module=SourceModule.ADMIN,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/notifications/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_mark_single_notification_read(self):
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/notifications/read/{self.notification.id}/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_user_cannot_mark_another_user_notification(self):
        other = Notification.objects.create(
            user=self.user2,
            notification_type=NotificationType.SECURITY_EVENT,
            title='Security Event',
            message='Other user event',
            source_module=SourceModule.SECURITY,
        )

        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/notifications/read/{other.id}/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_read_all_marks_only_current_user_unread(self):
        own_unread = Notification.objects.create(
            user=self.user,
            notification_type=NotificationType.SYSTEM_ALERT,
            title='Another Alert',
            message='Unread',
            source_module=SourceModule.SYSTEM,
        )
        other_unread = Notification.objects.create(
            user=self.user2,
            notification_type=NotificationType.SYSTEM_ALERT,
            title='Other Alert',
            message='Unread',
            source_module=SourceModule.SYSTEM,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/notifications/read-all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        own_unread.refresh_from_db()
        other_unread.refresh_from_db()
        self.assertTrue(own_unread.is_read)
        self.assertFalse(other_unread.is_read)
