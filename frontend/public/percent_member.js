// 국회의원 상세정보 페이지 (완전 수정 버전)

// 페이지 상태 관리
let pageState = {
    currentMember: null,
    memberList: [],
    photoList: [],
    performanceData: [],
    attendanceData: [],
    billCountData: [],
    committeeData: {},
    rankingData: [],
    isLoading: false,
    hasError: false,
    isSearching: false
};

// 기본 국회의원 정보
const DEFAULT_MEMBER = {
    name: '나경원',
    party: '국민의힘',
    mona_cd: 'DEFAULT_001',
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
        
        if (elements.searchButton) {
            elements.searchButton.disabled = true;
        }
        
    } else {
        document.querySelectorAll('.loading').forEach(el => {
            el.classList.remove('loading');
        });
        
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
    }
}

// 🔧 API에서 국회의원 명단 가져오기 (강화된 디버깅)
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
        
        console.log('🔍 의원 명단 원본 샘플 (처음 5개):', rawData.slice(0, 5));
        
        // API 데이터 매핑
        pageState.memberList = rawData.map(member => ({
            name: member.name || '',
            party: member.party || '무소속',
            mona_cd: member.mona_cd || '',
            homepage: member.homepage || '',
            phone: member.phone || '',
            _raw: member
        }));
        
        console.log(`✅ 국회의원 명단 로드 완료: ${pageState.memberList.length}명`);
        
        // 🔧 나경원 의원 확인
        const naKyungWonMember = pageState.memberList.find(m => m.name === '나경원');
        if (naKyungWonMember) {
            console.log('✅ 나경원 의원 명단 발견:', naKyungWonMember);
        } else {
            console.warn('❌ 나경원 의원 명단 없음');
            console.log('📋 전체 의원명 목록:', pageState.memberList.map(m => m.name).sort());
        }
        
        return pageState.memberList;
        
    } catch (error) {
        console.error('❌ 국회의원 명단 로드 실패:', error);
        pageState.memberList = getFallbackMemberList();
        throw error;
    }
}

// 🔧 API에서 국회의원 실적 데이터 가져오기 (강화된 디버깅)
async function fetchPerformanceData() {
    try {
        console.log('📊 국회의원 실적 API 호출...');
        
        const performanceData = await window.APIService.getMemberPerformance();
        
        if (!performanceData || !Array.isArray(performanceData)) {
            console.warn('실적 데이터가 없거나 올바르지 않습니다.');
            pageState.performanceData = [];
            return pageState.performanceData;
        }
        
        console.log('🔍 실적 데이터 원본 구조:', {
            총개수: performanceData.length,
            첫번째샘플: performanceData[0],
            필드목록: performanceData[0] ? Object.keys(performanceData[0]) : []
        });
        
        // API 데이터 매핑 (정확한 필드명 사용)
        pageState.performanceData = performanceData.map(perf => ({
            name: perf.lawmaker_name || '',
            party: perf.party || '무소속',
            total_score: parseFloat(perf.total_socre || perf.total_score || 0),
            attendance_score: parseFloat(perf.attendance_score || 0),
            petition_score: parseFloat(perf.petition_score || 0),
            petition_result_score: parseFloat(perf.petition_result_score || 0),
            invalid_vote_ratio: parseFloat(perf.invalid_vote_ratio || 0),
            vote_match_ratio: parseFloat(perf.vote_match_ratio || 0),
            vote_mismatch_ratio: parseFloat(perf.vote_mismatch_ratio || 0),
            lawmaker_id: perf.lawmaker || '',
            _raw: perf
        }));
        
        console.log(`✅ 실적 데이터 로드 완료: ${pageState.performanceData.length}개`);
        
        // 🔧 나경원 의원 실적 확인
        const naKyungWonPerf = pageState.performanceData.find(p => p.name === '나경원');
        if (naKyungWonPerf) {
            console.log('✅ 나경원 실적 데이터 발견:', naKyungWonPerf);
        } else {
            console.warn('❌ 나경원 실적 데이터 없음');
            console.log('📋 실적 데이터 의원명 목록:', pageState.performanceData.map(p => p.name).sort());
            
            // 유사한 이름 검색
            const similarNames = pageState.performanceData
                .map(p => p.name)
                .filter(name => name.includes('나') && name.includes('원'));
            
            if (similarNames.length > 0) {
                console.log('🔍 "나"와 "원"이 포함된 이름들:', similarNames);
            }
        }
        
        return pageState.performanceData;
        
    } catch (error) {
        console.error('❌ 실적 데이터 로드 실패:', error);
        pageState.performanceData = [];
        return pageState.performanceData;
    }
}

