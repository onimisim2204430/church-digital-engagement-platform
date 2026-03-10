"""
Email Campaign Admin Views
Admin endpoints for managing email campaigns
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.users.permissions import IsModerator, HasModulePermission
from apps.users.models import User, UserRole
from apps.content.views import create_audit_log
from apps.moderation.models import ActionType
from .models import EmailCampaign, EmailSubscription, EmailLog, CampaignStatus
from .serializers import (
    EmailCampaignSerializer, EmailCampaignCreateSerializer,
    EmailCampaignListSerializer, EmailSubscriptionSerializer
)


class AdminEmailCampaignViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing email campaigns
    Accessible by ADMIN and MODERATORs with outreach.email permission
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('outreach.email')]
    queryset = EmailCampaign.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmailCampaignCreateSerializer
        elif self.action == 'list':
            return EmailCampaignListSerializer
        return EmailCampaignSerializer
    
    def get_queryset(self):
        queryset = EmailCampaign.objects.all()
        
        # Filter by status
        campaign_status = self.request.query_params.get('status')
        if campaign_status:
            queryset = queryset.filter(status=campaign_status)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        campaign = serializer.save(created_by=self.request.user)
        
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.CREATE,
            description=f"Created email campaign: {campaign.subject}",
            content_object=campaign,
            request=self.request
        )
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """
        Send email campaign
        Note: In production, this should be queued to a background task (Celery)
        """
        campaign = self.get_object()
        
        if campaign.status == CampaignStatus.SENT:
            return Response(
                {'error': 'Campaign already sent'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get recipients
        recipients = []
        if campaign.send_to_all:
            recipients = User.objects.filter(is_active=True)
        elif campaign.send_to_members_only:
            recipients = User.objects.filter(
                is_active=True,
                role__in=[UserRole.MEMBER, UserRole.ADMIN]
            )
        
        # Filter by subscription status
        subscribed_users = EmailSubscription.objects.filter(
            is_subscribed=True
        ).values_list('user_id', flat=True)
        recipients = recipients.filter(id__in=subscribed_users)
        
        # Update campaign
        campaign.status = CampaignStatus.SENDING
        campaign.total_recipients = recipients.count()
        campaign.save()
        
        # In production, create email logs and send via background task
        # For now, just mark as sent
        for recipient in recipients:
            EmailLog.objects.create(
                campaign=campaign,
                recipient=recipient,
                is_sent=True,
                sent_at=timezone.now()
            )
        
        campaign.status = CampaignStatus.SENT
        campaign.sent_at = timezone.now()
        campaign.total_sent = recipients.count()
        campaign.save()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.EMAIL_SENT,
            description=f"Sent email campaign '{campaign.subject}' to {recipients.count()} recipients",
            content_object=campaign,
            request=request
        )
        
        return Response({
            'message': f'Campaign sent to {recipients.count()} recipients',
            'campaign': EmailCampaignSerializer(campaign).data
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get campaign analytics"""
        campaign = self.get_object()
        
        logs = campaign.email_logs.all()
        
        return Response({
            'campaign_id': str(campaign.id),
            'subject': campaign.subject,
            'status': campaign.status,
            'total_recipients': campaign.total_recipients,
            'total_sent': logs.filter(is_sent=True).count(),
            'total_delivered': logs.filter(is_delivered=True).count(),
            'total_opened': logs.filter(is_opened=True).count(),
            'total_failed': logs.filter(is_failed=True).count(),
            'sent_at': campaign.sent_at,
        })


class AdminEmailSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin viewset for viewing email subscriptions
    Accessible by ADMIN and MODERATORs with outreach.email permission
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('outreach.email')]
    serializer_class = EmailSubscriptionSerializer
    queryset = EmailSubscription.objects.all()
    
    def get_queryset(self):
        queryset = EmailSubscription.objects.all()
        
        # Filter by subscription status
        is_subscribed = self.request.query_params.get('is_subscribed')
        if is_subscribed is not None:
            queryset = queryset.filter(is_subscribed=is_subscribed.lower() == 'true')
        
        return queryset.order_by('-subscribed_at')
