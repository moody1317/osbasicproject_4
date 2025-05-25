document.addEventListener('DOMContentLoaded', function() {
    // 퍼센트 설정 확인
    if (PercentManager.hasSettings()) {
        console.log('사용자 퍼센트 설정을 적용합니다.');
    } else {
        console.log('기본 퍼센트 설정을 사용합니다.');
    }
    // 가상의 국회의원 데이터 (300명)
    const memberData = [];
    const memberNames = [
        '나경원', '김철수', '이영희', '박민수', '정수진', '최영수', '강미경', '윤태호', '송지연', '조민철',
        '한소영', '배성우', '임도현', '노승민', '오정화', '서동훈', '유미래', '홍길동', '신영란', '김상훈',
        '이동욱', '박서연', '정민호', '최다혜', '강태진', '윤수정', '송현우', '조예린', '한민규', '배지원'
    ];
    const parties = ['국민의힘', '더불어민주당', '조국혁신당', '개혁신당', '진보당', '새로운미래', '무소속'];
    
    for (let i = 1; i <= 300; i++) {
        const randomName = memberNames[Math.floor(Math.random() * memberNames.length)];
        const randomParty = parties[Math.floor(Math.random() * parties.length)];
        const phoneNumber = `02-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        
        memberData.push({
            rank: i,
            name: `${randomName}`,
            party: randomParty,
            phone: phoneNumber,
            homepage: '#'
        });
    }

    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let sortOrder = 'desc'; // 기본값은 내림차순

    // 국회의원 상세 페이지로 이동하는 함수
    function navigateToMemberDetail(memberName) {
        // percent_member.html 페이지로 이동하면서 의원 이름을 URL 파라미터로 전달
        const memberDetailUrl = `percent_member.html?name=${encodeURIComponent(memberName)}`;
        
        console.log(`${memberName} 의원 상세 페이지로 이동: ${memberDetailUrl}`);
        
        // 실제 페이지 이동
        window.location.href = memberDetailUrl;
    }

    // 현재 페이지 데이터 가져오기
    function getCurrentPageData() {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return memberData.slice(startIndex, endIndex);
    }

    // 테이블 렌더링
    function renderTable() {
        const tableBody = document.getElementById('memberTableBody');
        const currentData = getCurrentPageData();
        
        tableBody.innerHTML = '';
        
        currentData.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-cell">${member.rank}</td>
                <td>
                    <div class="member-name" data-member-name="${member.name}">${member.name} 의원</div>
                </td>
                <td class="party-name">${member.party}</td>
                <td class="phone-number">${member.phone}</td>
                <td class="home-icon">
                    <a href="${member.homepage}" title="의원 홈페이지 바로가기">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                        </svg>
                    </a>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // 의원 이름 클릭 이벤트 추가
        addMemberNameClickEvents();
        
        // 페이지네이션 업데이트
        window.createPagination(
            memberData.length,
            currentPage,
            ITEMS_PER_PAGE,
            (newPage) => {
                currentPage = newPage;
                renderTable();
            }
        );
    }

    // 의원 이름 클릭 이벤트 추가
    function addMemberNameClickEvents() {
        const memberNameElements = document.querySelectorAll('.member-name');
        
        memberNameElements.forEach(element => {
            element.addEventListener('click', function() {
                const memberName = this.getAttribute('data-member-name');
                navigateToMemberDetail(memberName);
            });
        });
    }

    // 페이지네이션 UI 업데이트
    function updatePagination() {
        const totalPages = Math.ceil(memberData.length / ITEMS_PER_PAGE);
        const pagination = document.getElementById('pagination');
        
        if (!pagination) return;

        pagination.innerHTML = '';

        // 이전 버튼
        const prevButton = document.createElement('a');
        prevButton.href = '#';
        prevButton.className = 'navigate';
        prevButton.innerHTML = '&lt;';
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        pagination.appendChild(prevButton);

        // 페이지 번호 계산
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        // 첫 페이지
        if (startPage > 1) {
            const firstPage = createPageButton(1);
            pagination.appendChild(firstPage);
            
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
        }

        // 페이지 번호들
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = createPageButton(i);
            pagination.appendChild(pageButton);
        }

        // 마지막 페이지
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
            
            const lastPage = createPageButton(totalPages);
            pagination.appendChild(lastPage);
        }

        // 다음 버튼
        const nextButton = document.createElement('a');
        nextButton.href = '#';
        nextButton.className = 'navigate';
        nextButton.innerHTML = '&gt;';
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        pagination.appendChild(nextButton);
    }

    // 페이지 버튼 생성
    function createPageButton(pageNumber) {
        const button = document.createElement('a');
        button.href = '#';
        button.textContent = pageNumber;
        if (pageNumber === currentPage) {
            button.className = 'active';
        }
        button.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = pageNumber;
            renderTable();
        });
        return button;
    }

    // 정렬 함수
    function sortMembers(order) {
        if (order === 'asc') {
            memberData.sort((a, b) => b.rank - a.rank); // 오름차순 (300부터 1까지)
        } else {
            memberData.sort((a, b) => a.rank - b.rank); // 내림차순 (1부터 300까지)
        }
        
        // 정렬 후 순위 재설정
        memberData.forEach((member, index) => {
            if (order === 'asc') {
                member.rank = memberData.length - index;
            } else {
                member.rank = index + 1;
            }
        });

        currentPage = 1; // 정렬 후 첫 페이지로
        renderTable();
    }

    // 설정 버튼 클릭 시 드롭다운 표시
    const settingsBtn = document.getElementById('settingsBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    
    if (settingsBtn && sortDropdown) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sortDropdown.classList.toggle('active');
        });
        
        // 드롭다운 외부 클릭시 닫기
        document.addEventListener('click', function() {
            sortDropdown.classList.remove('active');
        });
        
        // 드롭다운 내부 클릭 시 이벤트 버블링 방지
        sortDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // 정렬 방식 선택 처리
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    if (dropdownItems) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', function() {
                // 활성 항목 변경
                dropdownItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                // 정렬 방식 적용
                sortOrder = this.getAttribute('data-sort');
                sortMembers(sortOrder);

                // 드롭다운 닫기
                sortDropdown.classList.remove('active');
            });
        });
    }

    // 홈페이지 아이콘 클릭 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.closest('.home-icon a')) {
            e.preventDefault();
            alert('의원 홈페이지로 이동합니다.');
        }
    });

    // 초기 렌더링
    renderTable();
});