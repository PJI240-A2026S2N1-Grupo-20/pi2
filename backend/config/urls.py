from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework.permissions import AllowAny
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/kanban/', include('kanban.urls')),
    path(
        'api/schema/',
        SpectacularAPIView.as_view(permission_classes=[AllowAny]),
        name='schema',
    ),
    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
