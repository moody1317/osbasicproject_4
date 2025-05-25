document.addEventListener('DOMContentLoaded', function() {
    // 예시 법안 데이터 (더 많은 데이터 추가)
    const billData = [
        {
            id: 1,
            billNumber: "2024-001",
            title: "국민건강보험법 일부개정법률안",
            proposer: "김민수 의원 외 10인",
            date: "2024-03-15",
            status: "가결",
            committee: "보건복지위원회"
        },
        {
            id: 2,
            billNumber: "2024-002",
            title: "소득세법 일부개정법률안",
            proposer: "이정희 의원 외 15인",
            date: "2024-03-14",
            status: "부결",
            committee: "기획재정위원회"
        },
        {
            id: 3,
            billNumber: "2024-003",
            title: "교육기본법 일부개정법률안",
            proposer: "박영진 의원 외 20인",
            date: "2024-03-13",
            status: "심의중",
            committee: "교육위원회"
        },
        {
            id: 4,
            billNumber: "2024-004",
            title: "중소기업 지원에 관한 특별법안",
            proposer: "정의당",
            date: "2024-03-12",
            status: "가결",
            committee: "산업통상자원위원회"
        },
        {
            id: 5,
            billNumber: "2024-005",
            title: "환경보호법 전부개정법률안",
            proposer: "녹색당",
            date: "2024-03-11",
            status: "심의중",
            committee: "환경노동위원회"
        },
        {
            id: 6,
            billNumber: "2024-006",
            title: "근로기준법 일부개정법률안",
            proposer: "박정민 의원 외 8인",
            date: "2024-03-10",
            status: "가결",
            committee: "환경노동위원회"
        },
        {
            id: 7,
            billNumber: "2024-007",
            title: "주택법 일부개정법률안",
            proposer: "최영희 의원 외 12인",
            date: "2024-03-09",
            status: "부결",
            committee: "국토교통위원회"
        },
        {
            id: 8,
            billNumber: "2024-008",
            title: "문화예술진흥법 일부개정법률안",
            proposer: "김문수 의원 외 5인",
            date: "2024-03-08",
            status: "심의중",
            committee: "문화체육관광위원회"
        },
        {
            id: 9,
            billNumber: "2024-009",
            title: "정보통신망법 일부개정법률안",
            proposer: "이상호 의원 외 18인",
            date: "2024-03-07",
            status: "가결",
            committee: "과학기술정보방송통신위원회"
        },
        {
            id: 10,
            billNumber: "2024-010",
            title: "농어촌정비법 일부개정법률안",
            proposer: "강원도당",
            date: "2024-03-06",
            status: "심의중",
            committee: "농림축산식품해양수산위원회"
        },
        {
            id: 11,
            billNumber: "2024-011",
            title: "국방개혁법 일부개정법률안",
            proposer: "정태영 의원 외 22인",
            date: "2024-03-05",
            status: "가결",
            committee: "국방위원회"
        },
        {
            id: 12,
            billNumber: "2024-012",
            title: "지방자치법 일부개정법률안",
            proposer: "한미경 의원 외 15인",
            date: "2024-03-04",
            status: "부결",
            committee: "행정안전위원회"
        }
    ];

    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let filteredData = [...billData];

    // 본회의 상세 페이지로 이동
    function navigateToMeetingDetail(bill) {
        // URL 파라미터로 본회의 정보 전달
        const params = new URLSearchParams({
            bill_id: bill.id,
            bill_number: bill.billNumber,
            title: bill.title,
            proposer: bill.proposer,
            date: bill.date,
            status: bill.status,
            committee: bill.committee
        });
        
        console.log(`본회의 [${bill.id}] 상세 페이지로 이동`);
        
        // more_meeting.html 페이지로 이동
        window.location.href = `more_meeting.html?${params.toString()}`;
    }
    
    // 법안 목록 테이블 생성 함수
    function renderBillTable(page = 1) {
        const tableBody = document.getElementById('billTableBody');
        if (!tableBody) {
            console.error('billTableBody element not found');
            return;
        }

        // 기존 내용 초기화
        tableBody.innerHTML = '';

        // 데이터가 없는 경우 처리
        if (filteredData.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="6" style="text-align: center; padding: 40px;">표시할 법안이 없습니다.</td>';
            tableBody.appendChild(noDataRow);
            
            // 페이지네이션 업데이트 (데이터가 없어도 호출)
            if (window.createPagination) {
                window.createPagination(0, 1, ITEMS_PER_PAGE, () => {});
            }
            return;
        }

        // 페이지에 해당하는 데이터 추출
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = filteredData.slice(startIndex, endIndex);

        // 각 법안 데이터로 행 생성
        pageData.forEach((bill, index) => {
            const row = document.createElement('tr');
            
            // 상태에 따른 클래스 추가
            if (bill.status === '가결') {
                row.classList.add('passed');
            } else if (bill.status === '부결') {
                row.classList.add('rejected');
            }

            // 행 HTML 생성
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td class="bill-number">${bill.billNumber}</td>
                <td class="bill-title">${bill.title}</td>
                <td>${bill.proposer}</td>
                <td>${bill.date}</td>
                <td><span class="status-badge status-${getStatusClass(bill.status)}">${bill.status}</span></td>
            `;

            // 클릭 이벤트 추가
            row.addEventListener('click', function() {
                navigateToMeetingDetail(bill);
            });

            // 호버 효과를 위한 스타일 추가
            row.style.cursor = 'pointer';

            tableBody.appendChild(row);
        });

        // 페이지네이션 업데이트
        if (window.createPagination) {
            window.createPagination(
                filteredData.length,
                currentPage,
                ITEMS_PER_PAGE,
                (newPage) => {
                    currentPage = newPage;
                    renderBillTable(currentPage);
                }
            );
        }
    }

    // 상태에 따른 클래스명 반환
    function getStatusClass(status) {
        switch(status) {
            case '가결': return 'passed';
            case '부결': return 'rejected';
            case '심의중': return 'pending';
            default: return '';
        }
    }

    // 검색 기능
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (!searchInput || !searchButton) {
            console.error('Search elements not found');
            return;
        }

        // 검색 실행 함수
        function performSearch() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            if (!searchTerm) {
                filteredData = [...billData];
            } else {
                // 검색 결과 필터링
                filteredData = billData.filter(bill => 
                    bill.title.toLowerCase().includes(searchTerm) ||
                    bill.proposer.toLowerCase().includes(searchTerm) ||
                    bill.committee.toLowerCase().includes(searchTerm) ||
                    bill.billNumber.toLowerCase().includes(searchTerm)
                );
            }

            // 첫 페이지로 리셋
            currentPage = 1;
            renderBillTable(currentPage);
        }

        // 검색 버튼 클릭 이벤트
        searchButton.addEventListener('click', performSearch);

        // 엔터키 입력 이벤트
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // 필터 기능 설정
    function setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 활성 버튼 변경
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                const filterType = this.getAttribute('data-filter');
                applyFilter(filterType);
            });
        });
    }

    // 필터 적용
    function applyFilter(filterType) {
        switch(filterType) {
            case 'all':
                filteredData = [...billData];
                break;
            case 'passed':
                filteredData = billData.filter(bill => bill.status === '가결');
                break;
            case 'rejected':
                filteredData = billData.filter(bill => bill.status === '부결');
                break;
            case 'pending':
                filteredData = billData.filter(bill => bill.status === '심의중');
                break;
            default:
                filteredData = [...billData];
        }

        // 첫 페이지로 리셋
        currentPage = 1;
        renderBillTable(currentPage);
    }

    // 초기화 함수
    function init() {
        console.log('Initializing meeting.js...');
        
        // 테이블 렌더링
        renderBillTable(currentPage);
        
        // 검색 기능 설정
        setupSearch();
        
        // 필터 기능 설정
        setupFilters();
        
        console.log('Meeting.js initialized successfully');
    }

    // 페이지 로드 시 초기화
    init();
});
