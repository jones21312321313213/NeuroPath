from rest_framework.permissions import BasePermission

# =====================================================================
# SDD COMPONENT: UserAuthPermissions
# Description: Verifies the user's active session token and authenticates 
#              their identity before granting entry to the dashboard.
# =====================================================================
class UserAuthPermissions(BasePermission):
    def has_permission(self, request, view):
        # Checks if the user's JWT token is valid and active
        return bool(request.user and request.user.is_authenticated)