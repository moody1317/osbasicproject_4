from django.urls import path
from . import views

urlpatterns = [
    path('ranking/', views.party_ranking, name='party_ranking'),
]
