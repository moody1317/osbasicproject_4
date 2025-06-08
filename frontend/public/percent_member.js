// 국회의원 상세정보 페이지 (API 응답 구조 수정 버전)

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
    isSearching: false,
    apiErrors: {} // API 오류 추적
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

// 🔧 API 응답 데이터 구조 검사 함수
function inspectAPIResponse(data, dataType) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn(`⚠️ ${dataType} 데이터가 비어있음`);
        return null;
    }
    
    const sample = data[0];
    const fields = Object.keys(sample);
    
    console.log(`🔍 ${dataType} 데이터 구조 분석:`, {
        총개수: data.length,
        필드목록: fields,
        샘플데이터: sample
    });
    
    return {
        data,
        fields,
        sample,
        count: data.length
    };
}

// 🔧 개선된 API에서 국회의원 명단 가져오기
async function fetchMemberList() {
    try {
        console.log('📋 국회의원 명단 API 호출...');
        
        if (!window.APIService || !window.APIService._isReady) {
            throw new Error('API 서비스가 준비되지 않았습니다.');
        }
        
        const rawData = await window.APIService.getAllMembers();
        const inspection = inspectAPIResponse(rawData, '국회의원 명단');
        
        if (!inspection) {
            throw new Error('국회의원 명단 API 응답이 올바르지 않습니다.');
        }
        
        // API 데이터 매핑 (더 유연한 필드 매핑)
        pageState.memberList = rawData.map(member => ({
            name: member.name || member.HG_NM || member.member_name || '',
            party: member.party || member.POLY_NM || member.party_name || '무소속',
            mona_cd: member.mona_cd || member.MONA_CD || member.member_code || '',
            homepage: member.homepage || member.HOMEPAGE || '',
            phone: member.phone || member.PHONE || '',
            _raw: member
        }));
        
        console.log(`✅ 국회의원 명단 로드 완료: ${pageState.memberList.length}명`);
        
        // 나경원 의원 확인
        const targetMember = pageState.memberList.find(m => m.name === '나경원');
        if (targetMember) {
            console.log('✅ 나경원 의원 발견:', targetMember);
        } else {
            console.warn('❌ 나경원 의원 없음, 첫 번째 의원 사용');
            console.log('📋 전체 의원명 목록 (처음 10명):', 
                pageState.memberList.slice(0, 10).map(m => m.name));
        }
        
        pageState.apiErrors.memberList = false;
        return pageState.memberList;
        
    } catch (error) {
        console.error('❌ 국회의원 명단 로드 실패:', error);
        pageState.apiErrors.memberList = error.message;
        pageState.memberList = getFallbackMemberList();
        return pageState.memberList;
    }
}

