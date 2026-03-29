"""URL routes for payments API endpoints."""

from django.urls import path

from .views import (
    AdminPaystackBalanceView,
    InitializePaymentView,
    MemberPaymentTransactionsView,
    MemberRecurringPlansView,
    MemberRecurringPlanDetailView,
    AdminPaymentTransactionsView,
    AdminTransactionRefundView,
    PaystackWebhookView,
    VerifyPaymentView,
)

app_name = 'payments'

urlpatterns = [
    path('my-transactions/', MemberPaymentTransactionsView.as_view(), name='member-payment-transactions'),
    path('my-recurring-plans/', MemberRecurringPlansView.as_view(), name='member-recurring-plans'),
    path('my-recurring-plans/<uuid:plan_id>/', MemberRecurringPlanDetailView.as_view(), name='member-recurring-plan-detail'),
    path('admin/transactions/', AdminPaymentTransactionsView.as_view(), name='admin-payment-transactions'),
    path('admin/paystack-balance/', AdminPaystackBalanceView.as_view(), name='admin-paystack-balance'),
    path('admin/transactions/<uuid:transaction_id>/refund/', AdminTransactionRefundView.as_view(), name='admin-transaction-refund'),
    path('initialize/', InitializePaymentView.as_view(), name='initialize-payment'),
    path('verify/<str:reference>/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('webhook/paystack/', PaystackWebhookView.as_view(), name='paystack-webhook'),
]
