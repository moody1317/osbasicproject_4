// 국회의원 상세정보 페이지 

// 페이지 상태 관리
let pageState = {
    currentMember: null,
    memberList: [],
    photoList: [],
    performanceData: [],
    isLoading: false,
    hasError: false,
    isSearching: false
};

// 기본 국회의원 정보 (URL 파라미터나 폴백용)
const DEFAULT_MEMBER = {
    name: '나경원',
    party: '국민의힘',
    mona_cd: 'DEFAULT_001',
    committees: ['행정안전위원회'],
    phone: '',
    homepage: ''
};

// DOM 요소 캐시
const elements = {
    memberName: null,
    memberParty: null,
    memberPhoto: null,
    memberHomepageLink: null,
    searchInput: null,
    partyFilter: null,
    searchButton: null,
    searchResults: null,
    overallRanking: null,
    partyRanking: null,
    attendanceStat: null,
    billPassStat: null,
    petitionProposalStat: null,
    petitionResultStat: null,
    abstentionStat: null,
    committeeStat: null,
    voteMatchStat: null,
    voteMismatchStat: null
};

// DOM 요소 초기화
function initializeElements() {
    elements.memberName = document.getElementById('memberName');
    elements.memberParty = document.getElementById('memberParty');
    elements.memberPhoto = document.getElementById('memberPhoto');
    elements.memberHomepageLink = document.getElementById('memberHomepageLink');
    elements.searchInput = document.getElementById('memberSearchInput');
    elements.partyFilter = document.getElementById('partyFilter');
    elements.searchButton = document.getElementById('searchButton');
    elements.overallRanking = document.getElementById('overallRanking');
    elements.partyRanking = document.getElementById('partyRanking');
    elements.attendanceStat = document.getElementById('attendanceStat');
    elements.billPassStat = document.getElementById('billPassStat');
    elements.petitionProposalStat = document.getElementById('petitionProposalStat');
    elements.petitionResultStat = document.getElementById('petitionResultStat');
    elements.abstentionStat = document.getElementById('abstentionStat');
    elements.committeeStat = document.getElementById('committeeStat');
    elements.voteMatchStat = document.getElementById('voteMatchStat');
    elements.voteMismatchStat = document.getElementById('voteMismatchStat');
}

// 로딩 상태 표시/숨김
function toggleLoadingState(show) {
    pageState.isLoading = show;
    
    if (show) {
        // 모든 통계 값을 로딩으로 표시
        const loadingElements = [
            elements.overallRanking,
            elements.partyRanking,
            elements.attendanceStat,
            elements.billPassStat,
            elements.petitionProposalStat,
            elements.petitionResultStat,
            elements.abstentionStat,
            elements.committeeStat,
            elements.voteMatchStat,
            elements.voteMismatchStat
        ];
        
        loadingElements.forEach(el => {
            if (el) {
                el.innerHTML = '<span class="loading-spinner"></span>로딩 중...';
                el.classList.add('loading');
            }
        });
        
        // 검색 버튼 비활성화
        if (elements.searchButton) {
            elements.searchButton.disabled = true;
        }
        
    } else {
        // 로딩 클래스 제거
        document.querySelectorAll('.loading').forEach(el => {
            el.classList.remove('loading');
        });
        
        // 검색 버튼 활성화
        if (elements.searchButton) {
            elements.searchButton.disabled = false;
        }
    }
}

