// 국회의원 상세정보 페이지 (랭킹 API 통합 버전)

// 페이지 상태 관리
let pageState = {
    currentMember: null,
    memberList: [],
    photoList: [],
    performanceData: [],
    attendanceData: [],
    billCountData: [],
    committeeData: [],
    rankingData: [], // 🆕 랭킹 데이터 추가
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
    committeeStat: null,
    abstentionStat: null,
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
    elements.committeeStat = document.getElementById('committeeStat');
    elements.abstentionStat = document.getElementById('abstentionStat');
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
            elements.committeeStat,
            elements.abstentionStat,
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

// 🆕 API에서 국회의원 랭킹 데이터 가져오기
async function fetchRankingData() {
    try {
        console.log('🏆 국회의원 랭킹 API 호출...');
        
        if (!window.APIService || !window.APIService.getMemberScoreRanking) {
            throw new Error('랭킹 API 서비스가 준비되지 않았습니다.');
        }
        
        const rankingResponse = await window.APIService.getMemberScoreRanking();
        
        if (!rankingResponse || !rankingResponse.data || !Array.isArray(rankingResponse.data)) {
            throw new Error('랭킹 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.rankingData = rankingResponse.data.map(ranking => ({
            name: ranking.HG_NM || '이름 없음',
            party: ranking.POLY_NM || '정당 없음',
            overallRank: parseInt(ranking.총점_순위) || 999,
            // 추가 데이터가 있다면 여기에 매핑
            totalScore: ranking.총점 || 0,
            source: 'ranking_server'
        }));
        
        console.log(`✅ 랭킹 데이터 로드 완료: ${pageState.rankingData.length}명`);
        return pageState.rankingData;
        
    } catch (error) {
        console.error('❌ 랭킹 데이터 로드 실패:', error);
        pageState.rankingData = [];
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
            name: perf.lawmaker_name || '',
            party: perf.party || '',
            total_score: parseFloat(perf.total_score || 0),
            attendance_score: parseFloat(perf.attendance_score || 0),
            petition_score: parseFloat(perf.petition_score || 0),
            petition_result_score: parseFloat(perf.petition_result_score || 0),
            committee_score: parseFloat(perf.committee_score || 0),
            invalid_vote_ratio: parseFloat(perf.invalid_vote_ratio || 0),
            vote_match_ratio: parseFloat(perf.vote_match_ratio || 0),
            vote_mismatch_ratio: parseFloat(perf.vote_mismatch_ratio || 0),
            lawmaker_id: perf.lawmaker || null
        }));
        
        console.log(`✅ 실적 데이터 로드 완료: ${pageState.performanceData.length}개`);
        return pageState.performanceData;
        
    } catch (error) {
        console.error('❌ 실적 데이터 로드 실패:', error);
        pageState.performanceData = [];
        throw error;
    }
}

// API에서 출석 데이터 가져오기
async function fetchAttendanceData() {
    try {
        console.log('📅 출석 데이터 API 호출...');
        
        // global_sync.js의 fetchFromAPI 사용
        const attendanceData = await window.APIService.fetchFromAPI('api', '/attendance/attendance/');
        
        if (!attendanceData || !Array.isArray(attendanceData)) {
            throw new Error('출석 데이터 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.attendanceData = attendanceData.map(att => ({
            member_name: att.member_name || '',
            party: att.party || '',
            total_meetings: parseInt(att.total_meetings || 0),
            attendance: parseInt(att.attendance || 0),
            absences: parseInt(att.absences || 0),
            leaves: parseInt(att.leaves || 0),
            business_trips: parseInt(att.business_trips || 0),
            attendance_rate: parseFloat(att.attendance_rate || 0)
        }));
        
        console.log(`✅ 출석 데이터 로드 완료: ${pageState.attendanceData.length}개`);
        return pageState.attendanceData;
        
    } catch (error) {
        console.error('❌ 출석 데이터 로드 실패:', error);
        pageState.attendanceData = [];
        throw error;
    }
}

// API에서 본회의 제안 데이터 가져오기
async function fetchBillCountData() {
    try {
        console.log('📋 본회의 제안 데이터 API 호출...');
        
        // global_sync.js의 fetchFromAPI 사용
        const billData = await window.APIService.fetchFromAPI('api', '/legislation/bill-count');
        
        if (!billData || !Array.isArray(billData)) {
            throw new Error('본회의 제안 데이터 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.billCountData = billData.map(bill => ({
            id: bill.id || '',
            proposer: bill.proposer || '',
            total: parseInt(bill.total || 0),
            approved: parseInt(bill.approved || 0),
            discarded: parseInt(bill.discarded || 0),
            rejected: parseInt(bill.rejected || 0),
            other: parseInt(bill.other || 0)
        }));
        
        console.log(`✅ 본회의 제안 데이터 로드 완료: ${pageState.billCountData.length}개`);
        return pageState.billCountData;
        
    } catch (error) {
        console.error('❌ 본회의 제안 데이터 로드 실패:', error);
        pageState.billCountData = [];
        throw error;
    }
}

