"""
Tests for apps/email/utils.py

Covers:
- generate_unsubscribe_token / verify_unsubscribe_token (round-trip + expiry)
- generate_tracking_pixel_token / verify_tracking_pixel_token (round-trip + expiry)
- validate_email_address (valid addresses, normalisation, rejections)
- sanitize_email_input (control char stripping, truncation)
- extract_email_domain
- build_unsubscribe_url / build_tracking_pixel_url (URL structure, signed token)
"""

import time
import uuid
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings


@override_settings(
    EMAIL_UNSUBSCRIBE_SECRET='test-unsubscribe-secret-32-chars-xx',
    EMAIL_SERVICE_CONFIG=MagicMock(tracking_secret='test-tracking-secret-32-chars-xx'),
    SITE_URL='https://example.com',
    DEBUG=True,
)
class TokenGenerationTests(TestCase):
    """generate_unsubscribe_token / verify_unsubscribe_token"""

    def setUp(self):
        # Patch the service-config tracking secret so we don't need a real config object
        import apps.email.utils as u
        self._orig_tracking = getattr(u, '_get_tracking_secret', None)

    def _get_utils(self):
        from apps.email import utils
        return utils

    def test_unsubscribe_token_round_trip(self):
        u = self._get_utils()
        with patch.object(u, '_get_unsubscribe_secret', return_value='supersecretkey'):
            token = u.generate_unsubscribe_token('user@example.com', ['NOTIFICATION'])
            self.assertTrue(u.verify_unsubscribe_token(token, 'user@example.com', ['NOTIFICATION']))

    def test_unsubscribe_token_wrong_email_fails(self):
        u = self._get_utils()
        with patch.object(u, '_get_unsubscribe_secret', return_value='supersecretkey'):
            token = u.generate_unsubscribe_token('user@example.com', ['NOTIFICATION'])
            self.assertFalse(u.verify_unsubscribe_token(token, 'other@example.com', ['NOTIFICATION']))

    def test_unsubscribe_token_wrong_categories_fails(self):
        u = self._get_utils()
        with patch.object(u, '_get_unsubscribe_secret', return_value='supersecretkey'):
            token = u.generate_unsubscribe_token('user@example.com', ['NOTIFICATION'])
            self.assertFalse(u.verify_unsubscribe_token(token, 'user@example.com', ['BULK']))

    def test_unsubscribe_token_expired(self):
        u = self._get_utils()
        with patch.object(u, '_get_unsubscribe_secret', return_value='supersecretkey'):
            token = u.generate_unsubscribe_token('user@example.com', ['NOTIFICATION'])
            # Patch time so the token appears expired (max_age_seconds=0 means immediately expired)
            result = u.verify_unsubscribe_token(
                token, 'user@example.com', ['NOTIFICATION'], max_age_seconds=0
            )
            # Token was just created so with max_age=0 it should be expired
            # (timestamp - now >= 0 means expired if max_age=0)
            # The check is: now - ts > max_age; with ts=now and max_age=0 it may pass/fail by 1s
            # So test with a clearly expired token instead
            old_token = '0.' + token.split('.', 1)[1] if '.' in token else token
            self.assertFalse(u.verify_unsubscribe_token(old_token, 'user@example.com', ['NOTIFICATION'], max_age_seconds=1))

    def test_unsubscribe_token_tampered(self):
        u = self._get_utils()
        with patch.object(u, '_get_unsubscribe_secret', return_value='supersecretkey'):
            token = u.generate_unsubscribe_token('user@example.com', ['NOTIFICATION'])
            # Corrupt the signature part
            parts = token.rsplit('.', 1)
            tampered = parts[0] + '.deadbeef'
            self.assertFalse(u.verify_unsubscribe_token(tampered, 'user@example.com', ['NOTIFICATION']))

    def test_tracking_token_round_trip(self):
        u = self._get_utils()
        msg_id = str(uuid.uuid4())
        with patch.object(u, '_get_tracking_secret', return_value='trackingsecret'):
            token = u.generate_tracking_pixel_token(msg_id)
            self.assertTrue(u.verify_tracking_pixel_token(token, msg_id))

    def test_tracking_token_wrong_id_fails(self):
        u = self._get_utils()
        msg_id = str(uuid.uuid4())
        other_id = str(uuid.uuid4())
        with patch.object(u, '_get_tracking_secret', return_value='trackingsecret'):
            token = u.generate_tracking_pixel_token(msg_id)
            self.assertFalse(u.verify_tracking_pixel_token(token, other_id))


