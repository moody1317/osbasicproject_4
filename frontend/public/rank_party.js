// 정당 랭킹 페이지 (완전 개선된 버전 - HTML 순서 완벽 매칭)

// 페이지 상태 관리
let pageState = {
    partyData: [],
    currentSortOrder: 'asc', // 기본 정렬: 오름차순 (1위부터)
    isLoading: false,
    hasError: false,
    lastUpdateTime: null
};

// DOM 요소들
let elements = {
    settingsBtn: null,
    sortDropdown: null,
    tableBody: null
};

// 🔄 HTML 테이블 헤더 순서와 정확히 일치하는 구조
const TABLE_STRUCTURE = [
    { key: 'rank', label: '순위', className: 'rank-cell' },           // 1
    { key: 'score', label: '점수', className: 'performance-cell' },   // 2  
    { key: 'name', label: '정당명', className: 'name-cell' },         // 3
    { key: 'leader', label: '원내대표', className: 'leader-cell' },    // 4
    { key: 'homepage', label: '정당 홈페이지', className: 'home-icon' }  // 5
];

// 원내대표 정보 (API에서 제공되지 않는 경우 사용)
const PARTY_LEADERS = {
    "국민의힘": "권성동",
    "더불어민주당": "박찬대", 
    "조국혁신당": "김선민",
    "개혁신당": "신지혜",
    "진보당": "김재연",
    "기본소득당": "용혜인",
    "사회민주당": "한창민",
    "무소속": "무소속"
};

// 정당별 추정 의원 수 (API에서 제공되지 않는 경우)
const ESTIMATED_MEMBER_COUNTS = {
    "더불어민주당": 170,
    "국민의힘": 108, 
    "조국혁신당": 12,
    "개혁신당": 3,
    "진보당": 1,
    "기본소득당": 1,
    "사회민주당": 1,
    "무소속": 4
};

