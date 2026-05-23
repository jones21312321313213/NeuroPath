from django.shortcuts import render

from rest_framework import generics, status
from rest_framework.response import Response
from .models import StudentProfile
from .serializers import StudentProfileSerializer

class StudentProfileListCreateView(generics.ListCreateAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer

    # This method matches your Activity Diagram flow step-by-step
    def create(self, request, *args, **kwargs):
        # 1. Receive data from the React ProfileUI Form
        serializer = self.get_serializer(data=request.data)

        # 2. Valid Details? (Diamond block in Activity Diagram)
        if serializer.is_valid():
            # 3. Store Student Details, ASD Background, and Assessments
            self.perform_create(serializer)
            
            # 4. Generate Summary and Confirm
            return Response({
                "message": "Student profile successfully created and saved.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        # 5. If Validation Fails, send errors back to React
        return Response({
            "message": "Validation failed. Please check the entered details.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)