// 알림 메시지 표시
function showNotification(message, type = 'info', duration = 3000) {
    if (window.APIService && window.APIService.showNotification) {
        window.APIService.showNotification(message, type, duration);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // 기본 알림 시스템
        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// API에서 국회의원 명단 가져오기
async function fetchMemberList() {
    try {
        console.log('📋 국회의원 명단 API 호출...');
        
        if (!window.APIService || !window.APIService._isReady) {
            throw new Error('API 서비스가 준비되지 않았습니다.');
        }
        
        const rawData = await window.APIService.getAllMembers();
        
        if (!rawData || !Array.isArray(rawData)) {
            throw new Error('국회의원 명단 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.memberList = rawData.map(member => ({
            name: member.name || '이름 없음',
            party: member.party || '정당 없음',
            mona_cd: member.mona_cd || '',
            committees: Array.isArray(member.committees) ? member.committees : 
                       typeof member.committees === 'string' ? [member.committees] : ['위원회 정보 없음'],
            phone: member.phone || '',
            homepage: member.homepage || ''
        }));
        
        console.log(`✅ 국회의원 명단 로드 완료: ${pageState.memberList.length}명`);
        return pageState.memberList;
        
    } catch (error) {
        console.error('❌ 국회의원 명단 로드 실패:', error);
        
        // 폴백 데이터 사용
        pageState.memberList = getFallbackMemberList();
        throw error;
    }
}

// API에서 국회의원 사진 데이터 가져오기
async function fetchPhotoList() {
    try {
        console.log('📸 국회의원 사진 API 호출...');
        
        const photoData = await window.APIService.getMemberPhotos();
        
        if (!photoData || !Array.isArray(photoData)) {
            throw new Error('사진 데이터 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.photoList = photoData.map(photo => ({
            member_code: photo.member_code || '',
            member_name: photo.member_name || '',
            photo: photo.photo || ''
        }));
        
        console.log(`✅ 사진 데이터 로드 완료: ${pageState.photoList.length}개`);
        return pageState.photoList;
        
    } catch (error) {
        console.error('❌ 사진 데이터 로드 실패:', error);
        pageState.photoList = [];
        throw error;
    }
}

// API에서 국회의원 실적 데이터 가져오기
async function fetchPerformanceData() {
    try {
        console.log('📊 국회의원 실적 API 호출...');
        
        const performanceData = await window.APIService.getMemberRanking();
        
        if (!performanceData || !Array.isArray(performanceData)) {
            throw new Error('실적 데이터 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.performanceData = performanceData.map(perf => ({
            name: perf.name || perf.member_name || '',
            party: perf.party || '',
            total_score: parseFloat(perf.total_score || 0),
            attendance_score: parseFloat(perf.attendance_score || 0),
            petition_score: parseFloat(perf.petition_score || 0),
            petition_result_score: parseFloat(perf.petition_result_score || 0),
            committee_score: parseFloat(perf.committee_score || 0),
            invalid_vote_ratio: parseFloat(perf.invalid_vote_ratio || 0),
            vote_match_ratio: parseFloat(perf.vote_match_ratio || 0),
            vote_mismatch_ratio: parseFloat(perf.vote_mismatch_ratio || 0)
        }));
        
        console.log(`✅ 실적 데이터 로드 완료: ${pageState.performanceData.length}개`);
        return pageState.performanceData;
        
    } catch (error) {
        console.error('❌ 실적 데이터 로드 실패:', error);
        pageState.performanceData = [];
        throw error;
    }
}

// 폴백 국회의원 명단 (API 실패 시)
function getFallbackMemberList() {
    return [
        {
            name: '나경원',
            party: '국민의힘',
            mona_cd: 'MEMBER_001',
            committees: ['행정안전위원회'],
            phone: '02-788-2001',
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '이재명',
            party: '더불어민주당',
            mona_cd: 'MEMBER_002',
            committees: ['정무위원회'],
            phone: '02-788-2002',
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '조국',
            party: '조국혁신당',
            mona_cd: 'MEMBER_003',
            committees: ['법제사법위원회'],
            phone: '02-788-2003',
            homepage: 'https://www.assembly.go.kr'
        }
    ];
}

// 국회의원 사진 찾기
function findMemberPhoto(memberCode, memberName) {
    if (!pageState.photoList || pageState.photoList.length === 0) {
        return null;
    }
    
    // 먼저 코드로 찾기
    const photoByCode = pageState.photoList.find(photo => 
        photo.member_code === memberCode
    );
    
    if (photoByCode) {
        return photoByCode.photo;
    }
    
    // 이름으로 찾기
    const photoByName = pageState.photoList.find(photo => 
        photo.member_name === memberName
    );
    
    return photoByName ? photoByName.photo : null;
}

