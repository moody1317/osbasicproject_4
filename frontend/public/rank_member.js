// rank_member.js - 국회의원 랭킹 페이지 (v2.0.0)

// 페이지 상태 관리
let pageState = {
    memberList: [],        // /member/ API 데이터 (name, party, homepage, phone)
    memberRanking: [],     // /ranking/members/ API 데이터 (HG_NM, POLY_NM, 총점_순위)  
    filteredMembers: [],   // 필터링된 결과
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    currentSort: 'asc',
    currentFilter: 'all',
    searchQuery: '',
    isLoading: false,
    hasError: false,
    initialized: false
};

// DOM 요소 캐시
const elements = {
    memberTableBody: null,
    pagination: null,
    searchInput: null,
    searchButton: null,
    filterButtons: null,
    settingsBtn: null,
    sortDropdown: null
};

// DOM 요소 초기화
function initializeElements() {
    elements.memberTableBody = document.getElementById('memberTableBody');
    elements.pagination = document.getElementById('pagination');
    elements.searchInput = document.getElementById('searchInput');
    elements.searchButton = document.getElementById('searchButton');
    elements.filterButtons = document.querySelectorAll('.filter-btn');
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.sortDropdown = document.getElementById('sortDropdown');
}

// 로딩 상태 관리
function setLoadingState(loading) {
    pageState.isLoading = loading;
    
    if (elements.memberTableBody) {
        if (loading) {
            elements.memberTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--example);">
                        <div class="loading-spinner"></div>
                        국회의원 데이터를 불러오는 중...
                    </td>
                </tr>
            `;
        }
    }
    
    if (elements.searchButton) {
        elements.searchButton.disabled = loading;
    }
}

// 알림 표시
function showNotification(message, type = 'info', duration = 3000) {
    if (window.APIService && window.APIService.showNotification) {
        window.APIService.showNotification(message, type, duration);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// API 데이터 로드
async function loadAllData() {
    try {
        setLoadingState(true);
        console.log('[RankMember] 🚀 데이터 로드 시작...');
        
        if (!window.APIService || !window.APIService._isReady) {
            throw new Error('API 서비스가 준비되지 않았습니다.');
        }
        
        // 필수 데이터 로드
        const results = await Promise.allSettled([
            window.APIService.getAllMembers(),    // /member/ - name, party, homepage, phone
            window.APIService.getMemberRanking()  // /ranking/members/ - HG_NM, POLY_NM, 총점_순위
        ]);
        
        const [membersResult, rankingResult] = results;
        
        // 국회의원 명단 처리
        if (membersResult.status === 'fulfilled') {
            pageState.memberList = membersResult.value || [];
            console.log(`[RankMember] ✅ 국회의원 명단: ${pageState.memberList.length}명`);
        } else {
            console.error('[RankMember] ❌ 국회의원 명단 로드 실패:', membersResult.reason);
            throw new Error('국회의원 명단을 불러올 수 없습니다.');
        }
        
        // 랭킹 데이터 처리
        if (rankingResult.status === 'fulfilled') {
            pageState.memberRanking = rankingResult.value || [];
            console.log(`[RankMember] ✅ 랭킹 데이터: ${pageState.memberRanking.length}개`);
        } else {
            console.warn('[RankMember] ⚠️ 랭킹 데이터 로드 실패:', rankingResult.reason);
            pageState.memberRanking = [];
        }
        
        // 데이터 병합 및 렌더링
        mergeAndProcessData();
        
        console.log('[RankMember] ✅ 데이터 로드 완료');
        return true;
        
    } catch (error) {
        console.error('[RankMember] ❌ 데이터 로드 실패:', error);
        pageState.hasError = true;
        showNotification('데이터 로드에 실패했습니다.', 'error');
        
        // 폴백 데이터 사용
        pageState.memberList = getFallbackData();
        pageState.memberRanking = [];
        mergeAndProcessData();
        
        throw error;
    } finally {
        setLoadingState(false);
    }
}

// 폴백 데이터
function getFallbackData() {
    return [
        {
            name: '나경원',
            party: '국민의힘',
            phone: '02-788-2721',
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '이재명',
            party: '더불어민주당',
            phone: '02-788-2922',
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '조국',
            party: '조국혁신당',
            phone: '02-788-2923',
            homepage: 'https://www.assembly.go.kr'
        }
    ];
}

// 데이터 병합 및 처리
function mergeAndProcessData() {
    try {
        // 의원 명단을 기본으로 랭킹 데이터 병합
        pageState.filteredMembers = pageState.memberList.map((member, index) => {
            const memberName = member.name || '';
            
            // 랭킹 데이터 찾기 (이름으로 매칭)
            const ranking = pageState.memberRanking.find(r => r.HG_NM === memberName);
            
            return {
                rank: ranking ? parseInt(ranking.총점_순위) || (index + 1) : (index + 1),
                name: memberName,
                party: member.party || '정당 정보 없음',
                contact: member.phone || '',
                homepage: member.homepage || '',
                originalIndex: index
            };
        });
        
        // 정렬 적용
        applySorting();
        
        // 필터 적용
        applyFilter();
        
        // 페이지네이션 계산
        calculatePagination();
        
        // 테이블 렌더링
        renderTable();
        
        console.log(`[RankMember] 📊 데이터 처리 완료: ${pageState.filteredMembers.length}명`);
        
    } catch (error) {
        console.error('[RankMember] ❌ 데이터 처리 실패:', error);
        pageState.filteredMembers = [];
        renderTable();
    }
}

// 정렬 적용
function applySorting() {
    pageState.filteredMembers.sort((a, b) => {
        if (pageState.currentSort === 'asc') {
            return a.rank - b.rank;  // 1위부터 오름차순
        } else {
            return b.rank - a.rank;  // 마지막 순위부터 내림차순
        }
    });
}

// 필터 적용
function applyFilter() {
    let filtered = [...pageState.filteredMembers];
    
    // 정당 필터 적용
    if (pageState.currentFilter !== 'all') {
        filtered = filtered.filter(member => member.party === pageState.currentFilter);
    }
    
    // 검색 쿼리 적용
    if (pageState.searchQuery) {
        const query = pageState.searchQuery.toLowerCase();
        filtered = filtered.filter(member => 
            member.name.toLowerCase().includes(query) ||
            member.party.toLowerCase().includes(query)
        );
    }
    
    pageState.filteredMembers = filtered;
}

// 페이지네이션 계산
function calculatePagination() {
    pageState.totalPages = Math.ceil(pageState.filteredMembers.length / pageState.itemsPerPage);
    
    if (pageState.currentPage > pageState.totalPages) {
        pageState.currentPage = 1;
    }
}

// 테이블 렌더링
function renderTable() {
    if (!elements.memberTableBody) return;
    
    // 빈 결과 처리
    if (pageState.filteredMembers.length === 0) {
        elements.memberTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--example);">
                    ${pageState.hasError ? '데이터 로드에 실패했습니다.' : '검색 결과가 없습니다.'}
                </td>
            </tr>
        `;
        renderPagination();
        return;
    }
    
    // 현재 페이지 데이터 계산
    const startIndex = (pageState.currentPage - 1) * pageState.itemsPerPage;
    const endIndex = startIndex + pageState.itemsPerPage;
    const currentPageMembers = pageState.filteredMembers.slice(startIndex, endIndex);
    
    // 테이블 HTML 생성
    // 순위 > 국회의원명 > 정당명 > 연락처 > 의원 홈페이지
    const tableHTML = currentPageMembers.map(member => `
        <tr>
            <td class="rank-cell">${member.rank}</td>
            <td>
                <a href="percent_member.html?member=${encodeURIComponent(member.name)}" 
                   class="member-name">${member.name}</a>
            </td>
            <td class="party-name">${member.party}</td>
            <td class="phone-number">${member.contact || '연락처 정보 없음'}</td>
            <td class="home-icon">
                ${member.homepage ? 
                    `<a href="${member.homepage}" target="_blank">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                        </svg>
                    </a>` : 
                    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.3;">
                        <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                    </svg>`
                }
            </td>
        </tr>
    `).join('');
    
    elements.memberTableBody.innerHTML = tableHTML;
    
    // 페이지네이션 렌더링
    renderPagination();
}

// 페이지네이션 렌더링
function renderPagination() {
    if (!elements.pagination) return;
    
    if (pageState.totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 이전 버튼
    if (pageState.currentPage > 1) {
        paginationHTML += `<a href="#" class="prev-next" data-page="${pageState.currentPage - 1}">‹ 이전</a>`;
    }
    
    // 페이지 번호들
    const startPage = Math.max(1, pageState.currentPage - 2);
    const endPage = Math.min(pageState.totalPages, pageState.currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `<a href="#" data-page="1">1</a>`;
        if (startPage > 2) {
            paginationHTML += `<span class="ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === pageState.currentPage ? 'active' : '';
        paginationHTML += `<a href="#" class="${activeClass}" data-page="${i}">${i}</a>`;
    }
    
    if (endPage < pageState.totalPages) {
        if (endPage < pageState.totalPages - 1) {
            paginationHTML += `<span class="ellipsis">...</span>`;
        }
        paginationHTML += `<a href="#" data-page="${pageState.totalPages}">${pageState.totalPages}</a>`;
    }
    
    // 다음 버튼
    if (pageState.currentPage < pageState.totalPages) {
        paginationHTML += `<a href="#" class="prev-next" data-page="${pageState.currentPage + 1}">다음 ›</a>`;
    }
    
    elements.pagination.innerHTML = paginationHTML;
    
    // 페이지네이션 이벤트 리스너
    elements.pagination.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.dataset.page);
            if (page !== pageState.currentPage && page >= 1 && page <= pageState.totalPages) {
                pageState.currentPage = page;
                renderTable();
            }
        });
    });
}

