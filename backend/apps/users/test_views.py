"""
Test view to isolate 403 issue - Senior Engineer Debug Session
This minimal view will help identify if the problem is global or specific to email verification views.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


@method_decorator(csrf_exempt, name='dispatch')
class TestVerificationView(APIView):
    """
    Minimal test endpoint to isolate 403 issue.
    If this works, the original view has something broken.
    If this fails, the problem is global configuration.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        print("✅ TEST VIEW HIT!")
        print(f"User: {request.user}")
        print(f"Auth: {request.auth}")
        print(f"Authenticated: {request.user.is_authenticated}")
        print(f"Headers: {request.META.get('HTTP_AUTHORIZATION', 'MISSING')}")
        
        return Response({
            "status": "success",
            "message": "Test endpoint working",
            "user": request.user.email,
            "user_id": request.user.id,
        })