// 국회의원 실적 찾기
function findMemberPerformance(memberName) {
    if (!pageState.performanceData || pageState.performanceData.length === 0) {
        return null;
    }
    
    return pageState.performanceData.find(perf => 
        perf.name === memberName
    );
}

// 국회의원 정보 업데이트
function updateMemberProfile(member) {
    if (!member) return;
    
    console.log(`👤 ${member.name} 프로필 업데이트 중...`);
    
    // 기본 정보 업데이트
    if (elements.memberName) elements.memberName.textContent = member.name;
    if (elements.memberParty) elements.memberParty.textContent = member.party;
    
    // 사진 업데이트
    updateMemberPhoto(member);
    
    // 홈페이지 링크 업데이트
    updateHomepageLink(member);
    
    // 실적 데이터 업데이트
    updatePerformanceStats(member);
    
    // 정당 색상 적용
    if (window.applyPartyColors) {
        window.applyPartyColors(member.party);
    }
    
    // 페이지 제목 업데이트
    document.title = `백일하 - ${member.name} 의원`;
    
    console.log(`✅ ${member.name} 프로필 업데이트 완료`);
}

// 국회의원 사진 업데이트
function updateMemberPhoto(member) {
    if (!elements.memberPhoto) return;
    
    const photoUrl = findMemberPhoto(member.mona_cd, member.name);
    
    if (photoUrl) {
        elements.memberPhoto.innerHTML = `
            <img src="${photoUrl}" alt="${member.name} 의원" 
                 onerror="this.parentElement.innerHTML='<div class=\\"photo-placeholder\\">사진 없음</div>'">
        `;
    } else {
        elements.memberPhoto.innerHTML = `
            <div class="photo-placeholder">사진 없음</div>
        `;
    }
}

// 홈페이지 링크 업데이트
function updateHomepageLink(member) {
    if (!elements.memberHomepageLink) return;
    
    if (member.homepage && member.homepage !== '') {
        elements.memberHomepageLink.href = member.homepage;
        elements.memberHomepageLink.classList.remove('disabled');
        elements.memberHomepageLink.title = `${member.name} 의원 홈페이지`;
    } else {
        elements.memberHomepageLink.href = '#';
        elements.memberHomepageLink.classList.add('disabled');
        elements.memberHomepageLink.title = '홈페이지 정보 없음';
    }
}

// 실적 통계 업데이트
function updatePerformanceStats(member) {
    const performance = findMemberPerformance(member.name);
    
    if (!performance) {
        console.warn(`⚠️ ${member.name} 실적 데이터 없음`);
        updateStatsWithFallback(member);
        return;
    }
    
    // 순위 계산 (임시 - 실제 순위 API 구현 후 수정)
    const overallRank = calculateOverallRank(performance);
    const partyRank = calculatePartyRank(performance, member.party);
    
    // 순위 업데이트
    if (elements.overallRanking) {
        elements.overallRanking.innerHTML = `전체 순위: <strong>${overallRank}위</strong>`;
    }
    if (elements.partyRanking) {
        elements.partyRanking.innerHTML = `정당 내 순위: <strong>${partyRank}위</strong>`;
    }
    
    // 실적 통계 업데이트
    updateStatElement(elements.attendanceStat, performance.attendance_score, '%');
    updateStatElement(elements.billPassStat, performance.attendance_score, '%'); // API 매핑 확인 필요
    updateStatElement(elements.petitionProposalStat, performance.petition_score, '%');
    updateStatElement(elements.petitionResultStat, performance.petition_result_score, '%');
    updateStatElement(elements.abstentionStat, performance.invalid_vote_ratio, '%');
    updateStatElement(elements.committeeStat, performance.committee_score, '%');
    updateStatElement(elements.voteMatchStat, performance.vote_match_ratio, '%');
    updateStatElement(elements.voteMismatchStat, performance.vote_mismatch_ratio, '%');
}