// 검색 기능 설정
function setupSearch() {
    if (!elements.searchInput || !elements.searchButton) return;
    
    // 실시간 검색
    let searchTimeout;
    elements.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(this.value);
        }, 300);
    });
    
    // 검색 버튼 클릭
    elements.searchButton.addEventListener('click', function() {
        performSearch(elements.searchInput.value);
    });
    
    // 엔터키 검색
    elements.searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
        }
    });
}

// 검색 실행
function performSearch(query) {
    pageState.searchQuery = query.trim();
    pageState.currentPage = 1;
    
    // 데이터 다시 처리
    mergeAndProcessData();
    
    console.log(`[RankMember] 🔍 검색 실행: "${pageState.searchQuery}"`);
}

// 필터 버튼 설정
function setupFilters() {
    if (!elements.filterButtons) return;
    
    elements.filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 활성 상태 변경
            elements.filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 필터 적용
            pageState.currentFilter = this.dataset.filter;
            pageState.currentPage = 1;
            
            // 데이터 다시 처리
            mergeAndProcessData();
            
            console.log(`[RankMember] 📋 필터 적용: ${pageState.currentFilter}`);
        });
    });
}

// 정렬 설정
function setupSorting() {
    if (!elements.settingsBtn || !elements.sortDropdown) return;
    
    // 설정 버튼 클릭
    elements.settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        elements.sortDropdown.classList.toggle('active');
    });
    
    // 정렬 옵션 클릭
    elements.sortDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            // 활성 상태 변경
            elements.sortDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // 정렬 적용
            pageState.currentSort = this.dataset.sort;
            
            // 데이터 다시 처리
            mergeAndProcessData();
            
            // 드롭다운 닫기
            elements.sortDropdown.classList.remove('active');
            
            console.log(`[RankMember] 🔄 정렬 변경: ${pageState.currentSort}`);
        });
    });
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function() {
        if (elements.sortDropdown) {
            elements.sortDropdown.classList.remove('active');
        }
    });
}

