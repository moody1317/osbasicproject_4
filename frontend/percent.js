document.addEventListener('DOMContentLoaded', function() {
    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let filteredData = [];
    let petitionData = []; // API에서 가져올 데이터

    // ===== 환경별 대응 함수 =====

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

    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';

    // 🔧 API에서 청원 데이터 가져오기 (환경별 최적화)
    async function fetchPetitionData() {
        try {
            showLoading();
            console.log(`[${envType}] 청원 데이터를 가져오는 중...`);
            
            // API 서비스 확인
            if (!window.APIService) {
                throw new Error('API 서비스가 로드되지 않았습니다');
            }
            
            // API에서 청원 데이터 가져오기
            const data = await window.APIService.getPetitions();
            
            if (data && Array.isArray(data)) {
                petitionData = data;
                filteredData = [...petitionData];
                
                console.log(`[${envType}] 청원 데이터 로드 완료:`, petitionData.length, '건');
                console.log(`[${envType}] 첫 번째 청원 데이터 샘플:`, petitionData[0]);
                
                return { success: true, dataSource: 'api' };
                
            } else {
                throw new Error('잘못된 데이터 형식 또는 빈 데이터');
            }
            
        } catch (error) {
            console.error(`[${envType}] 청원 데이터 로드 실패:`, error);
            
            // API 실패 시 기본 데이터 사용
            petitionData = getDefaultPetitionData();
            filteredData = [...petitionData];
            
            return { success: false, error: error.message, dataSource: 'default' };
            
        } finally {
            hideLoading();
            renderPetitionTable(filteredData, currentPage);
        }
    }

    // 🔧 검색 API 호출 (환경별 로깅)
    async function searchPetitions(query, page = 1) {
        try {
            console.log(`[${envType}] 서버에서 청원 검색 중:`, query);
            
            if (!window.APIService || !window.APIService.searchPetitions) {
                throw new Error('검색 API가 사용 불가능합니다');
            }
            
            const searchResult = await window.APIService.searchPetitions(query, page, ITEMS_PER_PAGE);
            
            if (searchResult && searchResult.results) {
                filteredData = searchResult.results;
                currentPage = page;
                
                // 페이지네이션 정보가 있으면 사용
                const totalItems = searchResult.total || filteredData.length;
                renderPetitionTable(filteredData, currentPage, totalItems);
                
                console.log(`[${envType}] 검색 완료:`, filteredData.length, '건 발견');
            } else {
                throw new Error('검색 결과가 없습니다');
            }
            
        } catch (error) {
            console.error(`[${envType}] 청원 검색 실패:`, error);
            
            // 검색 실패 시 클라이언트 사이드 검색으로 폴백
            performClientSearch(query);
        }
    }

    // 🔧 클라이언트 사이드 검색 (환경별 로깅)
    function performClientSearch(query) {
        console.log(`[${envType}] 클라이언트 사이드 검색 실행:`, query);
        
        if (!query.trim()) {
            filteredData = [...petitionData];
        } else {
            const searchTerm = query.toLowerCase();
            filteredData = petitionData.filter(petition => 
                petition.title.toLowerCase().includes(searchTerm) ||
                petition.introducerMember.toLowerCase().includes(searchTerm) ||
                (petition.committee && petition.committee.toLowerCase().includes(searchTerm))
            );
        }
        
        currentPage = 1;
        renderPetitionTable(filteredData, currentPage);
    }

    // 기본 청원 데이터
    function getDefaultPetitionData() {
        return [
            {
                id: 1,
                title: '인공지능 기본법 제정 촉구에 관한 청원',
                introducerMember: '오병일',
                introduceDate: '2024.12.03',
                referralDate: '2024.12.05',
                status: 'rejected',
                committee: '과학기술정보방송통신위원회',
                petitionNumber: '2200060',
                billId: 'PRC_X2U4Y1O2J0N3D1Z7L1M7T1Y5V8H8K5'
            },
            {
                id: 2,
                title: '청년 주택 구입 지원을 위한 특별법 제정 청원',
                introducerMember: '김영호',
                introduceDate: '2024.11.20',
                referralDate: '2024.11.22',
                status: 'committee',
                committee: '국토교통위원회',
                petitionNumber: '2200061',
                billId: 'PRC_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5'
            },
            {
                id: 3,
                title: '반려동물 의료비 부담 완화를 위한 건강보험 적용 청원',
                introducerMember: '박민정',
                introduceDate: '2024.11.18',
                referralDate: '2024.11.21',
                status: 'review',
                committee: '보건복지위원회',
                petitionNumber: '2200062',
                billId: 'PRC_B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'
            },
            {
                id: 4,
                title: '대학생 등록금 부담 경감을 위한 정책 개선 청원',
                introducerMember: '이준석',
                introduceDate: '2024.11.15',
                referralDate: '2024.11.18',
                status: 'complete',
                committee: '교육위원회',
                petitionNumber: '2200063',
                billId: 'PRC_C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7'
            },
            {
                id: 5,
                title: '소상공인 임대료 지원 확대 방안 마련 청원',
                introducerMember: '최수진',
                introduceDate: '2024.11.12',
                referralDate: '2024.11.15',
                status: 'committee',
                committee: '중소벤처기업위원회',
                petitionNumber: '2200064',
                billId: 'PRC_D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8'
            },
            {
                id: 6,
                title: '육아휴직 급여 인상 및 기간 연장 청원',
                introducerMember: '한민수',
                introduceDate: '2024.11.10',
                referralDate: '2024.11.13',
                status: 'complete',
                committee: '환경노동위원회',
                petitionNumber: '2200065',
                billId: 'PRC_E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9'
            },
            {
                id: 7,
                title: '온라인 게임 셧다운제 개선 청원',
                introducerMember: '정하늘',
                introduceDate: '2024.11.08',
                referralDate: '2024.11.11',
                status: 'review',
                committee: '과학기술정보방송통신위원회',
                petitionNumber: '2200066',
                billId: 'PRC_F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0'
            },
            {
                id: 8,
                title: '택시 요금 현실화 및 승차거부 방지 청원',
                introducerMember: '윤상호',
                introduceDate: '2024.11.05',
                referralDate: '2024.11.08',
                status: 'committee',
                committee: '국토교통위원회',
                petitionNumber: '2200067',
                billId: 'PRC_G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1'
            },
            {
                id: 9,
                title: '농산물 가격 안정화를 위한 정책 수립 청원',
                introducerMember: '강은미',
                introduceDate: '2024.11.03',
                referralDate: '2024.11.06',
                status: 'pending',
                committee: '농림축산식품해양수산위원회',
                petitionNumber: '2200068',
                billId: 'PRC_H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2'
            },
            {
                id: 10,
                title: '치킨집 영업시간 규제 완화 청원',
                introducerMember: '오세훈',
                introduceDate: '2024.11.01',
                referralDate: '2024.11.04',
                status: 'rejected',
                committee: '행정안전위원회',
                petitionNumber: '2200069',
                billId: 'PRC_I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3'
            }
        ];
    }

    // 🔧 로딩 표시 (환경별)
    function showLoading() {
        const tableBody = document.getElementById('petitionTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--example);">[${envType}] 데이터를 불러오는 중...</td></tr>`;
        }
    }

    // 로딩 숨기기
    function hideLoading() {
        // renderPetitionTable이 호출되면서 자동으로 로딩이 사라짐
    }

    // 🔧 에러 메시지 표시 (환경별)
    function showError(message) {
        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">❌ ${envType} 오류</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    // 🔧 성공 메시지 표시 (환경별)
    function showSuccess(message) {
        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification success-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">✅ ${envType} 성공</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    // 🆕 경고 메시지 표시
    function showWarning(message) {
        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification warning-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #ff9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">⚠️ ${envType} 경고</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 4초 후 자동 제거
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
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

    // 상태별 한국어 매핑 
    const statusMap = {
        'pending': '접수',
        'review': '심사중', 
        'committee': '위원회 심사',
        'complete': '처리완료',
        'rejected': '불채택'
    };

    // 상태별 CSS 클래스 매핑 
    const statusClassMap = {
        'pending': 'status-pending',
        'review': 'status-review',
        'committee': 'status-committee', 
        'complete': 'status-complete',
        'rejected': 'status-rejected'
    };

    // 페이지 변경 함수 
    window.changePage = function(page) {
        currentPage = page;
        renderPetitionTable(filteredData, currentPage);
        
        // 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 청원 테이블 렌더링 
    function renderPetitionTable(data, page = 1, totalItems = null) {
        const tableBody = document.getElementById('petitionTableBody');
        const totalCountElement = document.getElementById('totalCount');
        
        if (!tableBody) return;

        // 전체 데이터 수 (검색 결과의 경우 totalItems가 전달될 수 있음)
        const totalDataCount = totalItems !== null ? totalItems : data.length;

        // 페이지에 해당하는 데이터 추출 (검색 결과가 이미 페이지별로 제한된 경우가 아니라면)
        let pageData;
        if (totalItems !== null) {
            // 서버에서 이미 페이지네이션된 데이터
            pageData = data;
        } else {
            // 클라이언트 사이드 페이지네이션
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            pageData = data.slice(startIndex, endIndex);
        }

        // 전체 건수 업데이트
        if (totalCountElement) {
            totalCountElement.textContent = totalDataCount.toLocaleString();
        }

        // 기존 내용 초기화
        tableBody.innerHTML = '';

        // 데이터가 없는 경우
        if (pageData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--example);">[${envType}] 표시할 청원이 없습니다.</td></tr>`;
            
            if (window.createPagination) {
                window.createPagination(0, 1, ITEMS_PER_PAGE, () => {});
            }
            return;
        }

        // 각 청원 데이터로 행 생성
        pageData.forEach((petition, index) => {
            const row = document.createElement('tr');
            const globalIndex = ((page - 1) * ITEMS_PER_PAGE) + index + 1;
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
                    <span class="petition-title" title="${petition.title}">
                        ${petition.title}
                    </span>
                </td>
                <td>
                    <span class="member-name">
                        ${petition.introducerMember || '소개의원 정보 없음'}
                    </span>
                </td>
                <td>${petition.introduceDate || '-'}</td>
                <td>${petition.referralDate || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <span class="committee-name" title="${petition.committee || ''}">
                        ${petition.committee || '위원회 정보 없음'}
                    </span>
                </td>
            `;

            // 행 전체에 클릭 이벤트 추가
            row.addEventListener('click', function() {
                showPetitionDetail(petition.id);
            });

            // 호버 효과를 위한 스타일 추가
            row.style.cursor = 'pointer';

            tableBody.appendChild(row);
        });

        // 페이지네이션 업데이트
        if (window.createPagination) {
            window.createPagination(totalDataCount, page, ITEMS_PER_PAGE, window.changePage);
        }
    }

    // 청원 상세 페이지로 이동 
    window.showPetitionDetail = function(petitionId) {
        console.log(`[${envType}] 청원 [${petitionId}] 상세 페이지로 이동`);
        
        // more_petition.html 페이지로 이동
        window.location.href = `more_petition.html?petition_id=${petitionId}`;
    };

    // 🔧 검색 기능 (환경별 로깅)
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        
        if (searchTerm === '') {
            filteredData = [...petitionData];
            currentPage = 1;
            renderPetitionTable(filteredData, currentPage);
            return;
        }

        // 검색 진행 중 표시
        showLoading();

        try {
            // 서버 사이드 검색 시도
            if (window.APIService && window.APIService.searchPetitions) {
                await searchPetitions(searchTerm, 1);
                showSuccess(`'${searchTerm}'에 대한 검색이 완료되었습니다.`);
            } else {
                // API 서비스가 없으면 클라이언트 사이드 검색
                performClientSearch(searchTerm);
                showSuccess(`'${searchTerm}'에 대한 검색이 완료되었습니다.`);
            }
        } catch (error) {
            console.error(`[${envType}] 검색 중 오류:`, error);
            hideLoading();
            showError('검색 중 오류가 발생했습니다.');
        }
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

        // 입력값이 비어있을 때 전체 목록 표시
        searchInput.addEventListener('input', function() {
            if (this.value.trim() === '') {
                filteredData = [...petitionData];
                currentPage = 1;
                renderPetitionTable(filteredData, currentPage);
            }
        });
    }

    // 🔧 필터 기능 (환경별 로깅)
    const statusFilter = document.getElementById('statusFilter');
    const periodFilter = document.getElementById('periodFilter');

    function applyFilters() {
        let filtered = [...petitionData];

        // 상태 필터
        const selectedStatus = statusFilter?.value;
        if (selectedStatus && selectedStatus !== 'all') {
            filtered = filtered.filter(petition => petition.status === selectedStatus);
            console.log(`[${envType}] 상태 필터 적용: ${selectedStatus}, 결과: ${filtered.length}건`);
        }

        // 기간 필터
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
                try {
                    const petitionDate = new Date(petition.introduceDate.replace(/\./g, '-'));
                    return petitionDate >= cutoffDate;
                } catch (error) {
                    console.warn(`[${envType}] 날짜 파싱 오류:`, petition.introduceDate);
                    return true; // 날짜 파싱 실패 시 포함
                }
            });
            
            console.log(`[${envType}] 기간 필터 적용: ${selectedPeriod}, 결과: ${filtered.length}건`);
        }

        filteredData = filtered;
        currentPage = 1;
        renderPetitionTable(filteredData, currentPage);
        
        // 필터 적용 결과 알림
        if (selectedStatus !== 'all' || selectedPeriod !== 'all') {
            showSuccess(`필터가 적용되었습니다. ${filtered.length}건의 청원이 표시됩니다.`);
        }
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    if (periodFilter) {
        periodFilter.addEventListener('change', applyFilters);
    }

    // 🔧 페이지 초기화 (환경별 최적화)
    async function initializePage() {
        console.log(`[${envType}] 청원 페이지 초기화 중...`);
        
        try {
            // API 서비스 연결 확인
            if (!window.APIService) {
                console.warn(`[${envType}] API 서비스가 로드되지 않았습니다. 기본 데이터를 사용합니다.`);
                petitionData = getDefaultPetitionData();
                filteredData = [...petitionData];
                renderPetitionTable(filteredData, currentPage);
                showError('API 연결 실패. 기본 데이터를 표시합니다.');
                return;
            }
            
            console.log(`[${envType}] APIService 확인 완료, API 데이터 로드 시작`);
            
            // API에서 데이터 로드 시도
            const result = await fetchPetitionData();
            
            // 결과에 따른 적절한 알림 표시
            if (result.success) {
                if (result.dataSource === 'api') {
                    showSuccess(`청원 데이터가 성공적으로 로드되었습니다. (총 ${petitionData.length}건)`);
                }
            } else {
                if (result.dataSource === 'default') {
                    showError(`청원 데이터를 불러오는데 실패했습니다. 기본 데이터를 사용합니다.\n오류: ${result.error}`);
                }
            }
            
            console.log(`[${envType}] 청원 페이지 초기화 완료`);
            
        } catch (error) {
            console.error(`[${envType}] 페이지 초기화 오류:`, error);
            
            // 초기화 실패 시 기본 데이터 사용
            petitionData = getDefaultPetitionData();
            filteredData = [...petitionData];
            renderPetitionTable(filteredData, currentPage);
            showError('페이지 초기화 중 오류가 발생했습니다. 기본 데이터를 표시합니다.');
        }
    }

    // 페이지 초기화 실행
    initializePage();
    
    // 🆕 개발자 도구용 디버그 함수 (환경별 정보 추가)
    window.debugPetition = {
        env: () => envType,
        getData: () => petitionData,
        getFiltered: () => filteredData,
        reloadData: fetchPetitionData,
        testSearch: (query) => performClientSearch(query),
        showEnvInfo: () => {
            console.log(`현재 환경: ${envType}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`청원 데이터: ${petitionData.length}건`);
            console.log(`필터된 데이터: ${filteredData.length}건`);
            console.log(`현재 페이지: ${currentPage}`);
            console.log(`APIService 사용 가능: ${!!window.APIService}`);
        }
    };
    
    console.log(`[${envType}] 청원 페이지 스크립트 로드 완료`);
});