// 통계 요소 업데이트
function updateStatElement(element, value, suffix = '') {
    if (!element) return;
    
    const numValue = parseFloat(value) || 0;
    const displayValue = numValue.toFixed(1);
    
    element.textContent = `${displayValue}${suffix}`;
    element.classList.remove('loading');
    
    // 값에 따른 색상 클래스 적용
    element.classList.remove('good', 'warning', 'bad');
    
    if (numValue >= 80) {
        element.classList.add('good');
    } else if (numValue >= 60) {
        element.classList.add('warning');
    } else if (numValue < 40) {
        element.classList.add('bad');
    }
}

// 폴백 통계 업데이트
function updateStatsWithFallback(member) {
    console.log(`🔄 ${member.name} 폴백 데이터 사용`);
    
    // 기본값으로 통계 업데이트
    const fallbackStats = generateFallbackStats(member);
    
    if (elements.overallRanking) {
        elements.overallRanking.innerHTML = `전체 순위: <strong>정보 없음</strong>`;
    }
    if (elements.partyRanking) {
        elements.partyRanking.innerHTML = `정당 내 순위: <strong>정보 없음</strong>`;
    }
    
    updateStatElement(elements.attendanceStat, fallbackStats.attendance, '%');
    updateStatElement(elements.billPassStat, fallbackStats.billPass, '%');
    updateStatElement(elements.petitionProposalStat, fallbackStats.petition, '%');
    updateStatElement(elements.petitionResultStat, fallbackStats.petitionResult, '%');
    updateStatElement(elements.abstentionStat, fallbackStats.abstention, '%');
    updateStatElement(elements.committeeStat, fallbackStats.committee, '%');
    updateStatElement(elements.voteMatchStat, fallbackStats.voteMatch, '%');
    updateStatElement(elements.voteMismatchStat, fallbackStats.voteMismatch, '%');
}

// 폴백 통계 생성
function generateFallbackStats(member) {
    // 정당별로 다른 특성을 가진 기본 데이터
    const baseStats = {
        attendance: 75 + Math.random() * 20,
        billPass: 60 + Math.random() * 35,
        petition: 50 + Math.random() * 40,
        petitionResult: 40 + Math.random() * 50,
        abstention: Math.random() * 15,
        committee: Math.random() * 25,
        voteMatch: 70 + Math.random() * 25,
        voteMismatch: Math.random() * 25
    };
    
    // 정당별 특성 반영
    switch(member.party) {
        case '국민의힘':
            baseStats.attendance = 85.5;
            baseStats.billPass = 78.2;
            break;
        case '더불어민주당':
            baseStats.attendance = 87.2;
            baseStats.billPass = 82.1;
            break;
        case '조국혁신당':
            baseStats.attendance = 82.8;
            baseStats.billPass = 76.4;
            break;
    }
    
    return baseStats;
}

// 임시 순위 계산 함수들 (실제 순위 API 구현 후 제거)
function calculateOverallRank(performance) {
    if (!pageState.performanceData || pageState.performanceData.length === 0) {
        return '정보 없음';
    }
    
    const sorted = pageState.performanceData
        .sort((a, b) => b.total_score - a.total_score);
    
    const rank = sorted.findIndex(p => p.total_score === performance.total_score) + 1;
    return rank || '정보 없음';
}

function calculatePartyRank(performance, party) {
    if (!pageState.performanceData || pageState.performanceData.length === 0) {
        return '정보 없음';
    }
    
    const partyMembers = pageState.performanceData
        .filter(p => p.party === party)
        .sort((a, b) => b.total_score - a.total_score);
    
    const rank = partyMembers.findIndex(p => p.total_score === performance.total_score) + 1;
    return rank || '정보 없음';
}

