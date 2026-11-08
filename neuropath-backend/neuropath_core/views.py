from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """Lightweight health check endpoint for container orchestrators and load balancers."""
    return JsonResponse({
        "status": "ok",
        "app": "neuropath-backend"
    })
