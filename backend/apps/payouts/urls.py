from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.payouts.views import PaystackWebhookView
from apps.payouts.viewsets import AdminWithdrawalViewSet, WithdrawalViewSet, BudgetViewSet

router = DefaultRouter()
router.register(r'withdrawals', WithdrawalViewSet, basename='withdrawals')
router.register(r'admin/withdrawals', AdminWithdrawalViewSet, basename='admin-withdrawals')
router.register(r'budget', BudgetViewSet, basename='budget')

urlpatterns = [
	path('withdrawals/webhook/paystack/', PaystackWebhookView.as_view(), name='payout-paystack-webhook'),
]
urlpatterns += router.urls
