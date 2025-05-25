
document.addEventListener('DOMContentLoaded', function() {
    // 공지사항 데이터
    const announcementData = [
        {
            date: '2025.05.25',
            title: '제21대 대통령선거 출마 의원 제외 안내',
            isNew: true
        },
        {
            date: '2025.05.25',
            title: '국회의원 사진 및 정당 로고 출처 안내',
            isNew: true
        },
        {
            date: '2025.01.15',
            title: '서버 점검 안내 (1월 20일 02:00 ~ 06:00)',
            isNew: false
        },
        {
            date: '2025.01.10',
            title: '백일하 서비스 업데이트 안내 (v2.0)',
            isNew: false
        },
        {
            date: '2024.04.10',
            title: '제22대 국회의원 정보 업데이트',
            isNew: false
        }
        // 더 많은 공지사항 추가 가능
    ];

    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;

    // 공지사항 목록 렌더링
    function renderAnnouncements(page) {
        const announcementList = document.querySelector('.announcement-list');
        if (!announcementList) return;

        // 페이지에 해당하는 데이터 추출
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = announcementData.slice(startIndex, endIndex);

        // 기존 내용 초기화
        announcementList.innerHTML = '';

        // 각 공지사항 렌더링
        pageData.forEach(announcement => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="#">
                    <div class="announcement-item">
                        <span class="announcement-date">${announcement.date}</span>
                        <span class="announcement-title">${announcement.title}</span>
                        ${announcement.isNew ? '<span class="announcement-badge new">NEW</span>' : ''}
                    </div>
                </a>
            `;
            announcementList.appendChild(li);
        });

        // 클릭 이벤트 재설정
        setupAnnouncementClickEvents();

        // 페이지네이션 업데이트
        updatePagination();
    }

    // 페이지네이션 업데이트
    function updatePagination() {
        window.createPagination(
            announcementData.length,
            currentPage,
            ITEMS_PER_PAGE,
            (newPage) => {
                currentPage = newPage;
                renderAnnouncements(currentPage);
            }
        );
    }

    // 공지사항 클릭 이벤트 설정
    function setupAnnouncementClickEvents() {
        const announcementItems = document.querySelectorAll('.announcement-list a');
        
        announcementItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 공지사항 제목 가져오기
                const title = this.querySelector('.announcement-title').textContent;
                const date = this.querySelector('.announcement-date').textContent;
                
                // 상세 내용 모달 표시
                showAnnouncementDetail(title, date);
            });
        });
    }

    // 초기 렌더링
    renderAnnouncements(currentPage);
    
    // 공지사항 상세 모달 표시 함수
    function showAnnouncementDetail(title, date) {
        // 기존 모달 제거
        const existingModal = document.querySelector('.announcement-detail-modal');
        const existingBackdrop = document.getElementById('modalBackdrop');
        if (existingModal) existingModal.remove();
        if (existingBackdrop) existingBackdrop.remove();
        
        // 모달 생성
        const modal = document.createElement('div');
        modal.className = 'announcement-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        // 공지사항별 상세 내용
        let content = '';
        
        switch(title) {
            case '제21대 대통령선거 출마 의원 제외 안내':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">2025년 06월 03일에 실시하는 제21대 대통령선거 출마로 다음 의원의 정보가 제외됬었음을 알립니다.</p>
                    
                    <h4 style="color: var(--string); margin: 20px 0 10px;">더불어민주당</h4>
                    <p style="margin-bottom: 15px;">이재명</p>
                    <h4 style="color: var(--string); margin: 20px 0 10px;">개혁신당</h4>
                    <p style="margin-bottom: 15px;">이준석</p>
                `;
                break;

            case '국회의원 사진 및 정당 로고 출처 안내':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">저희가 사용하는 사진들은 각 주소에서 가져왔음을 명시합니다.</p>
                    <p style="margin-bottom: 15px;">저희는 어느 정당에 대한 악의가 없으며 비상업적 교육 목적으로 제작되었음을 알립니다.</p>
                    
                    <h4 style="color: var(--string); margin: 20px 0 10px;">정당 로고</h4>
                    <p style="margin-bottom: 15px;">각 정당의 홈페이지 및 PI 매뉴얼에 근거하여 준수하였습니다.</p>
                    <h4 style="color: var(--string); margin: 20px 0 10px;">국회의원 사진</h4>
                    <p style="margin-bottom: 15px;">열린국회정보 OpenAPI에서 제공하는 국회의원 사진을 사용하였습니다.</p>
                `; 
                break;

            case '서버 점검 안내 (1월 20일 02:00 ~ 06:00)':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">더 나은 서비스 제공을 위한 서버 점검이 예정되어 있어 안내드립니다.</p>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">점검 일시</h4>
                    <p style="margin-bottom: 15px;">2025년 1월 20일 (월) 02:00 ~ 06:00 (약 4시간)</p>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">점검 내용</h4>
                    <ul style="margin-left: 20px; margin-bottom: 15px; line-height: 1.8;">
                        <li>서버 안정성 개선</li>
                        <li>데이터베이스 최적화</li>
                        <li>보안 업데이트</li>
                    </ul>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">참고사항</h4>
                    <p>점검 시간 동안은 서비스 이용이 불가능합니다. 불편을 드려 죄송합니다.</p>
                `;
                break;
                
            case '백일하 서비스 업데이트 안내 (v2.0)':
                content = `
                    <p style="margin-bottom: 15px;">백일하가 v2.0으로 업데이트되었습니다!</p>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">주요 업데이트 내용</h4>
                    <ul style="margin-left: 20px; margin-bottom: 15px; line-height: 1.8;">
                        <li><strong>UI/UX 개선</strong>: 더욱 직관적인 인터페이스</li>
                        <li><strong>성능 최적화</strong>: 페이지 로딩 속도 50% 향상</li>
                        <li><strong>새로운 기능</strong>: 의원별 상세 통계 차트 추가</li>
                        <li><strong>모바일 최적화</strong>: 반응형 디자인 개선</li>
                    </ul>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">개선된 기능</h4>
                    <ul style="margin-left: 20px; margin-bottom: 15px; line-height: 1.8;">
                        <li>정당 비교 기능 강화</li>
                        <li>검색 필터 추가</li>
                        <li>데이터 시각화 개선</li>
                    </ul>
                    
                    <p style="margin-top: 20px;">앞으로도 더 나은 서비스를 위해 노력하겠습니다.</p>
                `;
                break;

            case '제22대 국회의원 정보 업데이트':
                content = `
                    <p style="margin-bottom: 15px;">제22대 국회의원 정보가 전면 업데이트되었습니다.</p>
        
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">업데이트 내용</h4>
                    <ul style="margin-left: 20px; margin-bottom: 15px; line-height: 1.8;">
                    <li>제22대 국회의원 300명 전원 정보 등록 완료</li>
                    <li>의원별 프로필 사진 및 기본 정보 업데이트</li>
                </ul>
                `;
                break;
                
            default:
                content = `<p>공지사항 내용이 준비 중입니다.</p>`;
        }
        
        modal.innerHTML = `
            <div style="border-bottom: 1px solid var(--side2); padding-bottom: 15px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 5px; color: var(--string);">${title}</h3>
                <p style="font-size: 14px; color: var(--example);">${date}</p>
            </div>
            <div style="line-height: 1.8; color: var(--string);">
                ${content}
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="this.closest('.announcement-detail-modal').remove(); document.getElementById('modalBackdrop').remove();" 
                        style="padding: 10px 30px; background: var(--light-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    확인
                </button>
            </div>
        `;
        
        // 배경 오버레이 생성
        const backdrop = document.createElement('div');
        backdrop.id = 'modalBackdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;
        
        backdrop.onclick = function() {
            modal.remove();
            backdrop.remove();
        };
        
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
    }
    
    // 페이지네이션 클릭 이벤트
    const paginationLinks = document.querySelectorAll('.pagination a:not(.navigate)');
    
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 활성 페이지 변경
            document.querySelector('.pagination .active').classList.remove('active');
            this.classList.add('active');
            
            // 실제 구현 시 여기서 AJAX로 해당 페이지 공지사항을 로드
            console.log('페이지 ' + this.textContent + ' 로드');
        });
    });
    
    // 페이지 로드 시 애니메이션
    const announcementSection = document.querySelector('.announcement-section');
    announcementSection.style.opacity = '0';
    announcementSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        announcementSection.style.transition = 'all 0.5s ease';
        announcementSection.style.opacity = '1';
        announcementSection.style.transform = 'translateY(0)';
    }, 100);
});
