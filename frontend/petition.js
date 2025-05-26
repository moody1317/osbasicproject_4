document.addEventListener('DOMContentLoaded', function() {
    // 청원 더미 데이터
    const petitionData = [
        {
            id: 1,
            title: '청년 주택 구입 지원을 위한 특별법 제정 청원',
            introducerMember: '김영호',
            introduceDate: '2025.05.20',
            referralDate: '2025.05.22',
            status: 'committee',
            committee: '국토교통위원회'
        },
        {
            id: 2,
            title: '반려동물 의료비 부담 완화를 위한 건강보험 적용 청원',
            introducerMember: '박민정',
            introduceDate: '2025.05.18',
            referralDate: '2025.05.21',
            status: 'review',
            committee: '보건복지위원회'
        },
        {
            id: 3,
            title: '대학생 등록금 부담 경감을 위한 정책 개선 청원',
            introducerMember: '이준석',
            introduceDate: '2025.05.15',
            referralDate: '2025.05.18',
            status: 'complete',
            committee: '교육위원회'
        },
        {
            id: 4,
            title: '소상공인 임대료 지원 확대 방안 마련 청원',
            introducerMember: '최수진',
            introduceDate: '2025.05.12',
            referralDate: '2025.05.15',
            status: 'committee',
            committee: '중소벤처기업위원회'
        },
        {
            id: 5,
            title: '육아휴직 급여 인상 및 기간 연장 청원',
            introducerMember: '한민수',
            introduceDate: '2025.05.10',
            referralDate: '2025.05.13',
            status: 'complete',
            committee: '환경노동위원회'
        },
        {
            id: 6,
            title: '온라인 게임 셧다운제 개선 청원',
            introducerMember: '정하늘',
            introduceDate: '2025.05.08',
            referralDate: '2025.05.11',
            status: 'review',
            committee: '과학기술정보방송통신위원회'
        },
        {
            id: 7,
            title: '택시 요금 현실화 및 승차거부 방지 청원',
            introducerMember: '윤상호',
            introduceDate: '2025.05.05',
            referralDate: '2025.05.08',
            status: 'committee',
            committee: '국토교통위원회'
        },
        {
            id: 8,
            title: '농산물 가격 안정화를 위한 정책 수립 청원',
            introducerMember: '강은미',
            introduceDate: '2025.05.03',
            referralDate: '2025.05.06',
            status: 'pending',
            committee: '농림축산식품해양수산위원회'
        },
        {
            id: 9,
            title: '치킨집 영업시간 규제 완화 청원',
            introducerMember: '오세훈',
            introduceDate: '2025.05.01',
            referralDate: '2025.05.04',
            status: 'rejected',
            committee: '행정안전위원회'
        },
        {
            id: 10,
            title: '전기차 충전소 확대 설치 청원',
            introducerMember: '임종석',
            introduceDate: '2025.04.28',
            referralDate: '2025.05.01',
            status: 'complete',
            committee: '산업통상자원중소벤처기업위원회'
        },
        {
            id: 11,
            title: '학교급식 친환경 식재료 의무 사용 청원',
            introducerMember: '김희경',
            introduceDate: '2025.04.25',
            referralDate: '2025.04.28',
            status: 'committee',
            committee: '교육위원회'
        },
        {
            id: 12,
            title: '펜션 및 민박업 규제 개선 청원',
            introducerMember: '박주민',
            introduceDate: '2025.04.22',
            referralDate: '2025.04.25',
            status: 'review',
            committee: '문화체육관광위원회'
        },
        {
            id: 13,
            title: '외국인 관광객 대상 의료관광 활성화 청원',
            introducerMember: '안철수',
            introduceDate: '2025.04.20',
            referralDate: '2025.04.23',
            status: 'complete',
            committee: '보건복지위원회'
        },
        {
            id: 14,
            title: '공공병원 확충 및 의료 접근성 개선 청원',
            introducerMember: '심상정',
            introduceDate: '2025.04.18',
            referralDate: '2025.04.21',
            status: 'committee',
            committee: '보건복지위원회'
        },
        {
            id: 15,
            title: '재택근무 확산을 위한 근로기준법 개정 청원',
            introducerMember: '류호정',
            introduceDate: '2025.04.15',
            referralDate: '2025.04.18',
            status: 'review',
            committee: '환경노동위원회'
        }
    ];

    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let filteredData = [...petitionData];

    // 상태별 한국어 매핑
    const statusMap = {
        'pending': '접수',
        'review': '심사중', 
        'committee': '위원회 회부',
        'complete': '처리완료',
        'rejected': '폐기'
    };

    // 상태별 CSS 클래스 매핑
    const statusClassMap = {
        'pending': 'status-pending',
        'review': 'status-review',
        'committee': 'status-committee', 
        'complete': 'status-complete',
        'rejected': 'status-rejected'
    };

    // 페이지 변경 함수 (전역으로 노출)
    window.changePage = function(page) {
        currentPage = page;
        renderPetitionTable(filteredData, currentPage);
        
        // 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 청원 테이블 렌더링
    function renderPetitionTable(data, page = 1) {
        const tableBody = document.getElementById('petitionTableBody');
        const totalCountElement = document.getElementById('totalCount');
        
        if (!tableBody) return;

        // 페이지에 해당하는 데이터 추출
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = data.slice(startIndex, endIndex);

        // 전체 건수 업데이트
        if (totalCountElement) {
            totalCountElement.textContent = data.length.toLocaleString();
        }

        // 기존 내용 초기화
        tableBody.innerHTML = '';

        // 각 청원 데이터로 행 생성
        pageData.forEach((petition, index) => {
            const row = document.createElement('tr');
            const globalIndex = startIndex + index + 1;
            const statusText = statusMap[petition.status] || petition.status;
            const statusClass = statusClassMap[petition.status] || '';

            // 상태에 따른 행 클래스 추가
            if (petition.status === 'complete') {
                row.classList.add('status-complete');
            } else if (petition.status === 'rejected') {
                row.classList.add('status-rejected');
            }

            // 행 HTML 생성
            row.innerHTML = `
                <td>${globalIndex}</td>
                <td>
                    <a href="#" class="petition-title" onclick="showPetitionDetail(${petition.id})">
                        ${petition.title}
                    </a>
                </td>
                <td>
                    <a href="#" class="member-link" onclick="showMemberDetail('${petition.introducerMember}')">
                        ${petition.introducerMember}
                    </a>
                </td>
                <td>${petition.introduceDate}</td>
                <td>${petition.referralDate}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <span class="committee-name" title="${petition.committee}">
                        ${petition.committee}
                    </span>
                </td>
            `;

            tableBody.appendChild(row);
        });

        // 페이지네이션 업데이트 (scripts.js의 createPagination 사용)
        if (window.createPagination) {
            window.createPagination(data.length, page, ITEMS_PER_PAGE, window.changePage);
        }
    }

    // 청원 상세 페이지로 이동 (전역 함수)
    window.showPetitionDetail = function(petitionId) {
        console.log(`청원 [${petitionId}] 상세 페이지로 이동`);
        
        // more_petition.html 페이지로 이동
        window.location.href = `more_petition.html?petition_id=${petitionId}`;
    };

    // 의원 상세 링크 (전역 함수)
    window.showMemberDetail = function(memberName) {
        alert(`${memberName} 의원의 상세 정보 페이지로 이동합니다.\n(현재 개발 중)`);
    };

    // 검색 기능
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            filteredData = [...petitionData];
        } else {
            filteredData = petitionData.filter(petition => 
                petition.title.toLowerCase().includes(searchTerm) ||
                petition.introducerMember.toLowerCase().includes(searchTerm) ||
                petition.committee.toLowerCase().includes(searchTerm)
            );
        }
        
        currentPage = 1;
        renderPetitionTable(filteredData, currentPage);
    }

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // 필터 기능
    const statusFilter = document.getElementById('statusFilter');
    const periodFilter = document.getElementById('periodFilter');

    function applyFilters() {
        let filtered = [...petitionData];

        // 상태 필터
        const selectedStatus = statusFilter?.value;
        if (selectedStatus && selectedStatus !== 'all') {
            filtered = filtered.filter(petition => petition.status === selectedStatus);
        }

        // 기간 필터 (간단한 예시)
        const selectedPeriod = periodFilter?.value;
        if (selectedPeriod && selectedPeriod !== 'all') {
            const now = new Date();
            const cutoffDate = new Date();
            
            switch(selectedPeriod) {
                case 'month1':
                    cutoffDate.setMonth(now.getMonth() - 1);
                    break;
                case 'month3':
                    cutoffDate.setMonth(now.getMonth() - 3);
                    break;
                case 'month6':
                    cutoffDate.setMonth(now.getMonth() - 6);
                    break;
                case 'year1':
                    cutoffDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            filtered = filtered.filter(petition => {
                const petitionDate = new Date(petition.introduceDate.replace(/\./g, '-'));
                return petitionDate >= cutoffDate;
            });
        }

        filteredData = filtered;
        currentPage = 1;
        renderPetitionTable(filteredData, currentPage);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    if (periodFilter) {
        periodFilter.addEventListener('change', applyFilters);
    }

    // 초기 렌더링
    renderPetitionTable(filteredData, currentPage);
});
