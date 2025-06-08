// rank_member.js - 국회의원 랭킹 페이지 (v1.0.0)

// 페이지 상태 관리
let pageState = {
    memberList: [],        // /member/ API 데이터
    memberRanking: [],     // /ranking/members/ API 데이터  
    memberPhotos: [],      // 사진 데이터
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
    sortDropdown: null,
    loadingIndicator: null
};

// 초기화
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
    
    // 검색 버튼 비활성화/활성화
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
        console.log('[RankMember] 🚀 전체 데이터 로드 시작...');
        
        if (!window.APIService || !window.APIService._isReady) {
            throw new Error('API 서비스가 준비되지 않았습니다.');
        }
        
        // 필요한 데이터만 로드 (멤버 명단 + 랭킹)
        const results = await Promise.allSettled([
            window.APIService.getAllMembers(),    // /member/ - name, party, homepage, phone
            window.APIService.getMemberRanking(), // /ranking/members/ - HG_NM, POLY_NM, 총점_순위
        ]);
        
        const [membersResult, rankingResult, photosResult] = results;
        
        // 국회의원 명단 (필수)
        if (membersResult.status === 'fulfilled') {
            pageState.memberList = membersResult.value || [];
            console.log(`[RankMember] ✅ 국회의원 명단: ${pageState.memberList.length}명`);
        } else {
            console.error('[RankMember] ❌ 국회의원 명단 로드 실패:', membersResult.reason);
            throw new Error('국회의원 명단을 불러올 수 없습니다.');
        }
        
        // 랭킹 데이터 (필수)
        if (rankingResult.status === 'fulfilled') {
            pageState.memberRanking = rankingResult.value || [];
            console.log(`[RankMember] ✅ 랭킹 데이터: ${pageState.memberRanking.length}개`);
        } else {
            console.warn('[RankMember] ⚠️ 랭킹 데이터 로드 실패:', rankingResult.reason);
            pageState.memberRanking = [];
        }
        
        // 데이터 병합 및 정렬
        mergeAndSortData();
        
        console.log('[RankMember] ✅ 전체 데이터 로드 완료');
        return true;
        
    } catch (error) {
        console.error('[RankMember] ❌ 데이터 로드 실패:', error);
        pageState.hasError = true;
        showNotification('데이터 로드에 실패했습니다.', 'error');
        
        // 폴백 데이터 사용
        pageState.memberList = getFallbackData();
        mergeAndSortData();
        
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

// 데이터 병합 및 정렬
function mergeAndSortData() {
    try {
        // 의원 명단을 기본으로 하여 랭킹 데이터를 병합
        pageState.filteredMembers = pageState.memberList.map((member, index) => {
            const memberName = member.name || '';
            
            // 랭킹 데이터 찾기 (HG_NM으로 매칭)
            const ranking = pageState.memberRanking.find(r => 
                r.HG_NM === memberName
            );
            
            return {
                rank: ranking ? parseInt(ranking.총점_순위) || (index + 1) : (index + 1),
                name: memberName,
                party: member.party || '정당 없음',
                contact: member.phone || '',
                homepage: member.homepage || '',
                totalScore: 0, // 랭킹 API에서 점수는 별도로 제공되지 않음
                photo: photo ? photo.photo : null,
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
        
        console.log(`[RankMember] 📊 데이터 병합 완료: ${pageState.filteredMembers.length}명`);
        
    } catch (error) {
        console.error('[RankMember] ❌ 데이터 병합 실패:', error);
        pageState.filteredMembers = [];
        renderTable();
    }
}

// 정렬 적용
function applySorting() {
    pageState.filteredMembers.sort((a, b) => {
        const aRank = a.rank;
        const bRank = b.rank;
        
        if (pageState.currentSort === 'asc') {
            return aRank - bRank;
        } else {
            return bRank - aRank;
        }
    });
    
    // 순위 다시 매기기
    pageState.filteredMembers.forEach((member, index) => {
        if (pageState.currentSort === 'asc') {
            member.displayRank = index + 1;
        } else {
            member.displayRank = pageState.filteredMembers.length - index;
        }
    });
}

// 필터 적용
function applyFilter() {
    if (pageState.currentFilter !== 'all') {
        pageState.filteredMembers = pageState.filteredMembers.filter(member => 
            member.party === pageState.currentFilter
        );
    }
    
    // 검색 쿼리 적용
    if (pageState.searchQuery) {
        const query = pageState.searchQuery.toLowerCase();
        pageState.filteredMembers = pageState.filteredMembers.filter(member => 
            member.name.toLowerCase().includes(query) ||
            member.party.toLowerCase().includes(query)
        );
    }
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
    
    const startIndex = (pageState.currentPage - 1) * pageState.itemsPerPage;
    const endIndex = startIndex + pageState.itemsPerPage;
    const currentPageMembers = pageState.filteredMembers.slice(startIndex, endIndex);
    
    const tableHTML = currentPageMembers.map(member => `
        <tr>
            <td class="rank-cell">${member.displayRank}</td>
            <td>
                <a href="percent_member.html?member=${encodeURIComponent(member.name)}" 
                   class="member-name">${member.name}</a>
            </td>
            <td class="party-name">${member.party}</td>
            <td class="phone-number">${member.contact || '연락처 정보 없음'}</td>
            <td class="home-icon">
                <a href="${member.homepage || '#'}" 
                   target="_blank" 
                   ${!member.homepage ? 'onclick="return false;" style="opacity: 0.3;"' : ''}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                    </svg>
                </a>
            </td>
        </tr>
    `).join('');
    
    elements.memberTableBody.innerHTML = tableHTML;
    
    // 페이지네이션 렌더링
    renderPagination();
    
    // 정당 색상 적용
    applyPartyColors();
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
            if (page !== pageState.currentPage) {
                pageState.currentPage = page;
                renderTable();
            }
        });
    });
}

// 정당 색상 적용
function applyPartyColors() {
    if (typeof window.applyPartyColors === 'function') {
        window.applyPartyColors();
    }
}

// 검색 기능
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
    
    // 검색 버튼
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
    
    // 데이터를 다시 병합하여 필터링 적용
    mergeAndSortData();
    
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
            
            // 데이터를 다시 병합하여 필터링 적용
            mergeAndSortData();
            
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
            
            // 데이터를 다시 병합하여 정렬 적용
            mergeAndSortData();
            
            // 드롭다운 닫기
            elements.sortDropdown.classList.remove('active');
            
            console.log(`[RankMember] 🔄 정렬 변경: ${pageState.currentSort}`);
        });
    });
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function() {
        elements.sortDropdown.classList.remove('active');
    });
}

// 데이터 새로고침 (WeightSync 호환)
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

// WeightSync 호환 함수들
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
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('[RankMember] 📄 DOM 로드 완료');
    
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
            console.warn('[RankMember] ⚠️ API 서비스 연결 타임아웃');
            // 폴백 데이터로 초기화
            pageState.memberList = getFallbackData();
            mergeAndSortData();
            initializeElements();
            setupSearch();
            setupFilters();
            setupSorting();
        }
    }
    
    waitForAPI();
});

console.log('[RankMember] 📦 rank_member.js 로드 완료 (v1.0.0)');
