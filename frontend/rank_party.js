document.addEventListener('DOMContentLoaded', function() {
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
    
    // 국회의원 데이터 300명
    const memberData = [];
    const memberNames = [
        '나경원', '김철수', '이영희', '박민수', '정수진', '최영수', '강미경', '윤태호', '송지연', '조민철',
        '한소영', '배성우', '임도현', '노승민', '오정화', '서동훈', '유미래', '홍길동', '신영란', '김상훈',
        '이동욱', '박서연', '정민호', '최다혜', '강태진', '윤수정', '송현우', '조예린', '한민규', '배지원'
    ];
    const parties = ['국민의힘', '더불어민주당', '조국혁신당', '개혁신당', '진보당', '사회민주당', '무소속', '기본소득당'];
    
    for (let i = 1; i <= 300; i++) {
        const randomName = memberNames[Math.floor(Math.random() * memberNames.length)];
        const randomParty = parties[Math.floor(Math.random() * parties.length)];
        const phoneNumber = `02-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
                
        memberData.push({
            rank: i,
            name: `${randomName} 의원`,
            party: randomParty,
            phone: phoneNumber,
            homepage: '#'
        });
    }

    // 페이지네이션 설정
    const itemsPerPage = 10;
    const totlaPages = Math.ceil(memberData.length / itemsPerPage);
    let currentPage = 1;
    let sortOrder = 'desc';


    // 현재 페이지 데이터 가져오기
    function getCurrentPageData() {
        const startIndex = (currentPage - 1)*itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return memberData.slice(startIndex, endIndex);
    }

    // 테이블 렌더링
    function renderTable() {
        const tableBody = document.getElementById('memberTalbeBody');
        const currentData = getCurrentPageData();

        tableBody.innerHTML = '';

        currentData.forEach(member => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-cell">${member.rank}</td>
                <td>
                    <div class="member-name">${mamber.name}</div>
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

        // 페이지 정보 업데이트
        updatePageInfo();
    }

    function updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        const startRank = (currentPage - 1)*itemsPerPage + 1;
        const endRank = Math.min(currentPage*itemsPerPage, memberData.length);
        pageInfo.textContent = `전체 ${memberData.length}명 중 ${startRank}-${endRank}위 (${currentPage}/${totalPages} 페이지)`;
    }

    // 페이지네이션 생성
    function createPagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        // 이전 버튼
        const prevBtn = document.createElement('a');
        prevBtn.href = '#';
        prevBtn.className = 'prev-next';
        prevBtn.textContent = '<< 이전';
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                renderTable();
                createPagination();
            }
        });
        pagination.appendChild(prevBtn);

        // 페이지 번호 버튼 생성 로직
        const maxVisiblePages = 10;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // 시작 페이지 조정
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // 첫 페이지와 생략 부호
        if (startPage > 1) {
            const firstBtn = createPageButton(1);
            pagination.appendChild(firstBtn);
                    
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            }
        }

        // 페이지 번호 버튼들
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = createPageButton(i);
            pagination.appendChild(pageBtn);
        }

        // 마지막 페이지와 생략 부호
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            }
                    
            const lastBtn = createPageButton(totalPages);
            pagination.appendChild(lastBtn);
        }
        // 다음 버튼
        const nextBtn = document.createElement('a');
        nextBtn.href = '#';
        nextBtn.className = 'prev-next';
        nextBtn.textContent = '다음 >>';
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
                createPagination();
            }
        });
        pagination.appendChild(nextBtn);
    }
    
    // 페이지 버튼 생성
    function createPageButton(pageNum) {
        const pageBtn = document.createElement('a');
        pageBtn.href = '#';
        pageBtn.textContent = pageNum;
        if (pageNum === currentPage) {
            pageBtn.className = 'active';
        }
        pageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = pageNum;
            renderTable();
            createPagination();
        });
        return pageBtn;
    }
    
    // 정렬 방식 선택 처리
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const tableBody = document.getElementById('partyTableBody');

    if (dropdownItems && tableBody) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', function() {
                // 활성 항목 변경
                dropdownItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                // 정렬 방식 적용
                const sortOrder = this.getAttribute('data-sort');
                sortTable(sortOrder);

                // 드롭다운 닫기
                sortDropdown.classList.remove('active');
            });
        });
    }

    // 테이블 정렬 함수
    function sortTable(order) {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const rankA = parseInt(a.querySelector('.rank-cell').textContent);
            const rankB = parseInt(b.querySelector('.rank-cell').textContent);

            if (order === 'asc') {
                return rankB - rankA; // 오름차순 (8부터 1까지)
            } else {
                return rankA - rankB; // 내림차순 (1부터 8까지)
            }
        });

        // 정렬된 행을 테이블에 다시 추가
        rows.forEach(row => {
            tableBody.appendChild(row);
        });

        // 순위 번호 재설정
        updateRankNumbers(order);
    }

    // 순위 번호 업데이트 함수
    function updateRankNumbers(order) {
        const rankCells = tableBody.querySelectorAll('.rank-cell');

        if (order === 'asc') {
            // 오름차순 (8부터 1까지)
            rankCells.forEach((cell, index) => {
                cell.textContent = 8 - index;
            });
        } else {
            // 내림차순 (1부터 8까지)
            rankCells.forEach((cell, index) => {
                cell.textContent = index + 1;
            });
        }
    }

    // 테이블 행에 호버 효과 추가
    const tableRows = document.querySelectorAll('.party-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--main2)';
        });

        row.addEventListener('mouseleave', function(){
            this.style.backgroundColor = '';
        });
    });

    // 홈페이지 아이콘 클릭 효과
    const homeIcons = document.querySelectorAll('.home-icon a');
    homeIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            alert('의원 홈페이지로 이동합니다.');
        });
    });

    renderTable();
    createPagination();
});