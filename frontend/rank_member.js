document.addEventListener('DOMContentLoaded', function() {
    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let sortOrder = 'desc'; // 기본값은 내림차순 (1위부터)
    let memberData = []; // API에서 가져올 데이터
    let filteredData = []; // 검색/필터링된 데이터

    // ===== 환경별 API 호출 로직 =====

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

    // 🔧 서버 상태 확인 (환경별 대응)
    async function checkServerStatus() {
        try {
            // Vercel 환경에서는 프록시를 통해 확인
            if (isVercelEnvironment()) {
                console.log('[VERCEL] 프록시를 통한 서버 상태 확인');
                const response = await fetch('/api/performance/party-weighted-performance/', {
                    method: 'HEAD'
                });
                return response.ok;
            } 
            // 로컬 환경에서는 APIService를 통해 확인
            else {
                console.log('[LOCAL] APIService를 통한 서버 상태 확인');
                if (window.APIService && window.APIService.checkServerStatus) {
                    return await window.APIService.checkServerStatus();
                }
                
                // APIService가 없으면 기본적으로 true 반환
                return true;
            }
        } catch (error) {
            console.warn('서버 상태 확인 실패:', error.message);
            return false;
        }
    }

    // 🔧 국회의원 순위 데이터 가져오기 (환경별 최적화)
    async function fetchMemberRanking() {
        try {
            showAdvancedLoading();
            
            // 1. 환경 확인 및 로깅
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 국회의원 순위 데이터 로드 시작`);
            
            // 2. 서버 상태 확인 (환경별)
            const serverAlive = await checkServerStatus();
            if (!serverAlive) {
                console.warn(`[${envType}] 서버 응답 불안정, 깨우기 메시지 표시`);
                showServerWakeupMessage();
            }

            // 3. 퍼센트 설정 가져오기
            let percentSettings = null;
            try {
                if (window.PercentManager) {
                    percentSettings = await PercentManager.getSettingsForBackend();
                    console.log(`[${envType}] 퍼센트 설정 적용:`, percentSettings);
                }
            } catch (error) {
                console.warn(`[${envType}] 퍼센트 설정 로드 실패, 기본값 사용:`, error);
            }

            // 4. API 서비스 확인
            if (!window.APIService || !window.APIService.getMemberRanking) {
                throw new Error('APIService가 로드되지 않음');
            }

            // 5. 재시도 로직으로 API 호출
            const apiCall = async () => {
                return await window.APIService.getMemberRanking(percentSettings);
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
            console.error('국회의원 순위 데이터 로드 실패:', error);
            
            // API 실패 시 기본 데이터 사용
            memberData = getDefaultMemberData();
            filteredData = [...memberData];
            
            const envType = isVercelEnvironment() ? 'Vercel' : '로컬';
            showFallbackMessage(`${envType} 환경에서 API 연결 실패로 기본 데이터를 사용합니다.`);
            
        } finally {
            hideLoading();
            renderTable();
        }
    }

    // 🆕 성공 메시지 표시
    function showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
            font-size: 14px; max-width: 400px;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">✅ 데이터 로드 성공</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 4000);
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
                photo: member.photo || member.profile_image || null
            };
        });
    }

    // 🔧 서버 깨우기 메시지 (환경별 메시지)
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
                        <style>
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
                        </style>
                    </td>
                </tr>
            `;
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
                        <style>
                            .spinner-advanced {
                                width: 40px; height: 40px; border: 4px solid #f3f3f3;
                                border-top: 4px solid #3498db; border-radius: 50%;
                                animation: spin 1s linear infinite;
                            }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        </style>
                    </td>
                </tr>
            `;
        }
    }

    // 서버 메시지 숨기기
    function hideServerMessage() {
        // renderTable에서 자동으로 처리됨
    }

    // 🔧 폴백 메시지 표시 (환경별)
    function showFallbackMessage(message) {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
            font-size: 14px; max-width: 400px;
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
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 8000);
    }

    // 🔧 검색 API 호출 (환경별 최적화)
    async function searchMembers(query, page = 1) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 의원 검색 시도:`, query);
            
            if (window.APIService && window.APIService.searchMembers) {
                const data = await APIService.searchMembers(query, page);
                
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
            // 검색 실패 시 클라이언트 사이드 검색으로 폴백
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

    // 랜덤 전화번호 생성
    function generatePhoneNumber() {
        return `02-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    }

    // 기본 국회의원 데이터
    function getDefaultMemberData() {
        const memberNames = [
            '김철수', '이영희', '박민수', '정수진', '최영수', '강미경', '윤태호', '송지연', '조민철', '한소영',
            '배성우', '임도현', '노승민', '오정화', '서동훈', '유미래', '홍길동', '신영란', '김상훈', '이동욱',
            '박서연', '정민호', '최다혜', '강태진', '윤수정', '송현우', '조예린', '한민규', '배지원', '나경원'
        ];
        const parties = ['국민의힘', '더불어민주당', '조국혁신당', '개혁신당', '진보당', '새로운미래', '무소속'];
        
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
    
    // 로딩 표시
    function showLoading() {
        const tableBody = document.getElementById('memberTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">데이터를 불러오는 중...</td></tr>';
        }
    }

    // 로딩 숨기기
    function hideLoading() {
        // renderTable이 호출되면서 자동으로 로딩이 사라짐
    }

    // 에러 메시지 표시
    function showError(message) {
        const notification = document.createElement('div');
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
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }

    // 퍼센트 설정 확인
    async function checkPercentSettings() {
        try {
            if (!window.PercentManager) {
                return;
            }
            
            const hasSettings = await PercentManager.hasSettings();
            
            if (hasSettings) {
                const settings = await PercentManager.getSettings();
            }
        } catch (error) {
            // 퍼센트 설정 확인 오류 시 기본값 사용
        }
    }

    // 국회의원 상세 페이지로 이동하는 함수
    function navigateToMemberDetail(memberName) {
        const memberDetailUrl = `percent_member.html?name=${encodeURIComponent(memberName)}`;
        window.location.href = memberDetailUrl;
    }

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
            return;
        }

        // 전체 건수 업데이트
        if (totalMemberCountElement) {
            totalMemberCountElement.textContent = filteredData.length.toLocaleString();
        }
        
        tableBody.innerHTML = '';
        
        if (currentData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">표시할 의원이 없습니다.</td></tr>';
            
            // 페이지네이션 업데이트 (데이터가 없어도 호출)
            if (window.createPagination) {
                window.createPagination(0, 1, ITEMS_PER_PAGE, () => {});
            }
            return;
        }
        
        currentData.forEach((member, index) => {
            const row = document.createElement('tr');
            const displayRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            
            row.innerHTML = `
                <td class="rank-cell">${member.rank || displayRank}</td>
                <td>
                    <div class="member-info">
                        ${member.photo ? `<img src="${member.photo}" alt="${member.name}" class="member-photo-small" 
                                              style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 10px;"
                                              onerror="this.style.display='none'">` : ''}
                        <div class="member-name" data-member-name="${member.name}">${member.name} 의원</div>
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
            row.style.cursor = 'pointer';
            
            tableBody.appendChild(row);
        });

        // 의원 이름 클릭 이벤트 추가
        addMemberNameClickEvents();
        
        // 페이지네이션 업데이트
        updatePagination();
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

    // 검색 기능 설정
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (!searchInput || !searchButton) {
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
    }

    // 필터 기능 설정
    function setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
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

    // 퍼센트 설정 변경 감지
    if (window.PercentSettings) {
        window.PercentSettings.onChange(async function(newSettings) {
            // 새로운 설정으로 순위 재계산
            await fetchMemberRanking();
        });
    }

    // 🔧 페이지 초기화 (환경별 로깅 추가)
    async function initializePage() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`🚀 [${envType}] rank_member.js 초기화 시작`);
        
        // 퍼센트 설정 확인
        await checkPercentSettings();
        
        // API 서비스 확인 및 데이터 로드
        if (!window.APIService) {
            console.warn(`[${envType}] APIService 없음, 기본 데이터 사용`);
            memberData = getDefaultMemberData();
            filteredData = [...memberData];
            renderTable();
        } else {
            console.log(`[${envType}] APIService 사용 가능, API 데이터 로드`);
            // API에서 데이터 로드 (재시도 로직 포함)
            await fetchMemberRanking();
        }
        
        // 검색 기능 설정
        setupSearch();
        
        // 필터 기능 설정
        setupFilters();
        
        console.log(`✅ [${envType}] rank_member.js 초기화 완료`);
    }

    // 페이지 초기화 실행
    initializePage();

    // 🆕 디버그 유틸리티 추가
    window.memberRankDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        memberCount: () => memberData.length,
        filteredCount: () => filteredData.length,
        currentPage: () => currentPage,
        reloadData: () => fetchMemberRanking(),
        testServerStatus: () => checkServerStatus(),
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`의원 데이터: ${memberData.length}명`);
            console.log(`필터된 데이터: ${filteredData.length}명`);
        }
    };
});
