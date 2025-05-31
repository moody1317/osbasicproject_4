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

    // 🔥 정당명을 클릭하면 percent_party 페이지로 이동하는 함수
    function navigateToPartyDetail(partyName) {
        console.log(`정당 [${partyName}] 상세 페이지로 이동`);
        
        // URL 파라미터로 정당 정보 전달
        const params = new URLSearchParams({
            party: partyName
        });
        
        // percent_party.html 페이지로 이동
        window.location.href = `percent_party.html?${params.toString()}`;
    }

    // 정렬 방식 선택 처리
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const tableBody = document.getElementById('partyTableBody'); // ✅ 수정: 올바른 ID 사용

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

    // 🔥 테이블 행에 호버 효과 및 클릭 이벤트 추가
    function addTableRowEvents() {
        const tableRows = document.querySelectorAll('.party-table tbody tr');
        tableRows.forEach(row => {
            // 호버 효과
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--main2)';
                this.style.cursor = 'pointer'; // 🔥 커서 변경
            });

            row.addEventListener('mouseleave', function(){
                this.style.backgroundColor = '';
            });

            // 🔥 클릭 이벤트 - 행 전체 클릭 시 해당 정당 페이지로 이동
            row.addEventListener('click', function() {
                // 정당명 추출 (3번째 td에서)
                const partyNameCell = this.querySelector('td:nth-child(3)');
                if (partyNameCell) {
                    const partyName = partyNameCell.textContent.trim();
                    navigateToPartyDetail(partyName);
                }
            });
        });
    }

    // 홈페이지 아이콘 클릭 효과 (이벤트 버블링 방지)
    const homeIcons = document.querySelectorAll('.home-icon a');
    homeIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // 🔥 이벤트 버블링 방지 (행 클릭 이벤트와 충돌 방지)
            alert('정당 홈페이지로 이동합니다.');
        });
    });

    // 🔥 초기화 함수 실행
    addTableRowEvents();
});