// APIService 준비 확인
function waitForAPIService() {
    return new Promise((resolve) => {
        if (window.APIService && window.APIService._isReady) {
            resolve();
            return;
        }
        
        // APIService가 준비될 때까지 대기
        const checkInterval = setInterval(() => {
            if (window.APIService && window.APIService._isReady) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // 10초 후 타임아웃
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 10000);
    });
}

// 알림 표시 함수 (다른 페이지들과 일관성 있게)
function showNotification(message, type = 'info', duration = 3000) {
    if (window.APIService && window.APIService.showNotification) {
        window.APIService.showNotification(message, type, duration);
    } else {
        console.log(`[RankParty] [${type.toUpperCase()}] ${message}`);
    }
}

// 성공 메시지 표시
function showSuccess(message) {
    showNotification(message, 'success');
}

// 에러 메시지 표시  
function showError(message) {
    showNotification(message, 'error');
}

// 경고 메시지 표시
function showWarning(message) {
    showNotification(message, 'warning');
}

// 정보 메시지 표시
function showInfo(message) {
    showNotification(message, 'info');
}

// 정당 홈페이지 URL 가져오기 함수 (정확한 매핑)
function getPartyHomepage(partyName) {
    // 정당명 정규화 (다른 페이지들과 동일)
    function normalizePartyName(name) {
        if (!name) return '무소속';
        
        const nameMapping = {
            '국민의힘': '국민의힘',
            '국민의 힘': '국민의힘',
            '더불어민주당': '더불어민주당',
            '민주당': '더불어민주당',
            '조국혁신당': '조국혁신당',
            '개혁신당': '개혁신당',
            '진보당': '진보당',
            '기본소득당': '기본소득당',
            '사회민주당': '사회민주당',
            '무소속': '무소속',
            '없음': '무소속'
        };
        
        return nameMapping[name] || name;
    }
    
    const normalizedName = normalizePartyName(partyName);
    
    // scripts.js의 partyData 사용
    if (typeof window.partyData !== 'undefined' && window.partyData[normalizedName]) {
        const url = window.partyData[normalizedName].url;
        console.log(`[RankParty] 정당 "${partyName}" → "${normalizedName}" 홈페이지: ${url}`);
        return url || '#';
    }
    
    // 기본 홈페이지 URL들 (폴백)
    const defaultUrls = {
        "국민의힘": "https://www.peoplepowerparty.kr/",
        "더불어민주당": "https://theminjoo.kr/",
        "조국혁신당": "https://rebuildingkoreaparty.kr",
        "개혁신당": "https://www.reformparty.kr/",
        "진보당": "https://jinboparty.com/",
        "기본소득당": "https://basicincomeparty.kr/",
        "사회민주당": "https://www.samindang.kr/",
        "무소속": "#"
    };
    
    return defaultUrls[normalizedName] || '#';
}

// 🔄 API 데이터를 HTML 순서에 맞게 처리하는 함수
function processApiData(apiData) {
    try {
        console.log('[RankParty] 📊 API 데이터 처리 시작:', apiData);
        
        // 유효한 데이터만 필터링하고 점수순으로 정렬
        const validData = apiData
            .filter(item => item && (item.party || item.party_name) && (item.avg_total_score !== undefined || item.score !== undefined))
            .map(party => {
                const partyName = party.party || party.party_name || '알 수 없는 정당';
                const score = party.avg_total_score || party.score || 0;
                
                return {
                    // HTML 순서와 정확히 일치하는 구조
                    name: partyName,                                        // 3. 정당명
                    performance: Math.round(score * 100) / 100,             // 2. 점수 (소수점 2자리)
                    leader: PARTY_LEADERS[partyName] || '정보 없음',         // 4. 원내대표
                    homepage: getPartyHomepage(partyName),                  // 5. 정당 홈페이지
                    memberCount: party.memberCount || ESTIMATED_MEMBER_COUNTS[partyName] || 1,
                    rawData: party // 원본 데이터 보존
                };
            })
            .sort((a, b) => b.performance - a.performance); // 점수 내림차순 정렬
        
        // 순위 부여 (1. 순위)
        const processedData = validData.map((party, index) => ({
            ...party,
            rank: index + 1,        // 1. 순위
            displayRank: index + 1  // 표시용 순위 (정렬에 따라 변경됨)
        }));
        
        console.log('[RankParty] ✅ 처리된 정당 데이터 (HTML 순서 매칭):', processedData);
        return processedData;
        
    } catch (error) {
        console.error('[RankParty] ❌ API 데이터 처리 실패:', error);
        return getFallbackData();
    }
}

// 🔄 폴백 데이터 (HTML 순서와 정확히 일치)
function getFallbackData() {
    console.log('[RankParty] 📋 폴백 데이터 사용 중...');
    
    // HTML 순서: 순위, 점수, 정당명, 원내대표, 정당 홈페이지
    return [
        { rank: 1, displayRank: 1, performance: 85.2, name: '국민의힘', leader: '권성동', homepage: 'https://www.peoplepowerparty.kr/', memberCount: 108 },
        { rank: 2, displayRank: 2, performance: 82.7, name: '더불어민주당', leader: '박찬대', homepage: 'https://theminjoo.kr/', memberCount: 170 },
        { rank: 3, displayRank: 3, performance: 78.1, name: '조국혁신당', leader: '김선민', homepage: 'https://rebuildingkoreaparty.kr', memberCount: 12 },
        { rank: 4, displayRank: 4, performance: 74.8, name: '개혁신당', leader: '신지혜', homepage: 'https://www.reformparty.kr/', memberCount: 3 },
        { rank: 5, displayRank: 5, performance: 71.3, name: '사회민주당', leader: '한창민', homepage: 'https://www.samindang.kr/', memberCount: 1 },
        { rank: 6, displayRank: 6, performance: 68.9, name: '기본소득당', leader: '용혜인', homepage: 'https://basicincomeparty.kr/', memberCount: 1 },
        { rank: 7, displayRank: 7, performance: 65.4, name: '진보당', leader: '김재연', homepage: 'https://jinboparty.com/', memberCount: 1 },
        { rank: 8, displayRank: 8, performance: 62.1, name: '무소속', leader: '무소속', homepage: '#', memberCount: 4 }
    ];
}

// 🔄 페이지 로드 시 API 데이터 불러오기 (다른 페이지들과 일관성 있게)
async function loadPartyData() {
    try {
        console.log('[RankParty] 🚀 정당 랭킹 데이터 로드 시작...');
        pageState.isLoading = true;
        pageState.hasError = false;
        
        // 로딩 상태 표시
        showLoadingState();
        
        // APIService 준비 대기
        await waitForAPIService();
        
        if (!window.APIService || !window.APIService._isReady) {
            throw new Error('APIService를 사용할 수 없습니다');
        }
        
        // 🎯 다른 페이지들과 동일한 방식으로 API 호출 (함수명 통일)
        const apiData = await window.APIService.getPartyWeightedPerformanceData();
        console.log('[RankParty] ✅ API에서 받은 정당 데이터:', apiData);
        
        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            pageState.partyData = processApiData(apiData);
            pageState.lastUpdateTime = new Date();
            renderTable();
            
            showSuccess(`정당 랭킹 데이터 로드 완료 (${pageState.partyData.length}개 정당)`);
            console.log('[RankParty] ✅ API 데이터로 테이블 생성 완료');
        } else {
            throw new Error('API 데이터가 비어있거나 올바르지 않음');
        }
        
    } catch (error) {
        console.error('[RankParty] ❌ API 데이터 로드 실패:', error);
        pageState.hasError = true;
        
        // 폴백: 기본 데이터 사용
        pageState.partyData = getFallbackData();
        renderTable();
        
        showWarning('API 연결 실패, 기본 데이터를 표시합니다');
    } finally {
        pageState.isLoading = false;
    }
}

