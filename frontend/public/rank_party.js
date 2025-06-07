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
        const contentElement = document.getElementById('party-ranking-content');
        
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

    // 정당 성과 데이터 로드
    async function fetchPartyPerformanceData() {
        try {
            console.log('[RankParty] 📊 정당 성과 데이터 조회...');
            
            const rawData = await window.APIService.getPartyPerformance();
            
            if (!rawData || !Array.isArray(rawData)) {
                throw new Error('정당 성과 API 응답이 올바르지 않습니다.');
            }
            
            console.log('[RankParty] 📊 원본 정당 성과 데이터:', rawData.length, '건');
            
            // 정당별 성과 데이터 매핑
            const performanceData = {};
            rawData.forEach(party => {
                const partyName = normalizePartyName(party.party);
                if (partyName && partyName !== '정보없음') {
                    performanceData[partyName] = {
                        // === 기본 정보 ===
                        party: partyName,
                        
                        // === 출석 관련 (데이터 매핑에 따름) ===
                        avg_attendance: parseFloat(party.avg_attendance || 0),
                        max_attendance: parseFloat(party.max_attendance || 0),
                        min_attendance: parseFloat(party.min_attendance || 0),
                        std_attendance: parseFloat(party.std_attendance || 0),
                        
                        // === 무효표 및 기권 관련 ===
                        avg_invalid_vote_ratio: parseFloat(party.avg_invalid_vote_ratio || 0),
                        max_invalid_vote_ratio: parseFloat(party.max_invalid_vote_ratio || 0),
                        min_invalid_vote_ratio: parseFloat(party.min_invalid_vote_ratio || 0),
                        std_invalid_vote_ratio: parseFloat(party.std_invalid_vote_ratio || 0),
                        
                        // === 표결 일치 관련 ===
                        avg_vote_match_ratio: parseFloat(party.avg_vote_match_ratio || 0),
                        max_vote_match_ratio: parseFloat(party.max_vote_match_ratio || 0),
                        min_vote_match_ratio: parseFloat(party.min_vote_match_ratio || 0),
                        std_vote_match_ratio: parseFloat(party.std_vote_match_ratio || 0),
                        
                        // === 표결 불일치 관련 ===
                        avg_vote_mismatch_ratio: parseFloat(party.avg_vote_mismatch_ratio || 0),
                        max_vote_mismatch_ratio: parseFloat(party.max_vote_mismatch_ratio || 0),
                        min_vote_mismatch_ratio: parseFloat(party.min_vote_mismatch_ratio || 0),
                        std_vote_mismatch_ratio: parseFloat(party.std_vote_mismatch_ratio || 0),
                        
                        // === 본회의 및 청원 관련 ===
                        bill_pass_sum: parseInt(party.bill_pass_sum || 0),
                        petition_sum: parseInt(party.petition_sum || 0),
                        petition_pass_sum: parseInt(party.petition_pass_sum || 0),
                        
                        // === 위원회 관련 ===
                        committee_leader_count: parseInt(party.committee_leader_count || 0),
                        committee_secretary_count: parseInt(party.committee_secretary_count || 0),
                        
                        // === 총점 (최종 정당 퍼센트) ===
                        avg_total_score: parseFloat(party.avg_total_score || 0),
                        
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
            throw error;
        }
    }

    // 정당 랭킹 데이터 로드
    async function fetchPartyRankingData() {
        try {
            console.log('[RankParty] 🏆 정당 랭킹 데이터 조회...');
            
            const rawData = await window.APIService.getPartyScoreRanking();
            
            if (!rawData || !Array.isArray(rawData)) {
                throw new Error('정당 랭킹 API 응답이 올바르지 않습니다.');
            }
            
            console.log('[RankParty] 🏆 원본 정당 랭킹 데이터:', rawData.length, '건');
            
            // 정당별 랭킹 데이터 매핑
            const rankingData = {};
            rawData.forEach(ranking => {
                const partyName = normalizePartyName(ranking.POLY_NM);
                if (partyName && partyName !== '정보없음') {
                    rankingData[partyName] = {
                        party: partyName,
                        rank: parseInt(ranking.평균실적_순위 || 999), // 순위
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
            throw error;
        }
    }

    // 정당 통계 데이터 로드 (챗봇용)
    async function fetchPartyStatsData() {
        try {
            console.log('[RankParty] 📈 정당 통계 데이터 조회...');
            
            const rawData = await window.APIService.getPartyStatsRanking();
            
            if (!rawData || !Array.isArray(rawData)) {
                console.warn('[RankParty] ⚠️ 정당 통계 데이터가 없거나 형식이 다름');
                return {};
            }
            
            // 정당별 통계 데이터 매핑
            const statsData = {};
            rawData.forEach(stats => {
                const partyName = normalizePartyName(stats.party || stats.POLY_NM);
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

            // 병렬로 데이터 로드 (필수 데이터만)
            const [performanceResult, rankingResult] = await Promise.allSettled([
                fetchPartyPerformanceData(),
                fetchPartyRankingData()
            ]);

            // 선택적 데이터 로드
            const [statsResult] = await Promise.allSettled([
                fetchPartyStatsData()
            ]);

            // 결과 확인
            const results = {
                performance: performanceResult.status === 'fulfilled',
                ranking: rankingResult.status === 'fulfilled',
                stats: statsResult.status === 'fulfilled'
            };

            console.log('[RankParty] 📊 API 로드 결과:', results);

            // 필수 데이터가 하나라도 없으면 오류
            if (!results.performance && !results.ranking) {
                throw new Error('필수 정당 데이터를 로드할 수 없습니다');
            }

            // 정당 목록 생성 (성과 데이터 우선, 없으면 랭킹 데이터)
            const allPartyNames = new Set();
            
            if (results.performance) {
                Object.keys(partyPerformanceData).forEach(name => allPartyNames.add(name));
            }
            if (results.ranking) {
                Object.keys(partyRankingData).forEach(name => allPartyNames.add(name));
            }

            // 정당 데이터 통합
            partyData = Array.from(allPartyNames).map(partyName => {
                const performance = partyPerformanceData[partyName];
                const ranking = partyRankingData[partyName];
                const stats = partyStatsData[partyName];
                
                return {
                    // === 기본 정보 ===
                    name: partyName,
                    party: partyName,
                    
                    // === 순위 정보 ===
                    rank: ranking ? ranking.rank : 999,
                    rankSource: ranking ? 'api' : 'estimated',
                    
                    // === 성과 정보 ===
                    totalScore: performance ? performance.avg_total_score : 0,
                    
                    // === 세부 통계 ===
                    attendanceRate: performance ? performance.avg_attendance : 85,
                    billPassSum: performance ? performance.bill_pass_sum : 0,
                    petitionSum: performance ? performance.petition_sum : 0,
                    petitionPassSum: performance ? performance.petition_pass_sum : 0,
                    chairmanCount: performance ? performance.committee_leader_count : 0,
                    secretaryCount: performance ? performance.committee_secretary_count : 0,
                    
                    // === 투표 관련 ===
                    invalidVoteRatio: performance ? performance.avg_invalid_vote_ratio * 100 : 2,
                    voteMatchRatio: performance ? performance.avg_vote_match_ratio * 100 : 85,
                    voteMismatchRatio: performance ? performance.avg_vote_mismatch_ratio * 100 : 15,
                    
                    // === 통계 상세 정보 (툴팁용) ===
                    attendanceStats: performance ? {
                        avg: performance.avg_attendance,
                        max: performance.max_attendance,
                        min: performance.min_attendance,
                        std: performance.std_attendance
                    } : null,
                    
                    invalidVoteStats: performance ? {
                        avg: performance.avg_invalid_vote_ratio,
                        max: performance.max_invalid_vote_ratio,
                        min: performance.min_invalid_vote_ratio,
                        std: performance.std_invalid_vote_ratio
                    } : null,
                    
                    voteMatchStats: performance ? {
                        avg: performance.avg_vote_match_ratio * 100,
                        max: performance.max_vote_match_ratio * 100,
                        min: performance.min_vote_match_ratio * 100,
                        std: performance.std_vote_match_ratio * 100
                    } : null,
                    
                    voteMismatchStats: performance ? {
                        avg: performance.avg_vote_mismatch_ratio * 100,
                        max: performance.max_vote_mismatch_ratio * 100,
                        min: performance.min_vote_mismatch_ratio * 100,
                        std: performance.std_vote_mismatch_ratio * 100
                    } : null,
                    
                    // === 원본 데이터들 ===
                    _performance: performance,
                    _ranking: ranking,
                    _stats: stats
                };
            }).filter(party => party.name && party.name !== '정보없음');

            // 순위순으로 정렬
            partyData.sort((a, b) => a.rank - b.rank);

            // 데이터가 없는 경우 기본 데이터 사용
            if (partyData.length === 0) {
                partyData = getDefaultPartyData();
                showNotification('기본 데이터를 사용합니다', 'warning');
            }

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
            }
        ];
    }

    // === 🎨 UI 렌더링 함수들 ===

    // 정당 랭킹 테이블 렌더링
    function renderPartyRankingTable() {
        const tableContainer = document.getElementById('party-ranking-table');
        if (!tableContainer) {
            console.error('[RankParty] ❌ 테이블 컨테이너를 찾을 수 없습니다');
            return;
        }

        // 페이지네이션 적용
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = getSortedPartyData().slice(startIndex, endIndex);

        const tableHTML = `
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
                                    <div class="tooltip">
                                        ${party.attendanceStats ? `
                                            평균: ${party.attendanceStats.avg.toFixed(1)}%<br>
                                            최대: ${party.attendanceStats.max.toFixed(1)}%<br>
                                            최소: ${party.attendanceStats.min.toFixed(1)}%<br>
                                            표준편차: ${party.attendanceStats.std.toFixed(1)}%
                                        ` : '상세 정보 없음'}
                                    </div>
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
        `;

        tableContainer.innerHTML = tableHTML;

        // 정렬 이벤트 리스너 추가
        setupSortingListeners();
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
        }
    }

    // 통계 정보 렌더링
    function renderStatistics() {
        const statsContainer = document.getElementById('party-statistics');
        if (!statsContainer) return;

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
    };

    // 디버그 유틸리티 (전역)
    window.rankPartyDebug = {
        getPartyData: () => partyData,
        getPerformanceData: () => partyPerformanceData,
        getRankingData: () => partyRankingData,
        getStatsData: () => partyStatsData,
        reloadData: () => initializePage(),
        refreshData: () => refreshPartyRanking(),
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
                
                console.log('✅ 성과 데이터:', performance.status, performance.status === 'fulfilled' ? performance.value.length + '건' : performance.reason);
                console.log('✅ 랭킹 데이터:', ranking.status, ranking.status === 'fulfilled' ? ranking.value.length + '건' : ranking.reason);
                console.log('✅ 통계 데이터:', stats.status, stats.status === 'fulfilled' ? stats.value.length + '건' : stats.reason);
                
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

    console.log('[RankParty] ✅ 정당 랭킹 페이지 스크립트 로드 완료 (Django API 연동 + 가중치 감지 버전)');
    console.log('[RankParty] 🔗 API 모드: Django API 직접 연동');
    console.log('[RankParty] 📊 데이터 매핑: 새로운 필드 구조 적용');
    console.log('[RankParty] 🔧 디버그 명령어:');
    console.log('[RankParty]   - window.rankPartyDebug.showInfo() : 페이지 정보 확인');
    console.log('[RankParty]   - window.rankPartyDebug.reloadData() : 데이터 새로고침');
    console.log('[RankParty]   - window.rankPartyDebug.testAPIService() : APIService 테스트');
    console.log('[RankParty]   - window.rankPartyDebug.simulateWeightChange() : 가중치 변경 시뮬레이션');
});
