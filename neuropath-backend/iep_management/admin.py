from django.contrib import admin

# Register your models here.
from .models import IEP, IEPGoal,Assessment

admin.site.register(IEP)
admin.site.register(IEPGoal)
admin.site.register(Assessment)