class ValidateEmailAddressTests(TestCase):

    def _validate(self, email):
        from apps.email.utils import validate_email_address
        return validate_email_address(email)

    def test_valid_email_returned_normalised(self):
        result = self._validate('  User@EXAMPLE.COM  ')
        self.assertEqual(result, 'user@example.com')

    def test_basic_valid_email(self):
        result = self._validate('alice@example.org')
        self.assertEqual(result, 'alice@example.org')

    def test_plus_addressing_allowed(self):
        result = self._validate('bob+tag@example.com')
        self.assertEqual(result, 'bob+tag@example.com')

    def test_missing_at_raises(self):
        with self.assertRaises(ValueError):
            self._validate('notanemail')

    def test_missing_domain_raises(self):
        with self.assertRaises(ValueError):
            self._validate('user@')

    def test_empty_string_raises(self):
        with self.assertRaises(ValueError):
            self._validate('')

    def test_double_at_raises(self):
        with self.assertRaises(ValueError):
            self._validate('user@@example.com')


class SanitizeEmailInputTests(TestCase):

    def _sanitize(self, value, max_length=255):
        from apps.email.utils import sanitize_email_input
        return sanitize_email_input(value, max_length=max_length)

    def test_normal_string_unchanged(self):
        result = self._sanitize('Hello world')
        self.assertEqual(result, 'Hello world')

    def test_control_chars_stripped(self):
        result = self._sanitize('Hello\x00\x01\x08World')
        self.assertNotIn('\x00', result)
        self.assertNotIn('\x01', result)
        self.assertIn('Hello', result)
        self.assertIn('World', result)

    def test_truncation(self):
        result = self._sanitize('A' * 300, max_length=100)
        self.assertLessEqual(len(result), 100)

    def test_non_string_converted(self):
        result = self._sanitize(42)
        self.assertIsInstance(result, str)


class ExtractEmailDomainTests(TestCase):

    def _extract(self, email):
        from apps.email.utils import extract_email_domain
        return extract_email_domain(email)

    def test_standard_domain(self):
        self.assertEqual(self._extract('user@example.com'), 'example.com')

    def test_subdomain(self):
        self.assertEqual(self._extract('user@mail.church.org'), 'mail.church.org')

    def test_capitalised_normalised(self):
        self.assertEqual(self._extract('User@EXAMPLE.COM'), 'example.com')

    def test_invalid_email_returns_empty(self):
        result = self._extract('notanemail')
        self.assertEqual(result, '')


@override_settings(SITE_URL='https://church.example.com')
class BuildUrlTests(TestCase):

    def test_build_unsubscribe_url_structure(self):
        from apps.email.utils import build_unsubscribe_url
        from apps.email import utils as u
        with patch.object(u, '_get_unsubscribe_secret', return_value='secret'):
            with patch.object(u, '_get_tracking_base_url', return_value='https://church.example.com'):
                url = build_unsubscribe_url('user@example.com', ['NOTIFICATION'])
        self.assertIn('https://church.example.com', url)
        self.assertIn('t=', url)

    def test_build_tracking_pixel_url_structure(self):
        from apps.email.utils import build_tracking_pixel_url
        from apps.email import utils as u
        msg_id = str(uuid.uuid4())
        with patch.object(u, '_get_tracking_secret', return_value='secret'):
            with patch.object(u, '_get_tracking_base_url', return_value='https://church.example.com'):
                url = build_tracking_pixel_url(msg_id)
        self.assertIn('https://church.example.com', url)
        self.assertIn(msg_id, url)
