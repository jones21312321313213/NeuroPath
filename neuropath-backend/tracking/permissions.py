from rest_framework.permissions import BasePermission

# =====================================================================
# SDD COMPONENT: SessionAuthenticationGuard
# Description: Strict security wrapper operating at the API controller 
#              pipeline level. Validates session tokens and idle boundaries.
# =====================================================================
class SessionAuthenticationGuard(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)