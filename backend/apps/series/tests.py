"""Series API tests."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User, UserRole
from .models import Series, SeriesVisibility


class FeaturedSeriesSelectionTests(APITestCase):
	def setUp(self):
		self.url = '/api/v1/admin/series/set-featured/'

		self.admin = User.objects.create_user(
			email='admin-series@example.com',
			password='StrongPass123!',
			first_name='Admin',
			last_name='Series',
			role=UserRole.ADMIN,
			is_staff=True,
			is_active=True,
		)

		self.other_admin = User.objects.create_user(
			email='admin-alt@example.com',
			password='StrongPass123!',
			first_name='Alt',
			last_name='Admin',
			role=UserRole.ADMIN,
			is_staff=True,
			is_active=True,
		)

		self.series = [
			Series.objects.create(
				title=f'Series {index + 1}',
				description='Sample',
				visibility=SeriesVisibility.PUBLIC,
				author=self.admin,
			)
			for index in range(4)
		]

		self.other_admin_series = Series.objects.create(
			title='Other Admin Featured',
			description='Sample',
			visibility=SeriesVisibility.PUBLIC,
			author=self.other_admin,
			is_featured=True,
			featured_priority=99,
		)

	def test_set_featured_accepts_exactly_three_ids(self):
		self.client.force_authenticate(self.admin)
		payload = {'series_ids': [str(self.series[0].id), str(self.series[1].id), str(self.series[2].id)]}

		response = self.client.post(self.url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data.get('results', [])), 3)

		self.series[0].refresh_from_db()
		self.series[1].refresh_from_db()
		self.series[2].refresh_from_db()
		self.series[3].refresh_from_db()
		self.other_admin_series.refresh_from_db()

		self.assertTrue(self.series[0].is_featured)
		self.assertTrue(self.series[1].is_featured)
		self.assertTrue(self.series[2].is_featured)
		self.assertEqual(self.series[0].featured_priority, 3)
		self.assertEqual(self.series[1].featured_priority, 2)
		self.assertEqual(self.series[2].featured_priority, 1)
		self.assertFalse(self.series[3].is_featured)
		# Admin users can manage all series, so this gets cleared too.
		self.assertFalse(self.other_admin_series.is_featured)

	def test_set_featured_rejects_less_than_three(self):
		self.client.force_authenticate(self.admin)
		payload = {'series_ids': [str(self.series[0].id), str(self.series[1].id)]}

		response = self.client.post(self.url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('series_ids', response.data)

	def test_set_featured_rejects_more_than_three(self):
		self.client.force_authenticate(self.admin)
		payload = {
			'series_ids': [
				str(self.series[0].id),
				str(self.series[1].id),
				str(self.series[2].id),
				str(self.series[3].id),
			]
		}

		response = self.client.post(self.url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('series_ids', response.data)

	def test_set_featured_rejects_duplicate_ids(self):
		self.client.force_authenticate(self.admin)
		duplicate_id = str(self.series[0].id)
		payload = {'series_ids': [duplicate_id, duplicate_id, str(self.series[1].id)]}

		response = self.client.post(self.url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('series_ids', response.data)

	def test_set_featured_requires_authentication(self):
		payload = {'series_ids': [str(self.series[0].id), str(self.series[1].id), str(self.series[2].id)]}
		response = self.client.post(self.url, payload, format='json')
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


class CurrentSeriesSpotlightTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_user(
			email='spotlight-admin@example.com',
			password='StrongPass123!',
			first_name='Spot',
			last_name='Admin',
			role=UserRole.ADMIN,
			is_staff=True,
			is_active=True,
		)

		self.series = Series.objects.create(
			title='Current Spotlight Series',
			description='Spotlight series body',
			visibility=SeriesVisibility.PUBLIC,
			author=self.admin,
		)

		self.admin_url = '/api/v1/admin/series/current-spotlight/'
		self.public_url = '/api/v1/public/series/current-spotlight/'

	def test_admin_can_update_current_spotlight(self):
		self.client.force_authenticate(self.admin)
		payload = {
			'series_id': str(self.series.id),
			'latest_part_number': 6,
			'latest_part_status': 'AVAILABLE',
			'section_label': 'Current Series',
			'description_override': 'A manual description from admin.',
			'cta_label': 'View Series Collection',
			'is_active': True,
		}

		response = self.client.post(self.admin_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['latest_part_label'], 'Part 6 Available')
		self.assertEqual(response.data['latest_part_number'], 6)
		self.assertEqual(response.data['latest_part_status'], 'AVAILABLE')
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
		self.assertEqual(response.data['latest_part_number'], 7)
		self.assertEqual(response.data['latest_part_status'], 'AVAILABLE')
		self.assertEqual(str(response.data['series']['id']), str(self.series.id))
