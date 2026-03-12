"""
Moderation Admin Views
Admin endpoints for audit logs and reports
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.users.permissions import IsModerator, HasModulePermission
from .models import AuditLog, Report
from .serializers import AuditLogSerializer, ReportSerializer, ReportResolveSerializer


class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin viewset for viewing audit logs (read-only)
    Accessible by ADMIN and MODERATORs with community.moderation permission
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('community.moderation')]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.all()
    
    def get_queryset(self):
        queryset = AuditLog.objects.all()
        
        # Filter by action type
        action_type = self.request.query_params.get('action_type')
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset.order_by('-created_at')


class AdminReportViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing user reports
    Accessible by ADMIN and MODERATORs with community.moderation permission
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('community.moderation')]
    serializer_class = ReportSerializer
    queryset = Report.objects.all()
    
    def get_queryset(self):
        queryset = Report.objects.all()
        
        # Filter by resolved status
        is_resolved = self.request.query_params.get('is_resolved')
        if is_resolved is not None:
            queryset = queryset.filter(is_resolved=is_resolved.lower() == 'true')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a report"""
        report = self.get_object()
        serializer = ReportResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        report.is_resolved = True
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.resolution_notes = serializer.validated_data.get('resolution_notes', '')
        report.save()
        
        return Response({
            'message': 'Report resolved successfully',
            'report': ReportSerializer(report).data
        })
