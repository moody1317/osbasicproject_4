from django.urls import path
from .views import compare_members

urlpatterns = [
    path('compare/', compare_members),  # /compare/ 로 요청 오면 compare_members 함수 실행
]
