document.addEventListener('DOMContentLoaded', function() {
    // 더보기 버튼들 선택
    const showMoreButtons = document.querySelectorAll('.show-more');
    
    showMoreButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            // 첫 번째 카드는 명예의 정당, 두 번째 카드는 명예의 의원
            if (index === 0) {
                // 명예의 정당 더보기 클릭
                window.location.href = 'rank_party.html';
            } else if (index === 1) {
                // 명예의 의원 더보기 클릭
                window.location.href = 'rank_member.html';
            }
        });
    });

    // 상세 퍼센트 링크
    const percentLink = document.querySelector('.percentages-container .more-link');
    if (percentLink) {
        percentLink.addEventListener('click', function() {
            window.location.href = 'percent.html';
        });
        
        // 마우스 호버 시 커서 모양 변경
        percentLink.style.cursor = 'pointer';
    }

    // 공지사항 링크
    const noticeLink = document.querySelector('.notices-container .more-link');
    if (noticeLink) {
        noticeLink.addEventListener('click', function() {
            window.location.href = 'announcements.html';
        });
        
        // 마우스 호버 시 커서 모양 변경
        noticeLink.style.cursor = 'pointer';
    }
});