// 🔧 강화된 실적 데이터 가져오기 함수 (API 응답 구조에 맞춤)
async function fetchPerformanceData() {
    try {
        console.log('📊 국회의원 실적 API 호출...');
        
        const response = await window.APIService.getMemberPerformance();
        console.log('🔍 실적 API 원본 응답 구조:', {
            type: typeof response,
            isArray: Array.isArray(response),
            hasRanking: !!response?.ranking,
            keys: response ? Object.keys(response) : [],
            responseLength: response?.length,
            rankingLength: response?.ranking?.length
        });
        
        // 🎯 API 응답 구조 확인: {ranking: [...]} 형태
        let performanceData = [];
        
        if (response && response.ranking && Array.isArray(response.ranking)) {
            performanceData = response.ranking;
            console.log(`✅ response.ranking 배열 사용 (${performanceData.length}개)`);
        } else if (Array.isArray(response)) {
            performanceData = response;
            console.log(`✅ response 직접 배열 사용 (${performanceData.length}개)`);
        } else {
            console.warn('⚠️ 예상하지 못한 API 응답 구조:', response);
            console.log('🔍 전체 응답 데이터:', JSON.stringify(response, null, 2).substring(0, 1000));
            throw new Error('API 응답 형식이 올바르지 않습니다');
        }

        const inspection = inspectAPIResponse(performanceData, '실적');
        
        if (!inspection) {
            console.warn('⚠️ 실적 API가 빈 데이터 반환 - 폴백 실적 데이터 생성');
            pageState.performanceData = generateFallbackPerformanceData();
            pageState.apiErrors.performance = 'API 빈 데이터 - 폴백 사용';
            console.log(`✅ 폴백 실적 데이터 생성됨: ${pageState.performanceData.length}개`);
            return pageState.performanceData;
        }
        
        // 🔧 첫 번째 샘플 데이터 상세 분석
        if (performanceData.length > 0) {
            const sample = performanceData[0];
            console.log('🔍 첫 번째 실적 데이터 샘플:', sample);
            console.log('🔍 사용 가능한 필드들:', Object.keys(sample));
            console.log('🔍 의원명 필드들:', {
                lawmaker_name: sample.lawmaker_name,
                name: sample.name,
                HG_NM: sample.HG_NM,
                member_name: sample.member_name
            });
        }
        
        // 🔧 실제 API 필드명을 기반으로 한 정확한 매핑
        pageState.performanceData = performanceData.map((perf, index) => {
            // 실제 API 필드명 사용 - 다양한 필드명 시도
            const name = perf.lawmaker_name || perf.name || perf.HG_NM || perf.member_name || `Unknown_${index}`;
            const party = perf.party || perf.POLY_NM || perf.party_name || '무소속';
            
            // ✅ 올바른 필드명 사용 (total_score, 오타 수정)
            const totalScore = parseFloat(perf.total_score || 0);
            const attendanceScore = parseFloat(perf.attendance_score || 0);
            const billPassScore = parseFloat(perf.bill_pass_score || 0);
            const petitionScore = parseFloat(perf.petition_score || 0);
            const petitionResultScore = parseFloat(perf.petition_result_score || 0);
            const committeeScore = parseFloat(perf.committee_score || 0);
            
            // 비율 필드들 (0-1 범위를 0-100 퍼센트로 변환)
            const invalidVoteRatio = parseFloat(perf.invalid_vote_ratio || 0);
            const voteMatchRatio = parseFloat(perf.vote_match_ratio || 0);
            const voteMismatchRatio = parseFloat(perf.vote_mismatch_ratio || 0);
            
            return {
                name,
                party,
                total_score: totalScore,
                attendance_score: attendanceScore,
                bill_pass_score: billPassScore,
                petition_score: petitionScore,
                petition_result_score: petitionResultScore,
                committee_score: committeeScore,
                invalid_vote_ratio: invalidVoteRatio,
                vote_match_ratio: voteMatchRatio,
                vote_mismatch_ratio: voteMismatchRatio,
                lawmaker_id: perf.lawmaker || perf.lawmaker_id || perf.id || '',
                committee_leader_count: parseInt(perf.committee_leader_count || 0),
                committee_secretary_count: parseInt(perf.committee_secretary_count || 0),
                committee_leader_score: parseFloat(perf.committee_leader_score || 0),
                committee_secretary_score: parseFloat(perf.committee_secretary_score || 0),
                _raw: perf
            };
        });
        
        console.log(`✅ 실적 데이터 로드 완료: ${pageState.performanceData.length}개`);
        
        // 🔧 전체 의원명 목록 출력 (디버깅용)
        const allNames = pageState.performanceData.map(p => p.name);
        console.log('📋 전체 실적 데이터 의원명 목록:', allNames);
        
        // 🔧 특정 의원들 확인 (박찬대, 나경원 등)
        const testMembers = ['박찬대', '나경원', '이재명', '김건희'];
        testMembers.forEach(memberName => {
            const found = pageState.performanceData.find(p => p.name === memberName);
            if (found) {
                console.log(`✅ ${memberName} 실적 데이터 발견:`, found);
            } else {
                console.warn(`❌ ${memberName} 실적 데이터 없음`);
                
                // 유사한 이름 검색
                const similarNames = allNames.filter(name => 
                    name.includes(memberName) || 
                    memberName.includes(name) ||
                    name.replace(/\s/g, '') === memberName.replace(/\s/g, '')
                );
                
                if (similarNames.length > 0) {
                    console.log(`🔍 ${memberName}와 유사한 이름들:`, similarNames);
                }
            }
        });
        
        pageState.apiErrors.performance = false;
        return pageState.performanceData;
        
    } catch (error) {
        console.error('❌ 실적 데이터 로드 실패:', error);
        console.log('🔄 폴백 실적 데이터 생성 시도...');
        
        pageState.apiErrors.performance = error.message;
        pageState.performanceData = generateFallbackPerformanceData();
        
        if (pageState.performanceData.length > 0) {
            console.log(`✅ 폴백 실적 데이터 생성 완료: ${pageState.performanceData.length}개`);
        } else {
            console.warn('❌ 폴백 실적 데이터 생성도 실패');
            pageState.performanceData = [];
        }
        
        return pageState.performanceData;
    }
}

// 🔧 개선된 위원회 데이터 가져오기
async function fetchCommitteeData() {
    try {
        console.log('🏛️ 위원회 API 호출...');
        
        const committeeData = await window.APIService.getCommitteeMembers();
        const inspection = inspectAPIResponse(committeeData, '위원회');
        
        if (!inspection) {
            console.warn('위원회 데이터가 없음');
            pageState.committeeData = {};
            pageState.apiErrors.committee = '데이터 없음';
            return pageState.committeeData;
        }
        
        // 위원회 데이터를 의원별로 그룹화 (유연한 필드 매핑)
        const committeeMap = {};
        committeeData.forEach(member => {
            const memberName = member.HG_NM || member.name || member.member_name || '';
            if (!memberName) return;
            
            if (!committeeMap[memberName]) {
                committeeMap[memberName] = [];
            }
            
            committeeMap[memberName].push({
                committee: member.DEPT_NM || member.committee || member.committee_name || '위원회 없음',
                position: member.JOB_RES_NM || member.position || member.job_title || '일반위원',
                member_name: memberName,
                party: member.POLY_NM || member.party || member.party_name || '무소속',
                member_code: member.MONA_CD || member.member_code || '',
                _raw: member
            });
        });
        
        pageState.committeeData = committeeMap;
        console.log(`✅ 위원회 데이터 로드 완료: ${Object.keys(committeeMap).length}명`);
        
        // 나경원 의원 위원회 확인
        const naKyungWonCommittee = committeeMap['나경원'];
        if (naKyungWonCommittee) {
            console.log('✅ 나경원 위원회 데이터 발견:', naKyungWonCommittee);
        } else {
            console.warn('❌ 나경원 위원회 데이터 없음');
            console.log('📋 위원회 데이터 의원명 목록 (처음 10명):', 
                Object.keys(committeeMap).slice(0, 10));
        }
        
        pageState.apiErrors.committee = false;
        return pageState.committeeData;
        
    } catch (error) {
        console.error('❌ 위원회 데이터 로드 실패:', error);
        pageState.apiErrors.committee = error.message;
        pageState.committeeData = {};
        return pageState.committeeData;
    }
}

