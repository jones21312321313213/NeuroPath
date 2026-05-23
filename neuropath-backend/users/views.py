from rest_framework import generics, status
from rest_framework.response import Response
from .models import StudentProfile

# Import the newly named ValidationService
from .serializers import StudentProfileSerializer, ValidationService 

class StudentProfileListCreateView(generics.ListCreateAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            self.perform_create(serializer)
            
            return Response({
                "message": "Student profile successfully created and saved.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "message": "Validation failed. Please check the entered details.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# SDD COMPONENT: ProfileUpdateController
# Description: Intercepts PUT requests and routes traffic.
# =====================================================================
class ProfileUpdateController(generics.RetrieveUpdateAPIView):
    queryset = StudentProfile.objects.all()
    
    # SDD COMPONENT: ValidationService is triggered here
    serializer_class = ValidationService

    def update(self, request, *args, **kwargs):
        # SDD COMPONENT: ProfileService
        # Description: Handles missing record exceptions and verifies existence
        try:
            instance = self.get_object() 
        except Exception:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Passes data to the ValidationService
        serializer = self.get_serializer(instance, data=request.data, partial=True)

        if serializer.is_valid():
            # SDD COMPONENT: StudentProfileManager
            # Description: Communicates with PostgreSQL to execute SQL update query
            self.perform_update(serializer)
            
            return Response({
                "message": "Student profile updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Update failed. Invalid input provided.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)