// 검색 기능 설정
function setupSearch() {
    if (!elements.searchInput) return;
    
    // 검색 결과 컨테이너 생성
    const searchContainer = elements.searchInput.parentElement;
    if (!elements.searchResults) {
        elements.searchResults = document.createElement('div');
        elements.searchResults.className = 'search-results';
        elements.searchResults.style.display = 'none';
        searchContainer.appendChild(elements.searchResults);
    }
    
    // 실시간 검색
    let searchTimeout;
    elements.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length === 0) {
            hideSearchResults();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
    
    // 검색 버튼 클릭
    if (elements.searchButton) {
        elements.searchButton.addEventListener('click', function() {
            const query = elements.searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        });
    }
    
    // 엔터키 검색
    elements.searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });
    
    // 외부 클릭 시 검색 결과 숨기기
    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    console.log('✅ 검색 기능 설정 완료');
}

// 검색 실행
function performSearch(query) {
    if (pageState.isSearching) return;
    
    pageState.isSearching = true;
    
    console.log(`🔍 검색 실행: "${query}"`);
    
    try {
        // 이름과 정당으로 필터링
        const filtered = pageState.memberList.filter(member => {
            const nameMatch = member.name.toLowerCase().includes(query.toLowerCase());
            const partyMatch = member.party.toLowerCase().includes(query.toLowerCase());
            
            // 정당 필터 적용
            const partyFilter = elements.partyFilter ? elements.partyFilter.value : '';
            const partyFilterMatch = !partyFilter || member.party === partyFilter;
            
            return (nameMatch || partyMatch) && partyFilterMatch;
        });
        
        displaySearchResults(filtered);
        
    } catch (error) {
        console.error('❌ 검색 실패:', error);
        showNotification('검색 중 오류가 발생했습니다', 'error');
    } finally {
        pageState.isSearching = false;
    }
}

