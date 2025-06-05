document.addEventListener('DOMContentLoaded', function() {
    // ===== 환경 감지 및 설정 =====
    
    // 배포 환경 감지 
    function isVercelEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('vercel.app')) return true;
        if (hostname.includes('.vercel.app')) return true;
        
        if (hostname !== 'localhost' && 
            hostname !== '127.0.0.1' && 
            !hostname.includes('github.io') && 
            !hostname.includes('netlify.app')) {
            return true;
        }
        
        return false;
    }

    // 환경별 알림 시스템
    function showEnvironmentNotification(message, type = 'info') {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const envBadge = `[${envType}]`;
        
        const colors = {
            info: '#2196f3',
            warning: '#ff9800', 
            error: '#f44336',
            success: '#4caf50'
        };

        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification env-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 400px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: 'Courier New', monospace;
        `;
        notification.textContent = `${envBadge} ${message}`;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 환경별 자동 제거 시간 조정
        const autoRemoveTime = isVercelEnvironment() ? 4000 : 5000;
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, autoRemoveTime);
    }

    // 기존 알림 제거
    function clearExistingNotifications() {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 200);
            }
        });
    }

    // ===== 페이지네이션 및 데이터 관리 =====
    
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let filteredData = [];
    let billData = []; // API에서 가져올 데이터

    // ===== API 연동 함수들 (환경별 최적화) =====

    // 🔧 본회의 법안 데이터 가져오기 (환경별 로깅)
    async function fetchBillData() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 본회의 법안 데이터를 가져오는 중...`);
            
            showLoading();
            
            // API 서비스 확인
            if (!window.APIService) {
                throw new Error('API 서비스가 로드되지 않았습니다');
            }
            
            // 환경별 최적화된 API 호출
            const data = await window.APIService.safeApiCall(
                () => window.APIService.getBills(),
                getDefaultBillData()
            );
            
            if (data && Array.isArray(data)) {
                billData = data.map(bill => ({
                    id: bill.id,
                    billNumber: bill.bill_number || `2024-${String(bill.id).padStart(3, '0')}`,
                    title: bill.title,
                    proposer: bill.proposer,
                    date: bill.date,
                    status: bill.status,
                    committee: bill.committee
                }));
                
                filteredData = [...billData];
                console.log(`[${envType}] 본회의 법안 데이터 로드 완료:`, billData.length, '건');
                
                showEnvironmentNotification(`본회의 데이터 로드 완료 (${billData.length}건)`, 'success');
                return { success: true, dataSource: 'api' };
                
            } else {
                throw new Error('잘못된 데이터 형식');
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 본회의 법안 데이터 로드 실패:`, error);
            
            // API 실패 시 기본 데이터 사용
            billData = getDefaultBillData();
            filteredData = [...billData];
            
            showEnvironmentNotification(`API 연결 실패, 기본 데이터 사용`, 'warning');
            
            return { success: false, error: error.message, dataSource: 'default' };
            
        } finally {
            hideLoading();
            renderBillTable(currentPage);
        }
    }

    // 🔧 검색 API 호출 (환경별 로깅)
    async function searchBills(query, page = 1) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 서버에서 본회의 검색 중:`, query);
            
            if (!window.APIService || !window.APIService.searchBills) {
                throw new Error('검색 API가 사용 불가능합니다');
            }
            
            const searchResult = await window.APIService.safeApiCall(
                () => window.APIService.searchBills(query, page, ITEMS_PER_PAGE),
                null
            );
            
            if (searchResult && searchResult.results) {
                filteredData = searchResult.results;
                currentPage = page;
                
                const totalItems = searchResult.total || filteredData.length;
                renderBillTable(currentPage, totalItems);
                
                console.log(`[${envType}] 검색 완료:`, filteredData.length, '건 발견');
                showEnvironmentNotification(`'${query}' 검색 완료 (${filteredData.length}건)`, 'success');
            } else {
                throw new Error('검색 결과가 없습니다');
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 본회의 검색 실패:`, error);
            
            // 검색 실패 시 클라이언트 사이드 검색으로 폴백
            performClientSearch(query);
            showEnvironmentNotification('서버 검색 실패, 로컬 검색 사용', 'warning');
        }
    }

    // 클라이언트 사이드 검색 (폴백)
    function performClientSearch(query) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 클라이언트 사이드 검색 실행:`, query);
        
        if (!query.trim()) {
            filteredData = [...billData];
        } else {
            const searchTerm = query.toLowerCase();
            filteredData = billData.filter(bill => 
                bill.title.toLowerCase().includes(searchTerm) ||
                bill.proposer.toLowerCase().includes(searchTerm) ||
                bill.committee.toLowerCase().includes(searchTerm) ||
                bill.billNumber.toLowerCase().includes(searchTerm)
            );
        }
        
        currentPage = 1;
        renderBillTable(currentPage);
    }

    // 기본 법안 데이터 (API 실패 시 사용)
    function getDefaultBillData() {
        return [
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
    }

    // ===== UI 관련 함수들 =====

    // 로딩 표시
    function showLoading() {
        const tableBody = document.getElementById('billTableBody');
        if (tableBody) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--example);">[${envType}] 데이터를 불러오는 중...</td></tr>`;
        }
    }

    // 로딩 숨기기
    function hideLoading() {
        // renderBillTable이 호출되면서 자동으로 로딩이 사라짐
    }

    // 에러 메시지 표시 
    function showError(message) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        showEnvironmentNotification(message, 'error');
    }

    // 본회의 상세 페이지로 이동
    function navigateToMeetingDetail(bill) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        
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
        
        console.log(`[${envType}] 본회의 [${bill.id}] 상세 페이지로 이동`);
        
        // more_meeting.html 페이지로 이동
        window.location.href = `more_meeting.html?${params.toString()}`;
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
    
    // 🔧 법안 목록 테이블 생성 함수 (환경별 로깅)
    function renderBillTable(page = 1, totalItems = null) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 테이블 렌더링, 페이지:`, page, '데이터 수:', filteredData.length);
        
        const tableBody = document.getElementById('billTableBody');
        const totalBillCountElement = document.getElementById('totalBillCount');
        
        if (!tableBody) {
            console.error(`[${envType}] billTableBody 요소를 찾을 수 없습니다!`);
            return;
        }

        // 전체 데이터 수 (검색 결과의 경우 totalItems가 전달될 수 있음)
        const totalDataCount = totalItems !== null ? totalItems : filteredData.length;

        // 페이지에 해당하는 데이터 추출
        let pageData;
        if (totalItems !== null) {
            // 서버에서 이미 페이지네이션된 데이터
            pageData = filteredData;
        } else {
            // 클라이언트 사이드 페이지네이션
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            pageData = filteredData.slice(startIndex, endIndex);
        }

        // 전체 건수 업데이트
        if (totalBillCountElement) {
            totalBillCountElement.textContent = totalDataCount.toLocaleString();
            console.log(`[${envType}] 전체 건수 업데이트:`, totalDataCount);
        } else {
            console.error(`[${envType}] totalBillCount 요소를 찾을 수 없습니다!`);
        }

        // 기존 내용 초기화
        tableBody.innerHTML = '';

        // 데이터가 없는 경우 처리
        if (pageData.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `<td colspan="6" style="text-align: center; padding: 40px; color: var(--example);">[${envType}] 표시할 법안이 없습니다.</td>`;
            tableBody.appendChild(noDataRow);

            if (totalBillCountElement) {
                totalBillCountElement.textContent = '0';
            }
            
            // 페이지네이션 업데이트 (데이터가 없어도 호출)
            if (window.createPagination) {
                window.createPagination(0, 1, ITEMS_PER_PAGE, () => {});
            }
            return;
        }

        // 페이지에 해당하는 데이터 추출
        const startIndex = (page - 1) * ITEMS_PER_PAGE;

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
                totalDataCount,
                currentPage,
                ITEMS_PER_PAGE,
                (newPage) => {
                    currentPage = newPage;
                    renderBillTable(currentPage);
                }
            );
        }
    }

    // ===== 검색 및 필터 기능 =====

    // 🔧 검색 기능 (환경별 로깅)
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (!searchInput || !searchButton) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 검색 요소를 찾을 수 없습니다!`);
            return;
        }

        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 검색 기능 설정 완료`);

        // 검색 실행 함수
        async function performSearch() {
            const searchTerm = searchInput.value.trim();
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 검색 실행:`, searchTerm);
            
            if (!searchTerm) {
                filteredData = [...billData];
                currentPage = 1;
                renderBillTable(currentPage);
                console.log(`[${envType}] 검색어 없음, 전체 데이터 표시`);
                return;
            }

            // 검색 진행 중 표시
            showLoading();

            try {
                // 환경별 최적화된 검색
                if (window.APIService && window.APIService.searchBills) {
                    await searchBills(searchTerm, 1);
                } else {
                    // API 서비스가 없으면 클라이언트 사이드 검색
                    performClientSearch(searchTerm);
                    showEnvironmentNotification(`'${searchTerm}' 로컬 검색 완료`, 'success');
                }
            } catch (error) {
                console.error(`[${envType}] 검색 중 오류:`, error);
                hideLoading();
                showEnvironmentNotification('검색 중 오류가 발생했습니다', 'error');
            }
        }

        // 이벤트 리스너 추가
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // 입력값이 비어있을 때 전체 목록 표시
        searchInput.addEventListener('input', function() {
            if (this.value.trim() === '') {
                filteredData = [...billData];
                currentPage = 1;
                renderBillTable(currentPage);
            }
        });
    }

    // 🔧 필터 기능 설정 (환경별 로깅)
    function setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 필터 버튼 발견:`, filterButtons.length, '개');
        
        filterButtons.forEach((button, index) => {
            console.log(`[${envType}] 필터 버튼 설정`, index, ':', button.textContent);
            
            button.addEventListener('click', function() {
                console.log(`[${envType}] 필터 클릭:`, this.getAttribute('data-filter'));
                
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
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 필터 적용:`, filterType);
        
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

        console.log(`[${envType}] 필터 적용 완료, 결과:`, filteredData.length, '건');
        showEnvironmentNotification(`${filterType} 필터 적용 (${filteredData.length}건)`, 'info');
        
        currentPage = 1;
        renderBillTable(currentPage);
    }

    // ===== 페이지 초기화 (환경별 최적화) =====

    // 🔧 초기화 함수 (환경별 로깅)
    async function init() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 본회의 페이지 초기화 중...`);
        
        // 요소 존재 확인
        const tableBody = document.getElementById('billTableBody');
        const totalCount = document.getElementById('totalBillCount');
        const searchInput = document.getElementById('searchInput');
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        console.log(`[${envType}] 요소 확인:`);
        console.log(`- billTableBody: ${!!tableBody}`);
        console.log(`- totalBillCount: ${!!totalCount}`);
        console.log(`- searchInput: ${!!searchInput}`);
        console.log(`- filter buttons: ${filterButtons.length}`);
        
        try {
            // API 서비스 연결 확인
            if (!window.APIService) {
                console.warn(`[${envType}] API 서비스가 로드되지 않았습니다. 기본 데이터를 사용합니다.`);
                billData = getDefaultBillData();
                filteredData = [...billData];
                renderBillTable(currentPage);
                showEnvironmentNotification('API 연결 실패, 기본 데이터 사용', 'warning');
            } else {
                // API에서 데이터 로드
                console.log(`[${envType}] API 서비스 연결 확인됨, 데이터 로드 시작`);
                const result = await fetchBillData();
                
                if (!result.success) {
                    console.warn(`[${envType}] API 로드 실패, 기본 데이터 사용`);
                }
            }
            
            // 검색 기능 설정
            setupSearch();
            
            // 필터 기능 설정
            setupFilters();
            
            console.log(`[${envType}] 본회의 페이지 초기화 완료!`);
            showEnvironmentNotification('본회의 페이지 로드 완료', 'success');
            
        } catch (error) {
            console.error(`[${envType}] 페이지 초기화 중 오류:`, error);
            showEnvironmentNotification('페이지 초기화 중 오류 발생', 'error');
            
            // 오류 시 기본 데이터 사용
            billData = getDefaultBillData();
            filteredData = [...billData];
            renderBillTable(currentPage);
        }
    }

    // 🔧 환경별 최적화된 초기화 지연
    const initDelay = isVercelEnvironment() ? 200 : 100;
    setTimeout(init, initDelay);
    
    // 🆕 디버그 유틸리티 (환경별)
    window.meetingDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        getData: () => billData,
        getFiltered: () => filteredData,
        reloadData: fetchBillData,
        testSearch: (query) => performClientSearch(query),
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`API 서비스: ${!!window.APIService}`);
            console.log(`데이터 수: ${billData.length}`);
        }
    };
    
    console.log(`🚀 [${isVercelEnvironment() ? 'VERCEL' : 'LOCAL'}] 본회의 페이지 스크립트 로드 완료`);
    console.log('🔧 디버그: window.meetingDebug.showEnvInfo()');
});
