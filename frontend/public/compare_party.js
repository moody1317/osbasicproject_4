document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 정당 비교 페이지 로드 시작 (랭킹 API 통합 + 가중치 감지 버전)');

    // 선택된 정당을 저장할 변수
    let selectedParties = [];
    let partyStats = {}; // 정당별 통계 데이터
    let partyRankings = {}; // 🆕 정당별 랭킹 데이터
    let partyWeightedPerformance = {}; // 🆕 정당별 가중치 성과 데이터 (위원장/간사)
    let isLoading = false;

    // 정당별 브랜드 색상
    const partyData = {
        "더불어민주당": {
            winColor: "#152484",
            loseColor: "#15248480",
            name: "더불어민주당"
        },
        "국민의힘": {
            winColor: "#E61E2B", 
            loseColor: "#E61E2B80",
            name: "국민의힘"
        },
        "조국혁신당": {
            winColor: "#06275E",
            loseColor: "#0073CF",
            name: "조국혁신당"
        },
        "개혁신당": {
            winColor: "#FF7210",
            loseColor: "#FF721080",
            name: "개혁신당"
        },
        "진보당": {
            winColor: "#D6001C",
            loseColor: "#D6001C80",
            name: "진보당"
        },
        "기본소득당": {
            winColor: "#091E3A",
            loseColor: "#00D2C3",
            name: "기본소득당"
        },
        "사회민주당": {
            winColor: "#43A213",
            loseColor: "#F58400",
            name: "사회민주당"
        },
        "무소속": {
            winColor: "#4B5563",
            loseColor: "#9CA3AF",
            name: "무소속"
        }
    };

    // APIService 준비 확인
    function waitForAPIService() {
        return new Promise((resolve) => {
            function checkAPIService() {
                if (window.APIService && window.APIService._isReady) {
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

    // 안전한 알림 표시 함수
    function showNotification(message, type = 'info') {
        if (window.APIService && window.APIService.showNotification) {
            window.APIService.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 에러 메시지 표시
    function showError(message) {
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                background: #ffebee;
                color: #c62828;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
                border: 1px solid #ffcdd2;
            `;
            errorDiv.innerHTML = `
                <h3>오류 발생</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" style="
                    background: #c62828;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">새로고침</button>
            `;
            container.insertBefore(errorDiv, container.firstChild);
        }
        showNotification(message, 'error');
    }

    // 로딩 상태 표시
    function showLoading(show = true) {
        const cards = document.querySelectorAll('.comparison-card');
        cards.forEach(card => {
            if (show) {
                card.style.opacity = '0.6';
                card.style.pointerEvents = 'none';
            } else {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
        });
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

    // 🆕 랭킹 서버에서 정당 순위 데이터 가져오기
    async function fetchPartyRankings() {
        try {
            console.log('🏆 정당 순위 API 호출...');
            
            if (!window.APIService || !window.APIService.getPartyScoreRanking) {
                throw new Error('정당 순위 API 서비스가 준비되지 않았습니다.');
            }
            
            const rankingResponse = await window.APIService.getPartyScoreRanking();
            
            if (!rankingResponse || !rankingResponse.data || !Array.isArray(rankingResponse.data)) {
                throw new Error('정당 순위 API 응답이 올바르지 않습니다.');
            }
            
            // API 데이터 매핑
            const rankings = {};
            rankingResponse.data.forEach(ranking => {
                const partyName = normalizePartyName(ranking.POLY_NM);
                rankings[partyName] = {
                    name: partyName,
                    rank: parseInt(ranking.평균실적_순위) || 999,
                    source: 'ranking_server'
                };
            });
            
            partyRankings = rankings;
            
            console.log(`✅ 정당 순위 데이터 로드 완료: ${Object.keys(rankings).length}개`);
            return rankings;
            
        } catch (error) {
            console.error('❌ 정당 순위 데이터 로드 실패:', error);
            partyRankings = {};
            throw error;
        }
    }

    // 🆕 메인 서버에서 정당 가중치 성과 데이터 가져오기 (위원장/간사)
    async function fetchPartyWeightedPerformance() {
        try {
            console.log('🏛️ 정당 가중치 성과 API 호출...');
            
            if (!window.APIService || !window.APIService.getPartyWeightedPerformance) {
                throw new Error('정당 가중치 성과 API 서비스가 준비되지 않았습니다.');
            }
            
            const performanceResponse = await window.APIService.getPartyWeightedPerformance();
            
            if (!performanceResponse || !Array.isArray(performanceResponse)) {
                throw new Error('정당 가중치 성과 API 응답이 올바르지 않습니다.');
            }
            
            // API 데이터 매핑
            const performances = {};
            performanceResponse.forEach(performance => {
                const partyName = normalizePartyName(performance.party || performance.party_name || performance.정당명);
                performances[partyName] = {
                    name: partyName,
                    committee_leader_count: parseInt(performance.committee_leader_count) || 0,
                    committee_secretary_count: parseInt(performance.committee_secretary_count) || 0,
                    source: 'main_server'
                };
            });
            
            console.log(`✅ 정당 가중치 성과 데이터 로드 완료: ${Object.keys(performances).length}개`);
            return performances;
            
        } catch (error) {
            console.error('❌ 정당 가중치 성과 데이터 로드 실패:', error);
            return {};
        }
    }

    // 🆕 랭킹 서버에서 두 정당 비교 데이터 가져오기
    async function fetchPartyComparison(party1, party2) {
        try {
            console.log(`🆚 정당 비교 API 호출: ${party1} vs ${party2}`);
            
            if (!window.APIService || !window.APIService.compareParties) {
                throw new Error('정당 비교 API 서비스가 준비되지 않았습니다.');
            }
            
            const comparisonResponse = await window.APIService.compareParties(party1, party2);
            
            if (!comparisonResponse || !comparisonResponse.data) {
                console.warn('정당 비교 API 응답이 없음, 기본 비교 로직 사용');
                return null;
            }
            
            console.log(`✅ 정당 비교 데이터 로드 완료: ${party1} vs ${party2}`);
            return comparisonResponse.data;
            
        } catch (error) {
            console.warn(`⚠️ 정당 비교 API 실패, 기본 비교 로직 사용:`, error);
            return null;
        }
    }

    // API에서 정당 목록 가져오기 (APIService 사용)
    async function loadPartyList() {
        try {
            console.log('📋 정당 목록 로드 중...');
            
            // APIService를 통해 의원 정보 가져오기
            const members = await window.APIService.getAllMembers();
            if (!Array.isArray(members)) {
                throw new Error('국회의원 데이터 형식이 올바르지 않습니다');
            }

            // 정당 목록 추출 (중복 제거)
            const parties = [...new Set(members.map(member => 
                normalizePartyName(member.party || member.party_name || member.political_party)
            ))].filter(party => party && party !== '정보없음').sort();

            console.log('✅ 정당 목록 로드 완료:', parties);
            return parties;

        } catch (error) {
            console.error('❌ 정당 목록 로드 실패:', error);
            showNotification('정당 목록 로드 실패', 'error');
            // 폴백으로 기본 정당 목록 반환
            return ["더불어민주당", "국민의힘", "조국혁신당", "개혁신당", "진보당", "기본소득당", "사회민주당", "무소속"];
        }
    }

    // 정당별 통계 계산 (APIService + 랭킹 서버 + 메인 서버 활용)
    async function calculatePartyStats(partyName) {
        try {
            console.log(`📊 ${partyName} 통계 계산 중...`);

            // 1차: 정당 통계 API 직접 호출 시도
            try {
                const partyStatsData = await window.APIService.getPartyStats();
                const partyData = partyStatsData.find(party => 
                    normalizePartyName(party.party || party.party_name) === partyName
                );
                
                if (partyData) {
                    // 🆕 랭킹 데이터와 가중치 성과 데이터 결합
                    const ranking = partyRankings[partyName];
                    const weightedPerformance = partyWeightedPerformance[partyName];
                    const stats = mapAPIDataToStats(partyData, ranking, weightedPerformance);
                    console.log(`✅ ${partyName} 통계 계산 완료 (직접 API + 랭킹 + 성과):`, stats);
                    return stats;
                }
            } catch (apiError) {
                console.log(`⚠️ 정당 통계 API 실패, 대체 방법 사용:`, apiError.message);
            }

            // 2차: 기존 API들을 조합해서 계산
            const [members, partyRanking, memberPerformance] = await Promise.all([
                window.APIService.getAllMembers(),
                window.APIService.getPartyRanking(),
                window.APIService.getMemberPerformance()
            ]);

            // 해당 정당 소속 의원들 필터링
            const partyMembers = members.filter(member => 
                normalizePartyName(member.party || member.party_name || member.political_party) === partyName
            );

            if (partyMembers.length === 0) {
                throw new Error(`${partyName} 소속 의원을 찾을 수 없습니다`);
            }

            // 정당 랭킹에서 해당 정당 정보 찾기
            const partyRankData = partyRanking.find(party => 
                normalizePartyName(party.party || party.party_name) === partyName
            );

            // 🆕 랭킹 데이터와 가중치 성과 데이터 결합
            const ranking = partyRankings[partyName];
            const weightedPerformance = partyWeightedPerformance[partyName];

            // 통계 계산
            const stats = calculateDetailedStats(partyMembers, partyRankData, memberPerformance, ranking, weightedPerformance);
            
            console.log(`✅ ${partyName} 통계 계산 완료 (조합 방식 + 랭킹 + 성과):`, stats);
            return stats;

        } catch (error) {
            console.error(`❌ ${partyName} 통계 계산 실패:`, error);
            showNotification(`${partyName} 정보 로드 실패`, 'error');
            
            // 🆕 랭킹 데이터와 가중치 성과 데이터만이라도 사용
            const ranking = partyRankings[partyName];
            const weightedPerformance = partyWeightedPerformance[partyName];
            return generateSampleStats(ranking, weightedPerformance);
        }
    }

    // 🔄 API 데이터를 내부 통계 형식으로 매핑 (랭킹 + 가중치 성과 데이터 추가)
    function mapAPIDataToStats(partyData, ranking = null, weightedPerformance = null) {
        try {
            // 가결률 계산 (가결 수를 기준으로 임의의 제안 수 대비 비율 계산)
            const estimatedBillCount = Math.max(partyData.bill_pass_sum * 2, 1);
            const billPassRate = (partyData.bill_pass_sum / estimatedBillCount) * 100;

            // 🆕 실제 위원장/간사 데이터 사용 (우선순위: 가중치 성과 API > 기본 API > 폴백)
            const chairmanCount = weightedPerformance?.committee_leader_count 
                || partyData.committee_leader_count 
                || 2;
                
            const secretaryCount = weightedPerformance?.committee_secretary_count 
                || partyData.committee_secretary_count 
                || 5;

            return {
                memberCount: partyData.member_count || 50,
                attendanceRate: partyData.avg_attendance || 85,
                billPassRate: Math.min(billPassRate, 100),
                petitionProposed: partyData.petition_sum || 0,
                petitionPassed: partyData.petition_pass_sum || 0,
                chairmanCount: chairmanCount,
                secretaryCount: secretaryCount,
                invalidVotes: Math.floor((partyData.avg_invalid_vote_ratio || 0.02) * 1000),
                abstentions: Math.floor((partyData.avg_invalid_vote_ratio || 0.02) * 500),
                voteConsistency: Math.floor((partyData.avg_vote_match_ratio || 0.8) * 200),
                voteInconsistency: Math.floor((partyData.avg_vote_mismatch_ratio || 0.15) * 200),
                // 🆕 랭킹 정보 추가
                rank: ranking ? ranking.rank : Math.floor(Math.random() * 8) + 1,
                rankSource: ranking ? ranking.source : 'estimated',
                // 🆕 가중치 성과 정보 추가
                chairmanSource: weightedPerformance ? 'main_server' : 'estimated',
                secretarySource: weightedPerformance ? 'main_server' : 'estimated',
                // 상세 정보 (툴팁용)
                attendanceStats: {
                    avg: partyData.avg_attendance || 85,
                    max: partyData.max_attendance || 95,
                    min: partyData.min_attendance || 75,
                    std: partyData.std_attendance || 5
                },
                invalidVoteStats: {
                    avg: partyData.avg_invalid_vote_ratio || 0.025,
                    max: partyData.max_invalid_vote_ratio || 0.050,
                    min: partyData.min_invalid_vote_ratio || 0.010,
                    std: partyData.std_invalid_vote_ratio || 0.015
                },
                voteMatchStats: {
                    avg: (partyData.avg_vote_match_ratio || 0.8) * 100,
                    max: (partyData.max_vote_match_ratio || 0.95) * 100,
                    min: (partyData.min_vote_match_ratio || 0.7) * 100,
                    std: (partyData.std_vote_match_ratio || 0.05) * 100
                },
                voteMismatchStats: {
                    avg: (partyData.avg_vote_mismatch_ratio || 0.15) * 100,
                    max: (partyData.max_vote_mismatch_ratio || 0.25) * 100,
                    min: (partyData.min_vote_mismatch_ratio || 0.05) * 100,
                    std: (partyData.std_vote_mismatch_ratio || 0.05) * 100
                },
                billPassSum: partyData.bill_pass_sum || 0,
                petitionSum: partyData.petition_sum || 0,
                petitionPassSum: partyData.petition_pass_sum || 0
            };
        } catch (error) {
            console.error('API 데이터 매핑 실패:', error);
            return generateSampleStats(ranking, weightedPerformance);
        }
    }

    // 🔄 상세 통계 계산 (랭킹 + 가중치 성과 데이터 추가)
    function calculateDetailedStats(partyMembers, partyRankData, memberPerformance, ranking = null, weightedPerformance = null) {
        try {
            const memberCount = partyMembers.length;
            
            // 파티 랭킹 데이터가 있으면 사용, 없으면 계산
            let attendanceRate, billPassRate, petitionStats, chairmanCount, secretaryCount;
            
            if (partyRankData) {
                // API 데이터 활용
                attendanceRate = partyRankData.avg_attendance || calculateAttendanceRate(partyMembers, memberPerformance);
                billPassRate = (partyRankData.bill_pass_sum / Math.max(partyRankData.bill_pass_sum * 2, 1)) * 100;
                petitionStats = {
                    proposed: partyRankData.petition_sum || 0,
                    passed: partyRankData.petition_pass_sum || 0
                };
                // 🆕 가중치 성과 데이터 우선 사용
                chairmanCount = weightedPerformance?.committee_leader_count 
                    || partyRankData.committee_leader_count 
                    || calculateChairmanCount(partyMembers);
                secretaryCount = weightedPerformance?.committee_secretary_count 
                    || partyRankData.committee_secretary_count 
                    || calculateSecretaryCount(partyMembers);
            } else {
                // 계산으로 통계 생성
                attendanceRate = calculateAttendanceRate(partyMembers, memberPerformance);
                billPassRate = calculateBillPassRate(partyMembers);
                petitionStats = calculatePetitionStats(partyMembers);
                // 🆕 가중치 성과 데이터 우선 사용
                chairmanCount = weightedPerformance?.committee_leader_count 
                    || calculateChairmanCount(partyMembers);
                secretaryCount = weightedPerformance?.committee_secretary_count 
                    || calculateSecretaryCount(partyMembers);
            }

            const invalidVoteStats = calculateInvalidVoteStats(partyMembers);
            const voteConsistency = calculateVoteConsistency(partyMembers);

            return {
                memberCount: memberCount,
                attendanceRate: attendanceRate,
                billPassRate: billPassRate,
                petitionProposed: petitionStats.proposed,
                petitionPassed: petitionStats.passed,
                chairmanCount: chairmanCount,
                secretaryCount: secretaryCount,
                invalidVotes: invalidVoteStats.invalid,
                abstentions: invalidVoteStats.abstentions,
                voteConsistency: voteConsistency.consistent,
                voteInconsistency: voteConsistency.inconsistent,
                // 🆕 랭킹 정보 추가
                rank: ranking ? ranking.rank : Math.floor(Math.random() * 8) + 1,
                rankSource: ranking ? ranking.source : 'estimated',
                // 🆕 가중치 성과 정보 추가
                chairmanSource: weightedPerformance ? 'main_server' : 'estimated',
                secretarySource: weightedPerformance ? 'main_server' : 'estimated',
                // 상세 정보 (툴팁용)
                attendanceStats: {
                    avg: attendanceRate,
                    max: Math.min(attendanceRate + 5, 100),
                    min: Math.max(attendanceRate - 5, 0),
                    std: 2.5
                },
                invalidVoteStats: {
                    avg: (invalidVoteStats.invalid + invalidVoteStats.abstentions) / memberCount / 100,
                    max: 0.050,
                    min: 0.010,
                    std: 0.015
                },
                voteMatchStats: {
                    avg: (voteConsistency.consistent / (voteConsistency.consistent + voteConsistency.inconsistent)) * 100,
                    max: 95.0,
                    min: 75.0,
                    std: 5.0
                },
                voteMismatchStats: {
                    avg: (voteConsistency.inconsistent / (voteConsistency.consistent + voteConsistency.inconsistent)) * 100,
                    max: 25.0,
                    min: 5.0,
                    std: 5.0
                },
                billPassSum: partyRankData?.bill_pass_sum || Math.floor(billPassRate * 2),
                petitionSum: petitionStats.proposed,
                petitionPassSum: petitionStats.passed
            };

        } catch (error) {
            console.error('상세 통계 계산 실패:', error);
            return generateSampleStats(ranking, weightedPerformance);
        }
    }

    // 출석률 계산
    function calculateAttendanceRate(partyMembers, memberPerformance) {
        try {
            if (!memberPerformance || !Array.isArray(memberPerformance)) {
                return Math.random() * 20 + 75; // 75-95%
            }

            const memberNames = partyMembers.map(m => m.name || m.member_name);
            const partyPerformance = memberPerformance.filter(p => 
                memberNames.includes(p.name || p.member_name)
            );

            if (partyPerformance.length === 0) {
                return Math.random() * 20 + 75;
            }

            const avgAttendance = partyPerformance.reduce((sum, p) => {
                const attendance = p.attendance_rate || p.attendance || 85;
                return sum + (typeof attendance === 'number' ? attendance : 85);
            }, 0) / partyPerformance.length;

            return Math.max(0, Math.min(100, avgAttendance));
        } catch (error) {
            return Math.random() * 20 + 75;
        }
    }

    // 본회의 가결률 계산
    function calculateBillPassRate(partyMembers) {
        try {
            // 정당별 추정 가결률 (실제 법안 데이터 없이 추정)
            const partyEstimates = {
                "더불어민주당": 65,
                "국민의힘": 58,
                "조국혁신당": 45,
                "개혁신당": 42,
                "진보당": 38,
                "기본소득당": 35,
                "사회민주당": 40,
                "무소속": 50
            };

            const partyName = partyMembers[0]?.party || partyMembers[0]?.party_name || "무소속";
            const normalizedName = normalizePartyName(partyName);
            
            return partyEstimates[normalizedName] || (Math.random() * 30 + 40);
        } catch (error) {
            return Math.random() * 30 + 40;
        }
    }

    // 청원 통계 계산
    function calculatePetitionStats(partyMembers) {
        try {
            const memberCount = partyMembers.length;
            const proposed = Math.floor(memberCount * (Math.random() * 3 + 2)); // 2-5건/인
            const passed = Math.floor(proposed * (Math.random() * 0.4 + 0.2)); // 20-60%

            return { proposed, passed };
        } catch (error) {
            return { 
                proposed: Math.floor(Math.random() * 100) + 50,
                passed: Math.floor(Math.random() * 50) + 20
            };
        }
    }

    // 위원장 수 계산
    function calculateChairmanCount(partyMembers) {
        try {
            const chairmen = partyMembers.filter(member => {
                const position = member.position || member.committee_position || member.role || '';
                return position.includes('위원장') || position.includes('의장');
            });

            return chairmen.length || Math.floor(partyMembers.length * 0.1) + 1;
        } catch (error) {
            return Math.floor(Math.random() * 8) + 2;
        }
    }

    // 간사 수 계산
    function calculateSecretaryCount(partyMembers) {
        try {
            const secretaries = partyMembers.filter(member => {
                const position = member.position || member.committee_position || member.role || '';
                return position.includes('간사');
            });

            return secretaries.length || Math.floor(partyMembers.length * 0.2) + 2;
        } catch (error) {
            return Math.floor(Math.random() * 15) + 5;
        }
    }

    // 무효표/기권 계산
    function calculateInvalidVoteStats(partyMembers) {
        try {
            const memberCount = partyMembers.length;
            const estimatedVotes = 300; // 연간 예상 투표 수
            
            const invalid = Math.floor(memberCount * estimatedVotes * (Math.random() * 0.02 + 0.01)); // 1-3%
            const abstentions = Math.floor(memberCount * estimatedVotes * (Math.random() * 0.05 + 0.02)); // 2-7%

            return { invalid, abstentions };
        } catch (error) {
            return { 
                invalid: Math.floor(Math.random() * 20) + 5,
                abstentions: Math.floor(Math.random() * 30) + 10
            };
        }
    }

    // 투표 일치도 계산
    function calculateVoteConsistency(partyMembers) {
        try {
            const totalVotes = 300; // 연간 예상 투표 수
            const consistencyRate = Math.random() * 0.3 + 0.6; // 60-90%
            
            const consistent = Math.floor(totalVotes * consistencyRate);
            const inconsistent = totalVotes - consistent;

            return { consistent, inconsistent };
        } catch (error) {
            return { 
                consistent: Math.floor(Math.random() * 50) + 150,
                inconsistent: Math.floor(Math.random() * 30) + 20
            };
        }
    }

    // 🔄 샘플 통계 생성 (API 실패 시, 랭킹 + 가중치 성과 데이터 포함)
    function generateSampleStats(ranking = null, weightedPerformance = null) {
        const attendanceRate = Math.random() * 20 + 75; // 75-95%
        const billPassRate = Math.random() * 30 + 40; // 40-70%
        const petitionProposed = Math.floor(Math.random() * 100) + 50;
        const petitionPassed = Math.floor(Math.random() * 50) + 20;
        const voteConsistency = Math.floor(Math.random() * 50) + 150;
        const voteInconsistency = Math.floor(Math.random() * 30) + 20;
        
        // 🆕 실제 위원장/간사 데이터 우선 사용
        const chairmanCount = weightedPerformance?.committee_leader_count 
            || Math.floor(Math.random() * 8) + 2;
        const secretaryCount = weightedPerformance?.committee_secretary_count 
            || Math.floor(Math.random() * 15) + 5;
        
        return {
            memberCount: Math.floor(Math.random() * 50) + 20,
            attendanceRate: attendanceRate,
            billPassRate: billPassRate,
            petitionProposed: petitionProposed,
            petitionPassed: petitionPassed,
            chairmanCount: chairmanCount,
            secretaryCount: secretaryCount,
            invalidVotes: Math.floor(Math.random() * 20) + 5,
            abstentions: Math.floor(Math.random() * 30) + 10,
            voteConsistency: voteConsistency,
            voteInconsistency: voteInconsistency,
            // 🆕 랭킹 정보 추가
            rank: ranking ? ranking.rank : Math.floor(Math.random() * 8) + 1,
            rankSource: ranking ? ranking.source : 'estimated',
            // 🆕 가중치 성과 정보 추가
            chairmanSource: weightedPerformance ? 'main_server' : 'estimated',
            secretarySource: weightedPerformance ? 'main_server' : 'estimated',
            // 상세 정보 (툴팁용)
            attendanceStats: {
                avg: attendanceRate,
                max: attendanceRate + 5,
                min: attendanceRate - 5,
                std: 2.5
            },
            invalidVoteStats: {
                avg: 0.025,
                max: 0.050,
                min: 0.010,
                std: 0.015
            },
            voteMatchStats: {
                avg: (voteConsistency / (voteConsistency + voteInconsistency)) * 100,
                max: 95.0,
                min: 75.0,
                std: 5.0
            },
            voteMismatchStats: {
                avg: (voteInconsistency / (voteConsistency + voteInconsistency)) * 100,
                max: 25.0,
                min: 5.0,
                std: 5.0
            },
            billPassSum: Math.floor(billPassRate * 2),
            petitionSum: petitionProposed,
            petitionPassSum: petitionPassed
        };
    }

    // 🔄 두 정당 비교 분석 (랭킹 서버 데이터 우선 사용)
    async function compareParties(party1Stats, party2Stats, party1Name, party2Name) {
        let comparisons = {};
        
        // 🆕 1차: 랭킹 서버의 비교 API 시도
        try {
            const apiComparison = await fetchPartyComparison(party1Name, party2Name);
            if (apiComparison) {
                console.log(`✅ 랭킹 서버 비교 데이터 사용: ${party1Name} vs ${party2Name}`);
                // API 데이터를 우리 형식으로 변환
                comparisons = mapComparisonAPIData(apiComparison);
                return comparisons;
            }
        } catch (error) {
            console.warn('랭킹 서버 비교 API 실패, 기본 비교 로직 사용');
        }
        
        // 2차: 기본 비교 로직
        comparisons.attendance = party1Stats.attendanceRate > party2Stats.attendanceRate ? [true, false] : [false, true];
        comparisons.billPass = party1Stats.billPassRate > party2Stats.billPassRate ? [true, false] : [false, true];
        comparisons.petitionProposed = party1Stats.petitionProposed > party2Stats.petitionProposed ? [true, false] : [false, true];
        comparisons.petitionPassed = party1Stats.petitionPassed > party2Stats.petitionPassed ? [true, false] : [false, true];
        comparisons.chairman = party1Stats.chairmanCount > party2Stats.chairmanCount ? [true, false] : [false, true];
        comparisons.secretary = party1Stats.secretaryCount > party2Stats.secretaryCount ? [true, false] : [false, true];
        
        // 무효표/기권은 적을수록 좋음
        const party1InvalidTotal = party1Stats.invalidVotes + party1Stats.abstentions;
        const party2InvalidTotal = party2Stats.invalidVotes + party2Stats.abstentions;
        comparisons.invalidVotes = party1InvalidTotal < party2InvalidTotal ? [true, false] : [false, true];
        
        comparisons.voteConsistency = party1Stats.voteConsistency > party2Stats.voteConsistency ? [true, false] : [false, true];
        comparisons.voteInconsistency = party1Stats.voteInconsistency < party2Stats.voteInconsistency ? [true, false] : [false, true];

        return comparisons;
    }

    // 🆕 비교 API 데이터를 내부 형식으로 매핑
    function mapComparisonAPIData(apiData) {
        // API 응답 구조에 따른 기본 매핑
        return {
            attendance: [apiData.party1_wins?.attendance || false, apiData.party2_wins?.attendance || false],
            billPass: [apiData.party1_wins?.bill_pass || false, apiData.party2_wins?.bill_pass || false],
            petitionProposed: [apiData.party1_wins?.petition_proposed || false, apiData.party2_wins?.petition_proposed || false],
            petitionPassed: [apiData.party1_wins?.petition_passed || false, apiData.party2_wins?.petition_passed || false],
            chairman: [apiData.party1_wins?.chairman || false, apiData.party2_wins?.chairman || false],
            secretary: [apiData.party1_wins?.secretary || false, apiData.party2_wins?.secretary || false],
            invalidVotes: [apiData.party1_wins?.invalid_votes || false, apiData.party2_wins?.invalid_votes || false],
            voteConsistency: [apiData.party1_wins?.vote_consistency || false, apiData.party2_wins?.vote_consistency || false],
            voteInconsistency: [apiData.party1_wins?.vote_inconsistency || false, apiData.party2_wins?.vote_inconsistency || false]
        };
    }

    // 🔄 정당 카드 업데이트 (랭킹 정보 추가)
    function updatePartyCard(cardIndex, partyName, stats, comparisons = null) {
        const cards = document.querySelectorAll('.comparison-card');
        if (cardIndex >= cards.length) return;

        const card = cards[cardIndex];
        const statusItems = card.querySelectorAll('.status-item');

        // 🆕 실시간 순위 표시
        const rankDisplay = stats.rankSource === 'ranking_server' 
            ? `${stats.rank}위 <span style="font-size: 12px; color: #888;">(실시간)</span>`
            : `${stats.rank}위 <span style="font-size: 12px; color: #888;">(추정)</span>`;

        // 각 항목 업데이트
        const updates = [
            { // 현재 순위
                value: rankDisplay,
                winLose: null,
                isHTML: true // HTML 내용 포함
            },
            { // 출석
                value: `${stats.attendanceRate.toFixed(1)}%`,
                winLose: comparisons ? (comparisons.attendance[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `출석 평균: ${stats.attendanceStats?.avg?.toFixed(1) || stats.attendanceRate.toFixed(1)}%<br>
                         출석 최대: ${stats.attendanceStats?.max?.toFixed(1) || (stats.attendanceRate + 5).toFixed(1)}%<br>
                         출석 최소: ${stats.attendanceStats?.min?.toFixed(1) || (stats.attendanceRate - 5).toFixed(1)}%<br>
                         표준편차: ${stats.attendanceStats?.std?.toFixed(1) || '2.5'}%`
            },
            { // 본회의 가결
                value: `${stats.billPassRate.toFixed(1)}%`,
                winLose: comparisons ? (comparisons.billPass[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `본회의 가결 수 (bill_pass_sum): ${stats.billPassSum || 0}건<br>
                         가결률: ${stats.billPassRate.toFixed(1)}%`
            },
            { // 청원 제안
                value: `${stats.petitionProposed}건`,
                winLose: comparisons ? (comparisons.petitionProposed[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `청원 제안 수 (petition_sum): ${stats.petitionSum || stats.petitionProposed || 0}건<br>
                         채택률: ${stats.petitionProposed > 0 ? ((stats.petitionPassed / stats.petitionProposed) * 100).toFixed(1) : '0.0'}%`
            },
            { // 청원 결과
                value: `${stats.petitionPassed}건`,
                winLose: comparisons ? (comparisons.petitionPassed[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `청원 결과 수 (petition_pass_sum): ${stats.petitionPassSum || stats.petitionPassed || 0}건<br>
                         부결: ${(stats.petitionProposed || 0) - (stats.petitionPassed || 0)}건<br>
                         가결률: ${stats.petitionProposed > 0 ? ((stats.petitionPassed / stats.petitionProposed) * 100).toFixed(1) : '0.0'}%`
            },
            { // 위원장
                value: `${stats.chairmanCount}명`,
                winLose: comparisons ? (comparisons.chairman[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `위원장 수: ${stats.chairmanCount}명<br>
                         데이터 출처: ${stats.chairmanSource === 'main_server' ? '실시간 API' : '추정값'}`
            },
            { // 간사
                value: `${stats.secretaryCount}명`,
                winLose: comparisons ? (comparisons.secretary[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `간사 수: ${stats.secretaryCount}명<br>
                         데이터 출처: ${stats.secretarySource === 'main_server' ? '실시간 API' : '추정값'}`
            },
            { // 무효표 및 기권
                value: `${(stats.invalidVotes + stats.abstentions)}건`,
                winLose: comparisons ? (comparisons.invalidVotes[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `무효표/기권 평균: ${stats.invalidVoteStats?.avg?.toFixed(3) || '0.025'}%<br>
                         최대: ${stats.invalidVoteStats?.max?.toFixed(3) || '0.050'}%<br>
                         최소: ${stats.invalidVoteStats?.min?.toFixed(3) || '0.010'}%<br>
                         표준편차: ${stats.invalidVoteStats?.std?.toFixed(3) || '0.015'}%`
            },
            { // 투표 결과 일치
                value: `${stats.voteConsistency}건`,
                winLose: comparisons ? (comparisons.voteConsistency[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `일치 평균: ${stats.voteMatchStats?.avg?.toFixed(1) || '85.0'}%<br>
                         최대: ${stats.voteMatchStats?.max?.toFixed(1) || '95.0'}%<br>
                         최소: ${stats.voteMatchStats?.min?.toFixed(1) || '75.0'}%<br>
                         표준편차: ${stats.voteMatchStats?.std?.toFixed(1) || '5.0'}%`
            },
            { // 투표 결과 불일치
                value: `${stats.voteInconsistency}건`,
                winLose: comparisons ? (comparisons.voteInconsistency[cardIndex] ? 'WIN' : 'LOSE') : null,
                tooltip: `불일치 평균: ${stats.voteMismatchStats?.avg?.toFixed(1) || '15.0'}%<br>
                         최대: ${stats.voteMismatchStats?.max?.toFixed(1) || '25.0'}%<br>
                         최소: ${stats.voteMismatchStats?.min?.toFixed(1) || '5.0'}%<br>
                         표준편차: ${stats.voteMismatchStats?.std?.toFixed(1) || '5.0'}%`
            }
        ];

        // 상태 항목들 업데이트 (첫 번째 제목 제외)
        updates.forEach((update, index) => {
            if (index + 1 < statusItems.length) {
                const statusItem = statusItems[index + 1];
                const statusValue = statusItem.querySelector('.status-value');
                const tooltip = statusItem.querySelector('.tooltip');

                if (statusValue) {
                    // WIN/LOSE 표시
                    if (update.winLose) {
                        const percentage = update.value;
                        if (update.isHTML) {
                            statusValue.innerHTML = `${update.winLose}(${percentage})`;
                        } else {
                            statusValue.innerHTML = `${update.winLose}(${percentage})`;
                        }
                        statusValue.className = `status-value ${update.winLose.toLowerCase()}`;
                    } else {
                        if (update.isHTML) {
                            statusValue.innerHTML = update.value;
                        } else {
                            statusValue.innerHTML = update.value;
                        }
                        statusValue.className = 'status-value';
                    }

                    // 정당 색상 적용
                    if (partyData[partyName]) {
                        if (update.winLose === 'WIN') {
                            statusValue.style.color = partyData[partyName].winColor;
                        } else if (update.winLose === 'LOSE') {
                            statusValue.style.color = partyData[partyName].loseColor;
                        }
                    }
                }

                // 툴팁 업데이트
                if (tooltip && update.tooltip) {
                    tooltip.innerHTML = update.tooltip;
                }
            }
        });

        // 🆕 랭킹 데이터 표시 로그
        console.log(`✅ ${partyName} 카드 업데이트 완료 (순위: ${stats.rank}위, 출처: ${stats.rankSource})`);
    }

    // 드롭다운 옵션 업데이트
    async function updateDropdownOptions() {
        try {
            const parties = await loadPartyList();
            const dropdowns = document.querySelectorAll('select.party-dropdown');

            dropdowns.forEach(dropdown => {
                // 기존 옵션 제거 (첫 번째 "정당 선택" 옵션 제외)
                while (dropdown.children.length > 1) {
                    dropdown.removeChild(dropdown.lastChild);
                }

                // API에서 가져온 정당 목록 추가
                parties.forEach(party => {
                    const option = document.createElement('option');
                    option.value = party;
                    option.textContent = party;
                    dropdown.appendChild(option);
                });
            });

            console.log('✅ 드롭다운 옵션 업데이트 완료');
        } catch (error) {
            console.error('❌ 드롭다운 옵션 업데이트 실패:', error);
        }
    }

    // 드롭다운 이벤트 핸들러 설정
    function setupDropdownHandlers() {
        const dropdowns = document.querySelectorAll('select.party-dropdown');
        
        dropdowns.forEach((dropdown, index) => {
            dropdown.addEventListener('change', async function() {
                const selectedParty = this.value;
                console.log(`정당 선택 (카드 ${index + 1}):`, selectedParty);
                
                // 이미 선택된 정당인지 확인
                if (selectedParties.includes(selectedParty) && selectedParty !== "") {
                    showNotification("이미 다른 칸에서 선택된 정당입니다", 'warning');
                    this.value = selectedParties[index] || ""; // 이전 값으로 복원
                    return;
                }
                
                // 선택된 정당 업데이트
                selectedParties[index] = selectedParty;
                
                // 다른 드롭다운에서 이미 선택된 정당 비활성화
                updateDropdownAvailability(dropdowns, index);
                
                if (selectedParty) {
                    // 정당 통계 로드 및 표시
                    showLoading(true);
                    
                    try {
                        const stats = await calculatePartyStats(selectedParty);
                        partyStats[selectedParty] = stats;
                        
                        // 두 정당이 모두 선택되었으면 비교 수행
                        if (selectedParties[0] && selectedParties[1]) {
                            const comparisons = await compareParties(
                                partyStats[selectedParties[0]], 
                                partyStats[selectedParties[1]], 
                                selectedParties[0], 
                                selectedParties[1]
                            );
                            updatePartyCard(0, selectedParties[0], partyStats[selectedParties[0]], comparisons);
                            updatePartyCard(1, selectedParties[1], partyStats[selectedParties[1]], comparisons);
                        } else {
                            updatePartyCard(index, selectedParty, stats);
                        }
                        
                        showNotification(`${selectedParty} 정보 로드 완료`, 'success');
                        
                    } catch (error) {
                        console.error(`❌ ${selectedParty} 정보 로드 실패:`, error);
                        showNotification(`${selectedParty} 정보 로드 실패`, 'error');
                    } finally {
                        showLoading(false);
                    }
                } else {
                    // 선택 해제 시 카드 리셋
                    resetPartyCard(index);
                }
            });
        });
        
        console.log('✅ 드롭다운 이벤트 핸들러 설정 완료');
    }

    // 드롭다운 사용 가능성 업데이트
    function updateDropdownAvailability(dropdowns, changedIndex) {
        dropdowns.forEach((otherDropdown, otherIndex) => {
            if (otherIndex !== changedIndex) {
                Array.from(otherDropdown.options).forEach(option => {
                    if (selectedParties.includes(option.value) && option.value !== selectedParties[otherIndex] && option.value !== "") {
                        option.disabled = true;
                    } else {
                        option.disabled = false;
                    }
                });
            }
        });
    }

    // 정당 카드 리셋
    function resetPartyCard(cardIndex) {
        const cards = document.querySelectorAll('.comparison-card');
        if (cardIndex >= cards.length) return;

        const card = cards[cardIndex];
        const statusItems = card.querySelectorAll('.status-item');

        // 각 항목을 기본값으로 리셋
        const resetValues = [
            '00위', // 현재 순위
            'WIN(00%)', // 출석
            'LOSE(00%)', // 본회의 가결
            'WIN(00%)', // 청원 제안
            'LOSE(00%)', // 청원 결과
            '00명', // 위원장
            '00명', // 간사
            'WIN(00%)', // 무효표 및 기권
            'WIN(00%)', // 투표 결과 일치
            'LOSE(00%)' // 투표 결과 불일치
        ];

        resetValues.forEach((resetValue, index) => {
            if (index + 1 < statusItems.length) {
                const statusValue = statusItems[index + 1].querySelector('.status-value');
                if (statusValue) {
                    statusValue.textContent = resetValue;
                    statusValue.className = 'status-value';
                    statusValue.style.color = '';
                }
            }
        });
    }

    // 🔄 데이터 새로고침 (가중치 변경 시 사용)
    async function refreshPartyComparison() {
        try {
            console.log('🔄 정당 비교 새로고침...');
            showLoading(true);
            
            // 랭킹 데이터와 가중치 성과 데이터 다시 로드
            await Promise.all([
                fetchPartyRankings(),
                fetchPartyWeightedPerformance().then(data => {
                    partyWeightedPerformance = data;
                })
            ]);
            
            // 선택된 정당들의 통계 다시 계산
            const refreshPromises = selectedParties.map(async (partyName, index) => {
                if (partyName) {
                    const stats = await calculatePartyStats(partyName);
                    partyStats[partyName] = stats;
                    return { partyName, stats, index };
                }
                return null;
            }).filter(Boolean);
            
            const refreshedParties = await Promise.all(refreshPromises);
            
            // 비교 데이터 업데이트
            if (selectedParties[0] && selectedParties[1]) {
                const comparisons = await compareParties(
                    partyStats[selectedParties[0]], 
                    partyStats[selectedParties[1]], 
                    selectedParties[0], 
                    selectedParties[1]
                );
                
                refreshedParties.forEach(({ partyName, stats, index }) => {
                    updatePartyCard(index, partyName, stats, comparisons);
                });
            } else {
                refreshedParties.forEach(({ partyName, stats, index }) => {
                    updatePartyCard(index, partyName, stats);
                });
            }
            
            showNotification('정당 비교 데이터가 업데이트되었습니다', 'success');
            
        } catch (error) {
            console.error('❌ 새로고침 실패:', error);
            showNotification('데이터 새로고침에 실패했습니다', 'error');
        } finally {
            showLoading(false);
        }
    }

    // 🔄 페이지 데이터 새로고침 (WeightSync 호환)
    async function loadPartyComparisonData() {
        return await refreshPartyComparison();
    }

    // === 🔄 가중치 변경 실시간 업데이트 시스템 ===
    
    // 가중치 변경 감지 및 자동 새로고침
    function setupWeightChangeListener() {
        try {
            console.log('[CompareParty] 🔄 가중치 변경 감지 시스템 설정...');
            
            // 1. localStorage 이벤트 감지 (다른 페이지에서 가중치 변경 시)
            window.addEventListener('storage', function(event) {
                if (event.key === 'weight_change_event' && event.newValue) {
                    try {
                        const changeData = JSON.parse(event.newValue);
                        console.log('[CompareParty] 📢 가중치 변경 감지:', changeData);
                        handleWeightUpdate(changeData, 'localStorage');
                    } catch (e) {
                        console.warn('[CompareParty] 가중치 변경 데이터 파싱 실패:', e);
                    }
                }
            });
            
            // 2. BroadcastChannel 감지 (최신 브라우저)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const weightChannel = new BroadcastChannel('weight_updates');
                    weightChannel.addEventListener('message', function(event) {
                        console.log('[CompareParty] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                        handleWeightUpdate(event.data, 'BroadcastChannel');
                    });
                    
                    // 페이지 언로드 시 채널 정리
                    window.addEventListener('beforeunload', () => {
                        weightChannel.close();
                    });
                    
                    console.log('[CompareParty] ✅ BroadcastChannel 설정 완료');
                } catch (e) {
                    console.warn('[CompareParty] BroadcastChannel 설정 실패:', e);
                }
            }
            
            // 3. 커스텀 이벤트 감지 (같은 페이지 내)
            document.addEventListener('weightSettingsChanged', function(event) {
                console.log('[CompareParty] 🎯 커스텀 이벤트 가중치 변경 감지:', event.detail);
                handleWeightUpdate(event.detail, 'customEvent');
            });
            
            // 4. 주기적 체크 (폴백)
            let lastWeightCheckTime = localStorage.getItem('last_weight_update') || '0';
            setInterval(function() {
                const currentCheckTime = localStorage.getItem('last_weight_update') || '0';
                
                if (currentCheckTime !== lastWeightCheckTime && currentCheckTime !== '0') {
                    console.log('[CompareParty] ⏰ 주기적 체크로 가중치 변경 감지');
                    lastWeightCheckTime = currentCheckTime;
                    
                    const changeData = {
                        type: 'weights_updated',
                        timestamp: new Date(parseInt(currentCheckTime)).toISOString(),
                        source: 'periodic_check'
                    };
                    
                    handleWeightUpdate(changeData, 'periodicCheck');
                }
            }, 5000);
            
            console.log('[CompareParty] ✅ 가중치 변경 감지 시스템 설정 완료');
            
        } catch (error) {
            console.error('[CompareParty] ❌ 가중치 변경 감지 시스템 설정 실패:', error);
        }
    }
    
    // 가중치 업데이트 처리 함수
    async function handleWeightUpdate(changeData, source) {
        try {
            if (isLoading) {
                console.log('[CompareParty] 🔄 이미 로딩 중이므로 가중치 업데이트 스킵');
                return;
            }
            
            console.log(`[CompareParty] 🔄 가중치 업데이트 처리 시작 (${source})`);
            
            // 사용자에게 업데이트 알림
            showNotification('가중치가 변경되었습니다. 정당 비교 데이터를 새로고침합니다...', 'info');
            
            // 현재 선택된 정당들 정보 백업
            const currentSelections = selectedParties.map((partyName, index) => {
                if (partyName) {
                    return { partyName, cardIndex: index };
                }
                return null;
            }).filter(selection => selection !== null);
            
            // 1초 딜레이 후 데이터 새로고침 (서버에서 가중치 처리 시간 고려)
            setTimeout(async () => {
                try {
                    // 새로운 데이터로 업데이트
                    await refreshPartyComparison();
                    
                    console.log('[CompareParty] ✅ 가중치 업데이트 완료');
                    showNotification('새로운 가중치가 정당 비교에 적용되었습니다! 🎉', 'success');
                    
                    // 응답 전송 (percent 페이지 모니터링용)
                    try {
                        const response = {
                            page: 'compare_party.html',
                            timestamp: new Date().toISOString(),
                            success: true,
                            source: source,
                            restoredSelections: currentSelections.length
                        };
                        localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                        setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
                    } catch (e) {
                        console.warn('[CompareParty] 응답 전송 실패:', e);
                    }
                    
                } catch (error) {
                    console.error('[CompareParty] ❌ 가중치 업데이트 데이터 로드 실패:', error);
                    showNotification('가중치 업데이트에 실패했습니다. 다시 시도해주세요.', 'error');
                }
            }, 1000);
            
        } catch (error) {
            console.error('[CompareParty] ❌ 가중치 업데이트 처리 실패:', error);
            showNotification('가중치 업데이트 처리에 실패했습니다.', 'error');
        }
    }
    
    // 수동 새로고침 함수들 (외부에서 호출 가능)
    window.refreshPartyComparisonData = function() {
        console.log('[CompareParty] 🔄 수동 새로고침 요청');
        refreshPartyComparison();
    };
    
    window.updatePartyComparisonData = function(newData) {
        console.log('[CompareParty] 📊 외부 데이터로 업데이트:', newData);
        
        if (newData && Array.isArray(newData)) {
            // 새로운 데이터로 정당 통계 재계산
            selectedParties.forEach(async (partyName, index) => {
                if (partyName) {
                    const stats = await calculatePartyStats(partyName);
                    partyStats[partyName] = stats;
                    updatePartyCard(index, partyName, stats);
                }
            });
            showNotification('정당 비교 데이터가 업데이트되었습니다', 'success');
        }
    };

    // 페이지 초기화
    async function initializePage() {
        console.log('🚀 정당 비교 페이지 초기화 중...');
        
        try {
            showLoading(true);
            
            // APIService 준비 대기
            await waitForAPIService();
            
            // 🆕 랭킹 데이터와 가중치 성과 데이터 우선 로드
            try {
                await Promise.all([
                    fetchPartyRankings(),
                    fetchPartyWeightedPerformance().then(data => {
                        partyWeightedPerformance = data;
                        console.log('✅ 메인 서버 연결 성공');
                    })
                ]);
                console.log('✅ 모든 서버 연결 성공');
            } catch (error) {
                console.warn('⚠️ 일부 서버 연결 실패, 기본 로직 사용');
            }
            
            // 드롭다운 옵션 업데이트
            await updateDropdownOptions();
            
            // 이벤트 핸들러 설정
            setupDropdownHandlers();
            
            // 🆕 가중치 변경 감지 시스템 설정
            setupWeightChangeListener();
            
            showNotification('정당 비교 페이지 로드 완료', 'success');
            console.log('✅ 정당 비교 페이지 초기화 완료');
            
        } catch (error) {
            console.error('❌ 페이지 초기화 오류:', error);
            showError('페이지 로드 중 오류가 발생했습니다');
        } finally {
            showLoading(false);
        }
    }

    // 🔧 디버그 유틸리티 (전역)
    window.comparePartyDebug = {
        getSelectedParties: () => selectedParties,
        getPartyStats: () => partyStats,
        getPartyRankings: () => partyRankings, // 🆕
        getPartyWeightedPerformance: () => partyWeightedPerformance, // 🆕
        reloadData: () => initializePage(),
        refreshData: () => refreshPartyComparison(), // 🆕 WeightSync 호환
        testPartyStats: (partyName) => calculatePartyStats(partyName),
        testPartyComparison: (party1, party2) => fetchPartyComparison(party1, party2), // 🆕
        testWeightedPerformance: () => fetchPartyWeightedPerformance(), // 🆕
        showPartyList: () => loadPartyList(),
        testAPIService: () => {
            console.log('🧪 APIService 테스트:');
            console.log('- APIService:', window.APIService);
            console.log('- 준비 상태:', window.APIService?._isReady);
            console.log('- 에러 상태:', window.APIService?._hasError);
            console.log('- 랭킹 서버:', !!window.APIService?.getPartyScoreRanking); // 🆕
            console.log('- 비교 API:', !!window.APIService?.compareParties); // 🆕
            console.log('- 가중치 성과 API:', !!window.APIService?.getPartyWeightedPerformance); // 🆕
            return window.APIService;
        },
        clearSelection: () => {
            selectedParties = [];
            partyStats = {};
            const dropdowns = document.querySelectorAll('select.party-dropdown');
            dropdowns.forEach(dropdown => dropdown.value = '');
            const cards = document.querySelectorAll('.comparison-card');
            cards.forEach((card, index) => resetPartyCard(index));
        },
        showInfo: () => {
            console.log('📊 정당 비교 페이지 정보:');
            console.log('- 선택된 정당:', selectedParties);
            console.log('- 정당 통계:', partyStats);
            console.log('- 정당 랭킹:', partyRankings); // 🆕
            console.log('- 정당 가중치 성과:', partyWeightedPerformance); // 🆕
            console.log('- APIService 상태:', window.APIService?._isReady ? '준비됨' : '준비중');
            console.log('- 랭킹 서버 상태:', Object.keys(partyRankings).length > 0 ? '연결됨' : '미연결'); // 🆕
            console.log('- 메인 서버 상태:', Object.keys(partyWeightedPerformance).length > 0 ? '연결됨' : '미연결'); // 🆕
            console.log('- 환경 정보:', window.APIService?.getEnvironmentInfo());
        },
        // 🆕 가중치 변경 시뮬레이션 테스트
        simulateWeightChange: () => {
            console.log('🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            handleWeightUpdate(changeData, 'debug');
        }
    };

    // 초기화 실행
    setTimeout(initializePage, 100);

    console.log('✅ 정당 비교 페이지 스크립트 로드 완료 (멀티 API 통합 + 가중치 감지 버전)');
    console.log('🔗 API 모드: APIService + 랭킹 서버 + 메인 서버 통합 사용');
    console.log('🔧 디버그 명령어:');
    console.log('  - window.comparePartyDebug.showInfo() : 페이지 정보 확인');
    console.log('  - window.comparePartyDebug.reloadData() : 데이터 새로고침');
    console.log('  - window.comparePartyDebug.refreshData() : 랭킹 데이터 새로고침');
    console.log('  - window.comparePartyDebug.clearSelection() : 선택 초기화');
    console.log('  - window.comparePartyDebug.testAPIService() : APIService 연결 테스트');
    console.log('  - window.comparePartyDebug.testPartyComparison("정당1", "정당2") : 비교 API 테스트');
    console.log('  - window.comparePartyDebug.testWeightedPerformance() : 가중치 성과 API 테스트');
    console.log('  - window.comparePartyDebug.simulateWeightChange() : 가중치 변경 시뮬레이션');
});