// WeightSync 호환 함수들
async function refreshMemberRankingData() {
    console.log('[RankMember] 🔄 의원 랭킹 데이터 새로고침...');
    try {
        await loadAllData();
        showNotification('의원 랭킹 데이터가 업데이트되었습니다.', 'success');
    } catch (error) {
        console.error('[RankMember] ❌ 새로고침 실패:', error);
        showNotification('데이터 새로고침에 실패했습니다.', 'error');
    }
}

async function refreshMemberDetails() {
    return await refreshMemberRankingData();
}

async function loadMemberData() {
    return await loadAllData();
}

async function updateMemberRanking() {
    return await refreshMemberRankingData();
}

async function fetchMemberData() {
    return await loadAllData();
}

// 페이지 초기화
async function initializePage() {
    try {
        console.log('[RankMember] 🚀 국회의원 랭킹 페이지 초기화...');
        
        // DOM 요소 초기화
        initializeElements();
        
        // 이벤트 리스너 설정
        setupSearch();
        setupFilters();
        setupSorting();
        
        // 데이터 로드
        await loadAllData();
        
        pageState.initialized = true;
        console.log('[RankMember] ✅ 페이지 초기화 완료');
        
    } catch (error) {
        console.error('[RankMember] ❌ 페이지 초기화 실패:', error);
        pageState.hasError = true;
        showNotification('페이지 초기화에 실패했습니다.', 'error');
    }
}

// 디버그 함수들
window.rankMemberDebug = {
    getState: () => pageState,
    refreshData: () => refreshMemberRankingData(),
    reloadData: () => loadAllData(),
    showInfo: () => {
        console.log('[RankMember] 📊 페이지 정보:');
        console.log(`- 전체 의원: ${pageState.memberList.length}명`);
        console.log(`- 필터된 의원: ${pageState.filteredMembers.length}명`);
        console.log(`- 현재 페이지: ${pageState.currentPage}/${pageState.totalPages}`);
        console.log(`- 정렬: ${pageState.currentSort}`);
        console.log(`- 필터: ${pageState.currentFilter}`);
        console.log(`- 검색: "${pageState.searchQuery}"`);
        console.log(`- 랭킹 데이터: ${pageState.memberRanking.length}개`);
        console.log(`- API 연결: ${window.APIService?._isReady ? '✅' : '❌'}`);
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('[RankMember] 📄 DOM 로드 완료 (v2.0.0)');
    
    // API 서비스 대기
    let attempts = 0;
    const maxAttempts = 30;
    
    function waitForAPI() {
        attempts++;
        
        if (window.APIService && window.APIService._isReady) {
            console.log('[RankMember] ✅ API 서비스 연결 확인');
            initializePage();
        } else if (attempts < maxAttempts) {
            setTimeout(waitForAPI, 100);
        } else {
            console.warn('[RankMember] ⚠️ API 서비스 연결 타임아웃, 폴백 데이터 사용');
            // 폴백 데이터로 초기화
            pageState.memberList = getFallbackData();
            pageState.memberRanking = [];
            mergeAndProcessData();
            initializeElements();
            setupSearch();
            setupFilters();
            setupSorting();
        }
    }
    
    waitForAPI();
});

console.log('[RankMember] 📦 rank_member.js 로드 완료 (v2.0.0)');