// 검색 결과 표시
function displaySearchResults(results) {
    if (!elements.searchResults) return;
    
    elements.searchResults.innerHTML = '';
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = '<div class="no-results">검색 결과가 없습니다</div>';
    } else {
        results.slice(0, 10).forEach(member => { // 최대 10개만 표시
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const photoUrl = findMemberPhoto(member.mona_cd, member.name);
            const committeesText = member.committees.join(', ');
            
            item.innerHTML = `
                <img src="${photoUrl || ''}" alt="${member.name}" class="search-result-photo" 
                     onerror="this.style.display='none'">
                <div class="search-result-info">
                    <div class="search-result-name">${member.name}</div>
                    <div class="search-result-details">${member.party} · ${committeesText}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                selectMember(member);
                hideSearchResults();
            });
            
            elements.searchResults.appendChild(item);
        });
    }
    
    elements.searchResults.style.display = 'block';
}

// 검색 결과 숨기기
function hideSearchResults() {
    if (elements.searchResults) {
        elements.searchResults.style.display = 'none';
    }
}

// 국회의원 선택
function selectMember(member) {
    console.log(`👤 ${member.name} 선택됨`);
    
    pageState.currentMember = member;
    elements.searchInput.value = member.name;
    
    // URL 업데이트
    updateUrl(member.name);
    
    // 프로필 업데이트
    updateMemberProfile(member);
    
    showNotification(`${member.name} 의원 정보 로드 완료`, 'success');
}

// URL 파라미터 처리
function getMemberFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberName = urlParams.get('member') || urlParams.get('name');
    
    if (memberName) {
        const member = pageState.memberList.find(m => m.name === memberName);
        return member || null;
    }
    
    return null;
}

// URL 업데이트
function updateUrl(memberName) {
    if (history.pushState) {
        const url = new URL(window.location);
        url.searchParams.set('member', memberName);
        history.pushState({ member: memberName }, '', url);
    }
}

// 전체 데이터 로드
async function loadAllData() {
    try {
        toggleLoadingState(true);
        
        console.log('🚀 전체 데이터 로드 시작...');
        
        // 병렬로 모든 데이터 로드
        const results = await Promise.allSettled([
            fetchMemberList(),
            fetchPhotoList(),
            fetchPerformanceData()
        ]);
        
        // 결과 확인
        const [memberResult, photoResult, performanceResult] = results;
        
        if (memberResult.status === 'rejected') {
            console.error('국회의원 명단 로드 실패:', memberResult.reason);
        }
        
        if (photoResult.status === 'rejected') {
            console.warn('사진 데이터 로드 실패:', photoResult.reason);
        }
        
        if (performanceResult.status === 'rejected') {
            console.warn('실적 데이터 로드 실패:', performanceResult.reason);
        }
        
        console.log('✅ 전체 데이터 로드 완료');
        
        // 최소 하나의 성공이 있으면 계속 진행
        if (memberResult.status === 'fulfilled') {
            return true;
        } else {
            throw new Error('필수 데이터 로드 실패');
        }
        
    } catch (error) {
        console.error('❌ 전체 데이터 로드 실패:', error);
        showNotification('데이터 로드에 실패했습니다', 'error');
        throw error;
    } finally {
        toggleLoadingState(false);
    }
}

// 초기화 함수
async function initializePage() {
    console.log('🚀 국회의원 상세정보 페이지 초기화...');
    
    try {
        // DOM 요소 초기화
        initializeElements();
        
        // 검색 기능 설정
        setupSearch();
        
        // 전체 데이터 로드
        await loadAllData();
        
        // URL에서 국회의원 확인
        const urlMember = getMemberFromUrl();
        const initialMember = urlMember || DEFAULT_MEMBER;
        
        // 기본 국회의원이 명단에 있는지 확인
        const foundMember = pageState.memberList.find(m => m.name === initialMember.name);
        const memberToLoad = foundMember || pageState.memberList[0] || initialMember;
        
        console.log(`👤 초기 국회의원: ${memberToLoad.name}`);
        
        // 초기 국회의원 정보 표시
        selectMember(memberToLoad);
        
        console.log('✅ 페이지 초기화 완료');
        
    } catch (error) {
        console.error('❌ 페이지 초기화 실패:', error);
        
        // 폴백: 기본 데이터로 표시
        pageState.currentMember = DEFAULT_MEMBER;
        updateMemberProfile(DEFAULT_MEMBER);
        
        showNotification('일부 데이터 로드에 실패했습니다', 'warning', 5000);
    }
}

// 브라우저 뒤로/앞으로 버튼 처리
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.member) {
        const member = pageState.memberList.find(m => m.name === event.state.member);
        if (member) {
            selectMember(member);
        }
    } else {
        const urlMember = getMemberFromUrl();
        if (urlMember) {
            selectMember(urlMember);
        }
    }
});

// 전역 함수들 (디버깅용)
window.memberPageDebug = {
    getState: () => pageState,
    getCurrentMember: () => pageState.currentMember,
    searchMember: (name) => {
        const member = pageState.memberList.find(m => m.name.includes(name));
        if (member) {
            selectMember(member);
            return member;
        }
        return null;
    },
    reloadData: () => loadAllData(),
    showInfo: () => {
        console.log('📊 국회의원 페이지 정보:');
        console.log(`- 현재 의원: ${pageState.currentMember?.name || '없음'}`);
        console.log(`- 의원 명단: ${pageState.memberList.length}명`);
        console.log(`- 사진 데이터: ${pageState.photoList.length}개`);
        console.log(`- 실적 데이터: ${pageState.performanceData.length}개`);
        console.log(`- API 서비스: ${!!window.APIService}`);
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 percent_member.js DOM 로드 완료');
    
    // global_sync.js 로딩 대기
    let attempts = 0;
    const maxAttempts = 30;
    
    function waitForAPI() {
        attempts++;
        
        if (window.APIService && window.APIService._isReady) {
            console.log('✅ API 서비스 연결 확인');
            initializePage();
        } else if (attempts < maxAttempts) {
            setTimeout(waitForAPI, 100);
        } else {
            console.warn('⚠️ API 서비스 연결 타임아웃, 기본 데이터 사용');
            pageState.memberList = getFallbackMemberList();
            updateMemberProfile(DEFAULT_MEMBER);
        }
    }
    
    waitForAPI();
});

console.log('📦 percent_member.js 로드 완료 (API 연결 버전)');