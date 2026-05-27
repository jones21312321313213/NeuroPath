from django.contrib import admin

# Register your models here.
from .models import IEPModel, IEPGoal,Assessment

admin.site.register(IEPModel)
admin.site.register(IEPGoal)
admin.site.register(Assessment)