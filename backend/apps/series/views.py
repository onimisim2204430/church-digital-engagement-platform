"""
Series Views
Admin API endpoints for managing series
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q, Count
from django.conf import settings

from apps.users.permissions import IsModerator, IsAdmin, HasModulePermission
from apps.users.models import UserRole
from apps.moderation.models import AuditLog, ActionType
from apps.content.models import Post
from apps.notifications.constants import NotificationPriority, NotificationType, SourceModule
from apps.notifications.services import NotificationService
from apps.email.services import EmailService
from apps.email.constants import EmailType
from .throttles import (
    SeriesAnnouncementRequestThrottle,
    SeriesSubscriptionAnonThrottle,
    SeriesSubscriptionUserThrottle,
)
from .models import (
    Series,
    SeriesVisibility,
    CurrentSeriesSpotlight,
    SeriesSubscription,
    SeriesSubscriptionStatus,
    SeriesAnnouncementRequest,
    SeriesAnnouncementRequestStatus,
)
from .serializers import (
    SeriesSerializer, SeriesCreateSerializer, SeriesUpdateSerializer,
    SeriesDetailSerializer, AddPostToSeriesSerializer,
    RemovePostFromSeriesSerializer, ReorderSeriesPostsSerializer,
    SetFeaturedSeriesSerializer, CurrentSeriesSpotlightSerializer,
    CreateSeriesSubscriptionSerializer, VerifySeriesSubscriptionSerializer,
    UnsubscribeSeriesSubscriptionSerializer, SeriesSubscriptionSerializer,
    SeriesAnnouncementRequestCreateSerializer, SeriesAnnouncementRequestSerializer,
    SeriesAnnouncementReviewSerializer, MemberRecentSermonSerializer,
)
from .tasks import deliver_series_announcement_request_task


def create_audit_log(user, action_type, description, content_object=None, request=None):
    """Helper function to create audit logs"""
    log_data = {
        'user': user,
        'action_type': action_type,
        'description': description,
    }
    
    if content_object:
        log_data['content_type'] = ContentType.objects.get_for_model(content_object)
        log_data['object_id'] = str(content_object.id)
    
    if request:
        log_data['ip_address'] = request.META.get('REMOTE_ADDR')
        log_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:500]
    
    AuditLog.objects.create(**log_data)


class AdminSeriesViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing series (CRUD operations)
    Accessible by ADMIN and MODERATORs with content.series permission

    Permissions:
    - ADMIN: Full access to all series
    - MODERATOR: Can create series, manage only their own (requires content.series)
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('content.series')]
    queryset = Series.objects.filter(is_deleted=False)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SeriesCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SeriesUpdateSerializer
        elif self.action == 'retrieve':
            return SeriesDetailSerializer
        return SeriesSerializer
    
    def check_series_ownership(self, series):
        """
        Check if the current user can modify the series.
        Admins can modify any series, moderators can only modify their own.
        Returns True if allowed, raises PermissionDenied if not.
        """
        from rest_framework.exceptions import PermissionDenied
        
        if self.request.user.role == UserRole.MODERATOR and series.author != self.request.user:
            raise PermissionDenied("You do not have permission to modify this series")
        return True
    
    def get_queryset(self):
        """
        Filter series based on user role:
        - ADMIN: See all series
        - MODERATOR: See only their own series
        """
        queryset = Series.objects.filter(is_deleted=False)
        
        # Role-based filtering
        if self.request.user.role == UserRole.MODERATOR:
            queryset = queryset.filter(author=self.request.user)
        
        # Filter by visibility
        visibility = self.request.query_params.get('visibility')
        if visibility:
            queryset = queryset.filter(visibility=visibility)
        
        # Filter by featured status
        is_featured = self.request.query_params.get('is_featured')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        
        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Override create to return full serialized response with all fields"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the created instance
        instance = serializer.instance
        
        # Serialize response using full SeriesSerializer
        output_serializer = SeriesSerializer(instance)
        headers = self.get_success_headers(serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        series = serializer.save(author=self.request.user)
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.CREATE,
            description=f"Created series: {series.title}",
            content_object=series,
            request=self.request
        )
    
    def update(self, request, *args, **kwargs):
        """Override update to return full serialized response with all fields"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Serialize response using full SeriesSerializer
        output_serializer = SeriesSerializer(instance)
        return Response(output_serializer.data)
    
    def perform_update(self, serializer):
        series = serializer.instance
        
        # Check ownership
        self.check_series_ownership(series)
        
        series = serializer.save()
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.UPDATE,
            description=f"Updated series: {series.title}",
            content_object=series,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        # Check ownership
        self.check_series_ownership(instance)
        
        # Soft delete
        instance.soft_delete(self.request.user)
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.DELETE,
            description=f"Deleted series: {instance.title}",
            content_object=instance,
            request=self.request
        )

    @action(detail=False, methods=['post'], url_path='set-featured')
    def set_featured(self, request):
        """
        Atomically set exactly 3 featured series for homepage archive.
        POST /api/v1/admin/series/set-featured/
        Body: {"series_ids": ["uuid-1", "uuid-2", "uuid-3"]}
        """
        serializer = SetFeaturedSeriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        selected_ids = serializer.validated_data['series_ids']

        allowed_queryset = self.get_queryset()
        selected_series = list(allowed_queryset.filter(pk__in=selected_ids))

        if len(selected_series) != 3:
            return Response(
                {'series_ids': ['One or more selected series were not found or are not accessible.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        missing_ids = [str(series_id) for series_id in selected_ids if str(series_id) not in {str(s.pk) for s in selected_series}]
        if missing_ids:
            return Response(
                {'series_ids': [f"Invalid or inaccessible series IDs: {', '.join(missing_ids)}"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_map = {str(series_id): index for index, series_id in enumerate(selected_ids)}

        with transaction.atomic():
            # Clear existing featured flags in the requester's queryset scope.
            allowed_queryset.exclude(pk__in=selected_ids).filter(is_featured=True).update(
                is_featured=False,
                featured_priority=0,
            )

            # Set selected items as featured and assign descending priority by selected order.
            for series in selected_series:
                selected_index = order_map[str(series.pk)]
                series.is_featured = True
                series.featured_priority = 3 - selected_index
                series.save(update_fields=['is_featured', 'featured_priority', 'updated_at'])

        ordered_featured = list(
            allowed_queryset.filter(pk__in=selected_ids, is_featured=True)
        )
        ordered_featured.sort(key=lambda s: order_map[str(s.pk)])

        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description='Updated featured series selection for homepage archive',
            request=request,
        )

        output = SeriesSerializer(ordered_featured, many=True, context={'request': request})
        return Response({'results': output.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'post'], url_path='current-spotlight')
    def current_spotlight(self, request):
        """
        Get or update the singleton Current Series spotlight config.
        GET/POST /api/v1/admin/series/current-spotlight/
        """
        spotlight, _created = CurrentSeriesSpotlight.objects.get_or_create(singleton_key='default')

        if request.method == 'GET':
            serializer = CurrentSeriesSpotlightSerializer(spotlight, context={'request': request})
            return Response(serializer.data)

        serializer = CurrentSeriesSpotlightSerializer(
            spotlight,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(updated_by=request.user)

        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description='Updated Current Series spotlight settings',
            request=request,
        )

        return Response(CurrentSeriesSpotlightSerializer(updated, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def add_post(self, request, pk=None):
        """
        Add a post to this series
        POST /api/v1/admin/series/{id}/add_post/
        Body: {"post_id": "uuid", "series_order": 1}
        """
        series = self.get_object()
        self.check_series_ownership(series)
        
        serializer = AddPostToSeriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        post_id = serializer.validated_data['post_id']
        series_order = serializer.validated_data.get('series_order')
        
        try:
            post = Post.objects.get(id=post_id, is_deleted=False)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Set series order (auto-suggest if not provided)
        if series_order is None:
            series_order = series.get_next_part_number()
        
        post.series = series
        post.series_order = series_order
        post.save(update_fields=['series', 'series_order'])
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Added post '{post.title}' to series '{series.title}'",
            content_object=series,
            request=request
        )
        
        return Response({
            'message': 'Post added to series successfully',
            'series_order': series_order
        })
    
    @action(detail=True, methods=['post'])
    def remove_post(self, request, pk=None):
        """
        Remove a post from this series
        POST /api/v1/admin/series/{id}/remove_post/
        Body: {"post_id": "uuid"}
        """
        series = self.get_object()
        self.check_series_ownership(series)
        
        serializer = RemovePostFromSeriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        post_id = serializer.validated_data['post_id']
        
        try:
            post = Post.objects.get(id=post_id, series=series)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found in this series'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        post.series = None
        post.series_order = 0
        post.save(update_fields=['series', 'series_order'])
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Removed post '{post.title}' from series '{series.title}'",
            content_object=series,
            request=request
        )
        
        return Response({'message': 'Post removed from series successfully'})
    
    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """
        Reorder posts in this series
        POST /api/v1/admin/series/{id}/reorder/
        Body: {"post_orders": [{"post_id": "uuid", "order": 1}, ...]}
        """
        series = self.get_object()
        self.check_series_ownership(series)
        
        serializer = ReorderSeriesPostsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        post_orders = serializer.validated_data['post_orders']
        
        with transaction.atomic():
            for item in post_orders:
                try:
                    post = Post.objects.get(id=item['post_id'], series=series)
                    post.series_order = int(item['order'])
                    post.save(update_fields=['series_order'])
                except Post.DoesNotExist:
                    return Response(
                        {'error': f"Post {item['post_id']} not found in this series"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Reordered posts in series '{series.title}'",
            content_object=series,
            request=request
        )
        
        return Response({'message': 'Posts reordered successfully'})
    
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """
        Get all posts in this series
        GET /api/v1/admin/series/{id}/posts/
        """
        series = self.get_object()
        posts = series.posts.filter(is_deleted=False).order_by('series_order', 'created_at')
        
        from apps.content.serializers import PostListSerializer
        serializer = PostListSerializer(posts, many=True)
        
        return Response(serializer.data)


class PublicSeriesSubscriptionView(APIView):
    """Create/update subscriptions for authenticated and public users.

    - Authenticated users → immediately active (no email verification required).
    - Anonymous users → double opt-in: verification email is sent, status stays
      PENDING_VERIFICATION until the user clicks the link.

    Rate limits (abuse prevention):
    - Anonymous: 10 requests / hour / IP  (SeriesSubscriptionAnonThrottle)
    - Authenticated: 30 requests / hour / user  (SeriesSubscriptionUserThrottle)
    """

    permission_classes = [AllowAny]
    throttle_classes = [SeriesSubscriptionAnonThrottle, SeriesSubscriptionUserThrottle]

    def delete(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required to unsubscribe.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        serializer = CreateSeriesSubscriptionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        series_slug = serializer.validated_data['series_slug']
        
        try:
            subscription = SeriesSubscription.objects.get(
                series__slug=series_slug,
                user=request.user,
                status=SeriesSubscriptionStatus.ACTIVE
            )
            subscription.mark_unsubscribed()
            return Response({'detail': 'You have unsubscribed from this series.'}, status=status.HTTP_200_OK)
        except SeriesSubscription.DoesNotExist:
            return Response({'detail': 'You are not subscribed to this series.'}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        serializer = CreateSeriesSubscriptionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        series_slug = serializer.validated_data['series_slug']
        email_input = (serializer.validated_data.get('email') or '').strip().lower()

        try:
            series = Series.objects.get(slug=series_slug, is_deleted=False)
        except Series.DoesNotExist:
            return Response({'detail': 'Series not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user if request.user.is_authenticated else None
        if not user and not email_input:
            return Response(
                {'email': ['Email is required for public subscriptions.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user:
            # Authenticated users subscribe directly — no verification needed.
            defaults = {
                'email': (user.email or '').lower(),
                'status': SeriesSubscriptionStatus.ACTIVE,
                'verified_at': timezone.now(),
                'verification_token_hash': '',
                'verification_token_expires_at': None,
                'unsubscribed_at': None,
            }
            subscription, created = SeriesSubscription.objects.update_or_create(
                series=series,
                user=user,
                defaults=defaults,
            )
            if not created and subscription.status == SeriesSubscriptionStatus.ACTIVE:
                return Response(
                    {
                        'detail': 'You are already subscribed to this series.',
                        'subscription': SeriesSubscriptionSerializer(subscription).data,
                        'verification_required': False,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    'detail': 'You are now subscribed to this series.',
                    'subscription': SeriesSubscriptionSerializer(subscription).data,
                    'verification_required': False,
                },
                status=status.HTTP_200_OK,
            )

        # ---- Anonymous user double opt-in path ----
        subscription, _created = SeriesSubscription.objects.get_or_create(
            series=series,
            user=None,
            email=email_input,
            defaults={'status': SeriesSubscriptionStatus.PENDING_VERIFICATION},
        )

        if subscription.status == SeriesSubscriptionStatus.ACTIVE:
            return Response(
                {
                    'detail': 'This email is already subscribed to the series.',
                    'subscription': SeriesSubscriptionSerializer(subscription).data,
                    'verification_required': False,
                },
                status=status.HTTP_200_OK,
            )

        subscription.status = SeriesSubscriptionStatus.PENDING_VERIFICATION
        raw_token = subscription.create_verification_token(ttl_minutes=30)

        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        verify_url = f'{frontend_base}/series-subscriptions/verify?token={raw_token}'
        unsubscribe_url = (
            f'{frontend_base}/series-subscriptions/unsubscribe'
            f'?token={subscription.unsubscribe_token}'
        )

        # Use the template engine for branded, consistent emails
        try:
            EmailService.send_email(
                to_email=subscription.email,
                template_slug='series_subscription_verification',
                context={
                    'series_title': series.title,
                    'verify_url': verify_url,
                    'unsubscribe_url': unsubscribe_url,
                },
                email_type=EmailType.VERIFICATION,
                async_send=True,
            )
        except Exception:
            # Fallback to inline HTML if the template hasn't been seeded yet
            EmailService.send_email(
                to_email=subscription.email,
                subject=f'Confirm your subscription to "{series.title}"',
                body_html=(
                    f'<p>You asked to subscribe to updates from <strong>{series.title}</strong>.</p>'
                    f'<p><a href="{verify_url}">Confirm your subscription</a></p>'
                    f'<p>If this wasn\'t you, ignore this email.</p>'
                    f'<p><a href="{unsubscribe_url}">Unsubscribe</a></p>'
                ),
                email_type=EmailType.VERIFICATION,
                async_send=True,
            )

        return Response(
            {
                'detail': 'Check your email and confirm your subscription to activate it.',
                'verification_required': True,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class VerifySeriesSubscriptionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifySeriesSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        token_hash = SeriesSubscription._hash_token(token)

        subscription = SeriesSubscription.objects.filter(
            status=SeriesSubscriptionStatus.PENDING_VERIFICATION,
            verification_token_hash=token_hash,
            verification_token_expires_at__gt=timezone.now(),
        ).select_related('series').first()

        if subscription:
            subscription.mark_active()
            return Response(
                {
                    'detail': 'Subscription verified successfully.',
                    'subscription': SeriesSubscriptionSerializer(subscription).data,
                    'series_title': subscription.series.title,
                    'series_slug': subscription.series.slug,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {'detail': 'Invalid or expired verification token.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UnsubscribeSeriesSubscriptionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UnsubscribeSeriesSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        subscription = SeriesSubscription.objects.select_related('series').filter(unsubscribe_token=token).first()
        if not subscription:
            return Response({'detail': 'Invalid unsubscribe token.'}, status=status.HTTP_400_BAD_REQUEST)

        subscription.mark_unsubscribed()
        return Response(
            {
                'detail': 'You have been unsubscribed from series updates.',
                'series_title': subscription.series.title,
            },
            status=status.HTTP_200_OK
        )


class MemberRecentSermonsView(APIView):
    """Return 3 class-A posts for member page recent cards.

    Selection rules:
    - Class A only: posts in multi-part series (>=2 parts), excluding announcement/devotional class.
    - Prefer latest post from each ACTIVE subscribed series (max one per series).
    - No duplicate series across returned slots.
    - If fewer than 3, fill with random class-A posts from general pool per request.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        class_a_type_filter = (
            Q(content_type__slug__in=['series', 'discipleship', 'sermon', 'article'])
            | (Q(content_type__isnull=True) & Q(post_type__in=['SERMON', 'ARTICLE']))
        )

        class_a_series_ids = (
            Series.objects.filter(is_deleted=False)
            .annotate(parts_count=Count('posts', filter=Q(posts__is_deleted=False)))
            .filter(parts_count__gte=2)
            .values_list('id', flat=True)
        )

        class_a_base_qs = Post.objects.filter(
            class_a_type_filter,
            is_deleted=False,
            is_published=True,
            series__isnull=False,
            series__is_deleted=False,
            series_id__in=class_a_series_ids,
        )

        subscribed_series_ids = list(
            SeriesSubscription.objects.filter(
                user=request.user,
                status=SeriesSubscriptionStatus.ACTIVE,
                series__is_deleted=False,
            ).values_list('series_id', flat=True)
        )

        selected_posts = []
        selected_post_ids = set()
        selected_series_ids = set()

        if subscribed_series_ids:
            subscribed_posts = (
                class_a_base_qs.filter(series_id__in=subscribed_series_ids)
                .select_related('author', 'series')
                .order_by('-published_at', '-created_at')
            )

            for post in subscribed_posts:
                if post.series_id in selected_series_ids:
                    continue
                selected_posts.append(post)
                selected_post_ids.add(post.id)
                selected_series_ids.add(post.series_id)
                if len(selected_posts) == 3:
                    break

        if len(selected_posts) < 3:
            fallback_pool = list(
                class_a_base_qs
                .exclude(id__in=selected_post_ids)
                .exclude(series_id__in=selected_series_ids)
                .select_related('author', 'series')
                .order_by('?')[:50]
            )

            for post in fallback_pool:
                if post.series_id in selected_series_ids or post.id in selected_post_ids:
                    continue
                selected_posts.append(post)
                selected_post_ids.add(post.id)
                selected_series_ids.add(post.series_id)
                if len(selected_posts) == 3:
                    break

        serializer = MemberRecentSermonSerializer(selected_posts[:3], many=True, context={'request': request})
        return Response({'results': serializer.data}, status=status.HTTP_200_OK)


class SeriesAnnouncementRequestViewSet(viewsets.ModelViewSet):
    """Moderator request queue for series notifications. Delivery requires admin approval."""

    queryset = SeriesAnnouncementRequest.objects.select_related(
        'series', 'created_by', 'approved_by', 'related_post'
    )

    def get_permissions(self):
        if self.action in ['approve', 'reject']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsModerator(), HasModulePermission('content.series')]

    def get_throttles(self):
        """Apply per-moderator-per-series throttle only on request creation."""
        if self.action == 'create':
            return [SeriesAnnouncementRequestThrottle()]
        return super().get_throttles()

    def get_serializer_class(self):
        if self.action == 'create':
            return SeriesAnnouncementRequestCreateSerializer
        if self.action in ['approve', 'reject']:
            return SeriesAnnouncementReviewSerializer
        return SeriesAnnouncementRequestSerializer

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user
        if user.role == UserRole.MODERATOR:
            qs = qs.filter(created_by=user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        req = serializer.save(
            created_by=self.request.user,
            status=SeriesAnnouncementRequestStatus.PENDING_ADMIN_APPROVAL,
        )

        create_audit_log(
            user=self.request.user,
            action_type=ActionType.CREATE,
            description=f"Submitted series announcement request '{req.title}' for admin approval",
            content_object=req.series,
            request=self.request,
        )

        # Notify the creator that the request is safely queued 
        NotificationService.notify_user(
            user=self.request.user,
            notification_type=NotificationType.SERIES_REQUEST_SUBMITTED,
            title='Announcement request submitted',
            message=f"Your announcement request '{req.title}' has been submitted and is awaiting admin approval.",
            metadata={'request_id': str(req.id), 'series_id': str(req.series_id)},
            priority=NotificationPriority.LOW,
            source_module=SourceModule.CONTENT,
        )

        # Notify every active admin
        admin_users = self.request.user.__class__.objects.filter(
            role=UserRole.ADMIN, is_active=True
        )
        for admin in admin_users:
            NotificationService.notify_user(
                user=admin,
                notification_type=NotificationType.SERIES_APPROVAL_NEEDED,
                title='Series announcement awaiting approval',
                message=(
                    f"{self.request.user.get_full_name() or self.request.user.email} "
                    f"submitted '{req.title}' for series '{req.series.title}'."
                ),
                metadata={'request_id': str(req.id), 'series_id': str(req.series_id)},
                priority=NotificationPriority.HIGH,
                source_module=SourceModule.CONTENT,
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        serializer = SeriesAnnouncementReviewSerializer(
            data=request.data,
            context={'instance': req},
        )
        serializer.is_valid(raise_exception=True)

        # Freeze the subscriber audience count at approval time, not delivery time.
        # This ensures the reported count reflects exactly who was targeted.
        active_subscriber_count = SeriesSubscription.objects.filter(
            series=req.series,
            status=SeriesSubscriptionStatus.ACTIVE,
        ).count()

        updated = SeriesAnnouncementRequest.objects.filter(
            id=req.id,
            status=SeriesAnnouncementRequestStatus.PENDING_ADMIN_APPROVAL,
        ).update(
            status=SeriesAnnouncementRequestStatus.APPROVED,
            approved_by=request.user,
            admin_note=serializer.validated_data.get('admin_note', ''),
            reviewed_at=timezone.now(),
            audience_snapshot_count=active_subscriber_count,
            audience_snapshot_frozen_at=timezone.now(),
        )
        if updated != 1:
            return Response(
                {'detail': 'This request has already been reviewed or is no longer pending.'},
                status=status.HTTP_409_CONFLICT,
            )

        req.refresh_from_db()

        deliver_series_announcement_request_task.delay(str(req.id))

        NotificationService.notify_user(
            user=req.created_by,
            notification_type=NotificationType.SERIES_REQUEST_APPROVED,
            title='Your announcement has been approved',
            message=(
                f"'{req.title}' was approved and queued for delivery "
                f"to {active_subscriber_count} subscriber(s)."
            ),
            metadata={'request_id': str(req.id), 'series_id': str(req.series_id)},
            priority=NotificationPriority.MEDIUM,
            source_module=SourceModule.CONTENT,
        )

        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Approved series announcement request '{req.title}'",
            content_object=req.series,
            request=request,
        )

        return Response(SeriesAnnouncementRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        serializer = SeriesAnnouncementReviewSerializer(
            data=request.data,
            context={'instance': req},
        )
        serializer.is_valid(raise_exception=True)

        updated = SeriesAnnouncementRequest.objects.filter(
            id=req.id,
            status=SeriesAnnouncementRequestStatus.PENDING_ADMIN_APPROVAL,
        ).update(
            status=SeriesAnnouncementRequestStatus.REJECTED,
            approved_by=request.user,
            admin_note=serializer.validated_data.get('admin_note', ''),
            reviewed_at=timezone.now(),
        )
        if updated != 1:
            return Response(
                {'detail': 'This request has already been reviewed or is no longer pending.'},
                status=status.HTTP_409_CONFLICT,
            )

        req.refresh_from_db()

        NotificationService.notify_user(
            user=req.created_by,
            notification_type=NotificationType.SERIES_REQUEST_REJECTED,
            title='Your announcement was not approved',
            message=(
                f"'{req.title}' was rejected."
                + (f" Admin note: {req.admin_note}" if req.admin_note else '')
            ),
            metadata={
                'request_id': str(req.id),
                'series_id': str(req.series_id),
                'admin_note': req.admin_note,
            },
            priority=NotificationPriority.HIGH,
            source_module=SourceModule.CONTENT,
        )

        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Rejected series announcement request '{req.title}'",
            content_object=req.series,
            request=request,
        )

        return Response(SeriesAnnouncementRequestSerializer(req).data)
