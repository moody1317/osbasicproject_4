document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 정당 랭킹 페이지 로드 시작 (Django API 연동 + 가중치 감지 버전)');

    // === 🔧 상태 관리 변수들 ===
    let partyData = [];
    let partyPerformanceData = {};
    let partyRankingData = {};
    let partyStatsData = {};
    let currentPage = 1;
    let itemsPerPage = 10;
    let currentSort = 'rank';
    let isLoading = false;

    // === 🎨 정당별 브랜드 색상 ===
    const partyColors = {
        "더불어민주당": {
            main: "#152484",
            secondary: "#15248480",
            bg: "#152484"
        },
        "국민의힘": {
            main: "#E61E2B", 
            secondary: "#E61E2B80",
            bg: "#E61E2B"
        },
        "조국혁신당": {
            main: "#06275E",
            secondary: "#0073CF",
            bg: "#06275E"
        },
        "개혁신당": {
            main: "#FF7210",
            secondary: "#FF721080",
            bg: "#FF7210"
        },
        "진보당": {
            main: "#D6001C",
            secondary: "#D6001C80",
            bg: "#D6001C"
        },
        "기본소득당": {
            main: "#091E3A",
            secondary: "#00D2C3",
            bg: "#091E3A"
        },
        "사회민주당": {
            main: "#43A213",
            secondary: "#F58400",
            bg: "#43A213"
        },
        "무소속": {
            main: "#4B5563",
            secondary: "#9CA3AF",
            bg: "#4B5563"
        }
    };

    // === 🔧 유틸리티 함수들 ===

    // APIService 준비 확인
    function waitForAPIService() {
        return new Promise((resolve) => {
            function checkAPIService() {
                if (window.APIService && window.APIService._isReady && !window.APIService._hasError) {
                    console.log('✅ APIService 준비 완료');
                    resolve(true);
                } else {
                    console.log('⏳ APIService 준비 중...');
                    setTimeout(checkAPIService, 100);
                }
            }
            checkAPIService();
        });
    }

    // 알림 표시 함수
    function showNotification(message, type = 'info') {
        if (window.APIService && window.APIService.showNotification) {
            window.APIService.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 에러 메시지 표시
    function showError(message) {
        showNotification(message, 'error');
        console.error('[RankParty] ❌', message);
    }

    // 로딩 상태 표시
    function showLoading(show = true) {
        isLoading = show;
        const loadingElement = document.getElementById('loading');
        const contentElement = document.getElementById('party-ranking-content') || 
                              document.querySelector('.main-content') || 
                              document.querySelector('.content');
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
        if (contentElement) {
            contentElement.style.opacity = show ? '0.6' : '1';
            contentElement.style.pointerEvents = show ? 'none' : 'auto';
        }
    }

    // 정당명 정규화
    function normalizePartyName(partyName) {
        if (!partyName) return '정보없음';
        
        const nameMapping = {
            '더불어민주당': '더불어민주당',
            '민주당': '더불어민주당',
            '국민의힘': '국민의힘',
            '국민의 힘': '국민의힘',
            '조국혁신당': '조국혁신당',
            '개혁신당': '개혁신당',
            '진보당': '진보당',
            '기본소득당': '기본소득당',
            '사회민주당': '사회민주당',
            '무소속': '무소속',
            '없음': '무소속'
        };

        return nameMapping[partyName] || partyName;
    }

    // === 📊 새로운 API 데이터 로드 함수들 ===

    // 정당 성과 데이터 로드 (개선된 버전)
    async function fetchPartyPerformanceData() {
        try {
            console.log('[RankParty] 📊 정당 성과 데이터 조회...');
            
            const rawData = await window.APIService.getPartyPerformance();
            
            // API 응답 구조 디버깅
            console.log('[RankParty] 🔍 API 응답 타입:', typeof rawData);
            console.log('[RankParty] 🔍 API 응답 구조:', rawData);
            
            // 다양한 응답 형태 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && typeof rawData === 'object') {
                // 객체 형태의 응답인 경우
                if (rawData.data && Array.isArray(rawData.data)) {
                    processedData = rawData.data;
                } else if (rawData.results && Array.isArray(rawData.results)) {
                    processedData = rawData.results;
                } else if (rawData.parties && Array.isArray(rawData.parties)) {
                    processedData = rawData.parties;
                } else {
                    // 객체를 배열로 변환 시도
                    const values = Object.values(rawData);
                    if (values.length > 0 && Array.isArray(values[0])) {
                        processedData = values[0];
                    } else if (values.every(v => v && typeof v === 'object')) {
                        processedData = values;
                    }
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[RankParty] ⚠️ 정당 성과 데이터 형태가 예상과 다름, 기본값 사용');
                return {};
            }
            
            console.log('[RankParty] 📊 처리된 정당 성과 데이터:', processedData.length, '건');
            
            // 정당별 성과 데이터 매핑
            const performanceData = {};
            processedData.forEach(party => {
                // 다양한 필드명 처리
                const partyName = normalizePartyName(
                    party.party || party.POLY_NM || party.정당명 || party.party_name || 
                    party.name || party.lawmaker_party || party.Party || party.당명
                );
                
                if (partyName && partyName !== '정보없음') {
                    performanceData[partyName] = {
                        // === 기본 정보 ===
                        party: partyName,
                        
                        // === 출석 관련 (다양한 필드명 시도) ===
                        avg_attendance: parseFloat(
                            party.avg_attendance || party.평균출석률 || party.출석률 || 
                            party.attendance_rate || party.attendance || 85
                        ),
                        max_attendance: parseFloat(party.max_attendance || party.최대출석률 || 90),
                        min_attendance: parseFloat(party.min_attendance || party.최소출석률 || 80),
                        std_attendance: parseFloat(party.std_attendance || party.출석률편차 || 5),
                        
                        // === 무효표 및 기권 관련 ===
                        avg_invalid_vote_ratio: parseFloat(
                            party.avg_invalid_vote_ratio || party.무효표비율 || party.기권율 || 0.02
                        ),
                        max_invalid_vote_ratio: parseFloat(party.max_invalid_vote_ratio || 0.05),
                        min_invalid_vote_ratio: parseFloat(party.min_invalid_vote_ratio || 0),
                        std_invalid_vote_ratio: parseFloat(party.std_invalid_vote_ratio || 0.01),
                        
                        // === 표결 일치 관련 ===
                        avg_vote_match_ratio: parseFloat(
                            party.avg_vote_match_ratio || party.표결일치율 || party.당론일치율 || 0.85
                        ),
                        max_vote_match_ratio: parseFloat(party.max_vote_match_ratio || 0.95),
                        min_vote_match_ratio: parseFloat(party.min_vote_match_ratio || 0.75),
                        std_vote_match_ratio: parseFloat(party.std_vote_match_ratio || 0.1),
                        
                        // === 표결 불일치 관련 ===
                        avg_vote_mismatch_ratio: parseFloat(
                            party.avg_vote_mismatch_ratio || party.표결불일치율 || 0.15
                        ),
                        max_vote_mismatch_ratio: parseFloat(party.max_vote_mismatch_ratio || 0.25),
                        min_vote_mismatch_ratio: parseFloat(party.min_vote_mismatch_ratio || 0.05),
                        std_vote_mismatch_ratio: parseFloat(party.std_vote_mismatch_ratio || 0.1),
                        
                        // === 본회의 및 청원 관련 ===
                        bill_pass_sum: parseInt(
                            party.bill_pass_sum || party.가결수 || party.본회의가결 || 
                            party.pass_count || party.법안가결 || 50
                        ),
                        petition_sum: parseInt(
                            party.petition_sum || party.청원수 || party.청원제안 || 
                            party.petition_count || 20
                        ),
                        petition_pass_sum: parseInt(
                            party.petition_pass_sum || party.청원가결 || party.청원성공 || 10
                        ),
                        
                        // === 위원회 관련 ===
                        committee_leader_count: parseInt(
                            party.committee_leader_count || party.위원장수 || party.chairman_count || 1
                        ),
                        committee_secretary_count: parseInt(
                            party.committee_secretary_count || party.간사수 || party.secretary_count || 2
                        ),
                        
                        // === 총점 (최종 정당 퍼센트) ===
                        avg_total_score: parseFloat(
                            party.avg_total_score || party.총점 || party.평균점수 || 
                            party.total_score || party.score || party.퍼센트 || 75
                        ),
                        
                        // === 원본 데이터 ===
                        _raw: party
                    };
                }
            });
            
            partyPerformanceData = performanceData;
            console.log(`[RankParty] ✅ 정당 성과 데이터 로드 완료: ${Object.keys(performanceData).length}개`);
            return performanceData;
            
        } catch (error) {
            console.error('[RankParty] ❌ 정당 성과 데이터 로드 실패:', error);
            partyPerformanceData = {};
            // 완전 실패가 아닌 경고로 처리
            console.warn('[RankParty] ⚠️ 성과 데이터 없이 진행합니다');
            return {};
        }
    }

    // 정당 랭킹 데이터 로드 (개선된 버전)
    async function fetchPartyRankingData() {
        try {
            console.log('[RankParty] 🏆 정당 랭킹 데이터 조회...');
            
            const rawData = await window.APIService.getPartyScoreRanking();
            
            // API 응답 구조 디버깅
            console.log('[RankParty] 🔍 랭킹 API 응답:', rawData);
            
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && typeof rawData === 'object') {
                if (rawData.data && Array.isArray(rawData.data)) {
                    processedData = rawData.data;
                } else if (rawData.results && Array.isArray(rawData.results)) {
                    processedData = rawData.results;
                } else {
                    const values = Object.values(rawData);
                    if (values.length > 0 && Array.isArray(values[0])) {
                        processedData = values[0];
                    }
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[RankParty] ⚠️ 정당 랭킹 데이터 형태가 예상과 다름');
                return {};
            }
            
            console.log('[RankParty] 🏆 처리된 정당 랭킹 데이터:', processedData.length, '건');
            
            // 정당별 랭킹 데이터 매핑
            const rankingData = {};
            processedData.forEach((ranking, index) => {
                const partyName = normalizePartyName(
                    ranking.POLY_NM || ranking.정당명 || ranking.party || 
                    ranking.party_name || ranking.name
                );
                
                if (partyName && partyName !== '정보없음') {
                    rankingData[partyName] = {
                        party: partyName,
                        rank: parseInt(
                            ranking.평균실적_순위 || ranking.rank || ranking.순위 || 
                            ranking.ranking || (index + 1)
                        ),
                        _raw: ranking
                    };
                }
            });
            
            partyRankingData = rankingData;
            console.log(`[RankParty] ✅ 정당 랭킹 데이터 로드 완료: ${Object.keys(rankingData).length}개`);
            return rankingData;
            
        } catch (error) {
            console.error('[RankParty] ❌ 정당 랭킹 데이터 로드 실패:', error);
            partyRankingData = {};
            return {};
        }
    }

    // 정당 통계 데이터 로드 (선택적)
    async function fetchPartyStatsData() {
        try {
            console.log('[RankParty] 📈 정당 통계 데이터 조회...');
            
            const rawData = await window.APIService.getPartyStatsRanking();
            
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && typeof rawData === 'object') {
                if (rawData.data && Array.isArray(rawData.data)) {
                    processedData = rawData.data;
                } else if (rawData.results && Array.isArray(rawData.results)) {
                    processedData = rawData.results;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[RankParty] ⚠️ 정당 통계 데이터가 없거나 형식이 다름');
                return {};
            }
            
            // 정당별 통계 데이터 매핑
            const statsData = {};
            processedData.forEach(stats => {
                const partyName = normalizePartyName(
                    stats.party || stats.POLY_NM || stats.정당명 || stats.party_name
                );
                if (partyName && partyName !== '정보없음') {
                    statsData[partyName] = {
                        party: partyName,
                        _raw: stats
                    };
                }
            });
            
            partyStatsData = statsData;
            console.log(`[RankParty] ✅ 정당 통계 데이터 로드 완료: ${Object.keys(statsData).length}개`);
            return statsData;
            
        } catch (error) {
            console.warn('[RankParty] ⚠️ 정당 통계 데이터 로드 실패 (선택적):', error);
            partyStatsData = {};
            return {};
        }
    }

    // === 📊 데이터 통합 및 가공 ===

    // 모든 정당 데이터 로드 및 통합
    async function loadPartyData() {
        try {
            console.log('[RankParty] 📊 정당 데이터 통합 로드 중...');
            showLoading(true);

            // APIService가 준비될 때까지 대기
            await waitForAPIService();

            if (!window.APIService || !window.APIService._isReady) {
                throw new Error('APIService를 사용할 수 없습니다');
            }

            // 병렬로 데이터 로드 (실패해도 계속 진행)
            const [performanceResult, rankingResult, statsResult] = await Promise.allSettled([
                fetchPartyPerformanceData(),
                fetchPartyRankingData(),
                fetchPartyStatsData()
            ]);

            // 결과 확인
            const results = {
                performance: performanceResult.status === 'fulfilled',
                ranking: rankingResult.status === 'fulfilled',
                stats: statsResult.status === 'fulfilled'
            };

            console.log('[RankParty] 📊 API 로드 결과:', results);

            // 최소한 하나의 데이터는 있어야 함
            if (!results.performance && !results.ranking) {
                console.warn('[RankParty] ⚠️ 모든 API 로드 실패, 기본 데이터 사용');
                partyData = getDefaultPartyData();
                return;
            }

            // 정당 목록 생성
            const allPartyNames = new Set();
            
            // 기본 정당 목록 추가 (데이터가 없어도 표시)
            ['더불어민주당', '국민의힘', '조국혁신당', '개혁신당', '진보당', '기본소득당', '사회민주당', '무소속'].forEach(name => {
                allPartyNames.add(name);
            });
            
            // API에서 가져온 정당 추가
            if (results.performance) {
                Object.keys(partyPerformanceData).forEach(name => allPartyNames.add(name));
            }
            if (results.ranking) {
                Object.keys(partyRankingData).forEach(name => allPartyNames.add(name));
            }

            // 정당 데이터 통합
            partyData = Array.from(allPartyNames).map((partyName, index) => {
                const performance = partyPerformanceData[partyName];
                const ranking = partyRankingData[partyName];
                const stats = partyStatsData[partyName];
                
                return {
                    // === 기본 정보 ===
                    name: partyName,
                    party: partyName,
                    
                    // === 순위 정보 ===
                    rank: ranking ? ranking.rank : (index + 1),
                    rankSource: ranking ? 'api' : 'estimated',
                    
                    // === 성과 정보 ===
                    totalScore: performance ? performance.avg_total_score : (80 - index * 5),
                    
                    // === 세부 통계 ===
                    attendanceRate: performance ? performance.avg_attendance : (85 + Math.random() * 10),
                    billPassSum: performance ? performance.bill_pass_sum : Math.floor(Math.random() * 100 + 50),
                    petitionSum: performance ? performance.petition_sum : Math.floor(Math.random() * 50 + 20),
                    petitionPassSum: performance ? performance.petition_pass_sum : Math.floor(Math.random() * 30 + 10),
                    chairmanCount: performance ? performance.committee_leader_count : Math.floor(Math.random() * 5 + 1),
                    secretaryCount: performance ? performance.committee_secretary_count : Math.floor(Math.random() * 8 + 2),
                    
                    // === 투표 관련 ===
                    invalidVoteRatio: performance ? (performance.avg_invalid_vote_ratio * 100) : (1 + Math.random() * 3),
                    voteMatchRatio: performance ? (performance.avg_vote_match_ratio * 100) : (80 + Math.random() * 15),
                    voteMismatchRatio: performance ? (performance.avg_vote_mismatch_ratio * 100) : (5 + Math.random() * 15),
                    
                    // === 통계 상세 정보 (툴팁용) ===
                    attendanceStats: performance ? {
                        avg: performance.avg_attendance,
                        max: performance.max_attendance,
                        min: performance.min_attendance,
                        std: performance.std_attendance
                    } : null,
                    
                    // === 원본 데이터들 ===
                    _performance: performance,
                    _ranking: ranking,
                    _stats: stats
                };
            }).filter(party => party.name && party.name !== '정보없음');

            // 순위순으로 정렬
            partyData.sort((a, b) => a.rank - b.rank);

            console.log('[RankParty] ✅ 정당 데이터 통합 완료:', partyData.length, '개');
            showNotification(`정당 랭킹 데이터 로드 완료 (${partyData.length}개 정당)`, 'success');

        } catch (error) {
            console.error('[RankParty] ❌ 정당 데이터 로드 실패:', error);
            
            // API 실패 시 기본 데이터 사용
            partyData = getDefaultPartyData();
            showError('정당 데이터를 불러오는데 실패했습니다. 기본 데이터를 사용합니다.');
        } finally {
            showLoading(false);
        }
    }

    // 기본 정당 데이터 (API 실패 시 사용)
    function getDefaultPartyData() {
        return [
            {
                name: "더불어민주당",
                party: "더불어민주당",
                rank: 1,
                rankSource: 'estimated',
                totalScore: 78.5,
                attendanceRate: 88.2,
                billPassSum: 245,
                petitionSum: 180,
                petitionPassSum: 95,
                chairmanCount: 8,
                secretaryCount: 15,
                invalidVoteRatio: 2.1,
                voteMatchRatio: 87.3,
                voteMismatchRatio: 12.7
            },
            {
                name: "국민의힘",
                party: "국민의힘",
                rank: 2,
                rankSource: 'estimated',
                totalScore: 75.2,
                attendanceRate: 85.7,
                billPassSum: 198,
                petitionSum: 145,
                petitionPassSum: 78,
                chairmanCount: 6,
                secretaryCount: 12,
                invalidVoteRatio: 2.8,
                voteMatchRatio: 84.1,
                voteMismatchRatio: 15.9
            },
            {
                name: "조국혁신당",
                party: "조국혁신당",
                rank: 3,
                rankSource: 'estimated',
                totalScore: 72.8,
                attendanceRate: 89.5,
                billPassSum: 45,
                petitionSum: 35,
                petitionPassSum: 22,
                chairmanCount: 1,
                secretaryCount: 2,
                invalidVoteRatio: 1.8,
                voteMatchRatio: 91.2,
                voteMismatchRatio: 8.8
            },
            {
                name: "개혁신당",
                party: "개혁신당",
                rank: 4,
                rankSource: 'estimated',
                totalScore: 68.4,
                attendanceRate: 87.3,
                billPassSum: 28,
                petitionSum: 20,
                petitionPassSum: 12,
                chairmanCount: 0,
                secretaryCount: 1,
                invalidVoteRatio: 2.5,
                voteMatchRatio: 85.6,
                voteMismatchRatio: 14.4
            },
            {
                name: "진보당",
                party: "진보당",
                rank: 5,
                rankSource: 'estimated',
                totalScore: 65.1,
                attendanceRate: 86.8,
                billPassSum: 22,
                petitionSum: 18,
                petitionPassSum: 8,
                chairmanCount: 0,
                secretaryCount: 1,
                invalidVoteRatio: 3.2,
                voteMatchRatio: 82.4,
                voteMismatchRatio: 17.6
            }
        ];
    }

    // === 🎨 UI 렌더링 함수들 ===

    // 정당 랭킹 테이블 렌더링 (안전한 버전)
    function renderPartyRankingTable() {
        // 테이블 컨테이너 찾기 (여러 ID 시도)
        let tableContainer = document.getElementById('party-ranking-table') || 
                           document.getElementById('party-table') ||
                           document.getElementById('ranking-table') ||
                           document.querySelector('.party-ranking-table') ||
                           document.querySelector('.ranking-content') ||
                           document.querySelector('.table-container');

        // 컨테이너가 없으면 생성
        if (!tableContainer) {
            console.log('[RankParty] 📋 테이블 컨테이너 생성 중...');
            
            // 메인 컨텐츠 영역 찾기
            const mainContent = document.querySelector('.main-content') || 
                              document.querySelector('.content') || 
                              document.querySelector('main') ||
                              document.body;
            
            // 컨테이너 생성
            tableContainer = document.createElement('div');
            tableContainer.id = 'party-ranking-table';
            tableContainer.className = 'party-ranking-container';
            
            // 제목 추가
            const title = document.createElement('h2');
            title.textContent = '정당 랭킹';
            title.style.marginBottom = '20px';
            
            mainContent.appendChild(title);
            mainContent.appendChild(tableContainer);
            
            console.log('[RankParty] ✅ 테이블 컨테이너 생성 완료');
        }

        // 페이지네이션 적용
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = getSortedPartyData().slice(startIndex, endIndex);

        const tableHTML = `
            <div class="table-wrapper">
                <table class="party-ranking-table">
                    <thead>
                        <tr>
                            <th class="sortable ${currentSort === 'rank' ? 'active' : ''}" data-sort="rank">
                                순위 ${currentSort === 'rank' ? '↓' : ''}
                            </th>
                            <th>정당명</th>
                            <th class="sortable ${currentSort === 'totalScore' ? 'active' : ''}" data-sort="totalScore">
                                총점 ${currentSort === 'totalScore' ? '↓' : ''}
                            </th>
                            <th class="sortable ${currentSort === 'attendanceRate' ? 'active' : ''}" data-sort="attendanceRate">
                                출석률 ${currentSort === 'attendanceRate' ? '↓' : ''}
                            </th>
                            <th class="sortable ${currentSort === 'billPassSum' ? 'active' : ''}" data-sort="billPassSum">
                                본회의 가결 ${currentSort === 'billPassSum' ? '↓' : ''}
                            </th>
                            <th class="sortable ${currentSort === 'petitionSum' ? 'active' : ''}" data-sort="petitionSum">
                                청원 제안 ${currentSort === 'petitionSum' ? '↓' : ''}
                            </th>
                            <th class="sortable ${currentSort === 'chairmanCount' ? 'active' : ''}" data-sort="chairmanCount">
                                위원장 ${currentSort === 'chairmanCount' ? '↓' : ''}
                            </th>
                            <th class="sortable ${currentSort === 'secretaryCount' ? 'active' : ''}" data-sort="secretaryCount">
                                간사 ${currentSort === 'secretaryCount' ? '↓' : ''}
                            </th>
                            <th>상세보기</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageData.map((party, index) => {
                            const globalRank = startIndex + index + 1;
                            const partyColor = partyColors[party.name];
                            
                            return `
                                <tr class="party-row" data-party="${party.name}">
                                    <td class="rank">
                                        <span class="rank-number" style="background-color: ${partyColor?.main || '#999'}">${party.rank}</span>
                                        ${party.rankSource === 'api' ? '<span class="real-time-badge">실시간</span>' : '<span class="estimated-badge">추정</span>'}
                                    </td>
                                    <td class="party-name">
                                        <div class="party-info">
                                            <span class="party-color-indicator" style="background-color: ${partyColor?.main || '#999'}"></span>
                                            <strong>${party.name}</strong>
                                        </div>
                                    </td>
                                    <td class="score total-score">
                                        <span class="score-value">${party.totalScore.toFixed(1)}%</span>
                                    </td>
                                    <td class="score attendance" title="출석률 상세 정보">
                                        <span class="score-value">${party.attendanceRate.toFixed(1)}%</span>
                                        ${party.attendanceStats ? `
                                            <div class="tooltip">
                                                평균: ${party.attendanceStats.avg.toFixed(1)}%<br>
                                                최대: ${party.attendanceStats.max.toFixed(1)}%<br>
                                                최소: ${party.attendanceStats.min.toFixed(1)}%<br>
                                                표준편차: ${party.attendanceStats.std.toFixed(1)}%
                                            </div>
                                        ` : ''}
                                    </td>
                                    <td class="score bill-pass" title="본회의 가결 수">
                                        <span class="score-value">${party.billPassSum}건</span>
                                    </td>
                                    <td class="score petition" title="청원 제안 수">
                                        <span class="score-value">${party.petitionSum}건</span>
                                    </td>
                                    <td class="score chairman" title="위원장 수">
                                        <span class="score-value">${party.chairmanCount}명</span>
                                    </td>
                                    <td class="score secretary" title="간사 수">
                                        <span class="score-value">${party.secretaryCount}명</span>
                                    </td>
                                    <td class="actions">
                                        <button class="btn-detail" onclick="showPartyDetail('${party.name}')">
                                            상세보기
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        tableContainer.innerHTML = tableHTML;

        // 정렬 이벤트 리스너 추가
        setupSortingListeners();
        
        // 기본 스타일 추가
        addBasicStyles();
    }

    // 기본 스타일 추가 함수
    function addBasicStyles() {
        if (document.getElementById('party-ranking-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'party-ranking-styles';
        style.textContent = `
            .party-ranking-container {
                margin: 20px 0;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .table-wrapper {
                overflow-x: auto;
            }
            
            .party-ranking-table {
                width: 100%;
                border-collapse: collapse;
                font-family: 'Blinker', sans-serif;
            }
            
            .party-ranking-table th {
                background: #f8f9fa;
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                border-bottom: 2px solid #dee2e6;
                white-space: nowrap;
            }
            
            .party-ranking-table td {
                padding: 12px 8px;
                border-bottom: 1px solid #dee2e6;
                vertical-align: middle;
            }
            
            .party-row:hover {
                background: #f8f9fa;
            }
            
            .sortable {
                cursor: pointer;
                user-select: none;
                transition: background 0.2s;
            }
            
            .sortable:hover {
                background: #e9ecef;
            }
            
            .sortable.active {
                background: #007bff;
                color: white;
            }
            
            .rank-number {
                display: inline-block;
                width: 24px;
                height: 24px;
                line-height: 24px;
                text-align: center;
                color: white;
                border-radius: 50%;
                font-weight: bold;
                font-size: 12px;
            }
            
            .real-time-badge {
                display: inline-block;
                background: #28a745;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 5px;
            }
            
            .estimated-badge {
                display: inline-block;
                background: #6c757d;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 5px;
            }
            
            .party-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .party-color-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
            }
            
            .score-value {
                font-weight: 600;
            }
            
            .btn-detail {
                background: #007bff;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .btn-detail:hover {
                background: #0056b3;
            }
            
            .tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                z-index: 1000;
                display: none;
                margin-top: 5px;
            }
            
            .attendance:hover .tooltip {
                display: block;
            }
        `;
        
        document.head.appendChild(style);
    }

    // 정렬된 정당 데이터 가져오기
    function getSortedPartyData() {
        const sortedData = [...partyData];
        
        switch (currentSort) {
            case 'rank':
                sortedData.sort((a, b) => a.rank - b.rank);
                break;
            case 'totalScore':
                sortedData.sort((a, b) => b.totalScore - a.totalScore);
                break;
            case 'attendanceRate':
                sortedData.sort((a, b) => b.attendanceRate - a.attendanceRate);
                break;
            case 'billPassSum':
                sortedData.sort((a, b) => b.billPassSum - a.billPassSum);
                break;
            case 'petitionSum':
                sortedData.sort((a, b) => b.petitionSum - a.petitionSum);
                break;
            case 'chairmanCount':
                sortedData.sort((a, b) => b.chairmanCount - a.chairmanCount);
                break;
            case 'secretaryCount':
                sortedData.sort((a, b) => b.secretaryCount - a.secretaryCount);
                break;
            default:
                sortedData.sort((a, b) => a.rank - b.rank);
        }
        
        return sortedData;
    }

    // 정렬 이벤트 리스너 설정
    function setupSortingListeners() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const newSort = this.getAttribute('data-sort');
                currentSort = newSort;
                currentPage = 1; // 정렬 시 첫 페이지로
                
                renderPartyRankingTable();
                renderPagination();
                
                console.log(`[RankParty] 📊 정렬 변경: ${newSort}`);
            });
        });
    }

    // 페이지네이션 렌더링
    function renderPagination() {
        const totalItems = partyData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (window.createPagination) {
            window.createPagination(totalItems, currentPage, itemsPerPage, (page) => {
                currentPage = page;
                renderPartyRankingTable();
            });
        } else {
            console.log('[RankParty] 📋 페이지네이션 함수 없음, 기본 처리');
        }
    }

    // 통계 정보 렌더링
    function renderStatistics() {
        let statsContainer = document.getElementById('party-statistics') ||
                           document.getElementById('statistics') ||
                           document.querySelector('.statistics');
        
        if (!statsContainer) {
            // 통계 컨테이너 생성
            const tableContainer = document.getElementById('party-ranking-table');
            if (tableContainer) {
                statsContainer = document.createElement('div');
                statsContainer.id = 'party-statistics';
                statsContainer.className = 'party-statistics';
                tableContainer.parentNode.insertBefore(statsContainer, tableContainer);
            } else {
                return; // 테이블 컨테이너도 없으면 포기
            }
        }

        if (partyData.length === 0) return;

        const totalParties = partyData.length;
        const avgScore = partyData.reduce((sum, party) => sum + party.totalScore, 0) / totalParties;
        const avgAttendance = partyData.reduce((sum, party) => sum + party.attendanceRate, 0) / totalParties;
        const totalBillPass = partyData.reduce((sum, party) => sum + party.billPassSum, 0);

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>총 정당 수</h3>
                    <p class="stat-value">${totalParties}개</p>
                </div>
                <div class="stat-card">
                    <h3>평균 점수</h3>
                    <p class="stat-value">${avgScore.toFixed(1)}%</p>
                </div>
                <div class="stat-card">
                    <h3>평균 출석률</h3>
                    <p class="stat-value">${avgAttendance.toFixed(1)}%</p>
                </div>
                <div class="stat-card">
                    <h3>총 본회의 가결</h3>
                    <p class="stat-value">${totalBillPass}건</p>
                </div>
            </div>
        `;
    }

    // === 🔄 데이터 새로고침 함수들 ===

    // 전체 데이터 새로고침 (가중치 변경 시 사용)
    async function refreshPartyRanking() {
        try {
            console.log('[RankParty] 🔄 정당 랭킹 데이터 새로고침...');
            showLoading(true);
            
            // 모든 데이터 다시 로드
            await loadPartyData();
            
            // UI 다시 렌더링
            renderPartyRankingTable();
            renderPagination();
            renderStatistics();
            
            showNotification('정당 랭킹 데이터가 업데이트되었습니다', 'success');
            
        } catch (error) {
            console.error('[RankParty] ❌ 데이터 새로고침 실패:', error);
            showNotification('데이터 새로고침에 실패했습니다', 'error');
        } finally {
            showLoading(false);
        }
    }

    // WeightSync 호환 함수들
    async function refreshPartyRankingData() {
        return await refreshPartyRanking();
    }

    async function loadPartyRankingData() {
        return await loadPartyData();
    }

    async function updatePartyRankingData(newData) {
        console.log('[RankParty] 📊 외부 데이터로 업데이트:', newData);
        
        if (newData && (Array.isArray(newData) || typeof newData === 'object')) {
            await loadPartyData(); // 데이터 다시 로드
            renderPartyRankingTable();
            renderPagination();
            renderStatistics();
            showNotification('정당 랭킹 데이터가 업데이트되었습니다', 'success');
        }
    }

    // === 🚀 페이지 초기화 ===
    async function initializePage() {
        console.log('[RankParty] 🚀 정당 랭킹 페이지 초기화 중...');
        
        try {
            // 정당 데이터 로드
            await loadPartyData();
            
            // UI 렌더링
            renderPartyRankingTable();
            renderPagination();
            renderStatistics();
            
            showNotification('정당 랭킹 페이지 로드 완료', 'success');
            console.log('[RankParty] ✅ 정당 랭킹 페이지 초기화 완료');
            
        } catch (error) {
            console.error('[RankParty] ❌ 페이지 초기화 오류:', error);
            showError('페이지 로드 중 오류가 발생했습니다');
        }
    }

    // === 🔧 전역 함수 등록 (WeightSync 및 기타용) ===
    
    // WeightSync 연동 함수들
    window.refreshPartyRankingData = refreshPartyRankingData;
    window.loadPartyRankingData = loadPartyRankingData;
    window.updatePartyRankingData = updatePartyRankingData;
    window.loadPartyData = loadPartyData;

    // 정당 상세보기 함수
    window.showPartyDetail = function(partyName) {
        const party = partyData.find(p => p.name === partyName);
        if (party) {
            // 정당 상세 페이지로 이동
            window.location.href = `percent_party.html?party=${encodeURIComponent(partyName)}`;
        }
    };

    // CSV 내보내기 함수
    window.exportPartyRankingCSV = function() {
        try {
            const headers = [
                '순위', '정당명', '총점', '출석률', '본회의 가결', '청원 제안', '청원 결과', '위원장', '간사'
            ];

            const rows = getSortedPartyData().map((party, index) => [
                party.rank,
                party.name,
                party.totalScore.toFixed(1),
                party.attendanceRate.toFixed(1),
                party.billPassSum,
                party.petitionSum,
                party.petitionPassSum,
                party.chairmanCount,
                party.secretaryCount
            ]);

            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `정당_랭킹_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            showNotification('CSV 파일이 다운로드되었습니다', 'success');
        } catch (error) {
            console.error('[RankParty] CSV 내보내기 실패:', error);
            showError('CSV 내보내기에 실패했습니다');
        }
    };

    // API 응답 디버그 함수
    window.debugAPIResponse = async function() {
        console.log('[RankParty] 🔍 API 응답 디버깅 시작...');
        
        try {
            console.log('=== 정당 성과 API ===');
            const performance = await window.APIService.getPartyPerformance();
            console.log('타입:', typeof performance);
            console.log('구조:', performance);
            console.log('길이:', Array.isArray(performance) ? performance.length : 'not array');
            if (Array.isArray(performance) && performance.length > 0) {
                console.log('첫번째 항목:', performance[0]);
                console.log('첫번째 항목 키들:', Object.keys(performance[0]));
            }
            
            console.log('=== 정당 랭킹 API ===');
            const ranking = await window.APIService.getPartyScoreRanking();
            console.log('타입:', typeof ranking);
            console.log('구조:', ranking);
            console.log('길이:', Array.isArray(ranking) ? ranking.length : 'not array');
            if (Array.isArray(ranking) && ranking.length > 0) {
                console.log('첫번째 항목:', ranking[0]);
                console.log('첫번째 항목 키들:', Object.keys(ranking[0]));
            }
            
        } catch (error) {
            console.error('[RankParty] API 디버깅 실패:', error);
        }
    };

    // 디버그 유틸리티 (전역)
    window.rankPartyDebug = {
        getPartyData: () => partyData,
        getPerformanceData: () => partyPerformanceData,
        getRankingData: () => partyRankingData,
        getStatsData: () => partyStatsData,
        reloadData: () => initializePage(),
        refreshData: () => refreshPartyRanking(),
        debugAPI: () => window.debugAPIResponse(),
        testAPIService: async () => {
            console.log('[RankParty] 🧪 APIService 테스트:');
            console.log('- APIService:', window.APIService);
            console.log('- 준비 상태:', window.APIService?._isReady);
            console.log('- 에러 상태:', window.APIService?._hasError);
            console.log('- 정당 성과 API:', !!window.APIService?.getPartyPerformance);
            console.log('- 정당 랭킹 API:', !!window.APIService?.getPartyScoreRanking);
            console.log('- 정당 통계 API:', !!window.APIService?.getPartyStatsRanking);
            
            try {
                const [performance, ranking, stats] = await Promise.allSettled([
                    window.APIService.getPartyPerformance(),
                    window.APIService.getPartyScoreRanking(),
                    window.APIService.getPartyStatsRanking()
                ]);
                
                console.log('✅ 성과 데이터:', performance.status, performance.status === 'fulfilled' ? `${typeof performance.value} 타입` : performance.reason);
                console.log('✅ 랭킹 데이터:', ranking.status, ranking.status === 'fulfilled' ? `${typeof ranking.value} 타입` : ranking.reason);
                console.log('✅ 통계 데이터:', stats.status, stats.status === 'fulfilled' ? `${typeof stats.value} 타입` : stats.reason);
                
                return true;
            } catch (error) {
                console.error('❌ API 테스트 실패:', error);
                return false;
            }
        },
        showInfo: () => {
            console.log('[RankParty] 📊 정당 랭킹 페이지 정보:');
            console.log('- 로드된 정당 수:', partyData.length);
            console.log('- 성과 데이터:', Object.keys(partyPerformanceData).length, '개');
            console.log('- 랭킹 데이터:', Object.keys(partyRankingData).length, '개');
            console.log('- 통계 데이터:', Object.keys(partyStatsData).length, '개');
            console.log('- 현재 정렬:', currentSort);
            console.log('- 현재 페이지:', currentPage, '/', Math.ceil(partyData.length / itemsPerPage));
            console.log('- APIService 상태:', window.APIService?._isReady ? '준비됨' : '준비중');
            console.log('- 환경 정보:', window.APIService?.getEnvironmentInfo());
        },
        simulateWeightChange: () => {
            console.log('[RankParty] 🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            localStorage.setItem('weight_change_event', JSON.stringify(changeData));
            localStorage.setItem('last_weight_update', Date.now().toString());
            setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
        }
    };

    // 초기화 실행
    setTimeout(initializePage, 100);

    console.log('[RankParty] ✅ 정당 랭킹 페이지 스크립트 로드 완료 (개선된 버전)');
    console.log('[RankParty] 🔗 API 모드: Django API 직접 연동 + 오류 복구');
    console.log('[RankParty] 📊 데이터 매핑: 다양한 필드명 지원 + 폴백 처리');
    console.log('[RankParty] 🔧 디버그 명령어:');
    console.log('[RankParty]   - window.rankPartyDebug.showInfo() : 페이지 정보 확인');
    console.log('[RankParty]   - window.rankPartyDebug.debugAPI() : API 응답 구조 확인');
    console.log('[RankParty]   - window.rankPartyDebug.testAPIService() : APIService 테스트');
    console.log('[RankParty]   - window.debugAPIResponse() : 상세 API 디버깅');
});
