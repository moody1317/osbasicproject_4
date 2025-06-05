// ===== 청원 현황 페이지 전용 스크립트 =====

document.addEventListener('DOMContentLoaded', function() {
    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let filteredData = [];
    let petitionData = []; // API에서 가져올 데이터

    // ===== 환경 감지 =====
    
    function isVercelEnvironment() {
        return window.percentSync ? window.percentSync.isVercelDeployment : false;
    }

    // ===== API 데이터 처리 함수들 =====

    // 재시도 포함 API 호출
    async function fetchWithRetry(apiCall, retries = 3, delay = 3000) {
        for (let i = 0; i < retries; i++) {
            try {
                const data = await apiCall();
                return data;
                
            } catch (error) {
                console.error(`API 시도 ${i + 1}/${retries} 실패:`, error.message);
                
                if (i === retries - 1) {
                    throw new Error(`${retries}회 시도 후 최종 실패: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // 지수적 백오프
            }
        }
    }

    // 서버 상태 확인
    async function checkServerStatus() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            if (!window.APIService) {
                console.warn(`[${envType}] APIService가 로드되지 않음`);
                return false;
            }
            
            if (window.APIService.checkServerStatus) {
                return await window.APIService.checkServerStatus();
            }
            
            // 기본 API 가용성 체크
            if (window.APIService.getPetitions) {
                console.log(`[${envType}] 청원 API 가용성 체크 완료`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.warn(`[${envType}] 서버 상태 확인 실패:`, error.message);
            return false;
        }
    }

    // API에서 청원 데이터 가져오기
    async function fetchPetitionData() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            showAdvancedLoading();
            console.log(`[${envType}] 청원 데이터 로드 시작`);
            
            // global_sync.js API 서비스 확인
            if (!window.APIService) {
                throw new Error('APIService가 로드되지 않음 - global_sync.js 먼저 로드 필요');
            }
            
            // 서버 상태 확인
            const serverAlive = await checkServerStatus();
            if (!serverAlive) {
                console.warn(`[${envType}] 서버 응답 불안정, 깨우기 메시지 표시`);
                showServerWakeupMessage();
            }

            // 재시도 로직으로 API 호출
            const apiCall = async () => {
                if (window.APIService.getPetitions) {
                    return await window.APIService.getPetitions();
                } else {
                    throw new Error('getPetitions 메서드 없음');
                }
            };

            const data = await fetchWithRetry(apiCall, 3, 5000);
            
            if (data && Array.isArray(data)) {
                petitionData = processPetitionData(data);
                filteredData = [...petitionData];
                hideServerMessage();
                
                console.log(`[${envType}] 청원 데이터 로드 완료:`, petitionData.length, '건');
                showSuccessMessage(`${petitionData.length}건의 청원 데이터를 성공적으로 불러왔습니다.`);
                return { success: true, dataSource: 'api' };
            } else {
                throw new Error('잘못된 데이터 형식 또는 빈 데이터');
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 청원 데이터 로드 실패:`, error);
            
            // API 실패 시 기본 데이터 사용
            petitionData = getDefaultPetitionData();
            filteredData = [...petitionData];
            
            showFallbackMessage(`${envType} 환경에서 API 연결 실패로 기본 데이터를 사용합니다.`);
            return { success: false, error: error.message, dataSource: 'default' };
            
        } finally {
            hideLoading();
            renderPetitionTable(filteredData, currentPage);
        }
    }

    // 검색 API 호출
    async function searchPetitions(query, page = 1) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 청원 검색 시도:`, query);
            
            if (window.APIService && window.APIService.searchPetitions) {
                const searchResult = await window.APIService.searchPetitions(query, page, ITEMS_PER_PAGE);
                
                if (searchResult && searchResult.results) {
                    filteredData = searchResult.results;
                    currentPage = page;
                    
                    // 페이지네이션 정보가 있으면 사용
                    const totalItems = searchResult.total || filteredData.length;
                    renderPetitionTable(filteredData, currentPage, totalItems);
                    
                    console.log(`[${envType}] 서버사이드 검색 성공:`, filteredData.length, '건');
                    return;
                }
            }
            
            // API가 없거나 실패 시 클라이언트 사이드 검색
            console.log(`[${envType}] 클라이언트사이드 검색으로 전환`);
            performClientSearch(query);
            
        } catch (error) {
            console.error('청원 검색 API 실패, 클라이언트 검색으로 전환:', error);
            performClientSearch(query);
        }
    }

    // 클라이언트 사이드 검색 (폴백)
    function performClientSearch(query) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
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

    // 서버 데이터 처리 함수
    function processPetitionData(rawData) {
        return rawData.map((petition, index) => {
            // 다양한 필드명 대응
            const title = petition.title || petition.petition_title || petition.청원명 || `청원 ${index + 1}`;
            const introducerMember = petition.introducer_member || petition.introducer || petition.소개의원 || '소개의원 정보 없음';
            const status = petition.status || petition.petition_status || petition.상태 || 'pending';
            const committee = petition.committee || petition.committee_name || petition.소관위원회 || '위원회 정보 없음';
            
            return {
                id: petition.id || index + 1,
                title: title,
                introducerMember: introducerMember,
                introduceDate: petition.introduce_date || petition.introduceDate || petition.소개일 || formatDate(new Date()),
                referralDate: petition.referral_date || petition.referralDate || petition.회부일 || formatDate(new Date()),
                status: status,
                committee: committee,
                petitionNumber: petition.petition_number || petition.petitionNumber || petition.청원번호 || `22${String(index + 1).padStart(5, '0')}`,
                billId: petition.bill_id || petition.billId || petition.법안ID || `PRC_${generateRandomId()}`,
                // API 원본 데이터 보존
                rawData: petition
            };
        });
    }

    // 날짜 포맷팅 함수
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    // 랜덤 ID 생성
    function generateRandomId() {
        return Array.from({length: 32}, () => 
            '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
        ).join('');
    }

    // ===== 기본 데이터 및 유틸리티 함수들 =====

    // 기본 청원 데이터 (API 실패 시 사용)
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
            },
            {
                id: 11,
                title: '플랫폼 노동자 권익 보호를 위한 법적 근거 마련 청원',
                introducerMember: '김종민',
                introduceDate: '2024.10.28',
                referralDate: '2024.10.31',
                status: 'review',
                committee: '환경노동위원회',
                petitionNumber: '2200070',
                billId: 'PRC_J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4'
            },
            {
                id: 12,
                title: '공공 와이파이 확대 및 품질 개선 청원',
                introducerMember: '이재명',
                introduceDate: '2024.10.25',
                referralDate: '2024.10.28',
                status: 'pending',
                committee: '과학기술정보방송통신위원회',
                petitionNumber: '2200071',
                billId: 'PRC_K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5'
            }
        ];
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

    // ===== UI 피드백 함수들 =====

    // 서버 깨우기 메시지 (환경별 메시지)
    function showServerWakeupMessage() {
        const tableBody = document.getElementById('petitionTableBody');
        const envType = isVercelEnvironment() ? 'Vercel' : '로컬';
        const envBadge = isVercelEnvironment() ? '🌐 VERCEL' : '🏠 LOCAL';
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <div class="server-wakeup-message">
                            <div class="loading-spinner-large"></div>
                            <h3>${envBadge} 서버 연결 중...</h3>
                            <p>${envType} 환경에서 API 서버에 연결하고 있습니다.</p>
                            <p>첫 요청 시 30초~1분 정도 소요될 수 있습니다.</p>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <p class="small-text">청원 데이터를 불러오는 중...</p>
                        </div>
                    </td>
                </tr>
            `;
            
            // 인라인 스타일 추가
            if (!document.getElementById('petition-wakeup-style')) {
                const style = document.createElement('style');
                style.id = 'petition-wakeup-style';
                style.textContent = `
                    .server-wakeup-message {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 15px;
                    }
                    .loading-spinner-large {
                        width: 60px;
                        height: 60px;
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #3498db;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    .progress-bar {
                        width: 350px;
                        height: 8px;
                        background-color: #f0f0f0;
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    .progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #3498db, #2ecc71);
                        width: 0%;
                        animation: progress 45s ease-in-out infinite;
                    }
                    .small-text {
                        font-size: 14px;
                        color: #666;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes progress {
                        0% { width: 0%; }
                        30% { width: 60%; }
                        60% { width: 85%; }
                        100% { width: 100%; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // 고급 로딩 표시 (환경별 메시지)
    function showAdvancedLoading() {
        const tableBody = document.getElementById('petitionTableBody');
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <div class="spinner-advanced"></div>
                            <div style="font-size: 16px; font-weight: 500;">${envBadge} 청원 데이터를 불러오는 중...</div>
                            <div style="font-size: 12px; color: #666;">API 서버에 연결 중입니다</div>
                        </div>
                    </td>
                </tr>
            `;
            
            // 스피너 CSS 추가
            if (!document.getElementById('petition-loading-style')) {
                const style = document.createElement('style');
                style.id = 'petition-loading-style';
                style.textContent = `
                    .spinner-advanced {
                        width: 40px; height: 40px; border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db; border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // 일반 로딩 표시
    function showLoading() {
        const tableBody = document.getElementById('petitionTableBody');
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--example);">${envBadge} 데이터를 불러오는 중...</td></tr>`;
        }
    }

    // 서버 메시지 숨기기
    function hideServerMessage() {
        // renderPetitionTable에서 자동으로 처리됨
    }

    // 로딩 숨기기
    function hideLoading() {
        // renderPetitionTable이 호출되면서 자동으로 로딩이 사라짐
    }

    // 성공 메시지 표시
    function showSuccessMessage(message) {
        showNotification('success', message, '✅ 데이터 로드 성공');
    }

    // 폴백 메시지 표시 (환경별)
    function showFallbackMessage(message) {
        showNotification('warning', message, '⚠️ 서버 연결 실패');
    }

    // 통합 알림 시스템
    function showNotification(type, message, title = '') {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        // 기존 알림 제거
        clearExistingNotifications();
        
        const colors = {
            success: { bg: '#27ae60', shadow: 'rgba(46, 204, 113, 0.3)' },
            warning: { bg: '#f39c12', shadow: 'rgba(243, 156, 18, 0.3)' },
            error: { bg: '#e74c3c', shadow: 'rgba(231, 76, 60, 0.3)' },
            info: { bg: '#3498db', shadow: 'rgba(52, 152, 219, 0.3)' }
        };
        
        const color = colors[type] || colors.info;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}-notification`;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, ${color.bg}, ${color.bg}dd);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px ${color.shadow};
            font-size: 14px; max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            line-height: 1.4;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">${title} ${envBadge}</div>
            <div>${message}</div>
            ${type === 'warning' ? '<div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">기본 데이터로 대체됩니다. 잠시 후 새로고침해보세요.</div>' : ''}
        `;
        
        document.body.appendChild(notification);
        
        // 슬라이드 인 애니메이션
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 자동 제거
        const duration = type === 'warning' ? 8000 : type === 'success' ? 4000 : 5000;
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
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

    // ===== 페이지 내비게이션 함수 =====

    // 청원 상세 페이지로 이동 
    function navigateToPetitionDetail(petitionId) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 청원 [${petitionId}] 상세 페이지로 이동`);
        
        const params = new URLSearchParams({
            petition_id: petitionId
        });
        
        window.location.href = `more_petition.html?${params.toString()}`;
    }

    // 페이지 변경 함수
    function changePage(page) {
        currentPage = page;
        renderPetitionTable(filteredData, currentPage);
        
        // 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===== 테이블 렌더링 및 페이지네이션 함수들 =====

    // 청원 테이블 렌더링 
    function renderPetitionTable(data, page = 1, totalItems = null) {
        const tableBody = document.getElementById('petitionTableBody');
        const totalCountElement = document.getElementById('totalCount');
        
        if (!tableBody) {
            console.error('petitionTableBody element not found!');
            return;
        }

        // 전체 데이터 수 (검색 결과의 경우 totalItems가 전달될 수 있음)
        const totalDataCount = totalItems !== null ? totalItems : data.length;

        // 페이지에 해당하는 데이터 추출
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
            const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--example);">${envBadge} 표시할 청원이 없습니다.</td></tr>`;
            
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
                <td style="text-align: center; font-weight: 500;">${globalIndex}</td>
                <td>
                    <span class="petition-title" title="${petition.title}" data-petition-id="${petition.id}">
                        ${petition.title}
                    </span>
                </td>
                <td>
                    <span class="member-name" data-member-name="${petition.introducerMember}">
                        ${petition.introducerMember || '소개의원 정보 없음'}
                    </span>
                </td>
                <td style="font-family: 'Blinker', sans-serif;">${petition.introduceDate || '-'}</td>
                <td style="font-family: 'Blinker', sans-serif;">${petition.referralDate || '-'}</td>
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
                navigateToPetitionDetail(petition.id);
            });

            // 호버 효과
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--main2)';
                this.style.cursor = 'pointer';
                this.style.transform = 'translateY(-1px)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            });

            row.addEventListener('mouseleave', function(){
                this.style.backgroundColor = '';
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });

            tableBody.appendChild(row);
        });

        // 청원 제목 및 의원명 클릭 이벤트 추가
        addClickEvents();

        // 페이지네이션 업데이트
        updatePagination(totalDataCount);
        
        // 테이블 애니메이션 추가
        setTimeout(addTableAnimation, 100);
    }

    // 클릭 이벤트 추가
    function addClickEvents() {
        // 청원 제목 클릭 이벤트
        const petitionTitles = document.querySelectorAll('.petition-title');
        petitionTitles.forEach(element => {
            element.addEventListener('click', function(e) {
                e.stopPropagation();
                const petitionId = this.getAttribute('data-petition-id');
                navigateToPetitionDetail(petitionId);
            });
        });

        // 의원명 클릭 이벤트 (의원 상세 페이지로 이동)
        const memberNames = document.querySelectorAll('.member-name');
        memberNames.forEach(element => {
            element.addEventListener('click', function(e) {
                e.stopPropagation();
                const memberName = this.getAttribute('data-member-name');
                
                if (memberName && memberName !== '소개의원 정보 없음') {
                    const params = new URLSearchParams({
                        name: memberName
                    });
                    window.location.href = `percent_member.html?${params.toString()}`;
                }
            });
        });
    }

    // 페이지네이션 업데이트
    function updatePagination(totalDataCount) {
        if (window.createPagination) {
            window.createPagination(
                totalDataCount,
                currentPage,
                ITEMS_PER_PAGE,
                changePage
            );
        }
    }

    // 테이블 행 애니메이션
    function addTableAnimation() {
        const tableRows = document.querySelectorAll('#petitionTableBody tr');
        
        tableRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.5s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    // ===== 검색 및 필터링 함수들 =====

    // 검색 기능 (환경별 로깅)
    async function performSearch() {
        const searchInput = document.getElementById('searchInput');
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
                showNotification('success', `'${searchTerm}'에 대한 검색이 완료되었습니다.`);
            } else {
                // API 서비스가 없으면 클라이언트 사이드 검색
                performClientSearch(searchTerm);
                showNotification('success', `'${searchTerm}'에 대한 검색이 완료되었습니다.`);
            }
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 검색 중 오류:`, error);
            hideLoading();
            showNotification('error', '검색 중 오류가 발생했습니다.');
        }
    }

    // 필터 적용
    function applyFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const periodFilter = document.getElementById('periodFilter');
        
        let filtered = [...petitionData];

        // 상태 필터
        const selectedStatus = statusFilter?.value;
        if (selectedStatus && selectedStatus !== 'all') {
            filtered = filtered.filter(petition => petition.status === selectedStatus);
            
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
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
                    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
                    console.warn(`[${envType}] 날짜 파싱 오류:`, petition.introduceDate);
                    return true; // 날짜 파싱 실패 시 포함
                }
            });
            
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 기간 필터 적용: ${selectedPeriod}, 결과: ${filtered.length}건`);
        }

        filteredData = filtered;
        currentPage = 1;
        renderPetitionTable(filteredData, currentPage);
        
        // 필터 적용 결과 알림
        if (selectedStatus !== 'all' || selectedPeriod !== 'all') {
            showNotification('success', `필터가 적용되었습니다. ${filtered.length}건의 청원이 표시됩니다.`);
        }
    }

    // ===== 이벤트 핸들러 설정 함수들 =====

    // 검색 이벤트 설정
    function setupSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');

        if (searchButton) {
            searchButton.addEventListener('click', performSearch);
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            // 실시간 검색 초기화 (디바운스 적용)
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (this.value.trim() === '') {
                        filteredData = [...petitionData];
                        currentPage = 1;
                        renderPetitionTable(filteredData, currentPage);
                    }
                }, 300);
            });
        }
    }

    // 필터 이벤트 설정
    function setupFilterEvents() {
        const statusFilter = document.getElementById('statusFilter');
        const periodFilter = document.getElementById('periodFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', applyFilters);
        }

        if (periodFilter) {
            periodFilter.addEventListener('change', applyFilters);
        }
    }

    // ===== 페이지 초기화 함수 =====

    // 페이지 초기화
    async function initializePage() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`🚀 [${envType}] 청원 현황 페이지 초기화 중...`);
        
        // global_sync.js 로딩 확인
        if (!window.percentSync || !window.APIService) {
            console.warn(`[${envType}] global_sync.js가 완전히 로드되지 않았습니다. 재시도 중...`);
            setTimeout(initializePage, 500);
            return;
        }
        
        console.log(`[${envType}] global_sync.js 확인 완료`);
        
        // scripts.js 로딩 확인
        if (!window.createPagination) {
            console.warn(`[${envType}] scripts.js가 완전히 로드되지 않았습니다. 재시도 중...`);
            setTimeout(initializePage, 500);
            return;
        }
        
        console.log(`[${envType}] scripts.js 확인 완료`);
        
        // 실제 API에서 데이터 로드
        const result = await fetchPetitionData();
        
        // 검색 이벤트 설정
        setupSearchEvents();
        
        // 필터 이벤트 설정
        setupFilterEvents();
        
        console.log(`✅ [${envType}] 청원 현황 페이지 초기화 완료`);
        
        // 초기화 결과 로깅
        if (result.success && result.dataSource === 'api') {
            console.log(`[${envType}] API 데이터 로드 성공: ${petitionData.length}건`);
        } else {
            console.log(`[${envType}] 기본 데이터 사용: ${petitionData.length}건`);
        }
    }

    // ===== 디버그 유틸리티 =====

    // 🆕 디버그 유틸리티
    window.petitionDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        getData: () => petitionData,
        getFiltered: () => filteredData,
        currentPage: () => currentPage,
        reloadData: () => fetchPetitionData(),
        testSearch: (query) => performClientSearch(query),
        testAPI: () => {
            if (window.vercelDebug) {
                window.vercelDebug.testPetitions();
            } else {
                console.error('vercelDebug not available');
            }
        },
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`청원 데이터: ${petitionData.length}건`);
            console.log(`필터된 데이터: ${filteredData.length}건`);
            console.log(`현재 페이지: ${currentPage}`);
            console.log(`global_sync 연동: ${!!(window.percentSync && window.APIService)}`);
            console.log(`scripts.js 연동: ${!!window.createPagination}`);
        }
    };

    // 전역 함수로 노출 (하위 호환성)
    window.changePage = changePage;
    window.showPetitionDetail = navigateToPetitionDetail;

    // 페이지 초기화 실행
    initializePage();
});