// API에서 위원회 정보 가져오기
async function fetchCommitteeData() {
    try {
        console.log('🏛️ 위원회 정보 API 호출...');
        
        // global_sync.js의 fetchFromAPI 사용
        const committeeData = await window.APIService.fetchFromAPI('api', '/legislation/committee-member/');
        
        if (!committeeData || !Array.isArray(committeeData)) {
            throw new Error('위원회 정보 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑
        pageState.committeeData = committeeData.map(comm => ({
            committee_name: comm.DEPT_NM || '',
            position: comm.JOB_RES_NM || '',
            member_name: comm.HG_NM || '',
            party: comm.POLY_NM || ''
        }));
        
        console.log(`✅ 위원회 정보 로드 완료: ${pageState.committeeData.length}개`);
        return pageState.committeeData;
        
    } catch (error) {
        console.error('❌ 위원회 정보 로드 실패:', error);
        pageState.committeeData = [];
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
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '이재명',
            party: '더불어민주당',
            mona_cd: 'MEMBER_002',
            committees: ['정무위원회'],
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '조국',
            party: '조국혁신당',
            mona_cd: 'MEMBER_003',
            committees: ['법제사법위원회'],
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

// 🆕 국회의원 랭킹 찾기
function findMemberRanking(memberName) {
    if (!pageState.rankingData || pageState.rankingData.length === 0) {
        return null;
    }
    
    return pageState.rankingData.find(ranking => 
        ranking.name === memberName
    );
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

// 국회의원 출석 정보 찾기
function findMemberAttendance(memberName) {
    if (!pageState.attendanceData || pageState.attendanceData.length === 0) {
        return null;
    }
    
    return pageState.attendanceData.find(att => 
        att.member_name === memberName
    );
}

// 국회의원 본회의 제안 정보 찾기
function findMemberBillCount(memberPerformance) {
    if (!pageState.billCountData || pageState.billCountData.length === 0 || !memberPerformance) {
        return null;
    }
    
    return pageState.billCountData.find(bill => 
        bill.id === memberPerformance.lawmaker_id
    );
}

// 국회의원 위원회 정보 찾기
function findMemberCommitteeInfo(memberName) {
    if (!pageState.committeeData || pageState.committeeData.length === 0) {
        return null;
    }
    
    return pageState.committeeData.find(comm => 
        comm.member_name === memberName
    );
}

// 위원회 직책 정보 생성
function getMemberCommitteePosition(member) {
    const committeeInfo = findMemberCommitteeInfo(member.name);
    
    if (!committeeInfo) {
        return '위원회 정보 없음';
    }
    
    const committee = committeeInfo.committee_name || '미상';
    const position = committeeInfo.position || '일반위원';
    
    return `${committee} (${position})`;
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

// 🔄 실적 통계 업데이트 (랭킹 API 통합)
function updatePerformanceStats(member) {
    const performance = findMemberPerformance(member.name);
    const attendance = findMemberAttendance(member.name);
    const billCount = findMemberBillCount(performance);
    const ranking = findMemberRanking(member.name); // 🆕 랭킹 데이터 사용
    
    if (!performance) {
        console.warn(`⚠️ ${member.name} 실적 데이터 없음`);
        updateStatsWithFallback(member);
        return;
    }
    
    // 🆕 실제 랭킹 데이터 사용
    const overallRank = ranking ? ranking.overallRank : calculateOverallRank(performance);
    const partyRank = calculatePartyRank(performance, member.party, ranking);
    
    // 순위 업데이트
    if (elements.overallRanking) {
        if (ranking && ranking.source === 'ranking_server') {
            elements.overallRanking.innerHTML = `전체 순위: <strong>${overallRank}위</strong> <span style="font-size: 12px; color: #888;">(실시간)</span>`;
        } else {
            elements.overallRanking.innerHTML = `전체 순위: <strong>${overallRank}위</strong> <span style="font-size: 12px; color: #888;">(추정)</span>`;
        }
    }
    
    if (elements.partyRanking) {
        elements.partyRanking.innerHTML = `정당 내 순위: <strong>${partyRank}위</strong>`;
    }
    
    // 위원회 직책 정보 가져오기
    const committeePosition = getMemberCommitteePosition(member);
    
    // 실적 통계 업데이트
    updateStatElement(elements.attendanceStat, attendance ? attendance.attendance_rate : performance.attendance_score, '%');
    updateStatElement(elements.billPassStat, billCount ? (billCount.approved / billCount.total * 100) : performance.attendance_score, '%');
    updateStatElement(elements.petitionProposalStat, performance.petition_score, '%');
    updateStatElement(elements.petitionResultStat, performance.petition_result_score, '%');
    
    // 위원회 직책 정보 업데이트
    updateCommitteeElement(elements.committeeStat, committeePosition);
    
    updateStatElement(elements.abstentionStat, performance.invalid_vote_ratio, '%');
    updateStatElement(elements.voteMatchStat, performance.vote_match_ratio, '%');
    updateStatElement(elements.voteMismatchStat, performance.vote_mismatch_ratio, '%');
    
    // 🆕 랭킹 데이터 표시 로그
    if (ranking) {
        console.log(`🏆 ${member.name} 랭킹 정보: 전체 ${ranking.overallRank}위 (${ranking.source})`);
    }
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

// 위원회 직책 요소 업데이트
function updateCommitteeElement(element, position) {
    if (!element) return;
    
    element.textContent = position;
    element.classList.remove('loading');
    
    // 직책에 따른 색상 클래스 적용
    element.classList.remove('good', 'warning', 'bad');
    
    if (position.includes('위원장') || position.includes('의장')) {
        element.classList.add('good');
    } else if (position.includes('간사')) {
        element.classList.add('warning');
    } else if (position.includes('정보 없음')) {
        element.classList.add('bad');
    }
    // 일반위원은 기본 색상
}

// 폴백 통계 업데이트
function updateStatsWithFallback(member) {
    console.log(`🔄 ${member.name} 폴백 데이터 사용`);
    
    // 기본값으로 통계 업데이트
    const fallbackStats = generateFallbackStats(member);
    
    // 🆕 랭킹 데이터가 있는지 확인
    const ranking = findMemberRanking(member.name);
    
    if (elements.overallRanking) {
        if (ranking) {
            elements.overallRanking.innerHTML = `전체 순위: <strong>${ranking.overallRank}위</strong> <span style="font-size: 12px; color: #888;">(실시간)</span>`;
        } else {
            elements.overallRanking.innerHTML = `전체 순위: <strong>정보 없음</strong>`;
        }
    }
    if (elements.partyRanking) {
        elements.partyRanking.innerHTML = `정당 내 순위: <strong>정보 없음</strong>`;
    }
    
    // 위원회 직책 정보 가져오기
    const committeePosition = getMemberCommitteePosition(member);
    
    updateStatElement(elements.attendanceStat, fallbackStats.attendance, '%');
    updateStatElement(elements.billPassStat, fallbackStats.billPass, '%');
    updateStatElement(elements.petitionProposalStat, fallbackStats.petition, '%');
    updateStatElement(elements.petitionResultStat, fallbackStats.petitionResult, '%');
    
    // 위원회 직책 정보 업데이트
    updateCommitteeElement(elements.committeeStat, committeePosition);
    
    updateStatElement(elements.abstentionStat, fallbackStats.abstention, '%');
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

// 🔄 순위 계산 함수들 (랭킹 서버 폴백용)
function calculateOverallRank(performance) {
    if (!pageState.performanceData || pageState.performanceData.length === 0) {
        return '정보 없음';
    }
    
    const sorted = pageState.performanceData
        .sort((a, b) => b.total_score - a.total_score);
    
    const rank = sorted.findIndex(p => p.total_score === performance.total_score) + 1;
    return rank || '정보 없음';
}

function calculatePartyRank(performance, party, ranking = null) {
    // 🆕 랭킹 데이터가 있으면 그것을 기반으로 정당 내 순위 계산
    if (ranking && pageState.rankingData.length > 0) {
        const partyMembers = pageState.rankingData
            .filter(r => r.party === party)
            .sort((a, b) => a.overallRank - b.overallRank);
        
        const rank = partyMembers.findIndex(r => r.name === ranking.name) + 1;
        return rank || '정보 없음';
    }
    
    // 폴백: 기존 방식
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
            
            // 🆕 랭킹 정보 추가
            const ranking = findMemberRanking(member.name);
            const rankText = ranking ? ` • ${ranking.overallRank}위` : '';
            
            item.innerHTML = `
                <img src="${photoUrl || ''}" alt="${member.name}" class="search-result-photo" 
                     onerror="this.style.display='none'">
                <div class="search-result-info">
                    <div class="search-result-name">${member.name}${rankText}</div>
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

// 🔄 전체 데이터 로드 (랭킹 API 추가)
async function loadAllData() {
    try {
        toggleLoadingState(true);
        
        console.log('🚀 전체 데이터 로드 시작...');
        
        // 병렬로 모든 데이터 로드 (🆕 랭킹 데이터 추가)
        const results = await Promise.allSettled([
            fetchMemberList(),
            fetchPhotoList(),
            fetchPerformanceData(),
            fetchAttendanceData(),
            fetchBillCountData(),
            fetchCommitteeData(),
            fetchRankingData() // 🆕 랭킹 데이터 추가
        ]);
        
        // 결과 확인
        const [memberResult, photoResult, performanceResult, attendanceResult, billResult, committeeResult, rankingResult] = results;
        
        if (memberResult.status === 'rejected') {
            console.error('국회의원 명단 로드 실패:', memberResult.reason);
        }
        
        if (photoResult.status === 'rejected') {
            console.warn('사진 데이터 로드 실패:', photoResult.reason);
        }
        
        if (performanceResult.status === 'rejected') {
            console.warn('실적 데이터 로드 실패:', performanceResult.reason);
        }
        
        if (attendanceResult.status === 'rejected') {
            console.warn('출석 데이터 로드 실패:', attendanceResult.reason);
        }
        
        if (billResult.status === 'rejected') {
            console.warn('본회의 제안 데이터 로드 실패:', billResult.reason);
        }
        
        if (committeeResult.status === 'rejected') {
            console.warn('위원회 정보 로드 실패:', committeeResult.reason);
        }
        
        // 🆕 랭킹 데이터 로드 결과 확인
        if (rankingResult.status === 'rejected') {
            console.warn('랭킹 데이터 로드 실패:', rankingResult.reason);
        } else {
            console.log('✅ 랭킹 서버 연결 성공');
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

// 🔄 데이터 새로고침 함수 (가중치 변경 시 사용)
async function refreshMemberDetails() {
    try {
        console.log('🔄 국회의원 상세정보 새로고침...');
        toggleLoadingState(true);
        
        // 실적 및 랭킹 데이터만 다시 로드 (가중치 영향 받는 데이터)
        const results = await Promise.allSettled([
            fetchPerformanceData(),
            fetchRankingData()
        ]);
        
        const [performanceResult, rankingResult] = results;
        
        if (performanceResult.status === 'fulfilled') {
            console.log('✅ 실적 데이터 새로고침 완료');
        }
        
        if (rankingResult.status === 'fulfilled') {
            console.log('✅ 랭킹 데이터 새로고침 완료');
        }
        
        // 현재 선택된 의원 프로필 업데이트
        if (pageState.currentMember) {
            updateMemberProfile(pageState.currentMember);
            showNotification(`${pageState.currentMember.name} 의원 정보가 업데이트되었습니다`, 'success');
        }
        
    } catch (error) {
        console.error('❌ 새로고침 실패:', error);
        showNotification('데이터 새로고침에 실패했습니다', 'error');
    } finally {
        toggleLoadingState(false);
    }
}

// 🔄 페이지 데이터 새로고침 (WeightSync 호환)
async function loadMemberDetailData() {
    return await refreshMemberDetails();
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

// 🔧 전역 함수들 (디버깅 및 WeightSync 호환)
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
    refreshData: () => refreshMemberDetails(), // 🆕 WeightSync 호환
    showInfo: () => {
        console.log('📊 국회의원 페이지 정보:');
        console.log(`- 현재 의원: ${pageState.currentMember?.name || '없음'}`);
        console.log(`- 의원 명단: ${pageState.memberList.length}명`);
        console.log(`- 사진 데이터: ${pageState.photoList.length}개`);
        console.log(`- 실적 데이터: ${pageState.performanceData.length}개`);
        console.log(`- 출석 데이터: ${pageState.attendanceData.length}개`);
        console.log(`- 본회의 제안: ${pageState.billCountData.length}개`);
        console.log(`- 위원회 정보: ${pageState.committeeData.length}개`);
        console.log(`- 랭킹 데이터: ${pageState.rankingData.length}개`); // 🆕
        console.log(`- API 서비스: ${!!window.APIService}`);
        console.log(`- 랭킹 서버: ${!!window.APIService?.getMemberScoreRanking}`); // 🆕
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 percent_member.js DOM 로드 완료 (랭킹 API 통합 버전)');
    
    // global_sync.js 및 weight_sync.js 로딩 대기
    let attempts = 0;
    const maxAttempts = 30;
    
    function waitForAPI() {
        attempts++;
        
        if (window.APIService && window.APIService._isReady) {
            console.log('✅ API 서비스 연결 확인');
            
            // 랭킹 서버 연결 확인
            if (window.APIService.getMemberScoreRanking) {
                console.log('✅ 랭킹 서버 연결 확인');
            } else {
                console.warn('⚠️ 랭킹 서버 미연결, 기본 순위 계산 사용');
            }
            
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

console.log('📦 percent_member.js 로드 완료 (랭킹 API 통합 + WeightSync 호환 버전)');
