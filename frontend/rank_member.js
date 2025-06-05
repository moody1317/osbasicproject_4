// ===== 국회의원 순위 페이지 전용 스크립트 =====

document.addEventListener('DOMContentLoaded', function() {
    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let sortOrder = 'desc'; // 기본값은 내림차순 (1위부터)
    let memberData = []; // API에서 가져올 데이터
    let filteredData = []; // 검색/필터링된 데이터

    // ===== 환경 감지 (global_sync.js 통합) =====
    
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
            
            // checkServerStatus가 없으면 간단한 health check
            if (window.APIService.getMemberRanking) {
                console.log(`[${envType}] 기본 API 가용성 체크 시도`);
                return true; // API가 있으면 일단 true
            }
            
            return false;
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.warn(`[${envType}] 서버 상태 확인 실패:`, error.message);
            return false;
        }
    }

    // 국회의원 순위 데이터 가져오기
    async function fetchMemberRanking() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            showAdvancedLoading();
            console.log(`[${envType}] 국회의원 순위 데이터 로드 시작`);
            
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

            // 퍼센트 설정 가져오기 (global_sync.js PercentSettings 사용)
            let percentSettings = null;
            try {
                if (window.PercentSettings) {
                    percentSettings = await window.PercentSettings.get();
                    console.log(`[${envType}] 퍼센트 설정 적용:`, percentSettings);
                }
            } catch (error) {
                console.warn(`[${envType}] 퍼센트 설정 로드 실패, 기본값 사용:`, error);
            }

            // 재시도 로직으로 API 호출
            const apiCall = async () => {
                if (window.APIService.getMemberRanking) {
                    return await window.APIService.getMemberRanking(percentSettings);
                } else {
                    throw new Error('getMemberRanking 메서드 없음');
                }
            };

            const data = await fetchWithRetry(apiCall, 3, 5000);
            
            if (data && Array.isArray(data)) {
                memberData = processMemberData(data);
                filteredData = [...memberData];
                hideServerMessage();
                
                console.log(`[${envType}] 국회의원 데이터 로드 완료:`, memberData.length, '명');
                showSuccessMessage(`${memberData.length}명의 의원 데이터를 성공적으로 불러왔습니다.`);
            } else {
                throw new Error('잘못된 데이터 형식');
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 국회의원 순위 데이터 로드 실패:`, error);
            
            // API 실패 시 기본 데이터 사용
            memberData = getDefaultMemberData();
            filteredData = [...memberData];
            
            showFallbackMessage(`${envType} 환경에서 API 연결 실패로 기본 데이터를 사용합니다.`);
            
        } finally {
            hideLoading();
            renderTable();
        }
    }

    // 검색 API 호출
    async function searchMembers(query, page = 1) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 의원 검색 시도:`, query);
            
            if (window.APIService && window.APIService.searchMembers) {
                const data = await window.APIService.searchMembers(query, page);
                
                if (data) {
                    filteredData = data.results || data; // API 응답 구조에 따라 조정
                    currentPage = page;
                    renderTable();
                    console.log(`[${envType}] 서버사이드 검색 성공:`, filteredData.length, '건');
                    return;
                }
            }
            
            // API가 없거나 실패 시 클라이언트 사이드 검색
            console.log(`[${envType}] 클라이언트사이드 검색으로 전환`);
            performClientSearch(query);
            
        } catch (error) {
            console.error('검색 API 실패, 클라이언트 검색으로 전환:', error);
            performClientSearch(query);
        }
    }

    // 클라이언트 사이드 검색 (폴백)
    function performClientSearch(query) {
        if (!query.trim()) {
            filteredData = [...memberData];
        } else {
            const searchTerm = query.toLowerCase();
            filteredData = memberData.filter(member => 
                member.name.toLowerCase().includes(searchTerm) ||
                member.party.toLowerCase().includes(searchTerm) ||
                member.district.toLowerCase().includes(searchTerm)
            );
        }
        
        currentPage = 1;
        renderTable();
    }

    // 서버 데이터 처리 함수
    function processMemberData(rawData) {
        return rawData.map((member, index) => {
            // 다양한 필드명 대응
            const name = member.name || member.member_name || member.의원명 || `의원${index + 1}`;
            const party = member.party || member.party_name || member.정당명 || '정당 정보 없음';
            const district = member.district || member.constituency || member.지역구 || `지역구${index + 1}`;
            const score = member.total_score || member.weighted_performance || member.performance || 0;
            
            return {
                rank: index + 1,
                name: name,
                party: party,
                district: district,
                phone: member.phone || generatePhoneNumber(),
                homepage: member.homepage || member.website || '#',
                totalScore: parseFloat(score) || 0,
                photo: member.photo || member.profile_image || null,
                // API 원본 데이터 보존
                rawData: member
            };
        });
    }

    // ===== 기본 데이터 및 유틸리티 함수들 =====

    // 랜덤 전화번호 생성
    function generatePhoneNumber() {
        return `02-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    }

    // 기본 국회의원 데이터 (API 실패 시 사용)
    function getDefaultMemberData() {
        const memberNames = [
            '김철수', '이영희', '박민수', '정수진', '최영수', '강미경', '윤태호', '송지연', '조민철', '한소영',
            '배성우', '임도현', '노승민', '오정화', '서동훈', '유미래', '홍길동', '신영란', '김상훈', '이동욱',
            '박서연', '정민호', '최다혜', '강태진', '윤수정', '송현우', '조예린', '한민규', '배지원', '나경원'
        ];
        const parties = ['국민의힘', '더불어민주당', '조국혁신당', '개혁신당', '진보당', '기본소득당', '무소속'];
        
        const data = [];
        for (let i = 1; i <= 300; i++) {
            const randomName = memberNames[Math.floor(Math.random() * memberNames.length)];
            const randomParty = parties[Math.floor(Math.random() * parties.length)];
            const phoneNumber = generatePhoneNumber();
            
            data.push({
                rank: i,
                name: `${randomName}`,
                party: randomParty,
                district: `지역구${i}`,
                phone: phoneNumber,
                homepage: '#',
                totalScore: Math.random() * 100
            });
        }
        
        return data;
    }

    // ===== UI 피드백 함수들 =====

    // 서버 깨우기 메시지 (환경별 메시지)
    function showServerWakeupMessage() {
        const tableBody = document.getElementById('memberTableBody');
        const envType = isVercelEnvironment() ? 'Vercel' : '로컬';
        const envBadge = isVercelEnvironment() ? '🌐 VERCEL' : '🏠 LOCAL';
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <div class="server-wakeup-message">
                            <div class="loading-spinner-large"></div>
                            <h3>${envBadge} 서버 연결 중...</h3>
                            <p>${envType} 환경에서 API 서버에 연결하고 있습니다.</p>
                            <p>첫 요청 시 30초~1분 정도 소요될 수 있습니다.</p>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <p class="small-text">국회의원 데이터를 불러오는 중...</p>
                        </div>
                    </td>
                </tr>
            `;
            
            // 인라인 스타일 추가
            if (!document.getElementById('member-wakeup-style')) {
                const style = document.createElement('style');
                style.id = 'member-wakeup-style';
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
        const tableBody = document.getElementById('memberTableBody');
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <div class="spinner-advanced"></div>
                            <div style="font-size: 16px; font-weight: 500;">${envBadge} 국회의원 데이터를 불러오는 중...</div>
                            <div style="font-size: 12px; color: #666;">API 서버에 연결 중입니다</div>
                        </div>
                    </td>
                </tr>
            `;
            
            // 스피너 CSS 추가
            if (!document.getElementById('member-loading-style')) {
                const style = document.createElement('style');
                style.id = 'member-loading-style';
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

    // 서버 메시지 숨기기
    function hideServerMessage() {
        // renderTable에서 자동으로 처리됨
    }

    // 로딩 숨기기
    function hideLoading() {
        // renderTable이 호출되면서 자동으로 로딩이 사라짐
    }

    // 성공 메시지 표시
    function showSuccessMessage(message) {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
            font-size: 14px; max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">✅ ${envBadge} 데이터 로드 성공</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // 슬라이드 인 애니메이션
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // 폴백 메시지 표시 (환경별)
    function showFallbackMessage(message) {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
            font-size: 14px; max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">⚠️ ${envBadge} 서버 연결 실패</div>
            <div>${message}</div>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
                기본 데이터로 대체됩니다. 잠시 후 새로고침해보세요.
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 8000);
    }

    // ===== 페이지 내비게이션 함수 =====

    // 국회의원 상세 페이지로 이동하는 함수
    function navigateToMemberDetail(memberName) {
        console.log(`의원 [${memberName}] 상세 페이지로 이동`);
        
        const params = new URLSearchParams({
            name: memberName
        });
        
        window.location.href = `percent_member.html?${params.toString()}`;
    }

    // ===== 테이블 렌더링 및 페이지네이션 함수들 =====

    // 현재 페이지 데이터 가져오기
    function getCurrentPageData() {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, endIndex);
    }

    // 테이블 렌더링
    function renderTable() {
        const tableBody = document.getElementById('memberTableBody');
        const totalMemberCountElement = document.getElementById('totalMemberCount');
        const currentData = getCurrentPageData();
        
        if (!tableBody) {
            console.error('memberTableBody element not found!');
            return;
        }

        // 전체 건수 업데이트
        if (totalMemberCountElement) {
            totalMemberCountElement.textContent = filteredData.length.toLocaleString();
        }
        
        tableBody.innerHTML = '';
        
        if (currentData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">표시할 의원이 없습니다.</td></tr>';
            updatePagination();
            return;
        }
        
        currentData.forEach((member, index) => {
            const row = document.createElement('tr');
            const displayRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            
            row.innerHTML = `
                <td class="rank-cell">${member.rank || displayRank}</td>
                <td>
                    <div class="member-info-cell">
                        ${member.photo ? `<img src="${member.photo}" alt="${member.name}" class="member-photo-small" 
                                              style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 10px; float: left;"
                                              onerror="this.style.display='none'">` : ''}
                        <div class="member-name" data-member-name="${member.name}">${member.name} 의원</div>
                        <div class="member-district" style="font-size: 12px; color: #666; clear: both;">${member.district}</div>
                    </div>
                </td>
                <td class="party-name">${member.party}</td>
                <td class="phone-number">${member.phone}</td>
                <td class="home-icon">
                    <a href="${member.homepage}" title="의원 홈페이지 바로가기" onclick="event.stopPropagation();">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                        </svg>
                    </a>
                </td>
            `;
            
            // 행 클릭 이벤트 추가 (홈페이지 아이콘 제외)
            row.addEventListener('click', function(e) {
                if (!e.target.closest('.home-icon')) {
                    const memberName = this.querySelector('.member-name').getAttribute('data-member-name');
                    navigateToMemberDetail(memberName);
                }
            });
            
            // 호버 효과
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--main2)';
                this.style.cursor = 'pointer';
            });

            row.addEventListener('mouseleave', function(){
                this.style.backgroundColor = '';
            });
            
            tableBody.appendChild(row);
        });

        // 의원 이름 클릭 이벤트 추가
        addMemberNameClickEvents();
        
        // 페이지네이션 업데이트
        updatePagination();
        
        // 테이블 애니메이션 추가
        setTimeout(addTableAnimation, 100);
    }

    // 의원 이름 클릭 이벤트 추가
    function addMemberNameClickEvents() {
        const memberNameElements = document.querySelectorAll('.member-name');
        
        memberNameElements.forEach(element => {
            element.addEventListener('click', function(e) {
                e.stopPropagation(); // 행 클릭 이벤트와 중복 방지
                const memberName = this.getAttribute('data-member-name');
                navigateToMemberDetail(memberName);
            });
        });
    }

    // 페이지네이션 업데이트
    function updatePagination() {
        if (window.createPagination) {
            window.createPagination(
                filteredData.length,
                currentPage,
                ITEMS_PER_PAGE,
                (newPage) => {
                    currentPage = newPage;
                    renderTable();
                }
            );
        }
    }

    // 테이블 행 애니메이션
    function addTableAnimation() {
        const tableRows = document.querySelectorAll('#memberTableBody tr');
        
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

    // ===== 정렬 및 필터링 함수들 =====

    // 정렬 함수
    function sortMembers(order) {
        if (order === 'desc') {
            filteredData.sort((a, b) => (a.rank || 0) - (b.rank || 0)); // 내림차순 (1위부터)
        } else {
            filteredData.sort((a, b) => (b.rank || 0) - (a.rank || 0)); // 오름차순 (300위부터)
        }

        currentPage = 1; // 정렬 후 첫 페이지로
        renderTable();
    }

    // 필터 적용
    function applyFilter(filterType) {
        if (filterType === 'all') {
            filteredData = [...memberData];
        } else {
            filteredData = memberData.filter(member => member.party === filterType);
        }
        
        currentPage = 1;
        renderTable();
    }

    // ===== 이벤트 핸들러 설정 함수들 =====

    // 검색 기능 설정
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (!searchInput || !searchButton) {
            console.warn('검색 요소를 찾을 수 없습니다');
            return;
        }

        // 검색 실행 함수
        async function performSearch() {
            const searchTerm = searchInput.value.trim();
            
            if (!searchTerm) {
                filteredData = [...memberData];
                currentPage = 1;
                renderTable();
                return;
            }

            // 검색어가 있으면 서버 사이드 검색 시도
            await searchMembers(searchTerm, 1);
        }

        // 이벤트 리스너 추가
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // 실시간 검색 (디바운스 적용)
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (this.value.trim() === '') {
                    filteredData = [...memberData];
                    currentPage = 1;
                    renderTable();
                }
            }, 300);
        });
    }

    // 필터 기능 설정
    function setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        if (!filterButtons.length) {
            console.warn('필터 버튼을 찾을 수 없습니다');
            return;
        }
        
        filterButtons.forEach((button, index) => {
            button.addEventListener('click', function() {
                // 활성 버튼 변경
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                const filterType = this.getAttribute('data-filter');
                applyFilter(filterType);
            });
        });
    }

    // 정렬 드롭다운 설정
    function setupSortDropdown() {
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
        
        if (dropdownItems.length) {
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
    }

    // 홈페이지 링크 클릭 이벤트 설정
    function setupHomepageLinks() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.home-icon a')) {
                e.preventDefault();
                e.stopPropagation();
                
                const link = e.target.closest('.home-icon a');
                const href = link.getAttribute('href');
                
                if (href && href !== '#') {
                    window.open(href, '_blank');
                } else {
                    alert('의원 홈페이지 정보가 없습니다.');
                }
            }
        });
    }

    // ===== 퍼센트 설정 확인 및 변경 감지 =====

    // 퍼센트 설정 확인
    async function checkPercentSettings() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            if (!window.PercentSettings) {
                console.warn(`[${envType}] PercentSettings가 로드되지 않음`);
                return;
            }
            
            const settings = await window.PercentSettings.get();
            
            if (settings) {
                console.log(`[${envType}] 사용자 퍼센트 설정을 적용합니다.`);
                console.log(`[${envType}] 현재 퍼센트 설정:`, settings);
            } else {
                console.log(`[${envType}] 기본 퍼센트 설정을 사용합니다.`);
            }
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 퍼센트 설정 확인 오류:`, error);
        }
    }

    // 퍼센트 설정 변경 감지
    function setupPercentSettingsWatcher() {
        if (window.PercentSettings && window.PercentSettings.onChange) {
            window.PercentSettings.onChange(async function(newSettings) {
                const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
                console.log(`[${envType}] 퍼센트 설정이 변경되었습니다. 순위를 다시 계산합니다.`);
                await fetchMemberRanking();
            });
        }
    }

    // ===== 페이지 초기화 함수 =====

    // 페이지 초기화
    async function initializePage() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`🚀 [${envType}] 국회의원 순위 페이지 초기화 중...`);
        
        // global_sync.js 로딩 확인
        if (!window.percentSync || !window.APIService) {
            console.warn(`[${envType}] global_sync.js가 완전히 로드되지 않았습니다. 재시도 중...`);
            setTimeout(initializePage, 500);
            return;
        }
        
        console.log(`[${envType}] global_sync.js 확인 완료`);
        
        // scripts.js 로딩 확인
        if (!window.PercentManager) {
            console.warn(`[${envType}] scripts.js가 완전히 로드되지 않았습니다. 재시도 중...`);
            setTimeout(initializePage, 500);
            return;
        }
        
        console.log(`[${envType}] scripts.js 확인 완료`);
        
        // 퍼센트 설정 확인
        await checkPercentSettings();
        
        // 퍼센트 설정 변경 감지 설정
        setupPercentSettingsWatcher();
        
        // 실제 API에서 데이터 로드
        await fetchMemberRanking();
        
        // 검색 기능 설정
        setupSearch();
        
        // 필터 기능 설정
        setupFilters();
        
        // 정렬 드롭다운 설정
        setupSortDropdown();
        
        // 홈페이지 링크 이벤트 설정
        setupHomepageLinks();
        
        console.log(`✅ [${envType}] 국회의원 순위 페이지 초기화 완료`);
    }

    // ===== 디버그 유틸리티 =====

    // 🆕 디버그 유틸리티
    window.memberRankDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        memberCount: () => memberData.length,
        filteredCount: () => filteredData.length,
        currentPage: () => currentPage,
        reloadData: () => fetchMemberRanking(),
        testServerStatus: () => checkServerStatus(),
        testSearch: (query) => searchMembers(query),
        testAPI: () => {
            if (window.vercelDebug) {
                window.vercelDebug.testPerformance();
            } else {
                console.error('vercelDebug not available');
            }
        },
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`의원 데이터: ${memberData.length}명`);
            console.log(`필터된 데이터: ${filteredData.length}명`);
            console.log(`현재 페이지: ${currentPage}`);
            console.log(`정렬 순서: ${sortOrder}`);
            console.log(`global_sync 연동: ${!!(window.percentSync && window.APIService)}`);
            console.log(`scripts.js 연동: ${!!window.PercentManager}`);
        }
    };

    // 페이지 초기화 실행
    initializePage();
});
