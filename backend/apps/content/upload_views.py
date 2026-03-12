import os, uuid
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

ALLOWED = {'image/jpeg','image/png','image/gif','image/webp'}
MAX_SIZE = 10 * 1024 * 1024

class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        f = request.FILES.get('image')
        if not f:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if f.content_type not in ALLOWED:
            return Response({'error': 'Unsupported type. Use JPEG, PNG, GIF or WebP.'}, status=status.HTTP_400_BAD_REQUEST)
        if f.size > MAX_SIZE:
            return Response({'error': 'File too large. Max 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        import uuid as _uuid
        ext = os.path.splitext(f.name)[1].lower() or '.jpg'
        name = _uuid.uuid4().hex + ext
        rel = 'posts/' + name
        abs_path = os.path.join(settings.MEDIA_ROOT, 'posts', name)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as fp:
            for chunk in f.chunks():
                fp.write(chunk)
        base = request.scheme + '://' + request.get_host()
        url = base + settings.MEDIA_URL + rel
        return Response({'url': url}, status=status.HTTP_201_CREATED)