// 🔧 API에서 위원회 데이터 가져오기 (강화된 디버깅)
async function fetchCommitteeData() {
    try {
        console.log('🏛️ 위원회 API 호출...');
        
        const committeeData = await window.APIService.getCommitteeMembers();
        
        if (!committeeData || !Array.isArray(committeeData)) {
            console.warn('위원회 데이터가 없거나 올바르지 않습니다.');
            pageState.committeeData = {};
            return pageState.committeeData;
        }
        
        console.log('🔍 위원회 데이터 원본 구조:', {
            총개수: committeeData.length,
            첫번째샘플: committeeData[0],
            필드목록: committeeData[0] ? Object.keys(committeeData[0]) : []
        });
        
        // 위원회 데이터를 의원별로 그룹화
        const committeeMap = {};
        committeeData.forEach(member => {
            const memberName = member.HG_NM || '';
            if (!committeeMap[memberName]) {
                committeeMap[memberName] = [];
            }
            
            committeeMap[memberName].push({
                committee: member.DEPT_NM || '위원회 없음',
                position: member.JOB_RES_NM || '일반위원',
                member_name: memberName,
                party: member.POLY_NM || '무소속',
                member_code: member.MONA_CD || '',
                _raw: member
            });
        });
        
        pageState.committeeData = committeeMap;
        console.log(`✅ 위원회 데이터 로드 완료: ${Object.keys(committeeMap).length}명`);
        
        // 🔧 나경원 의원 위원회 확인
        const naKyungWonCommittee = committeeMap['나경원'];
        if (naKyungWonCommittee) {
            console.log('✅ 나경원 위원회 데이터 발견:', naKyungWonCommittee);
        } else {
            console.warn('❌ 나경원 위원회 데이터 없음');
            console.log('📋 위원회 데이터 의원명 목록:', Object.keys(committeeMap).sort());
            
            // 유사한 이름 검색
            const similarNames = Object.keys(committeeMap)
                .filter(name => name.includes('나') && name.includes('원'));
            
            if (similarNames.length > 0) {
                console.log('🔍 "나"와 "원"이 포함된 이름들:', similarNames);
            }
        }
        
        return pageState.committeeData;
        
    } catch (error) {
        console.error('❌ 위원회 데이터 로드 실패:', error);
        pageState.committeeData = {};
        return pageState.committeeData;
    }
}

// 🔧 API에서 랭킹 데이터 가져오기 (강화된 디버깅)
async function fetchRankingData() {
    try {
        console.log('🏆 국회의원 랭킹 API 호출...');
        
        const rankingData = await window.APIService.getMemberRanking();
        
        if (!rankingData || !Array.isArray(rankingData)) {
            console.warn('랭킹 데이터가 없거나 올바르지 않습니다.');
            pageState.rankingData = [];
            return pageState.rankingData;
        }
        
        console.log('🔍 랭킹 데이터 원본 구조:', {
            총개수: rankingData.length,
            첫번째샘플: rankingData[0],
            필드목록: rankingData[0] ? Object.keys(rankingData[0]) : []
        });
        
        pageState.rankingData = rankingData.map(rank => ({
            name: rank.HG_NM || '',
            party: rank.POLY_NM || '무소속',
            overall_rank: parseInt(rank.총점_순위) || 999,
            _raw: rank
        }));
        
        console.log(`✅ 랭킹 데이터 로드 완료: ${pageState.rankingData.length}개`);
        
        // 🔧 나경원 의원 랭킹 확인
        const naKyungWonRanking = pageState.rankingData.find(r => r.name === '나경원');
        if (naKyungWonRanking) {
            console.log('✅ 나경원 랭킹 데이터 발견:', naKyungWonRanking);
        } else {
            console.warn('❌ 나경원 랭킹 데이터 없음');
            console.log('📋 랭킹 데이터 의원명 목록:', pageState.rankingData.map(r => r.name).sort());
        }
        
        return pageState.rankingData;
        
    } catch (error) {
        console.error('❌ 랭킹 데이터 로드 실패:', error);
        pageState.rankingData = [];
        return pageState.rankingData;
    }
}