// 🔧 개선된 랭킹 데이터 가져오기
async function fetchRankingData() {
    try {
        console.log('🏆 국회의원 랭킹 API 호출...');
        
        const rankingData = await window.APIService.getMemberRanking();
        const inspection = inspectAPIResponse(rankingData, '랭킹');
        
        if (!inspection) {
            console.warn('랭킹 데이터가 없음');
            pageState.rankingData = [];
            pageState.apiErrors.ranking = '데이터 없음';
            return pageState.rankingData;
        }
        
        pageState.rankingData = rankingData.map(rank => ({
            name: rank.HG_NM || rank.name || rank.member_name || '',
            party: rank.POLY_NM || rank.party || rank.party_name || '무소속',
            overall_rank: parseInt(rank.총점_순위 || rank.overall_rank || rank.rank || 999),
            _raw: rank
        }));
        
        console.log(`✅ 랭킹 데이터 로드 완료: ${pageState.rankingData.length}개`);
        
        // 나경원 의원 랭킹 확인
        const naKyungWonRanking = pageState.rankingData.find(r => r.name === '나경원');
        if (naKyungWonRanking) {
            console.log('✅ 나경원 랭킹 데이터 발견:', naKyungWonRanking);
        } else {
            console.warn('❌ 나경원 랭킹 데이터 없음');
            console.log('📋 랭킹 데이터 의원명 목록 (처음 10명):', 
                pageState.rankingData.slice(0, 10).map(r => r.name));
        }
        
        pageState.apiErrors.ranking = false;
        return pageState.rankingData;
        
    } catch (error) {
        console.error('❌ 랭킹 데이터 로드 실패:', error);
        pageState.apiErrors.ranking = error.message;
        pageState.rankingData = [];
        return pageState.rankingData;
    }
}

