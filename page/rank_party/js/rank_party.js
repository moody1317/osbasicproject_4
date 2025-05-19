// 페이지 로드 시 실행되는 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 네비게이션 탭 선택 효과
    const navItems = document.querySelectorAll('nav li');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 페이지네이션 활성화 효과
    const paginationLinks = document.querySelectorAll('.pagination a');
    paginationLinks.forEach(link => {
        if (!link.classList.contains('prev-next')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                paginationLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        }
    });

    // 설정 버튼 클릭 효과
    const settingsBtn = document.querySelector('.settings-btn');
    settingsBtn.addEventListener('click', function() {
        alert('설정 메뉴를 엽니다.');
    });

    // 홈페이지 아이콘 클릭 효과
    const homeIcons = document.querySelectorAll('.home-icon svg');
    homeIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            alert('정당 홈페이지로 이동합니다.');
        });
    });

    // 챗봇 아이콘 클릭 효과
    const chatbotIcon = document.querySelector('.robot-icon');
    chatbotIcon.addEventListener('click', function() {
        alert('챗봇 서비스를 시작합니다.');
    });
    
    // 모바일 화면에서 테이블 반응형 처리
    function adjustTableForScreenSize() {
        const width = window.innerWidth;
        const table = document.querySelector('.party-table');
        
        if (width <= 576) {
            // 작은 모바일 화면에서 원내대표 열 숨기기
            const representativeHeaders = document.querySelectorAll('.party-table th:nth-child(4)');
            const representativeCells = document.querySelectorAll('.party-table td:nth-child(4)');
            
            representativeHeaders.forEach(header => {
                header.style.display = 'none';
            });
            
            representativeCells.forEach(cell => {
                cell.style.display = 'none';
            });
        } else if (width <= 768) {
            // 태블릿 화면에서 정당명 열 숨기기
            const partyNameHeaders = document.querySelectorAll('.party-table th:nth-child(3)');
            const partyNameCells = document.querySelectorAll('.party-table td:nth-child(3)');
            
            partyNameHeaders.forEach(header => {
                header.style.display = 'none';
            });
            
            partyNameCells.forEach(cell => {
                cell.style.display = 'none';
            });
        } else {
            // 큰 화면에서는 모든 열 표시
            const allHeaders = document.querySelectorAll('.party-table th');
            const allCells = document.querySelectorAll('.party-table td');
            
            allHeaders.forEach(header => {
                header.style.display = '';
            });
            
            allCells.forEach(cell => {
                cell.style.display = '';
            });
        }
    }
    
    // 초기 로드 시 실행
    adjustTableForScreenSize();
    
    // 윈도우 크기 변경 시 실행
    window.addEventListener('resize', adjustTableForScreenSize);
    
    // 테이블 행에 호버 효과 추가
    const tableRows = document.querySelectorAll('.party-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--main2)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
    
    // 이전/다음 페이지네이션 버튼 기능
    const prevButton = document.querySelector('.pagination .prev-next:first-child');
    const nextButton = document.querySelector('.pagination .prev-next:last-child');
    const pageButtons = Array.from(document.querySelectorAll('.pagination a:not(.prev-next)'));
    
    prevButton.addEventListener('click', function(e) {
        e.preventDefault();
        const activePage = document.querySelector('.pagination a.active');
        const activeIndex = pageButtons.indexOf(activePage);
        
        if (activeIndex > 0) {
            activePage.classList.remove('active');
            pageButtons[activeIndex - 1].classList.add('active');
        }
    });
    
    nextButton.addEventListener('click', function(e) {
        e.preventDefault();
        const activePage = document.querySelector('.pagination a.active');
        const activeIndex = pageButtons.indexOf(activePage);
        
        if (activeIndex < pageButtons.length - 1) {
            activePage.classList.remove('active');
            pageButtons[activeIndex + 1].classList.add('active');
        }
    });
});