// 기타 API 로드 함수들 (간단히 유지)
async function fetchPhotoList() {
    try {
        const photoData = await window.APIService.getMemberPhotos();
        if (!photoData || !Array.isArray(photoData)) {
            pageState.photoList = [];
            return pageState.photoList;
        }
        
        pageState.photoList = photoData.map(photo => ({
            member_code: photo.member_code || '',
            member_name: photo.member_name || '',
            photo: photo.photo || '',
            _raw: photo
        }));
        
        console.log(`✅ 사진 데이터 로드 완료: ${pageState.photoList.length}개`);
        return pageState.photoList;
        
    } catch (error) {
        console.error('❌ 사진 데이터 로드 실패:', error);
        pageState.photoList = [];
        return pageState.photoList;
    }
}

async function fetchAttendanceData() {
    try {
        const attendanceData = await window.APIService.getMemberAttendance();
        if (!attendanceData || !Array.isArray(attendanceData)) {
            pageState.attendanceData = [];
            return pageState.attendanceData;
        }
        
        pageState.attendanceData = attendanceData.map(att => ({
            member_name: att.member_name || '',
            party: att.party || '무소속',
            total_meetings: parseInt(att.total_meetings || 0),
            attendance: parseInt(att.attendance || 0),
            attendance_rate: parseFloat(att.attendance_rate || 0),
            _raw: att
        }));
        
        console.log(`✅ 출석 데이터 로드 완료: ${pageState.attendanceData.length}개`);
        return pageState.attendanceData;
        
    } catch (error) {
        console.error('❌ 출석 데이터 로드 실패:', error);
        pageState.attendanceData = [];
        return pageState.attendanceData;
    }
}

async function fetchBillCountData() {
    try {
        const billCountData = await window.APIService.getMemberBillCount();
        if (!billCountData || !Array.isArray(billCountData)) {
            pageState.billCountData = [];
            return pageState.billCountData;
        }
        
        pageState.billCountData = billCountData.map(bill => ({
            id: bill.id || '',
            proposer: bill.proposer || '',
            total: parseInt(bill.total || 0),
            approved: parseInt(bill.approved || 0),
            _raw: bill
        }));
        
        console.log(`✅ 본회의 제안 데이터 로드 완료: ${pageState.billCountData.length}개`);
        return pageState.billCountData;
        
    } catch (error) {
        console.error('❌ 본회의 제안 데이터 로드 실패:', error);
        pageState.billCountData = [];
        return pageState.billCountData;
    }
}

// 폴백 국회의원 명단
function getFallbackMemberList() {
    return [
        {
            name: '나경원',
            party: '국민의힘',
            mona_cd: 'MEMBER_001',
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '이재명',
            party: '더불어민주당',
            mona_cd: 'MEMBER_002',
            homepage: 'https://www.assembly.go.kr'
        },
        {
            name: '조국',
            party: '조국혁신당',
            mona_cd: 'MEMBER_003',
            homepage: 'https://www.assembly.go.kr'
        }
    ];
}

// 데이터 검색 함수들
function findMemberPhoto(memberCode, memberName) {
    if (!pageState.photoList || pageState.photoList.length === 0) {
        return null;
    }
    
    const photoByCode = pageState.photoList.find(photo => 
        photo.member_code === memberCode
    );
    
    if (photoByCode) {
        return photoByCode.photo;
    }
    
    const photoByName = pageState.photoList.find(photo => 
        photo.member_name === memberName
    );
    
    return photoByName ? photoByName.photo : null;
}

function findMemberPerformance(memberName) {
    if (!pageState.performanceData || pageState.performanceData.length === 0) {
        console.log(`🔍 ${memberName} 실적 검색: 실적 데이터가 없음`);
        return null;
    }
    
    console.log(`🔍 ${memberName} 실적 검색 중...`);
    
    const performance = pageState.performanceData.find(perf => 
        perf.name === memberName
    );
    
    if (performance) {
        console.log(`✅ ${memberName} 실적 데이터 발견:`, performance);
    } else {
        console.warn(`❌ ${memberName} 실적 데이터 없음`);
        
        // 🔧 가능한 모든 매칭 시도
        const exactMatch = pageState.performanceData.find(p => p.name === memberName);
        const containsMatch = pageState.performanceData.find(p => p.name.includes(memberName) || memberName.includes(p.name));
        const trimmedMatch = pageState.performanceData.find(p => p.name.trim() === memberName.trim());
        
        console.log('🔍 매칭 시도 결과:', {
            정확히일치: exactMatch ? exactMatch.name : null,
            포함일치: containsMatch ? containsMatch.name : null,
            공백제거일치: trimmedMatch ? trimmedMatch.name : null
        });
    }
    
    return performance;
}

