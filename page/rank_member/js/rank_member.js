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
    const homeIcons = document.querySelectorAll('.home-icon a');
    homeIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            alert('의원 홈페이지로 이동합니다.');
        });
    });
    
    // 테이블 행에 호버 효과 추가
    const tableRows = document.querySelectorAll('.member-table tbody tr');
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
    
    // 챗봇 아이콘 클릭 효과
    const chatbotIcon = document.querySelector('.robot-icon');
    chatbotIcon.addEventListener('click', function() {
        alert('챗봇 서비스를 시작합니다.');
    });

    // 전화번호 클릭 시 전화 걸기 기능 (모바일)
    const phoneNumbers = document.querySelectorAll('.phone-number');
    phoneNumbers.forEach(phone => {
        phone.addEventListener('click', function() {
            if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                const phoneNumber = this.textContent.trim().replace(/-/g, '');
                window.location.href = `tel:${phoneNumber}`;
            }
        });
        
        // 모바일 기기에서만 커서와 스타일 변경
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            phone.style.cursor = 'pointer';
            phone.style.textDecoration = 'underline';
        }
    });

    // 테이블 정렬 기능
    const sortableHeaders = document.querySelectorAll('.member-table th');
    sortableHeaders.forEach(header => {
        if (header.textContent.trim() !== '의원 홈페이지') {
            header.style.cursor = 'pointer';
            
            header.addEventListener('click', function() {
                const index = Array.from(this.parentNode.children).indexOf(this);
                const rows = Array.from(document.querySelectorAll('.member-table tbody tr'));
                
                // 현재 정렬 방향 확인
                const isAscending = !this.classList.contains('sort-asc');
                
                // 모든 헤더에서 정렬 클래스 제거
                sortableHeaders.forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                
                // 현재 헤더에 정렬 클래스 추가
                this.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
                
                // 테이블 행 정렬
                rows.sort((a, b) => {
                    let aValue, bValue;
                    
                    if (index === 0) { // 순위 열
                        aValue = parseInt(a.querySelector('.rank-cell').textContent);
                        bValue = parseInt(b.querySelector('.rank-cell').textContent);
                    } else if (index === 1) { // 국회의원명 열
                        aValue = a.querySelector('.member-name').textContent.trim();
                        bValue = b.querySelector('.member-name').textContent.trim();
                    } else if (index === 2) { // 정당명 열
                        aValue = a.querySelector('.party-name').textContent.trim();
                        bValue = b.querySelector('.party-name').textContent.trim();
                    } else if (index === 3) { // 연락처 열
                        aValue = a.querySelector('.phone-number').textContent.trim();
                        bValue = b.querySelector('.phone-number').textContent.trim();
                    }
                    
                    // 오름차순 또는 내림차순 정렬
                    if (isAscending) {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });
                
                // 정렬된 행을 테이블에 다시 추가
                const tbody = document.querySelector('.member-table tbody');
                rows.forEach(row => tbody.appendChild(row));
            });
        }
    });
});
