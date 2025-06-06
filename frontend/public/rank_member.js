document.addEventListener('DOMContentLoaded', function() {
    // 퍼센트 설정 확인
    if (typeof PercentManager !== 'undefined' && PercentManager.hasSettings()) {
        console.log('사용자 퍼센트 설정을 적용합니다.');
    } else {
        console.log('기본 퍼센트 설정을 사용합니다.');
    }

    // API 데이터 저장용 변수
    let memberData = [];
    let filteredData = []; // 검색 및 필터링된 데이터
    let currentSortOrder = 'asc'; // 기본 정렬: 오름차순
    
    // 페이지네이션 설정
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;

    // DOM 요소들
    const tableBody = document.getElementById('memberTableBody');
    const settingsBtn = document.getElementById('settingsBtn');
    const sortDropdown = document.getElementById('sortDropdown');

    // 🚀 페이지 로드 시 API 데이터 불러오기
    async function loadMemberData() {
        try {
            console.log('국회의원 랭킹 데이터를 API에서 불러오는 중...');
            
            // 로딩 상태 표시
            showLoadingState();
            
            // API에서 국회의원 실적 데이터 가져오기
            if (typeof window.APIService !== 'undefined') {
                console.log('APIService를 통해 국회의원 실적 데이터 요청 중...');
                
                // 국회의원 실적 API 호출
                const data = await window.APIService.getMemberPerformance();
                console.log('API에서 받은 국회의원 실적 데이터:', data);
                
                if (data && Array.isArray(data) && data.length > 0) {
                    memberData = processApiData(data);
                    filteredData = [...memberData]; // 초기에는 모든 데이터 표시
                    renderTable();
                    updateMemberCount(); // 의원 수 업데이트
                    console.log(`✅ API 데이터로 테이블 생성 완료 (${memberData.length}명)`);
                } else {
                    throw new Error('API 데이터가 비어있거나 올바르지 않음');
                }
            } else {
                throw new Error('API 서비스를 사용할 수 없음');
            }
            
        } catch (error) {
            console.error('API 데이터 로드 실패:', error);
            
            // 폴백: 기본 데이터 사용
            console.log('폴백 데이터 사용 중...');
            memberData = getFallbackData();
            filteredData = [...memberData]; // 초기에는 모든 데이터 표시
            renderTable();
            updateMemberCount(); // 의원 수 업데이트
            
            // 사용자에게 알림
            if (window.APIService && window.APIService.showNotification) {
                window.APIService.showNotification('API 연결 실패, 기본 데이터를 표시합니다', 'warning');
            }
        }
    }

    // API 데이터 처리 함수 (새로운 스키마 적용)
    function processApiData(apiData) {
        return apiData.map((member, index) => {
            // 새로운 API 스키마에 맞춰 매핑
            const memberName = member.lawmaker_name || member.member_name || member.name || '알 수 없는 의원';
            const partyName = member.party || member.party_name || '무소속';
            const totalScore = member.total_score || member.total_socre || member.weighted_performance || member.performance || 0;
            
            return {
                rank: index + 1,
                name: memberName,
                party: partyName,
                phone: member.phone || member.contact || generatePhoneNumber(),
                performance: parseFloat(totalScore) || 0, // 숫자로 변환
                homepage: member.homepage || member.website || '#'
            };
        }).sort((a, b) => b.performance - a.performance); // 총 실적순으로 정렬
    }

    // 전화번호 생성 함수 (API에서 제공되지 않는 경우)
    function generatePhoneNumber() {
        return `02-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    }

    // 폴백 데이터 (API 실패 시 사용)
    function getFallbackData() {
        const memberNames = [
            '나경원', '김철수', '이영희', '박민수', '정수진', '최영수', '강미경', '윤태호', '송지연', '조민철',
            '한소영', '배성우', '임도현', '노승민', '오정화', '서동훈', '유미래', '홍길동', '신영란', '김상훈',
            '이동욱', '박서연', '정민호', '최다혜', '강태진', '윤수정', '송현우', '조예린', '한민규', '배지원'
        ];
        const parties = ['국민의힘', '더불어민주당', '조국혁신당', '개혁신당', '진보당', '새로운미래', '무소속'];
        
        const fallbackData = [];
        for (let i = 1; i <= 300; i++) {
            const randomName = memberNames[Math.floor(Math.random() * memberNames.length)];
            const randomParty = parties[Math.floor(Math.random() * parties.length)];
            const phoneNumber = generatePhoneNumber();
            
            fallbackData.push({
                rank: i,
                name: randomName,
                party: randomParty,
                phone: phoneNumber,
                performance: Math.random() * 100,
                homepage: '#'
            });
        }
        
        return fallbackData.sort((a, b) => b.performance - a.performance);
    }

    // 로딩 상태 표시 함수
    function showLoadingState() {
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        국회의원 실적 데이터를 불러오는 중...
                    </td>
                </tr>
            `;
        }
    }

    // 국회의원 상세 페이지로 이동하는 함수
    function navigateToMemberDetail(memberName) {
        // percent_member.html 페이지로 이동하면서 의원 이름을 URL 파라미터로 전달
        const memberDetailUrl = `percent_member.html?name=${encodeURIComponent(memberName)}`;
        
        console.log(`${memberName} 의원 상세 페이지로 이동: ${memberDetailUrl}`);
        
        // 실제 페이지 이동
        window.location.href = memberDetailUrl;
    }

    // 의원 수 업데이트 함수
    function updateMemberCount() {
        const totalMemberCountElement = document.getElementById('totalMemberCount');
        if (totalMemberCountElement) {
            totalMemberCountElement.textContent = filteredData.length.toLocaleString();
        }
    }

    // 현재 페이지 데이터 가져오기
    function getCurrentPageData() {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, endIndex); // memberData 대신 filteredData 사용
    }

    // 테이블 렌더링
    function renderTable() {
        if (!tableBody || !filteredData.length) {
            if (!tableBody) {
                console.error('테이블 바디가 없음');
                return;
            }
            
            // 데이터가 없는 경우
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--example);">
                        표시할 국회의원이 없습니다.
                    </td>
                </tr>
            `;
            updateMemberCount();
            updatePagination();
            return;
        }

        // 현재 정렬 순서에 따라 데이터 정렬
        const sortedData = [...filteredData].sort((a, b) => {
            if (currentSortOrder === 'asc') {
                return b.performance - a.performance; // 오름차순 (높은 실적이 위로)
            } else {
                return a.performance - b.performance; // 내림차순 (낮은 실적이 위로)
            }
        });

        // 순위 재계산 (정렬 순서에 따라)
        sortedData.forEach((member, index) => {
            if (currentSortOrder === 'asc') {
                member.displayRank = index + 1; // 1위부터
            } else {
                member.displayRank = sortedData.length - index; // 마지막 순위부터               
            }
        });

        // 필터링된 데이터 업데이트
        filteredData = sortedData;

        const currentData = getCurrentPageData();
        tableBody.innerHTML = '';
        
        currentData.forEach(member => {
            const row = document.createElement('tr');
            
            // 실적 점수 포맷팅 (소수점 1자리)
            const formattedScore = member.performance.toFixed(1);
            
            row.innerHTML = `
                <td class="rank-cell">${member.displayRank}</td>
                <td>
                    <div class="member-name" data-member-name="${member.name}">
                        ${member.name} 의원
                        <div style="font-size: 12px; color: var(--example); margin-top: 2px;">
                            실적: ${formattedScore}점
                        </div>
                    </div>
                </td>
                <td class="party-name">${member.party}</td>
                <td class="phone-number">${member.phone}</td>
                <td class="home-icon">
                    <a href="${member.homepage}" title="의원 홈페이지 바로가기" class="home-link">
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
        
        // 의원 수 업데이트
        updateMemberCount();
        
        // 페이지네이션 업데이트
        updatePagination();

        console.log(`✅ 테이블 렌더링 완료 (페이지 ${currentPage}, ${currentSortOrder} 정렬, ${filteredData.length}명 표시)`);
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
        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE); // memberData 대신 filteredData 사용
        const pagination = document.getElementById('pagination');
        
        if (!pagination) return;

        pagination.innerHTML = '';

        // 페이지가 1개 이하인 경우 페이지네이션 숨기기
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        // 이전 버튼
        const prevButton = document.createElement('a');
        prevButton.href = '#';
        prevButton.className = 'prev-next';
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
                dots.className = 'ellipsis';
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
                dots.className = 'ellipsis';
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
            
            const lastPage = createPageButton(totalPages);
            pagination.appendChild(lastPage);
        }

        // 다음 버튼
        const nextButton = document.createElement('a');
        nextButton.href = '#';
        nextButton.className = 'prev-next';
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

    // 검색 기능 설정
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (!searchInput || !searchButton) {
            console.error('검색 요소들을 찾을 수 없습니다');
            return;
        }

        console.log('검색 기능 설정 완료');

        // 검색 실행 함수
        function performSearch() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            console.log('검색 수행:', searchTerm);
            
            applyFilters();
        }

        // 이벤트 리스너 추가
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // 실시간 검색 (선택사항)
        searchInput.addEventListener('input', window.debounce(performSearch, 300));
    }

    // 필터 기능 설정
    function setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        console.log('필터 버튼 개수:', filterButtons.length);
        
        filterButtons.forEach((button, index) => {
            console.log('필터 버튼 설정', index, ':', button.textContent);
            
            button.addEventListener('click', function() {
                console.log('필터 클릭:', this.getAttribute('data-filter'));
                
                // 활성 버튼 변경
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                applyFilters();
            });
        });
    }

    // 필터 적용 함수
    function applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const activeFilter = document.querySelector('.filter-btn.active');
        
        let searchTerm = '';
        let filterType = 'all';
        
        if (searchInput) {
            searchTerm = searchInput.value.toLowerCase().trim();
        }
        
        if (activeFilter) {
            filterType = activeFilter.getAttribute('data-filter');
        }
        
        console.log('필터 적용:', { searchTerm, filterType });
        
        // 검색어와 정당 필터 적용
        filteredData = memberData.filter(member => {
            // 검색어 필터
            const matchesSearch = !searchTerm || 
                member.name.toLowerCase().includes(searchTerm) ||
                member.party.toLowerCase().includes(searchTerm);
            
            // 정당 필터
            const matchesParty = filterType === 'all' || member.party === filterType;
            
            return matchesSearch && matchesParty;
        });
        
        console.log('필터 결과:', filteredData.length, '명');
        
        currentPage = 1; // 첫 페이지로 이동
        renderTable();
    }

    // 정렬 함수
    function sortMembers(order) {
        currentSortOrder = order;
        currentPage = 1; // 정렬 후 첫 페이지로
        renderTable(); // 테이블 다시 렌더링
        
        console.log(`국회의원 정렬 적용: ${order} (실적 기준)`);
    }

    // 설정 버튼 및 드롭다운 이벤트 처리
    function initializeControls() {
        if (settingsBtn && sortDropdown) {
            // 설정 버튼 클릭 시 드롭다운 표시
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

            // 정렬 방식 선택 처리
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                item.addEventListener('click', function() {
                    // 활성 항목 변경
                    dropdownItems.forEach(i => i.classList.remove('active'));
                    this.classList.add('active');

                    // 정렬 방식 적용
                    const sortOrder = this.getAttribute('data-sort');
                    sortMembers(sortOrder);

                    // 드롭다운 닫기
                    sortDropdown.classList.remove('active');
                });
            });
        }

        // 검색 기능 설정
        setupSearch();
        
        // 필터 기능 설정
        setupFilters();

        // 홈페이지 아이콘 클릭 이벤트
        document.addEventListener('click', function(e) {
            if (e.target.closest('.home-link')) {
                const link = e.target.closest('.home-link');
                const href = link.getAttribute('href');
                
                if (href === '#' || !href) {
                    e.preventDefault();
                    alert('의원 홈페이지로 이동합니다.');
                }
                // href가 있으면 새 탭에서 열림
            }
        });
    }

    // 특정 의원 검색 함수
    window.searchMember = function(memberName) {
        // 검색창에 값 설정
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = memberName;
        }
        
        // 검색 적용
        applyFilters();
        
        const found = filteredData.find(member => 
            member.name.includes(memberName)
        );
        
        if (found) {
            // 해당 의원이 있는 페이지로 이동
            const memberIndex = filteredData.indexOf(found);
            const targetPage = Math.ceil((memberIndex + 1) / ITEMS_PER_PAGE);
            
            currentPage = targetPage;
            renderTable();
            
            // 해당 행 하이라이트
            setTimeout(() => {
                const memberNameElements = document.querySelectorAll('.member-name');
                memberNameElements.forEach(element => {
                    if (element.getAttribute('data-member-name') === found.name) {
                        const row = element.closest('tr');
                        row.style.backgroundColor = 'var(--main1)';
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // 3초 후 하이라이트 제거
                        setTimeout(() => {
                            row.style.backgroundColor = '';
                        }, 3000);
                    }
                });
            }, 100);
            
            console.log(`의원 "${memberName}" 찾음: 페이지 ${targetPage}, 실적 ${found.performance.toFixed(1)}점`);
            return true;
        } else {
            console.log(`의원 "${memberName}"을 찾을 수 없습니다.`);
            return false;
        }
    };

    // 🆕 퍼센트 가중치 업데이트 함수 (다른 페이지와 연동)
    async function updatePerformanceWeights(weights) {
        try {
            if (window.APIService && window.APIService.updateWeights) {
                console.log('퍼센트 가중치 업데이트 중...', weights);
                
                const result = await window.APIService.updateWeights(weights);
                console.log('가중치 업데이트 완료:', result);
                
                // 데이터 새로고침
                await loadMemberData();
                
                if (window.APIService.showNotification) {
                    window.APIService.showNotification('퍼센트 설정이 적용되었습니다', 'success');
                }
                
                return result;
            } else {
                throw new Error('가중치 업데이트 API를 사용할 수 없습니다');
            }
        } catch (error) {
            console.error('가중치 업데이트 실패:', error);
            
            if (window.APIService && window.APIService.showNotification) {
                window.APIService.showNotification('퍼센트 설정 적용 실패', 'error');
            }
            
            throw error;
        }
    }

    // 🆕 가중치 변경 감지 및 자동 새로고침
    function setupWeightChangeListener() {
        // localStorage 변경 감지
        window.addEventListener('storage', function(e) {
            if (e.key === 'weight_change_event' && e.newValue) {
                try {
                    const event = JSON.parse(e.newValue);
                    if (event.type === 'weights_updated' && event.source !== 'rank_member') {
                        console.log('🔄 가중치 변경 감지됨, 데이터 새로고침 중...');
                        
                        // 새로고침 알림 표시
                        if (window.APIService && window.APIService.showNotification) {
                            window.APIService.showNotification('가중치 변경 감지 - 데이터 새로고침 중...', 'info');
                        }
                        
                        // 1초 후 데이터 새로고침
                        setTimeout(() => {
                            loadMemberData();
                        }, 1000);
                    }
                } catch (error) {
                    console.warn('가중치 변경 이벤트 처리 실패:', error);
                }
            }
        });

        // 주기적으로 데이터 확인 (5분마다)
        setInterval(async () => {
            if (window.APIService && window.APIService._isReady) {
                console.log('📊 정기 데이터 새로고침 (5분)');
                try {
                    await loadMemberData();
                } catch (error) {
                    console.warn('정기 새로고침 실패:', error);
                }
            }
        }, 5 * 60 * 1000); // 5분
    }

    // 전역 함수로 등록 (다른 페이지에서 호출 가능)
    window.updateMemberRankingWeights = updatePerformanceWeights;

    // 초기화 함수들 실행
    initializeControls();
    setupWeightChangeListener(); // 🆕 가중치 변경 감지 설정
    loadMemberData();

    // 개발용 디버그 함수들
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugMemberRank = {
            data: () => memberData,
            filtered: () => filteredData,
            refresh: () => loadMemberData(),
            search: (name) => window.searchMember(name),
            sort: (order) => sortMembers(order),
            filter: (party) => {
                const filterBtn = document.querySelector(`.filter-btn[data-filter="${party}"]`);
                if (filterBtn) filterBtn.click();
            },
            page: (num) => {
                const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
                if (num >= 1 && num <= totalPages) {
                    currentPage = num;
                    renderTable();
                }
            },
            updateWeights: (weights) => updatePerformanceWeights(weights),
            // 🆕 가중치 연동 디버그 함수들
            triggerWeightChange: () => {
                // 가중치 변경 이벤트 시뮬레이션
                const event = {
                    type: 'weights_updated',
                    timestamp: new Date().toISOString(),
                    source: 'debug_test'
                };
                localStorage.setItem('weight_change_event', JSON.stringify(event));
                setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
            },
            showWeightStatus: () => {
                console.log('🔧 가중치 연동 상태:');
                console.log('- localStorage 이벤트 리스너: 활성화됨');
                console.log('- 정기 새로고침: 5분마다');
                console.log('- API 연결 상태:', window.APIService?._isReady ? '연결됨' : '연결 안됨');
            },
            apiTest: async () => {
                if (window.APIService) {
                    try {
                        const result = await window.APIService.getMemberPerformance();
                        console.log('API 테스트 결과:', result);
                        return result;
                    } catch (error) {
                        console.error('API 테스트 실패:', error);
                        return null;
                    }
                }
            }
        };
        
        console.log('🔧 개발 모드: window.debugMemberRank 사용 가능');
        console.log('  - data(): 전체 데이터 확인');
        console.log('  - filtered(): 필터링된 데이터 확인');
        console.log('  - refresh(): 데이터 새로고침');
        console.log('  - search(name): 의원 검색');
        console.log('  - sort(order): 정렬 변경');
        console.log('  - filter(party): 정당 필터');
        console.log('  - page(num): 페이지 이동');
        console.log('  - updateWeights(weights): 가중치 업데이트');
        console.log('  - triggerWeightChange(): 가중치 변경 이벤트 시뮬레이션');
        console.log('  - showWeightStatus(): 가중치 연동 상태 확인');
        console.log('  - apiTest(): API 연결 테스트');
    }

    console.log('✅ 국회의원 랭킹 페이지 초기화 완료 - 새로운 API 스키마 적용');
    console.log('🔗 API 엔드포인트: /performance/api/performance/');
    console.log('📊 데이터 스키마: lawmaker_name, party, total_score');
    console.log('🔍 검색 기능: 의원명, 정당명으로 검색 가능');
    console.log('🏷️ 필터 기능: 정당별 필터링 가능');
    console.log('⚖️ 가중치 연동: 퍼센트 설정 페이지와 실시간 연동');
    console.log('🔄 자동 새로고침: 가중치 변경 감지 및 5분마다 정기 새로고침');
});