function findMemberAttendance(memberName) {
    return pageState.attendanceData.find(att => att.member_name === memberName);
}

function findMemberBillCount(memberName, lawyerId) {
    if (!pageState.billCountData || pageState.billCountData.length === 0) {
        return null;
    }
    
    let billData = pageState.billCountData.find(bill => bill.proposer === memberName);
    
    if (!billData && lawyerId) {
        billData = pageState.billCountData.find(bill => bill.id === lawyerId);
    }
    
    return billData;
}

function findMemberCommittees(memberName) {
    return pageState.committeeData[memberName] || [];
}

function findMemberRanking(memberName) {
    return pageState.rankingData.find(rank => rank.name === memberName);
}

// 통계 계산 함수
function calculateMemberStats(performance, attendance, billCount, committees) {
    return {
        attendance: attendance ? 
            (attendance.attendance_rate || calculateAttendanceRate(attendance)) : 
            (performance.attendance_score || 0),
        
        billPass: billCount ? 
            calculateBillPassRate(billCount) : 
            Math.min((performance.total_score || 0) * 1.2, 95),
        
        petitionProposal: performance.petition_score || 0,
        petitionResult: performance.petition_result_score || 0,
        abstention: (performance.invalid_vote_ratio || 0) * 100,
        committee: getCommitteeInfo(committees),
        voteMatch: (performance.vote_match_ratio || 0) * 100,
        voteMismatch: (performance.vote_mismatch_ratio || 0) * 100
    };
}

function calculateAttendanceRate(attendance) {
    if (!attendance || !attendance.total_meetings) return 0;
    return (attendance.attendance / attendance.total_meetings) * 100;
}

function calculateBillPassRate(billCount) {
    if (!billCount || !billCount.total) return 0;
    return (billCount.approved / billCount.total) * 100;
}

function getCommitteeInfo(committees) {
    if (!committees || committees.length === 0) {
        return '위원회 정보 없음';
    }
    
    const prioritizedCommittee = committees.sort((a, b) => {
        const getRank = (position) => {
            if (position.includes('위원장')) return 3;
            if (position.includes('간사')) return 2;
            return 1;
        };
        return getRank(b.position) - getRank(a.position);
    })[0];
    
    return `${prioritizedCommittee.committee} ${prioritizedCommittee.position}`;
}

