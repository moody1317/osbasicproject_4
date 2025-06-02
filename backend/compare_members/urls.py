from django.urls import path
from . import views

urlpatterns = [
    path('search/', views.member_search, name='member_search'),
]