// 로딩 상태 표시 함수
function showLoadingState() {
    if (elements.tableBody) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    정당 데이터를 불러오는 중...
                </td>
            </tr>
        `;
    }
}

// 🔄 HTML 순서와 정확히 일치하는 테이블 렌더링 함수
function renderTable() {
    if (!elements.tableBody || !pageState.partyData.length) {
        console.error('[RankParty] 테이블 바디가 없거나 데이터가 비어있음');
        return;
    }

    // 현재 정렬 순서에 따라 데이터 정렬
    const sortedData = [...pageState.partyData].sort((a, b) => {
        if (pageState.currentSortOrder === 'asc') {
            return b.performance - a.performance; // 오름차순: 1위→2위→3위 (높은 성과부터)
        } else {
            return a.performance - b.performance; // 내림차순: 꼴등→1위 (낮은 성과부터)
        }
    });

    // 순위 재계산 (정렬 순서에 따라)
    sortedData.forEach((party, index) => {
        if (pageState.currentSortOrder === 'asc') {
            // 오름차순: 1위부터 순서대로 (1위, 2위, 3위...)
            party.displayRank = index + 1;
        } else {
            // 내림차순: 꼴등부터 역순으로 (8위, 7위, 6위...)
            party.displayRank = sortedData.length - index;
        }
    });

    // 🔄 HTML 순서와 정확히 일치하는 테이블 HTML 생성
    elements.tableBody.innerHTML = sortedData.map(party => `
        <tr data-party="${party.name}" class="party-row">
            <td class="${TABLE_STRUCTURE[0].className}">${party.displayRank}</td>
            <td class="${TABLE_STRUCTURE[1].className}">${party.performance.toFixed(1)}점</td>
            <td class="${TABLE_STRUCTURE[2].className}">${party.name}</td>
            <td class="${TABLE_STRUCTURE[3].className}">${party.leader}</td>
            <td class="${TABLE_STRUCTURE[4].className}">
                <a href="${party.homepage}" target="_blank" title="정당 홈페이지 바로가기" class="home-link">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                    </svg>
                </a>
            </td>
        </tr>
    `).join('');

    // 테이블 행 이벤트 추가
    addTableRowEvents();
    
    console.log(`[RankParty] ✅ 테이블 렌더링 완료 (${sortedData.length}개 정당, ${pageState.currentSortOrder} 정렬, HTML 순서 완벽 매칭)`);
}

// 정당명 클릭 시 percent_party 페이지로 이동하는 함수
function navigateToPartyDetail(partyName) {
    console.log(`[RankParty] 정당 [${partyName}] 상세 페이지로 이동`);
    
    // URL 파라미터로 정당 정보 전달
    const params = new URLSearchParams({
        party: partyName
    });
    
    // percent_party.html 페이지로 이동
    window.location.href = `percent_party.html?${params.toString()}`;
}

// 테이블 행에 호버 효과 및 클릭 이벤트 추가
function addTableRowEvents() {
    const tableRows = document.querySelectorAll('.party-table tbody tr.party-row');
    
    tableRows.forEach(row => {
        // 호버 효과
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--main2)';
            this.style.cursor = 'pointer';
        });

        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });

        // 클릭 이벤트 - 행 전체 클릭 시 해당 정당 페이지로 이동
        row.addEventListener('click', function(e) {
            // 홈페이지 링크 클릭은 제외
            if (e.target.closest('.home-link')) {
                return;
            }
            
            const partyName = this.getAttribute('data-party');
            if (partyName) {
                navigateToPartyDetail(partyName);
            }
        });
    });

    // 홈페이지 아이콘 클릭 효과 (이벤트 버블링 방지)
    const homeLinks = document.querySelectorAll('.home-link');
    homeLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.stopPropagation(); // 이벤트 버블링 방지
            
            const href = this.getAttribute('href');
            if (href === '#' || !href) {
                e.preventDefault();
                alert('해당 정당의 홈페이지 정보가 없습니다.');
            }
            // href가 있으면 새 탭에서 열림 (target="_blank")
        });
    });
}

// 테이블 정렬 함수
function sortTable(order) {
    pageState.currentSortOrder = order;
    renderTable(); // 테이블 다시 렌더링
    
    console.log(`[RankParty] 테이블 정렬 적용: ${order}`);
    showInfo(`정렬 방식 변경: ${order === 'asc' ? '오름차순 (1위부터)' : '내림차순 (꼴등부터)'}`);
}

// === 🔄 가중치 변경 실시간 업데이트 시스템 (완전 통합) ===

// 가중치 변경 감지 및 자동 새로고침
function setupWeightChangeListener() {
    try {
        console.log('[RankParty] 🔄 가중치 변경 감지 시스템 설정...');
        
        // 1. localStorage 이벤트 감지 (다른 페이지에서 가중치 변경 시)
        window.addEventListener('storage', function(event) {
            if (event.key === 'weight_change_event' && event.newValue) {
                try {
                    const changeData = JSON.parse(event.newValue);
                    console.log('[RankParty] 📢 가중치 변경 감지:', changeData);
                    handleWeightUpdate(changeData, 'localStorage');
                } catch (e) {
                    console.warn('[RankParty] 가중치 변경 데이터 파싱 실패:', e);
                }
            }
        });
        
        // 2. BroadcastChannel 감지 (최신 브라우저)
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const weightChannel = new BroadcastChannel('weight_updates');
                weightChannel.addEventListener('message', function(event) {
                    console.log('[RankParty] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                    handleWeightUpdate(event.data, 'BroadcastChannel');
                });
                
                // 페이지 언로드 시 채널 정리
                window.addEventListener('beforeunload', () => {
                    weightChannel.close();
                });
                
                console.log('[RankParty] ✅ BroadcastChannel 설정 완료');
            } catch (e) {
                console.warn('[RankParty] BroadcastChannel 설정 실패:', e);
            }
        }
        
        // 3. 커스텀 이벤트 감지 (같은 페이지 내)
        document.addEventListener('weightSettingsChanged', function(event) {
            console.log('[RankParty] 🎯 커스텀 이벤트 가중치 변경 감지:', event.detail);
            handleWeightUpdate(event.detail, 'customEvent');
        });
        
        // 4. 주기적 체크 (폴백)
        let lastWeightCheckTime = localStorage.getItem('last_weight_update') || '0';
        setInterval(function() {
            const currentCheckTime = localStorage.getItem('last_weight_update') || '0';
            
            if (currentCheckTime !== lastWeightCheckTime && currentCheckTime !== '0') {
                console.log('[RankParty] ⏰ 주기적 체크로 가중치 변경 감지');
                lastWeightCheckTime = currentCheckTime;
                
                const changeData = {
                    type: 'weights_updated',
                    timestamp: new Date(parseInt(currentCheckTime)).toISOString(),
                    source: 'periodic_check'
                };
                
                handleWeightUpdate(changeData, 'periodicCheck');
            }
        }, 5000);
        
        console.log('[RankParty] ✅ 가중치 변경 감지 시스템 설정 완료');
        
    } catch (error) {
        console.error('[RankParty] ❌ 가중치 변경 감지 시스템 설정 실패:', error);
    }
}

// 가중치 업데이트 처리 함수
async function handleWeightUpdate(changeData, source) {
    try {
        if (pageState.isLoading) {
            console.log('[RankParty] 🔄 이미 로딩 중이므로 가중치 업데이트 스킵');
            return;
        }
        
        console.log(`[RankParty] 🔄 가중치 업데이트 처리 시작 (${source})`);
        
        // 사용자에게 업데이트 알림
        showInfo('가중치가 변경되었습니다. 정당 랭킹을 새로고침합니다...');
        
        // 1초 딜레이 후 데이터 새로고침 (서버에서 가중치 처리 시간 고려)
        setTimeout(async () => {
            try {
                // 새로운 데이터로 업데이트
                await loadPartyData();
                
                console.log('[RankParty] ✅ 가중치 업데이트 완료');
                showSuccess('새로운 가중치가 정당 랭킹에 적용되었습니다! 🎉');
                
                // 응답 전송 (percent 페이지 모니터링용)
                try {
                    const response = {
                        page: 'rank_party.html',
                        timestamp: new Date().toISOString(),
                        success: true,
                        source: source,
                        dataCount: pageState.partyData.length,
                        sortOrder: pageState.currentSortOrder
                    };
                    localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                    setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
                } catch (e) {
                    console.warn('[RankParty] 응답 전송 실패:', e);
                }
                
            } catch (error) {
                console.error('[RankParty] ❌ 가중치 업데이트 데이터 로드 실패:', error);
                showError('가중치 업데이트에 실패했습니다. 다시 시도해주세요.');
            }
        }, 1000);
        
    } catch (error) {
        console.error('[RankParty] ❌ 가중치 업데이트 처리 실패:', error);
        showError('가중치 업데이트 처리에 실패했습니다.');
    }
}

// 수동 새로고침 함수들 (외부에서 호출 가능)
window.refreshPartyRankingData = function() {
    console.log('[RankParty] 🔄 수동 새로고침 요청');
    loadPartyData();
};

window.updatePartyRankingData = function(newData) {
    console.log('[RankParty] 📊 외부 데이터로 업데이트:', newData);
    
    if (newData && Array.isArray(newData)) {
        pageState.partyData = processApiData(newData);
        renderTable();
        showSuccess('정당 랭킹 데이터가 업데이트되었습니다');
    }
};

// 설정 버튼 및 드롭다운 이벤트 처리
function initializeControls() {
    if (elements.settingsBtn && elements.sortDropdown) {
        // 설정 버튼 클릭 시 드롭다운 표시
        elements.settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            elements.sortDropdown.classList.toggle('active');
        });
        
        // 드롭다운 외부 클릭시 닫기
        document.addEventListener('click', function() {
            elements.sortDropdown.classList.remove('active');
        });
        
        // 드롭다운 내부 클릭 시 이벤트 버블링 방지
        elements.sortDropdown.addEventListener('click', function(e) {
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
                sortTable(sortOrder);

                // 드롭다운 닫기
                elements.sortDropdown.classList.remove('active');
            });
        });
        
        console.log('[RankParty] ✅ 컨트롤 이벤트 설정 완료');
    }
}

// DOM 요소 초기화
function initializeElements() {
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.sortDropdown = document.getElementById('sortDropdown');
    elements.tableBody = document.getElementById('partyTableBody');
    
    console.log('[RankParty] 📋 DOM 요소 초기화:', {
        settingsBtn: !!elements.settingsBtn,
        sortDropdown: !!elements.sortDropdown,
        tableBody: !!elements.tableBody
    });
}

// 🔄 페이지 초기화 (다른 페이지들과 일관성 있게)
async function initializePage() {
    console.log('[RankParty] 🚀 정당 랭킹 페이지 초기화 중...');
    
    try {
        // DOM 요소 초기화
        initializeElements();
        
        // 컨트롤 초기화
        initializeControls();
        
        // 정당 데이터 로드
        await loadPartyData();
        
        // 가중치 변경 감지 시스템 설정
        setupWeightChangeListener();
        
        console.log('[RankParty] ✅ 정당 랭킹 페이지 초기화 완료');
        console.log('[RankParty] 📊 HTML 테이블 구조:', TABLE_STRUCTURE.map(t => t.label));
        console.log('[RankParty] 🔄 가중치 실시간 업데이트: 활성화됨');
        
    } catch (error) {
        console.error('[RankParty] ❌ 페이지 초기화 오류:', error);
        showError('페이지 로드 중 오류가 발생했습니다');
    }
}

// === DOM 로드 완료 시 실행 ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('[RankParty] 📦 DOM 로드 완료 - 초기화 시작...');
    
    // 약간의 딜레이 후 초기화 (다른 스크립트들이 로드될 시간 확보)
    setTimeout(initializePage, 100);
});

// === 🔄 개발용 디버그 함수들 (다른 페이지들과 일관성 있게) ===
window.partyRankDebug = {
    // 페이지 상태 정보
    getState: () => pageState,
    getData: () => pageState.partyData,
    getElements: () => elements,
    
    // 데이터 관련
    refresh: () => loadPartyData(),
    search: (name) => pageState.partyData.find(p => p.name.includes(name)),
    sort: (order) => sortTable(order),
    
    // HTML 매핑 테스트
    testHTMLMapping: () => {
        console.log('[RankParty] 🔍 HTML-JavaScript 매핑 테스트...');
        console.log('📋 HTML 테이블 구조:');
        TABLE_STRUCTURE.forEach((col, index) => {
            console.log(`  ${index + 1}. ${col.label} (${col.key}) - ${col.className}`);
        });
        
        if (pageState.partyData.length > 0) {
            console.log('📊 첫 번째 정당 데이터 매핑:');
            const firstParty = pageState.partyData[0];
            TABLE_STRUCTURE.forEach((col, index) => {
                const value = col.key === 'rank' ? firstParty.displayRank :
                             col.key === 'score' ? `${firstParty.performance.toFixed(1)}점` :
                             col.key === 'name' ? firstParty.name :
                             col.key === 'leader' ? firstParty.leader :
                             col.key === 'homepage' ? firstParty.homepage : 'N/A';
                console.log(`  ${index + 1}. ${col.label}: ${value}`);
            });
        }
    },
    
    // 가중치 관련
    simulateWeightChange: () => {
        console.log('[RankParty] 🔧 가중치 변경 시뮬레이션...');
        const changeData = {
            type: 'weights_updated',
            timestamp: new Date().toISOString(),
            source: 'debug_simulation'
        };
        handleWeightUpdate(changeData, 'debug');
    },
    
    // API 테스트
    testApiCall: async () => {
        try {
            console.log('[RankParty] 🧪 API 호출 테스트...');
            
            await waitForAPIService();
            
            if (!window.APIService || !window.APIService._isReady) {
                console.error('APIService를 사용할 수 없습니다');
                return null;
            }
            
            const data = await window.APIService.getPartyWeightedPerformanceData();
            console.log('[RankParty] ✅ API 테스트 결과:', data);
            return data;
        } catch (error) {
            console.error('[RankParty] ❌ API 테스트 실패:', error);
            return null;
        }
    },
    
    // 정보 표시
    showInfo: () => {
        console.log('[RankParty] 📊 정당 랭킹 페이지 정보:');
        console.log('- 로드된 정당 수:', pageState.partyData.length);
        console.log('- 현재 정렬:', pageState.currentSortOrder);
        console.log('- 마지막 업데이트:', pageState.lastUpdateTime);
        console.log('- APIService 상태:', window.APIService?._isReady ? '준비됨' : '대기중');
        console.log('- 로딩 상태:', pageState.isLoading);
        console.log('- 오류 상태:', pageState.hasError);
        console.log('- HTML 순서 매핑:', TABLE_STRUCTURE.map(t => t.label).join(' → '));
        console.log('- 가중치 변경 감지: 활성화됨');
    },
    
    // 테스트 데이터
    loadTestData: () => {
        console.log('[RankParty] 🧪 테스트 데이터 로드...');
        pageState.partyData = getFallbackData();
        renderTable();
        showInfo('테스트 데이터가 로드되었습니다');
    }
};

// 개발 모드에서만 디버그 정보 표시
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[RankParty] 🔧 개발 모드: window.partyRankDebug 사용 가능');
    console.log('  - getState(): 페이지 상태 확인');
    console.log('  - getData(): 현재 데이터 확인');
    console.log('  - refresh(): 데이터 새로고침');
    console.log('  - search(name): 정당 검색');
    console.log('  - sort(order): 정렬 변경');
    console.log('  - testHTMLMapping(): HTML 매핑 테스트');
    console.log('  - simulateWeightChange(): 가중치 변경 시뮬레이션');
    console.log('  - testApiCall(): API 연결 테스트');
    console.log('  - showInfo(): 페이지 정보 표시');
    console.log('  - loadTestData(): 테스트 데이터 로드');
}

console.log('[RankParty] ✅ 정당 랭킹 페이지 스크립트 로드 완료 (완전 개선된 버전)');
console.log('[RankParty] 🔄 HTML 순서 완벽 매칭 + 가중치 실시간 업데이트 시스템 통합');