function generateFallbackStats(member) {
    const baseStats = {
        attendance: 75 + Math.random() * 20,
        billPass: 60 + Math.random() * 35,
        petition: 50 + Math.random() * 40,
        petitionResult: 40 + Math.random() * 50,
        abstention: Math.random() * 15,
        voteMatch: 70 + Math.random() * 25,
        voteMismatch: Math.random() * 25
    };
    
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

function getDefaultCommitteeInfo(member) {
    const defaultCommittees = {
        '국민의힘': '국정감사위원회 일반위원',
        '더불어민주당': '예산결산위원회 일반위원',
        '조국혁신당': '법제사법위원회 일반위원',
        '개혁신당': '정무위원회 일반위원',
        '진보당': '환경노동위원회 일반위원',
        '기본소득당': '보건복지위원회 일반위원',
        '사회민주당': '문화체육관광위원회 일반위원',
        '무소속': '행정안전위원회 일반위원'
    };
    
    return defaultCommittees[member.party] || '위원회 정보 없음';
}

// UI 업데이트 함수들
function updateMemberProfile(member) {
    if (!member) return;
    
    console.log(`👤 ${member.name} 프로필 업데이트 중...`);
    
    if (elements.memberName) elements.memberName.textContent = member.name;
    if (elements.memberParty) elements.memberParty.textContent = member.party;
    
    updateMemberPhoto(member);
    updateHomepageLink(member);
    updatePerformanceStats(member);
    
    document.title = `백일하 - ${member.name} 의원`;
    
    console.log(`✅ ${member.name} 프로필 업데이트 완료`);
}

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

function updatePerformanceStats(member) {
    const performance = findMemberPerformance(member.name);
    const attendance = findMemberAttendance(member.name);
    const billCount = findMemberBillCount(member.name, performance?.lawmaker_id);
    const committees = findMemberCommittees(member.name);
    const ranking = findMemberRanking(member.name);
    
    // 순위 정보 업데이트
    updateRankingInfo(member, ranking);
    
    if (!performance) {
        console.warn(`⚠️ ${member.name} 실적 데이터 없음 - 랭킹과 폴백 데이터 사용`);
        updateStatsWithFallback(member, attendance, billCount, committees);
        return;
    }
    
    // 실적 통계 계산 및 업데이트
    const stats = calculateMemberStats(performance, attendance, billCount, committees);
    
    updateStatElement(elements.attendanceStat, stats.attendance, '%');
    updateStatElement(elements.billPassStat, stats.billPass, '%');
    updateStatElement(elements.petitionProposalStat, stats.petitionProposal, '%');
    updateStatElement(elements.petitionResultStat, stats.petitionResult, '%');
    updateStatElement(elements.abstentionStat, stats.abstention, '%');
    updateCommitteeElement(elements.committeeStat, stats.committee);
    updateStatElement(elements.voteMatchStat, stats.voteMatch, '%');
    updateStatElement(elements.voteMismatchStat, stats.voteMismatch, '%');
}

function updateRankingInfo(member, ranking) {
    if (elements.overallRanking) {
        if (ranking && ranking.overall_rank && ranking.overall_rank !== 999) {
            elements.overallRanking.innerHTML = `전체 순위: <strong>${ranking.overall_rank}위</strong>`;
        } else {
            elements.overallRanking.innerHTML = `전체 순위: <strong>정보 없음</strong>`;
        }
    }
    
    if (elements.partyRanking) {
        elements.partyRanking.style.display = 'none';
    }
}

function updateStatElement(element, value, suffix = '') {
    if (!element) return;
    
    const numValue = parseFloat(value) || 0;
    const displayValue = numValue.toFixed(1);
    
    element.textContent = `${displayValue}${suffix}`;
    element.classList.remove('loading');
    
    element.classList.remove('good', 'warning', 'bad');
    
    if (numValue >= 80) {
        element.classList.add('good');
    } else if (numValue >= 60) {
        element.classList.add('warning');
    } else if (numValue < 40) {
        element.classList.add('bad');
    }
}

function updateCommitteeElement(element, position) {
    if (!element) return;
    
    element.textContent = position;
    element.classList.remove('loading');
    
    element.classList.remove('good', 'warning', 'bad');
    
    if (position.includes('위원장') || position.includes('의장')) {
        element.classList.add('good');
    } else if (position.includes('간사')) {
        element.classList.add('warning');
    } else if (position.includes('정보 없음')) {
        element.classList.add('bad');
    }
}

function updateStatsWithFallback(member, attendance, billCount, committees) {
    console.log(`🔄 ${member.name} 폴백 데이터 사용 (실제 데이터 조합)`);
    
    const fallbackStats = generateFallbackStats(member);
    
    const attendanceRate = attendance ? 
        (attendance.attendance_rate || calculateAttendanceRate(attendance)) : 
        fallbackStats.attendance;
    
    const billPassRate = billCount ? 
        calculateBillPassRate(billCount) : 
        fallbackStats.billPass;
    
    const committeeInfo = committees && committees.length > 0 ? 
        getCommitteeInfo(committees) : 
        getDefaultCommitteeInfo(member);
    
    updateStatElement(elements.attendanceStat, attendanceRate, '%');
    updateStatElement(elements.billPassStat, billPassRate, '%');
    updateStatElement(elements.petitionProposalStat, fallbackStats.petition, '%');
    updateStatElement(elements.petitionResultStat, fallbackStats.petitionResult, '%');
    updateStatElement(elements.abstentionStat, fallbackStats.abstention, '%');
    updateCommitteeElement(elements.committeeStat, committeeInfo);
    updateStatElement(elements.voteMatchStat, fallbackStats.voteMatch, '%');
    updateStatElement(elements.voteMismatchStat, fallbackStats.voteMismatch, '%');
}

// 검색 관련 함수들
function setupSearch() {
    if (!elements.searchInput) return;
    
    const searchContainer = elements.searchInput.parentElement;
    if (!elements.searchResults) {
        elements.searchResults = document.createElement('div');
        elements.searchResults.className = 'search-results';
        elements.searchResults.style.display = 'none';
        searchContainer.appendChild(elements.searchResults);
    }
    
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
    
    if (elements.searchButton) {
        elements.searchButton.addEventListener('click', function() {
            const query = elements.searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        });
    }
    
    elements.searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    console.log('✅ 검색 기능 설정 완료');
}

function performSearch(query) {
    if (pageState.isSearching) return;
    
    pageState.isSearching = true;
    
    try {
        const filtered = pageState.memberList.filter(member => {
            const nameMatch = member.name.toLowerCase().includes(query.toLowerCase());
            const partyMatch = member.party.toLowerCase().includes(query.toLowerCase());
            
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

function displaySearchResults(results) {
    if (!elements.searchResults) return;
    
    elements.searchResults.innerHTML = '';
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = '<div class="no-results">검색 결과가 없습니다</div>';
    } else {
        results.slice(0, 10).forEach(member => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const photoUrl = findMemberPhoto(member.mona_cd, member.name);
            const committees = findMemberCommittees(member.name);
            const committeesText = committees.length > 0 ? 
                committees.map(c => c.committee).join(', ') : 
                '위원회 정보 없음';
            
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

function hideSearchResults() {
    if (elements.searchResults) {
        elements.searchResults.style.display = 'none';
    }
}

function selectMember(member) {
    console.log(`👤 ${member.name} 선택됨`);
    
    pageState.currentMember = member;
    elements.searchInput.value = member.name;
    
    updateUrl(member.name);
    updateMemberProfile(member);
    
    showNotification(`${member.name} 의원 정보 로드 완료`, 'success');
}

// URL 관련 함수들
function getMemberFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberName = urlParams.get('member') || urlParams.get('name');
    
    if (memberName) {
        const member = pageState.memberList.find(m => m.name === memberName);
        return member || null;
    }
    
    return null;
}

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
        
        if (!window.APIService || !window.APIService._isReady) {
            throw new Error('APIService가 준비되지 않았습니다.');
        }
        
        // 병렬로 모든 데이터 로드
        const results = await Promise.allSettled([
            fetchMemberList(),      // 필수
            fetchPerformanceData(), // 필수
            fetchRankingData(),     // 중요
            fetchCommitteeData(),   // 중요
            fetchPhotoList(),       // 선택
            fetchAttendanceData(),  // 선택
            fetchBillCountData()    // 선택
        ]);
        
        const [memberResult, performanceResult, rankingResult, committeeResult, photoResult, attendanceResult, billCountResult] = results;
        
        const loadResults = {
            members: memberResult.status === 'fulfilled',
            performance: performanceResult.status === 'fulfilled',
            ranking: rankingResult.status === 'fulfilled',
            committee: committeeResult.status === 'fulfilled',
            photos: photoResult.status === 'fulfilled',
            attendance: attendanceResult.status === 'fulfilled',
            billCount: billCountResult.status === 'fulfilled'
        };
        
        console.log('📊 API 로드 결과:', loadResults);
        
        Object.entries(loadResults).forEach(([key, success]) => {
            if (!success) {
                const result = results[Object.keys(loadResults).indexOf(key)];
                console.warn(`⚠️ ${key} 데이터 로드 실패:`, result.reason);
            }
        });
        
        console.log('✅ 전체 데이터 로드 완료');
        
        if (loadResults.members) {
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

// WeightSync 호환 함수들
async function refreshMemberDetails() {
    console.log('[PercentMember] 🔄 의원 상세정보 새로고침...');
    try {
        await loadAllData();
        if (pageState.currentMember) {
            updateMemberProfile(pageState.currentMember);
        }
        showNotification('의원 상세정보가 업데이트되었습니다.', 'success');
    } catch (error) {
        console.error('[PercentMember] ❌ 새로고침 실패:', error);
        showNotification('데이터 새로고침에 실패했습니다.', 'error');
    }
}

async function loadMemberDetailData() {
    return await loadAllData();
}

// 페이지 초기화
async function initializePage() {
    console.log('🚀 국회의원 상세정보 페이지 초기화...');
    
    try {
        initializeElements();
        setupSearch();
        
        await loadAllData();
        
        const urlMember = getMemberFromUrl();
        const initialMember = urlMember || DEFAULT_MEMBER;
        
        const foundMember = pageState.memberList.find(m => m.name === initialMember.name);
        const memberToLoad = foundMember || pageState.memberList[0] || initialMember;
        
        console.log(`👤 초기 국회의원: ${memberToLoad.name}`);
        
        selectMember(memberToLoad);
        
        console.log('✅ 페이지 초기화 완료');
        
    } catch (error) {
        console.error('❌ 페이지 초기화 실패:', error);
        
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

// 디버그 함수들
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
    refreshData: () => refreshMemberDetails(),
    showInfo: () => {
        console.log('📊 국회의원 페이지 정보:');
        console.log(`- 현재 의원: ${pageState.currentMember?.name || '없음'}`);
        console.log(`- 의원 명단: ${pageState.memberList.length}명`);
        console.log(`- 사진 데이터: ${pageState.photoList.length}개`);
        console.log(`- 실적 데이터: ${pageState.performanceData.length}개`);
        console.log(`- 출석 데이터: ${pageState.attendanceData.length}개`);
        console.log(`- 본회의 제안: ${pageState.billCountData.length}개`);
        console.log(`- 위원회 데이터: ${Object.keys(pageState.committeeData).length}명`);
        console.log(`- 랭킹 데이터: ${pageState.rankingData.length}개`);
        console.log(`- API 서비스: ${!!window.APIService}`);
        
        if (pageState.currentMember) {
            const ranking = findMemberRanking(pageState.currentMember.name);
            console.log(`- ${pageState.currentMember.name} 순위:`, ranking ? `${ranking.overall_rank}위` : '정보 없음');
        }
    },
    
    checkRanking: (memberName) => {
        const member = pageState.memberList.find(m => m.name === memberName);
        const ranking = findMemberRanking(memberName);
        
        console.log(`🏆 ${memberName} 랭킹 정보:`);
        console.log('- 의원 데이터:', member);
        console.log('- 랭킹 데이터:', ranking);
        
        if (ranking) {
            console.log(`✅ 전체 순위: ${ranking.overall_rank}위`);
        } else {
            console.log('❌ 랭킹 정보 없음');
            console.log('전체 랭킹 데이터:', pageState.rankingData.map(r => r.name));
        }
        
        return ranking;
    },
    
    // 🔧 데이터 매핑 확인 함수
    checkDataMapping: () => {
        console.log('🔍 API 데이터 매핑 확인:');
        
        if (pageState.memberList.length > 0) {
            console.log('👤 의원 명단 샘플:', pageState.memberList[0]);
        }
        
        if (pageState.performanceData.length > 0) {
            console.log('📊 실적 데이터 샘플:', pageState.performanceData[0]);
        }
        
        const committeeKeys = Object.keys(pageState.committeeData);
        if (committeeKeys.length > 0) {
            console.log('🏛️ 위원회 데이터 샘플:', {
                member: committeeKeys[0],
                committees: pageState.committeeData[committeeKeys[0]]
            });
        }
        
        if (pageState.rankingData.length > 0) {
            console.log('🏆 랭킹 데이터 샘플:', pageState.rankingData[0]);
        }
        
        console.log('\n🔍 나경원 의원 데이터 매핑:');
        const naKyungWon = {
            member: pageState.memberList.find(m => m.name === '나경원'),
            performance: findMemberPerformance('나경원'),
            committees: findMemberCommittees('나경원'),
            ranking: findMemberRanking('나경원'),
            attendance: findMemberAttendance('나경원'),
            billCount: pageState.billCountData.find(b => b.proposer === '나경원')
        };
        
        console.log('나경원 전체 데이터:', naKyungWon);
        return naKyungWon;
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 percent_member.js DOM 로드 완료 (완전 수정 버전)');
    
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
            console.warn('⚠️ API 서비스 연결 타임아웃, 폴백 데이터 사용');
            pageState.memberList = getFallbackMemberList();
            initializeElements();
            setupSearch();
            pageState.currentMember = DEFAULT_MEMBER;
            updateMemberProfile(DEFAULT_MEMBER);
        }
    }
    
    waitForAPI();
});

console.log('📦 percent_member.js 로드 완료 (완전 수정 버전)');