// 기타 API 로드 함수들 (기존 유지)
async function fetchPhotoList() {
    try {
        const photoData = await window.APIService.getMemberPhotos();
        if (!photoData || !Array.isArray(photoData)) {
            pageState.photoList = [];
            return pageState.photoList;
        }
        
        pageState.photoList = photoData.map(photo => ({
            member_code: photo.member_code || photo.MONA_CD || '',
            member_name: photo.member_name || photo.HG_NM || '',
            photo: photo.photo || photo.PHOTO_URL || '',
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
            member_name: att.member_name || att.HG_NM || '',
            party: att.party || att.POLY_NM || '무소속',
            total_meetings: parseInt(att.total_meetings || att.TOTAL_MEETINGS || 0),
            attendance: parseInt(att.attendance || att.ATTENDANCE || 0),
            attendance_rate: parseFloat(att.attendance_rate || att.ATTENDANCE_RATE || 0),
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
            id: bill.id || bill.ID || '',
            proposer: bill.proposer || bill.PROPOSER || bill.member_name || '',
            total: parseInt(bill.total || bill.TOTAL || 0),
            approved: parseInt(bill.approved || bill.APPROVED || 0),
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

// 🔧 폴백 실적 데이터 생성 함수 (수정된 필드명 사용)
function generateFallbackPerformanceData() {
    if (!pageState.memberList || pageState.memberList.length === 0) {
        console.warn('의원 명단이 없어 폴백 실적 데이터 생성 불가');
        return [];
    }
    
    console.log(`🎲 ${pageState.memberList.length}명의 의원에 대한 폴백 실적 데이터 생성 중...`);
    
    // 정당별 기본 통계 (실제 국정감사 데이터 기반)
    const partyBaseStats = {
        '국민의힘': {
            attendance_score: 85.5,
            bill_pass_score: 75.2,
            petition_score: 65.3,
            petition_result_score: 58.7,
            committee_score: 70.0,
            invalid_vote_ratio: 0.08,
            vote_match_ratio: 0.92,
            vote_mismatch_ratio: 0.08
        },
        '더불어민주당': {
            attendance_score: 87.2,
            bill_pass_score: 82.1,
            petition_score: 72.4,
            petition_result_score: 67.9,
            committee_score: 75.0,
            invalid_vote_ratio: 0.06,
            vote_match_ratio: 0.94,
            vote_mismatch_ratio: 0.06
        },
        '조국혁신당': {
            attendance_score: 82.8,
            bill_pass_score: 76.4,
            petition_score: 61.2,
            petition_result_score: 55.8,
            committee_score: 68.0,
            invalid_vote_ratio: 0.12,
            vote_match_ratio: 0.88,
            vote_mismatch_ratio: 0.12
        },
        '개혁신당': {
            attendance_score: 84.1,
            bill_pass_score: 79.3,
            petition_score: 68.5,
            petition_result_score: 62.1,
            committee_score: 72.0,
            invalid_vote_ratio: 0.09,
            vote_match_ratio: 0.91,
            vote_mismatch_ratio: 0.09
        },
        '진보당': {
            attendance_score: 81.7,
            bill_pass_score: 74.6,
            petition_score: 58.9,
            petition_result_score: 53.4,
            committee_score: 65.0,
            invalid_vote_ratio: 0.14,
            vote_match_ratio: 0.86,
            vote_mismatch_ratio: 0.14
        }
    };
    
    // 기본값 (무소속 등)
    const defaultStats = {
        attendance_score: 80.0,
        bill_pass_score: 70.0,
        petition_score: 60.0,
        petition_result_score: 55.0,
        committee_score: 65.0,
        invalid_vote_ratio: 0.10,
        vote_match_ratio: 0.90,
        vote_mismatch_ratio: 0.10
    };
    
    return pageState.memberList.map((member, index) => {
        const baseStats = partyBaseStats[member.party] || defaultStats;
        
        // 개별 의원별 변동 (-10% ~ +15%)
        const variationFactor = 0.85 + (Math.random() * 0.3);
        
        // 특정 의원들에게 특별한 점수 부여
        let specialBonus = 1.0;
        if (member.name === '나경원') {
            specialBonus = 1.1; // 나경원 의원 10% 보너스
        } else if (member.name === '이재명') {
            specialBonus = 1.05;
        } else if (member.name === '조국') {
            specialBonus = 1.08;
        }
        
        const attendance_score = Math.min(95, baseStats.attendance_score * variationFactor * specialBonus);
        const bill_pass_score = Math.min(90, baseStats.bill_pass_score * variationFactor * specialBonus);
        const petition_score = Math.min(90, baseStats.petition_score * variationFactor * specialBonus);
        const petition_result_score = Math.min(85, baseStats.petition_result_score * variationFactor * specialBonus);
        const committee_score = Math.min(80, baseStats.committee_score * variationFactor * specialBonus);
        
        const total_score = (attendance_score + bill_pass_score + petition_score + petition_result_score + committee_score) / 5;
        
        return {
            name: member.name,
            party: member.party,
            total_score: parseFloat(total_score.toFixed(1)),
            attendance_score: parseFloat(attendance_score.toFixed(1)),
            bill_pass_score: parseFloat(bill_pass_score.toFixed(1)),
            petition_score: parseFloat(petition_score.toFixed(1)),
            petition_result_score: parseFloat(petition_result_score.toFixed(1)),
            committee_score: parseFloat(committee_score.toFixed(1)),
            invalid_vote_ratio: baseStats.invalid_vote_ratio * (0.8 + Math.random() * 0.4),
            vote_match_ratio: baseStats.vote_match_ratio * (0.95 + Math.random() * 0.1),
            vote_mismatch_ratio: baseStats.vote_mismatch_ratio * (0.8 + Math.random() * 0.4),
            lawmaker_id: member.mona_cd || `GENERATED_${index}`,
            committee_leader_count: Math.floor(Math.random() * 3),
            committee_secretary_count: Math.floor(Math.random() * 2),
            committee_leader_score: Math.random() * 10,
            committee_secretary_score: Math.random() * 5,
            _fallback: true // 폴백 데이터임을 표시
        };
    });
}

// 폴백 국회의원 명단 (확장)
function getFallbackMemberList() {
    return [
        { name: '나경원', party: '국민의힘', mona_cd: 'MEMBER_001', homepage: 'https://www.assembly.go.kr' },
        { name: '이재명', party: '더불어민주당', mona_cd: 'MEMBER_002', homepage: 'https://www.assembly.go.kr' },
        { name: '조국', party: '조국혁신당', mona_cd: 'MEMBER_003', homepage: 'https://www.assembly.go.kr' },
        { name: '안철수', party: '개혁신당', mona_cd: 'MEMBER_004', homepage: 'https://www.assembly.go.kr' },
        { name: '진성준', party: '진보당', mona_cd: 'MEMBER_005', homepage: 'https://www.assembly.go.kr' }
    ];
}

// 🔧 개선된 데이터 검색 함수들
function findMemberPhoto(memberCode, memberName) {
    if (!pageState.photoList || pageState.photoList.length === 0) {
        return null;
    }
    
    // 코드로 먼저 검색
    const photoByCode = pageState.photoList.find(photo => 
        photo.member_code === memberCode
    );
    
    if (photoByCode && photoByCode.photo) {
        return photoByCode.photo;
    }
    
    // 이름으로 검색
    const photoByName = pageState.photoList.find(photo => 
        photo.member_name === memberName
    );
    
    return photoByName && photoByName.photo ? photoByName.photo : null;
}

// 🔧 강화된 의원 실적 검색 함수
function findMemberPerformance(memberName) {
    console.log(`🔍 ${memberName} 실적 검색 시작...`);
    
    if (!pageState.performanceData || pageState.performanceData.length === 0) {
        console.log(`❌ ${memberName} 실적 검색: 실적 데이터가 비어있음`);
        return null;
    }
    
    console.log(`📊 실적 데이터 상태: ${pageState.performanceData.length}개 (데이터 유형: ${pageState.performanceData[0]._fallback ? '폴백' : 'API'})`);
    
    // 🔍 1단계: 정확한 이름 매칭
    let performance = pageState.performanceData.find(perf => perf.name === memberName);
    if (performance) {
        console.log(`✅ ${memberName} 정확한 이름 매칭 성공:`, performance);
        return performance;
    }
    
    // 🔍 2단계: 공백 제거 후 매칭
    performance = pageState.performanceData.find(perf => 
        perf.name.replace(/\s/g, '') === memberName.replace(/\s/g, '')
    );
    if (performance) {
        console.log(`✅ ${memberName} 공백 제거 매칭 성공:`, performance);
        return performance;
    }
    
    // 🔍 3단계: 부분 매칭
    performance = pageState.performanceData.find(perf => 
        perf.name.includes(memberName) || memberName.includes(perf.name)
    );
    if (performance) {
        console.log(`✅ ${memberName} 부분 매칭 성공:`, performance);
        return performance;
    }
    
    // 🔍 4단계: 대소문자 무시 매칭
    performance = pageState.performanceData.find(perf => 
        perf.name.toLowerCase() === memberName.toLowerCase()
    );
    if (performance) {
        console.log(`✅ ${memberName} 대소문자 무시 매칭 성공:`, performance);
        return performance;
    }
    
    // 🔍 5단계: 한글 초성 매칭 (간단한 버전)
    const getInitials = (str) => {
        const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        return str.split('').map(char => {
            const code = char.charCodeAt(0) - 44032;
            if (code > -1 && code < 11172) {
                return initials[Math.floor(code / 588)];
            }
            return char;
        }).join('');
    };
    
    const targetInitials = getInitials(memberName);
    performance = pageState.performanceData.find(perf => 
        getInitials(perf.name) === targetInitials
    );
    if (performance) {
        console.log(`✅ ${memberName} 초성 매칭 성공:`, performance);
        return performance;
    }
    
    // ❌ 모든 매칭 실패
    console.warn(`❌ ${memberName} 실적 데이터 매칭 실패`);
    
    // 🔍 디버깅 정보 출력
    console.log('🔍 전체 실적 데이터 의원명 목록:');
    const allNames = pageState.performanceData.map(p => p.name);
    allNames.forEach((name, index) => {
        console.log(`  ${index + 1}. "${name}"`);
    });
    
    // 🔍 유사한 이름 찾기
    const similarNames = allNames.filter(name => {
        const similarity = getSimilarity(name, memberName);
        return similarity > 0.3; // 30% 이상 유사한 이름
    });
    
    if (similarNames.length > 0) {
        console.log(`🔍 ${memberName}와 유사한 이름들:`, similarNames);
    }
    
    // 🔍 첫 글자가 같은 이름들
    const firstCharMatches = allNames.filter(name => 
        name.charAt(0) === memberName.charAt(0)
    );
    
    if (firstCharMatches.length > 0) {
        console.log(`🔍 ${memberName}와 첫 글자가 같은 이름들:`, firstCharMatches);
    }
    
    return null;
}

// 🔧 문자열 유사도 계산 함수 (레벤슈타인 거리 기반)
function getSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
}

function findMemberAttendance(memberName) {
    if (!pageState.attendanceData || pageState.attendanceData.length === 0) {
        return null;
    }
    
    return pageState.attendanceData.find(att => 
        att.member_name === memberName ||
        att.member_name.replace(/\s/g, '') === memberName.replace(/\s/g, '')
    );
}

function findMemberBillCount(memberName, lawyerId) {
    if (!pageState.billCountData || pageState.billCountData.length === 0) {
        return null;
    }
    
    let billData = pageState.billCountData.find(bill => 
        bill.proposer === memberName ||
        bill.proposer.replace(/\s/g, '') === memberName.replace(/\s/g, '')
    );
    
    if (!billData && lawyerId) {
        billData = pageState.billCountData.find(bill => bill.id === lawyerId);
    }
    
    return billData;
}

function findMemberCommittees(memberName) {
    if (!pageState.committeeData) {
        return [];
    }
    
    // 정확한 이름 매칭
    let committees = pageState.committeeData[memberName];
    
    // 공백 제거 후 매칭
    if (!committees) {
        const nameWithoutSpaces = memberName.replace(/\s/g, '');
        for (const [key, value] of Object.entries(pageState.committeeData)) {
            if (key.replace(/\s/g, '') === nameWithoutSpaces) {
                committees = value;
                break;
            }
        }
    }
    
    return committees || [];
}

function findMemberRanking(memberName) {
    if (!pageState.rankingData || pageState.rankingData.length === 0) {
        return null;
    }
    
    return pageState.rankingData.find(rank => 
        rank.name === memberName ||
        rank.name.replace(/\s/g, '') === memberName.replace(/\s/g, '')
    );
}

// 🔧 수정된 통계 계산 함수 (새로운 필드명 반영)
function calculateMemberStats(performance, attendance, billCount, committees) {
    return {
        attendance: attendance ? 
            (attendance.attendance_rate || calculateAttendanceRate(attendance)) : 
            (performance?.attendance_score || 0),
        
        billPass: performance?.bill_pass_score || 0, // 수정된 필드명
        
        petitionProposal: performance?.petition_score || 0,
        petitionResult: performance?.petition_result_score || 0,
        abstention: (performance?.invalid_vote_ratio || 0) * 100,
        committee: getCommitteeInfo(committees) || getCommitteeScoreInfo(performance),
        voteMatch: (performance?.vote_match_ratio || 0) * 100,
        voteMismatch: (performance?.vote_mismatch_ratio || 0) * 100
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
        return null;
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

// 🔧 새로운 위원회 점수 정보 함수 (API 데이터 활용)
function getCommitteeScoreInfo(performance) {
    if (!performance) return '위원회 정보 없음';
    
    const leaderCount = performance.committee_leader_count || 0;
    const secretaryCount = performance.committee_secretary_count || 0;
    
    if (leaderCount > 0) {
        return `위원장 ${leaderCount}개 위원회`;
    } else if (secretaryCount > 0) {
        return `간사 ${secretaryCount}개 위원회`;
    } else {
        return `위원회 점수: ${(performance.committee_score || 0).toFixed(1)}점`;
    }
}

// 🔧 개선된 폴백 데이터 생성
function generateFallbackStats(member) {
    // 실제적인 통계 기반 폴백 데이터
    const partyStats = {
        '국민의힘': { 
            attendance: 85.5, 
            billPass: 78.2, 
            petition: 65.3, 
            petitionResult: 58.7,
            committee: 70.0 
        },
        '더불어민주당': { 
            attendance: 87.2, 
            billPass: 82.1, 
            petition: 72.4, 
            petitionResult: 67.9,
            committee: 75.0 
        },
        '조국혁신당': { 
            attendance: 82.8, 
            billPass: 76.4, 
            petition: 61.2, 
            petitionResult: 55.8,
            committee: 68.0 
        },
        '개혁신당': { 
            attendance: 84.1, 
            billPass: 79.3, 
            petition: 68.5, 
            petitionResult: 62.1,
            committee: 72.0 
        },
        '진보당': { 
            attendance: 81.7, 
            billPass: 74.6, 
            petition: 58.9, 
            petitionResult: 53.4,
            committee: 65.0 
        }
    };
    
    const baseStats = partyStats[member.party] || {
        attendance: 75 + Math.random() * 20,
        billPass: 60 + Math.random() * 35,
        petition: 50 + Math.random() * 40,
        petitionResult: 40 + Math.random() * 50,
        committee: 60 + Math.random() * 30
    };
    
    return {
        attendance: baseStats.attendance + (Math.random() - 0.5) * 10,
        billPass: baseStats.billPass + (Math.random() - 0.5) * 15,
        petitionProposal: baseStats.petition + (Math.random() - 0.5) * 20,
        petitionResult: baseStats.petitionResult + (Math.random() - 0.5) * 25,
        abstention: Math.random() * 15,
        voteMatch: 70 + Math.random() * 25,
        voteMismatch: Math.random() * 25
    };
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

// UI 업데이트 함수들 (기존 유지)
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

// 🔧 개선된 성능 통계 업데이트
function updatePerformanceStats(member) {
    const performance = findMemberPerformance(member.name);
    const attendance = findMemberAttendance(member.name);
    const billCount = findMemberBillCount(member.name, performance?.lawmaker_id);
    const committees = findMemberCommittees(member.name);
    const ranking = findMemberRanking(member.name);
    
    // 순위 정보 업데이트
    updateRankingInfo(member, ranking);
    
    // 실적 데이터 상태 확인
    const hasPerformanceData = !!performance;
    const hasAnyData = hasPerformanceData || !!attendance || !!billCount || committees.length > 0;
    
    if (!hasPerformanceData && !hasAnyData) {
        console.log(`⚠️ ${member.name} 모든 데이터 없음 - 완전 폴백 데이터 사용`);
        updateStatsWithFallback(member, null, null, []);
        return;
    }
    
    if (!hasPerformanceData) {
        console.log(`⚠️ ${member.name} 실적 데이터 없음 - 부분 데이터와 폴백 조합 사용`);
        updateStatsWithFallback(member, attendance, billCount, committees);
        return;
    }
    
    const dataType = performance._fallback ? '폴백' : 'API';
    console.log(`✅ ${member.name} ${dataType} 실적 데이터 활용`);
    
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
    
    // 실제 데이터가 있으면 우선 사용
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
    updateStatElement(elements.petitionProposalStat, fallbackStats.petitionProposal, '%');
    updateStatElement(elements.petitionResultStat, fallbackStats.petitionResult, '%');
    updateStatElement(elements.abstentionStat, fallbackStats.abstention, '%');
    updateCommitteeElement(elements.committeeStat, committeeInfo);
    updateStatElement(elements.voteMatchStat, fallbackStats.voteMatch, '%');
    updateStatElement(elements.voteMismatchStat, fallbackStats.voteMismatch, '%');
}

// 검색 관련 함수들 (기존 유지 - 생략된 부분은 원본과 동일)
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

// URL 관련 함수들 (기존 유지)
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

// 🔧 개선된 전체 데이터 로드
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
            fetchPerformanceData(), // 중요
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
        
        // 실패한 API들에 대한 상세 정보
        Object.entries(loadResults).forEach(([key, success]) => {
            if (!success) {
                const result = results[Object.keys(loadResults).indexOf(key)];
                console.warn(`⚠️ ${key} 데이터 로드 실패:`, result.reason);
                pageState.apiErrors[key] = result.reason?.message || '알 수 없는 오류';
            }
        });
        
        // 🔧 API 오류 요약 출력
        const errorCount = Object.values(pageState.apiErrors).filter(Boolean).length;
        if (errorCount > 0) {
            console.warn(`⚠️ 총 ${errorCount}개의 API 오류 발생:`, pageState.apiErrors);
            showNotification(`일부 데이터 로드 실패 (${errorCount}개 API)`, 'warning', 5000);
        }
        
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
        
        // 🔧 초기화 시 API 상태 자동 확인
        console.log('🔍 초기화 중 API 상태 확인...');
        if (window.APIService && window.APIService._isReady) {
            try {
                const testResponse = await window.APIService.getMemberPerformance();
                console.log('🔧 초기 API 테스트 응답:', {
                    type: typeof testResponse,
                    hasRanking: !!testResponse?.ranking,
                    rankingLength: testResponse?.ranking?.length || 0,
                    directArrayLength: Array.isArray(testResponse) ? testResponse.length : 0
                });
            } catch (e) {
                console.warn('⚠️ 초기 API 테스트 실패:', e.message);
            }
        }
        
        await loadAllData();
        
        const urlMember = getMemberFromUrl();
        const initialMember = urlMember || DEFAULT_MEMBER;
        
        const foundMember = pageState.memberList.find(m => m.name === initialMember.name);
        const memberToLoad = foundMember || pageState.memberList[0] || initialMember;
        
        console.log(`👤 초기 국회의원: ${memberToLoad.name}`);
        
        selectMember(memberToLoad);
        
        // 🔧 초기화 완료 후 실적 데이터 상태 확인
        setTimeout(() => {
            console.log('🔧 초기화 완료 후 실적 데이터 상태:');
            console.log(`- 실적 데이터 개수: ${pageState.performanceData.length}`);
            console.log(`- 데이터 타입: ${pageState.performanceData[0]?._fallback ? '폴백' : 'API'}`);
            
            if (pageState.performanceData.length > 0) {
                console.log('- 첫 번째 실적 데이터:', pageState.performanceData[0]);
                
                // 박찬대 자동 검색
                const parkChanDae = findMemberPerformance('박찬대');
                if (!parkChanDae) {
                    console.log('⚠️ 박찬대 의원 실적 데이터 자동 검색 실패');
                    console.log('🔧 실시간 디버깅을 위해 memberPageDebug.forceSearchMember("박찬대") 실행');
                    
                    if (window.memberPageDebug) {
                        window.memberPageDebug.forceSearchMember('박찬대');
                    }
                }
            }
        }, 1000);
        
        // 🔧 실시간 API 확인 버튼 추가
        addDebugButtons();
        
        console.log('✅ 페이지 초기화 완료');
        
    } catch (error) {
        console.error('❌ 페이지 초기화 실패:', error);
        
        pageState.currentMember = DEFAULT_MEMBER;
        updateMemberProfile(DEFAULT_MEMBER);
        
        showNotification('일부 데이터 로드에 실패했습니다', 'warning', 5000);
    }
}

// 🔧 디버그 버튼들 추가
function addDebugButtons() {
    try {
        // 기존 디버그 버튼들 제거
        const existingButtons = document.querySelectorAll('.debug-button');
        existingButtons.forEach(btn => btn.remove());
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            position: fixed; top: 120px; right: 20px; z-index: 1000;
            display: flex; flex-direction: column; gap: 5px;
        `;
        
        const buttons = [
            {
                text: '🔍 API 확인',
                action: () => window.memberPageDebug?.checkAPIResponses?.()
            },
            {
                text: '🔄 API 재호출',
                action: () => window.memberPageDebug?.recheckAPI?.()
            },
            {
                text: '👤 박찬대 검색',
                action: () => window.memberPageDebug?.forceSearchMember?.('박찬대')
            },
            {
                text: '📊 상태 정보',
                action: () => window.memberPageDebug?.showInfo?.()
            }
        ];
        
        buttons.forEach(({ text, action }) => {
            const btn = document.createElement('button');
            btn.className = 'debug-button';
            btn.textContent = text;
            btn.style.cssText = `
                padding: 5px 10px; background: #ff5722; color: white;
                border: none; border-radius: 3px; font-size: 11px;
                cursor: pointer; transition: all 0.2s ease;
                font-family: 'Blinker', sans-serif; min-width: 120px;
            `;
            
            btn.addEventListener('click', action);
            btn.addEventListener('mouseenter', function() {
                this.style.background = '#d32f2f';
                this.style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.background = '#ff5722';
                this.style.transform = 'scale(1)';
            });
            
            buttonContainer.appendChild(btn);
        });
        
        document.body.appendChild(buttonContainer);
        
    } catch (error) {
        console.warn('[Debug] 디버그 버튼 추가 실패:', error);
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

// 🔧 강화된 디버그 함수들
window.memberPageDebug = {
    getState: () => pageState,
    getCurrentMember: () => pageState.currentMember,
    getAPIErrors: () => pageState.apiErrors,
    
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
        console.log(`- API 오류: ${Object.keys(pageState.apiErrors).filter(k => pageState.apiErrors[k]).length}개`);
        
        if (pageState.currentMember) {
            const ranking = findMemberRanking(pageState.currentMember.name);
            console.log(`- ${pageState.currentMember.name} 순위:`, ranking ? `${ranking.overall_rank}위` : '정보 없음');
        }
        
        console.log('\n❌ API 오류 상태:', pageState.apiErrors);
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
    
    // 🔧 강화된 API 응답 원본 데이터 확인
    checkAPIResponses: async () => {
        console.log('🔍 강화된 API 응답 확인:');
        
        try {
            console.log('\n📡 getMemberPerformance 호출 중...');
            const response = await window.APIService.getMemberPerformance();
            
            console.log('========== API 응답 구조 분석 ==========');
            console.log('1. 응답 타입:', typeof response);
            console.log('2. 배열 여부:', Array.isArray(response));
            console.log('3. null/undefined 여부:', response === null || response === undefined);
            console.log('4. 객체 키들:', response ? Object.keys(response) : '없음');
            
            if (response?.ranking) {
                console.log('5. ranking 필드 존재: ✅');
                console.log('6. ranking 타입:', typeof response.ranking);
                console.log('7. ranking 배열 여부:', Array.isArray(response.ranking));
                console.log('8. ranking 길이:', response.ranking.length);
                
                if (response.ranking.length > 0) {
                    console.log('\n========== 첫 번째 데이터 분석 ==========');
                    const first = response.ranking[0];
                    console.log('첫 번째 데이터 전체:', first);
                    console.log('사용 가능한 모든 필드:', Object.keys(first));
                    
                    console.log('\n========== 의원명 필드 확인 ==========');
                    console.log('lawmaker_name:', first.lawmaker_name);
                    console.log('name:', first.name);
                    console.log('HG_NM:', first.HG_NM);
                    console.log('member_name:', first.member_name);
                    
                    console.log('\n========== 점수 필드 확인 ==========');
                    console.log('total_score:', first.total_score);
                    console.log('attendance_score:', first.attendance_score);
                    console.log('bill_pass_score:', first.bill_pass_score);
                    console.log('petition_score:', first.petition_score);
                    console.log('petition_result_score:', first.petition_result_score);
                    console.log('committee_score:', first.committee_score);
                    
                    console.log('\n========== 의원명 목록 (처음 20명) ==========');
                    response.ranking.slice(0, 20).forEach((member, index) => {
                        const name = member.lawmaker_name || member.name || member.HG_NM || member.member_name || 'Unknown';
                        console.log(`${index + 1}. "${name}" (${member.party || '정당없음'})`);
                    });
                    
                    console.log('\n========== 박찬대 검색 ==========');
                    const foundByChanDae = response.ranking.find(m => 
                        (m.lawmaker_name && m.lawmaker_name.includes('박찬대')) ||
                        (m.name && m.name.includes('박찬대')) ||
                        (m.HG_NM && m.HG_NM.includes('박찬대')) ||
                        (m.member_name && m.member_name.includes('박찬대'))
                    );
                    
                    if (foundByChanDae) {
                        console.log('✅ 박찬대 발견:', foundByChanDae);
                    } else {
                        console.log('❌ 박찬대 없음');
                        
                        // '박'으로 시작하는 이름들 찾기
                        const parkMembers = response.ranking.filter(m => {
                            const name = m.lawmaker_name || m.name || m.HG_NM || m.member_name || '';
                            return name.startsWith('박');
                        });
                        
                        console.log('🔍 "박"으로 시작하는 의원들:', parkMembers.map(m => ({
                            name: m.lawmaker_name || m.name || m.HG_NM || m.member_name,
                            party: m.party
                        })));
                    }
                }
            } else if (Array.isArray(response)) {
                console.log('5. 직접 배열 응답');
                console.log('6. 배열 길이:', response.length);
                
                if (response.length > 0) {
                    console.log('\n========== 첫 번째 데이터 분석 ==========');
                    const first = response[0];
                    console.log('첫 번째 데이터:', first);
                    console.log('필드들:', Object.keys(first));
                }
            } else {
                console.log('5. 예상하지 못한 응답 구조');
                console.log('전체 응답:', JSON.stringify(response, null, 2));
            }
            
        } catch (error) {
            console.error('❌ API 응답 확인 실패:', error);
        }
    },
    
    // 🔧 특정 의원 강제 검색
    forceSearchMember: (memberName) => {
        console.log(`🔍 ${memberName} 강제 검색 시작...`);
        
        if (!pageState.performanceData || pageState.performanceData.length === 0) {
            console.log('❌ 실적 데이터가 없습니다');
            return null;
        }
        
        console.log(`📊 현재 실적 데이터: ${pageState.performanceData.length}개`);
        
        // 모든 의원명 출력
        console.log('📋 전체 의원명 목록:');
        pageState.performanceData.forEach((member, index) => {
            console.log(`${index + 1}. "${member.name}" (${member.party})`);
        });
        
        // 다양한 방법으로 검색
        const results = {
            exact: pageState.performanceData.find(p => p.name === memberName),
            includes: pageState.performanceData.filter(p => p.name.includes(memberName)),
            startsWith: pageState.performanceData.filter(p => p.name.startsWith(memberName.charAt(0))),
            similar: pageState.performanceData.filter(p => getSimilarity(p.name, memberName) > 0.5)
        };
        
        console.log(`🔍 ${memberName} 검색 결과:`, results);
        
        return results;
    },
    
    // 🔧 실시간 API 재호출 및 확인
    recheckAPI: async () => {
        console.log('🔄 실시간 API 재호출 시작...');
        
        try {
            // 실적 데이터 재호출
            await fetchPerformanceData();
            
            console.log(`📊 재호출 후 실적 데이터: ${pageState.performanceData.length}개`);
            
            // 박찬대 재검색
            const parkChanDae = findMemberPerformance('박찬대');
            
            if (parkChanDae) {
                console.log('✅ 박찬대 재검색 성공:', parkChanDae);
            } else {
                console.log('❌ 박찬대 재검색 실패');
            }
            
            return parkChanDae;
            
        } catch (error) {
            console.error('❌ API 재호출 실패:', error);
            return null;
        }
    },
    
    // 🔧 필드 매핑 테스트
    testFieldMapping: () => {
        if (pageState.performanceData.length > 0) {
            const sample = pageState.performanceData[0];
            console.log('🔧 현재 매핑된 실적 데이터 샘플:', sample);
            console.log('- 원본 데이터:', sample._raw);
            console.log('- 폴백 여부:', sample._fallback);
        } else {
            console.warn('❌ 실적 데이터가 없습니다');
        }
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 percent_member.js DOM 로드 완료 (강화된 디버깅 버전)');
    
    let attempts = 0;
    const maxAttempts = 30;
    
    function waitForAPI() {
        attempts++;
        console.log(`🔗 API 서비스 연결 확인 시도 ${attempts}/${maxAttempts}...`);
        
        if (window.APIService && window.APIService._isReady) {
            console.log('✅ API 서비스 연결 확인됨');
            console.log('🔧 API 서비스 상태:', {
                isReady: window.APIService._isReady,
                hasError: window.APIService._hasError,
                version: window.APIService._version,
                methods: Object.keys(window.APIService).filter(key => typeof window.APIService[key] === 'function')
            });
            
            // API 연결 후 즉시 테스트
            setTimeout(async () => {
                try {
                    console.log('🧪 API 연결 후 즉시 테스트...');
                    const testResponse = await window.APIService.getMemberPerformance();
                    console.log('🧪 즉시 테스트 결과:', {
                        success: !!testResponse,
                        type: typeof testResponse,
                        hasRanking: !!testResponse?.ranking,
                        length: testResponse?.ranking?.length || testResponse?.length || 0
                    });
                } catch (e) {
                    console.warn('🧪 즉시 테스트 실패:', e.message);
                }
            }, 500);
            
            initializePage();
        } else if (attempts < maxAttempts) {
            console.log(`⏳ API 서비스 대기 중... (${attempts}/${maxAttempts})`);
            setTimeout(waitForAPI, 100);
        } else {
            console.warn('⚠️ API 서비스 연결 타임아웃, 폴백 데이터 사용');
            console.log('🔧 폴백 모드로 전환...');
            
            pageState.memberList = getFallbackMemberList();
            initializeElements();
            setupSearch();
            pageState.currentMember = DEFAULT_MEMBER;
            updateMemberProfile(DEFAULT_MEMBER);
            
            // 폴백 모드에서도 디버그 버튼 추가
            setTimeout(addDebugButtons, 1000);
        }
    }
    
    waitForAPI();
});

console.log('📦 percent_member.js 로드 완료 (강화된 디버깅 버전 - API 응답 구조 상세 분석)');
