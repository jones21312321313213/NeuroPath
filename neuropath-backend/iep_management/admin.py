from django.contrib import admin

# Register your models here.
from .models import IEP, IEP_Goal,Assessment

admin.site.register(IEP)
admin.site.register(IEP_Goal)
admin.site.register(Assessment)