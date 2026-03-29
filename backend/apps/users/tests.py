from django.test import TestCase, override_settings
from django.urls import reverse
from unittest.mock import patch

from apps.users.models import User, UserRole
from apps.users.services.google_oauth_service import (
	GoogleProfile,
	GoogleOAuthConfigurationError,
	GoogleTokenInvalidError,
	GoogleAudienceMismatchError,
	GoogleEmailNotVerifiedError,
)


@override_settings(GOOGLE_CLIENT_ID='test-google-client-id')
class GoogleLoginEndpointTests(TestCase):
	def setUp(self):
		self.url = reverse('users:google-login')

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_creates_new_user_for_valid_google_token(self, mock_verify):
		mock_verify.return_value = GoogleProfile(
			sub='google-sub-1',
			email='new.user@example.com',
			first_name='New',
			last_name='User',
			display_name='New User',
			picture='https://example.com/google-picture.jpg',
		)

		response = self.client.post(self.url, {'id_token': 'valid-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 201)
		self.assertIn('access', response.json())
		self.assertIn('refresh', response.json())

		user = User.objects.get(email='new.user@example.com')
		self.assertEqual(user.google_id, 'google-sub-1')
		self.assertTrue(user.email_verified)
		self.assertEqual(user.role, UserRole.VISITOR)

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_logs_in_existing_google_user(self, mock_verify):
		user = User.objects.create_user(
			email='existing.user@example.com',
			password=None,
			first_name='Existing',
			last_name='User',
			role=UserRole.VISITOR,
			google_id='existing-google-sub',
			email_verified=True,
		)

		mock_verify.return_value = GoogleProfile(
			sub='existing-google-sub',
			email='existing.user@example.com',
			first_name='Existing',
			last_name='User',
			display_name='Existing User',
			picture='https://example.com/google-existing-picture.jpg',
		)

		response = self.client.post(self.url, {'id_token': 'valid-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload['user']['id'], str(user.id))
		self.assertIn('access', payload)
		self.assertIn('refresh', payload)

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_rejects_invalid_token(self, mock_verify):
		mock_verify.side_effect = GoogleTokenInvalidError('invalid token')

		response = self.client.post(self.url, {'id_token': 'invalid-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload['code'], 'google_token_invalid')

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_rejects_audience_mismatch(self, mock_verify):
		mock_verify.side_effect = GoogleAudienceMismatchError('aud mismatch')

		response = self.client.post(self.url, {'id_token': 'aud-mismatch-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 401)
		payload = response.json()
		self.assertEqual(payload['code'], 'google_audience_mismatch')

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_rejects_unverified_google_email(self, mock_verify):
		mock_verify.side_effect = GoogleEmailNotVerifiedError('email not verified')

		response = self.client.post(self.url, {'id_token': 'unverified-email-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload['code'], 'google_email_not_verified')

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_returns_service_unavailable_when_google_not_configured(self, mock_verify):
		mock_verify.side_effect = GoogleOAuthConfigurationError('missing config')

		response = self.client.post(self.url, {'id_token': 'valid-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 503)
		payload = response.json()
		self.assertEqual(payload['code'], 'google_oauth_not_configured')

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_returns_server_error_for_unexpected_failure(self, mock_verify):
		mock_verify.side_effect = RuntimeError('unexpected downstream failure')

		response = self.client.post(self.url, {'id_token': 'valid-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 500)
		payload = response.json()
		self.assertEqual(payload['code'], 'google_login_failed')

	@patch('apps.users.views.GoogleOAuthService.verify_id_token')
	def test_auto_links_existing_password_account_on_first_google_login(self, mock_verify):
		user = User.objects.create_user(
			email='password.user@example.com',
			password='S3curePass123!',
			first_name='Password',
			last_name='User',
			role=UserRole.VISITOR,
			email_verified=False,
		)

		mock_verify.return_value = GoogleProfile(
			sub='new-google-sub',
			email='password.user@example.com',
			first_name='Password',
			last_name='User',
			display_name='Password User',
			picture='https://example.com/google-password-user.jpg',
		)

		response = self.client.post(self.url, {'id_token': 'valid-token'}, content_type='application/json')

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload['user']['id'], str(user.id))
		self.assertIn('access', payload)
		self.assertIn('refresh', payload)

		user.refresh_from_db()
		self.assertEqual(user.google_id, 'new-google-sub')
		self.assertEqual(user.google_profile_picture_url, 'https://example.com/google-password-user.jpg')
		self.assertTrue(user.email_verified)

	def test_requires_id_token(self):
		response = self.client.post(self.url, {}, content_type='application/json')
		self.assertEqual(response.status_code, 400)
		self.assertIn('id_token', response.json())
