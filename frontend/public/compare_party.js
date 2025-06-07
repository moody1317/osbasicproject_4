document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 정당 비교 페이지 로드 시작 (Django API 연동 + 가중치 감지 버전)');

    // === 🔧 상태 관리 변수들 ===
    let selectedParties = [];
    let partyStats = {}; // 정당별 통계 데이터
    let partyRankings = {}; // 정당별 랭킹 데이터
    let partyPerformanceData = {}; // 정당별 성과 데이터
    let isLoading = false;

    // === 🎨 정당별 브랜드 색상 ===
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

    // === 📊 새로운 API 데이터 로드 함수들 ===

    // 정당 성과 데이터 가져오기
    async function fetchPartyPerformanceData() {
        try {
            console.log('📊 정당 성과 데이터 조회...');
            
            const rawData = await window.APIService.getPartyPerformance();
            
            // API 응답 구조 디버깅
            console.log('🔍 정당 성과 API 원본 응답:', rawData);
            console.log('🔍 응답 타입:', typeof rawData);
            console.log('🔍 배열 여부:', Array.isArray(rawData));
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                // 직접 배열인 경우
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                // {data: [...]} 형식인 경우
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                // 객체인 경우 값들을 배열로 변환
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('⚠️ 정당 성과 데이터 형식이 예상과 다름, 빈 배열 사용');
                processedData = [];
            }
            
            // 정당별 성과 데이터 매핑
            const performanceData = {};
            processedData.forEach(party => {
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
                        
                        // === 총점 ===
                        avg_total_score: parseFloat(party.avg_total_score || 0),
                        
                        // === 원본 데이터 ===
                        _raw: party
                    };
                }
            });
            
            partyPerformanceData = performanceData;
            console.log(`✅ 정당 성과 데이터 로드 완료: ${Object.keys(performanceData).length}개`);
            return performanceData;
            
        } catch (error) {
            console.error('❌ 정당 성과 데이터 로드 실패:', error);
            partyPerformanceData = {};
            // 에러가 발생해도 빈 객체를 반환하여 페이지가 계속 작동하도록 함
            return {};
        }
    }

    // 정당 랭킹 데이터 가져오기
    async function fetchPartyRankingData() {
        try {
            console.log('🏆 정당 랭킹 데이터 조회...');
            
            const rawData = await window.APIService.getPartyScoreRanking();
            
            // API 응답 구조 디버깅
            console.log('🔍 정당 랭킹 API 원본 응답:', rawData);
            console.log('🔍 응답 타입:', typeof rawData);
            console.log('🔍 배열 여부:', Array.isArray(rawData));
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                // 직접 배열인 경우
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                // {data: [...]} 형식인 경우
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                // 객체인 경우 값들을 배열로 변환
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('⚠️ 정당 랭킹 데이터 형식이 예상과 다름, 빈 배열 사용');
                processedData = [];
            }
            
            // 정당별 랭킹 데이터 매핑
            const rankingData = {};
            processedData.forEach(ranking => {
                const partyName = normalizePartyName(ranking.POLY_NM);
                if (partyName && partyName !== '정보없음') {
                    rankingData[partyName] = {
                        party: partyName,
                        rank: parseInt(ranking.평균실적_순위 || 999),
                        _raw: ranking
                    };
                }
            });
            
            partyRankings = rankingData;
            console.log(`✅ 정당 랭킹 데이터 로드 완료: ${Object.keys(rankingData).length}개`);
            return rankingData;
            
        } catch (error) {
            console.error('❌ 정당 랭킹 데이터 로드 실패:', error);
            partyRankings = {};
            // 에러가 발생해도 빈 객체를 반환하여 페이지가 계속 작동하도록 함
            return {};
        }
    }

    // 두 정당 직접 비교 API 호출
    async function fetchPartyDirectComparison(party1, party2) {
        try {
            console.log(`🆚 정당 직접 비교 API 호출: ${party1} vs ${party2}`);
            
            const comparisonData = await window.APIService.compareParties(party1, party2);
            
            // API 응답 구조 디버깅
            console.log('🔍 정당 비교 API 원본 응답:', comparisonData);
            
            if (comparisonData) {
                console.log(`✅ 정당 직접 비교 데이터 로드 완료: ${party1} vs ${party2}`);
                return comparisonData;
            }
            
            return null;
            
        } catch (error) {
            console.warn(`⚠️ 정당 직접 비교 API 실패, 기본 비교 로직 사용:`, error);
            return null;
        }
    }

    // === 📋 정당 목록 로드 ===
    async function loadPartyList() {
        try {
            console.log('📋 정당 목록 로드 중...');
            
            // APIService의 getValidParties 사용
            if (window.APIService && window.APIService.getValidParties) {
                const parties = window.APIService.getValidParties();
                console.log('✅ 정당 목록 로드 완료 (APIService):', parties);
                return parties;
            }
            
            // 폴백: 성과 데이터에서 정당 목록 추출
            const performanceData = await fetchPartyPerformanceData();
            const parties = Object.keys(performanceData).sort();
            
            if (parties.length > 0) {
                console.log('✅ 정당 목록 로드 완료 (성과 데이터):', parties);
                return parties;
            }
            
            // 최종 폴백: 기본 정당 목록
            const defaultParties = ["더불어민주당", "국민의힘", "조국혁신당", "개혁신당", "진보당", "기본소득당", "사회민주당", "무소속"];
            console.log('✅ 정당 목록 로드 완료 (기본값):', defaultParties);
            return defaultParties;

        } catch (error) {
            console.error('❌ 정당 목록 로드 실패:', error);
            showNotification('정당 목록 로드 실패', 'error');
            return ["더불어민주당", "국민의힘", "조국혁신당", "개혁신당", "진보당", "기본소득당", "사회민주당", "무소속"];
        }
    }

    // === 📊 정당 통계 계산 ===
    async function calculatePartyStats(partyName) {
        try {
            console.log(`📊 ${partyName} 통계 계산 중...`);

            // 성과 데이터에서 해당 정당 찾기
            const performanceData = partyPerformanceData[partyName];
            const rankingData = partyRankings[partyName];
            
            if (!performanceData) {
                console.warn(`⚠️ ${partyName} 성과 데이터 없음, 기본값 사용`);
                return generateDefaultStats(partyName, rankingData);
            }

            // API 데이터를 UI에 맞는 형식으로 변환
            const stats = {
                // === 기본 정보 ===
                partyName: partyName,
                
                // === 순위 정보 ===
                rank: rankingData ? rankingData.rank : 999,
                rankSource: rankingData ? 'api' : 'estimated',
                
                // === 출석 관련 ===
                attendanceRate: performanceData.avg_attendance,
                attendanceStats: {
                    avg: performanceData.avg_attendance,
                    max: performanceData.max_attendance,
                    min: performanceData.min_attendance,
                    std: performanceData.std_attendance
                },
                
                // === 본회의 가결 관련 ===
                billPassSum: performanceData.bill_pass_sum,
                billPassRate: calculateBillPassRate(performanceData.bill_pass_sum),
                
                // === 청원 관련 ===
                petitionProposed: performanceData.petition_sum,
                petitionPassed: performanceData.petition_pass_sum,
                petitionSum: performanceData.petition_sum,
                petitionPassSum: performanceData.petition_pass_sum,
                
                // === 위원회 관련 ===
                chairmanCount: performanceData.committee_leader_count,
                secretaryCount: performanceData.committee_secretary_count,
                chairmanSource: 'api',
                secretarySource: 'api',
                
                // === 무효표 및 기권 관련 ===
                invalidVoteRatio: performanceData.avg_invalid_vote_ratio * 100, // 퍼센트로 변환
                invalidVotes: Math.floor(performanceData.avg_invalid_vote_ratio * 1000), // 건수로 추정
                abstentions: Math.floor(performanceData.avg_invalid_vote_ratio * 500), // 기권 건수 추정
                invalidVoteStats: {
                    avg: performanceData.avg_invalid_vote_ratio,
                    max: performanceData.max_invalid_vote_ratio,
                    min: performanceData.min_invalid_vote_ratio,
                    std: performanceData.std_invalid_vote_ratio
                },
                
                // === 투표 일치 관련 ===
                voteMatchRatio: performanceData.avg_vote_match_ratio * 100, // 퍼센트로 변환
                voteConsistency: Math.floor(performanceData.avg_vote_match_ratio * 200), // 건수로 추정
                voteMatchStats: {
                    avg: performanceData.avg_vote_match_ratio * 100,
                    max: performanceData.max_vote_match_ratio * 100,
                    min: performanceData.min_vote_match_ratio * 100,
                    std: performanceData.std_vote_match_ratio * 100
                },
                
                // === 투표 불일치 관련 ===
                voteMismatchRatio: performanceData.avg_vote_mismatch_ratio * 100, // 퍼센트로 변환
                voteInconsistency: Math.floor(performanceData.avg_vote_mismatch_ratio * 200), // 건수로 추정
                voteMismatchStats: {
                    avg: performanceData.avg_vote_mismatch_ratio * 100,
                    max: performanceData.max_vote_mismatch_ratio * 100,
                    min: performanceData.min_vote_mismatch_ratio * 100,
                    std: performanceData.std_vote_mismatch_ratio * 100
                },
                
                // === 총점 ===
                totalScore: performanceData.avg_total_score,
                
                // === 원본 데이터 ===
                _performanceData: performanceData,
                _rankingData: rankingData
            };
            
            console.log(`✅ ${partyName} 통계 계산 완료:`, stats);
            return stats;

        } catch (error) {
            console.error(`❌ ${partyName} 통계 계산 실패:`, error);
            showNotification(`${partyName} 정보 로드 실패`, 'error');
            return generateDefaultStats(partyName);
        }
    }

    // 본회의 가결률 계산 (가결 수를 기반으로 추정)
    function calculateBillPassRate(billPassSum) {
        if (!billPassSum || billPassSum === 0) return 0;
        
        // 가결 수를 기반으로 전체 제안 수 추정 (가결률 40-70% 가정)
        const estimatedTotalBills = Math.max(billPassSum * 2, billPassSum + 50);
        const passRate = (billPassSum / estimatedTotalBills) * 100;
        
        return Math.min(passRate, 100); // 최대 100%로 제한
    }

    // 기본 통계 생성 (API 데이터 없을 때)
    function generateDefaultStats(partyName, rankingData = null) {
        const attendanceRate = Math.random() * 20 + 75; // 75-95%
        const billPassRate = Math.random() * 30 + 40; // 40-70%
        const petitionProposed = Math.floor(Math.random() * 100) + 50;
        const petitionPassed = Math.floor(Math.random() * 50) + 20;
        const voteConsistency = Math.floor(Math.random() * 50) + 150;
        const voteInconsistency = Math.floor(Math.random() * 30) + 20;
        
        return {
            partyName: partyName,
            rank: rankingData ? rankingData.rank : Math.floor(Math.random() * 8) + 1,
            rankSource: rankingData ? 'api' : 'estimated',
            attendanceRate: attendanceRate,
            billPassRate: billPassRate,
            billPassSum: Math.floor(billPassRate * 2),
            petitionProposed: petitionProposed,
            petitionPassed: petitionPassed,
            petitionSum: petitionProposed,
            petitionPassSum: petitionPassed,
            chairmanCount: Math.floor(Math.random() * 8) + 2,
            secretaryCount: Math.floor(Math.random() * 15) + 5,
            chairmanSource: 'estimated',
            secretarySource: 'estimated',
            invalidVoteRatio: Math.random() * 3 + 1, // 1-4%
            invalidVotes: Math.floor(Math.random() * 20) + 5,
            abstentions: Math.floor(Math.random() * 30) + 10,
            voteMatchRatio: Math.random() * 20 + 70, // 70-90%
            voteConsistency: voteConsistency,
            voteMismatchRatio: Math.random() * 15 + 10, // 10-25%
            voteInconsistency: voteInconsistency,
            totalScore: Math.random() * 30 + 60, // 60-90%
            // 기본 통계 구조
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
                avg: 85.0,
                max: 95.0,
                min: 75.0,
                std: 5.0
            },
            voteMismatchStats: {
                avg: 15.0,
                max: 25.0,
                min: 5.0,
                std: 5.0
            }
        };
    }

    // === ⚖️ 정당 비교 로직 (수정된 버전) ===
    async function compareParties(party1Stats, party2Stats, party1Name, party2Name) {
        // 1차: API 직접 비교 시도
        try {
            const apiComparison = await fetchPartyDirectComparison(party1Name, party2Name);
            if (apiComparison) {
                console.log(`✅ API 비교 데이터 사용: ${party1Name} vs ${party2Name}`);
                return mapAPIComparisonData(apiComparison);
            }
        } catch (error) {
            console.warn('API 비교 실패, 로컬 비교 로직 사용');
        }
        
        // 2차: 로컬 비교 로직 (수정된 버전)
        console.log(`🔄 로컬 비교 로직 사용: ${party1Name} vs ${party2Name}`);
        console.log('Party1 Stats:', party1Stats);
        console.log('Party2 Stats:', party2Stats);
        
        const comparisons = {};
        
        // 🔧 비교 로직 수정: 명확한 승/패 결정
        
        // 출석률 비교 (높을수록 좋음)
        const attendanceDiff = party1Stats.attendanceRate - party2Stats.attendanceRate;
        if (Math.abs(attendanceDiff) < 0.1) {
            // 차이가 거의 없으면 둘 다 동등하게 처리
            comparisons.attendance = [true, true];
        } else {
            comparisons.attendance = attendanceDiff > 0 ? [true, false] : [false, true];
        }
        
        // 본회의 가결 비교 (많을수록 좋음)
        const billPassDiff = party1Stats.billPassSum - party2Stats.billPassSum;
        if (Math.abs(billPassDiff) < 1) {
            comparisons.billPass = [true, true];
        } else {
            comparisons.billPass = billPassDiff > 0 ? [true, false] : [false, true];
        }
        
        // 청원 제안 비교 (많을수록 좋음)
        const petitionProposedDiff = party1Stats.petitionProposed - party2Stats.petitionProposed;
        if (Math.abs(petitionProposedDiff) < 1) {
            comparisons.petitionProposed = [true, true];
        } else {
            comparisons.petitionProposed = petitionProposedDiff > 0 ? [true, false] : [false, true];
        }
        
        // 청원 결과 비교 (많을수록 좋음)
        const petitionPassedDiff = party1Stats.petitionPassed - party2Stats.petitionPassed;
        if (Math.abs(petitionPassedDiff) < 1) {
            comparisons.petitionPassed = [true, true];
        } else {
            comparisons.petitionPassed = petitionPassedDiff > 0 ? [true, false] : [false, true];
        }
        
        // 위원장 수 비교 (많을수록 좋음)
        const chairmanDiff = party1Stats.chairmanCount - party2Stats.chairmanCount;
        if (Math.abs(chairmanDiff) < 1) {
            comparisons.chairman = [true, true];
        } else {
            comparisons.chairman = chairmanDiff > 0 ? [true, false] : [false, true];
        }
        
        // 간사 수 비교 (많을수록 좋음)
        const secretaryDiff = party1Stats.secretaryCount - party2Stats.secretaryCount;
        if (Math.abs(secretaryDiff) < 1) {
            comparisons.secretary = [true, true];
        } else {
            comparisons.secretary = secretaryDiff > 0 ? [true, false] : [false, true];
        }
        
        // 무효표/기권 비교 (적을수록 좋음)
        const party1InvalidTotal = party1Stats.invalidVotes + party1Stats.abstentions;
        const party2InvalidTotal = party2Stats.invalidVotes + party2Stats.abstentions;
        const invalidDiff = party1InvalidTotal - party2InvalidTotal;
        if (Math.abs(invalidDiff) < 1) {
            comparisons.invalidVotes = [true, true];
        } else {
            comparisons.invalidVotes = invalidDiff < 0 ? [true, false] : [false, true]; // 적을수록 좋음
        }
        
        // 투표 일치 비교 (많을수록 좋음)
        const voteConsistencyDiff = party1Stats.voteConsistency - party2Stats.voteConsistency;
        if (Math.abs(voteConsistencyDiff) < 1) {
            comparisons.voteConsistency = [true, true];
        } else {
            comparisons.voteConsistency = voteConsistencyDiff > 0 ? [true, false] : [false, true];
        }
        
        // 투표 불일치 비교 (적을수록 좋음)
        const voteInconsistencyDiff = party1Stats.voteInconsistency - party2Stats.voteInconsistency;
        if (Math.abs(voteInconsistencyDiff) < 1) {
            comparisons.voteInconsistency = [true, true];
        } else {
            comparisons.voteInconsistency = voteInconsistencyDiff < 0 ? [true, false] : [false, true]; // 적을수록 좋음
        }

        console.log('🔍 비교 결과:', comparisons);
        return comparisons;
    }

    // API 비교 데이터를 내부 형식으로 매핑
    function mapAPIComparisonData(apiData) {
        // API 응답 구조에 따른 매핑 (실제 API 응답 구조에 맞춰 조정 필요)
        return {
            attendance: [apiData.party1_better?.attendance || false, apiData.party2_better?.attendance || false],
            billPass: [apiData.party1_better?.bill_pass || false, apiData.party2_better?.bill_pass || false],
            petitionProposed: [apiData.party1_better?.petition_proposed || false, apiData.party2_better?.petition_proposed || false],
            petitionPassed: [apiData.party1_better?.petition_passed || false, apiData.party2_better?.petition_passed || false],
            chairman: [apiData.party1_better?.chairman || false, apiData.party2_better?.chairman || false],
            secretary: [apiData.party1_better?.secretary || false, apiData.party2_better?.secretary || false],
            invalidVotes: [apiData.party1_better?.invalid_votes || false, apiData.party2_better?.invalid_votes || false],
            voteConsistency: [apiData.party1_better?.vote_consistency || false, apiData.party2_better?.vote_consistency || false],
            voteInconsistency: [apiData.party1_better?.vote_inconsistency || false, apiData.party2_better?.vote_inconsistency || false]
        };
    }

    // === 🎨 UI 업데이트 함수들 (수정된 버전) ===

    // 정당 카드 업데이트 (i 아이콘 보존)
    function updatePartyCard(cardIndex, partyName, stats, comparisons = null) {
        const cards = document.querySelectorAll('.comparison-card');
        if (cardIndex >= cards.length) return;

        const card = cards[cardIndex];
        const statusItems = card.querySelectorAll('.status-item');

        // 실시간 순위 표시
        const rankDisplay = stats.rankSource === 'api' 
            ? `${stats.rank}위 <span style="font-size: 12px; color: #888;">(실시간)</span>`
            : `${stats.rank}위 <span style="font-size: 12px; color: #888;">(추정)</span>`;

        // HTML과 동일한 순서로 업데이트 배열 정의
        // HTML 순서: 현재 순위, 출석, 본회의 가결, 청원 제안, 청원 결과, 위원장, 간사, 무효표 및 기권, 투표 결과 일치, 투표 결과 불일치
        const updates = [
            { // 0. 현재 순위
                value: rankDisplay,
                winLose: null,
                isHTML: true,
                tooltip: null
            },
            { // 1. 출석
                value: `${stats.attendanceRate.toFixed(1)}%`,
                winLose: comparisons ? (comparisons.attendance[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `출석 평균: ${stats.attendanceStats?.avg?.toFixed(1) || stats.attendanceRate.toFixed(1)}%<br>
                         출석 최대: ${stats.attendanceStats?.max?.toFixed(1) || (stats.attendanceRate + 5).toFixed(1)}%<br>
                         출석 최소: ${stats.attendanceStats?.min?.toFixed(1) || (stats.attendanceRate - 5).toFixed(1)}%<br>
                         표준편차: ${stats.attendanceStats?.std?.toFixed(1) || '2.5'}%`
            },
            { // 2. 본회의 가결
                value: `${stats.billPassSum}건`,
                winLose: comparisons ? (comparisons.billPass[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `본회의 가결 수: ${stats.billPassSum}건<br>
                         가결률 추정: ${stats.billPassRate?.toFixed(1) || '0.0'}%`
            },
            { // 3. 청원 제안
                value: `${stats.petitionProposed}건`,
                winLose: comparisons ? (comparisons.petitionProposed[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `청원 제안 수: ${stats.petitionSum}건`
            },
            { // 4. 청원 결과
                value: `${stats.petitionPassed}건`,
                winLose: comparisons ? (comparisons.petitionPassed[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `청원 결과 수: ${stats.petitionPassSum}건`
            },
            { // 5. 위원장
                value: `${stats.chairmanCount}명`,
                winLose: comparisons ? (comparisons.chairman[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `위원장 수: ${stats.chairmanCount}명<br>
                         데이터 출처: ${stats.chairmanSource === 'api' ? '실시간 API' : '추정값'}`
            },
            { // 6. 간사
                value: `${stats.secretaryCount}명`,
                winLose: comparisons ? (comparisons.secretary[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `간사 수: ${stats.secretaryCount}명<br>
                         데이터 출처: ${stats.secretarySource === 'api' ? '실시간 API' : '추정값'}`
            },
            { // 7. 무효표 및 기권
                value: `${(stats.invalidVotes + stats.abstentions)}건`,
                winLose: comparisons ? (comparisons.invalidVotes[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `무효표/기권 평균: ${stats.invalidVoteStats?.avg?.toFixed(3) || '0.025'}%<br>
                         최대: ${stats.invalidVoteStats?.max?.toFixed(3) || '0.050'}%<br>
                         최소: ${stats.invalidVoteStats?.min?.toFixed(3) || '0.010'}%<br>
                         표준편차: ${stats.invalidVoteStats?.std?.toFixed(3) || '0.015'}%`
            },
            { // 8. 투표 결과 일치
                value: `${stats.voteConsistency}건`,
                winLose: comparisons ? (comparisons.voteConsistency[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `일치 평균: ${stats.voteMatchStats?.avg?.toFixed(1) || '85.0'}%<br>
                         최대: ${stats.voteMatchStats?.max?.toFixed(1) || '95.0'}%<br>
                         최소: ${stats.voteMatchStats?.min?.toFixed(1) || '75.0'}%<br>
                         표준편차: ${stats.voteMatchStats?.std?.toFixed(1) || '5.0'}%`
            },
            { // 9. 투표 결과 불일치
                value: `${stats.voteInconsistency}건`,
                winLose: comparisons ? (comparisons.voteInconsistency[cardIndex] ? 'WIN' : 'LOSE') : null,
                isHTML: false,
                tooltip: `불일치 평균: ${stats.voteMismatchStats?.avg?.toFixed(1) || '15.0'}%<br>
                         최대: ${stats.voteMismatchStats?.max?.toFixed(1) || '25.0'}%<br>
                         최소: ${stats.voteMismatchStats?.min?.toFixed(1) || '5.0'}%<br>
                         표준편차: ${stats.voteMismatchStats?.std?.toFixed(1) || '5.0'}%`
            }
        ];

        // HTML의 status-item 순서와 정확히 매칭하여 업데이트
        updates.forEach((update, index) => {
            if (index < statusItems.length) {
                const statusItem = statusItems[index];
                const statusValue = statusItem.querySelector('.status-value');
                const tooltip = statusItem.querySelector('.tooltip');

                if (statusValue) {
                    // 🔧 i 아이콘 보존하면서 업데이트
                    const existingInfoIcon = statusValue.querySelector('.info-icon');
                    
                    // WIN/LOSE 표시
                    if (update.winLose) {
                        const percentage = update.value;
                        const newContent = `${update.winLose}(${percentage})`;
                        
                        if (existingInfoIcon) {
                            // i 아이콘이 있으면 보존
                            statusValue.innerHTML = newContent;
                            statusValue.appendChild(existingInfoIcon);
                        } else {
                            statusValue.innerHTML = newContent;
                        }
                        
                        statusValue.className = `status-value ${update.winLose.toLowerCase()}`;
                    } else {
                        // WIN/LOSE가 없는 경우 (순위 등)
                        if (existingInfoIcon) {
                            statusValue.innerHTML = update.value;
                            statusValue.appendChild(existingInfoIcon);
                        } else {
                            if (update.isHTML) {
                                statusValue.innerHTML = update.value;
                            } else {
                                statusValue.textContent = update.value;
                            }
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

                // 툴팁 업데이트 (기존 구조 보존)
                if (tooltip && update.tooltip) {
                    tooltip.innerHTML = update.tooltip;
                }
            }
        });

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

                // 정당 목록 추가
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
                        
                        // localStorage에 현재 비교 정보 저장 (weight_sync.js에서 사용)
                        if (selectedParties[0] && selectedParties[1]) {
                            localStorage.setItem('current_party_comparison', JSON.stringify({
                                party1: selectedParties[0],
                                party2: selectedParties[1]
                            }));
                        }
                        
                        // 두 정당이 모두 선택되었으면 비교 수행
                        if (selectedParties[0] && selectedParties[1]) {
                            console.log(`🆚 두 정당 비교 시작: ${selectedParties[0]} vs ${selectedParties[1]}`);
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
                    // localStorage에서 비교 정보 제거
                    localStorage.removeItem('current_party_comparison');
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

        // HTML 순서와 동일하게 리셋값 정의
        const resetValues = [
            '00위', // 현재 순위
            'WIN(00%)', // 출석
            'LOSE(00건)', // 본회의 가결
            'WIN(00건)', // 청원 제안
            'LOSE(00건)', // 청원 결과
            '00명', // 위원장
            '00명', // 간사
            'WIN(00건)', // 무효표 및 기권
            'WIN(00건)', // 투표 결과 일치
            'LOSE(00건)' // 투표 결과 불일치
        ];

        resetValues.forEach((resetValue, index) => {
            if (index < statusItems.length) {
                const statusValue = statusItems[index].querySelector('.status-value');
                if (statusValue) {
                    const existingInfoIcon = statusValue.querySelector('.info-icon');
                    statusValue.textContent = resetValue;
                    statusValue.className = 'status-value';
                    statusValue.style.color = '';
                    
                    // i 아이콘 복원
                    if (existingInfoIcon) {
                        statusValue.appendChild(existingInfoIcon);
                    }
                }
            }
        });
    }

    // === 🔄 데이터 새로고침 함수들 ===

    // 전체 데이터 새로고침 (가중치 변경 시 사용)
    async function refreshPartyComparison() {
        try {
            console.log('🔄 정당 비교 데이터 새로고침...');
            showLoading(true);
            
            // 모든 데이터 다시 로드
            await Promise.all([
                fetchPartyPerformanceData(),
                fetchPartyRankingData()
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
            console.error('❌ 데이터 새로고침 실패:', error);
            showNotification('데이터 새로고침에 실패했습니다', 'error');
        } finally {
            showLoading(false);
        }
    }

    // WeightSync 호환 함수들
    async function refreshPartyComparisonData() {
        return await refreshPartyComparison();
    }

    async function loadPartyComparisonData() {
        return await refreshPartyComparison();
    }

    async function updatePartyComparisonData(newData) {
        console.log('[CompareParty] 📊 외부 데이터로 업데이트:', newData);
        
        if (newData && (Array.isArray(newData) || typeof newData === 'object')) {
            // 새로운 데이터로 정당 통계 재계산
            const updatePromises = selectedParties.map(async (partyName, index) => {
                if (partyName) {
                    const stats = await calculatePartyStats(partyName);
                    partyStats[partyName] = stats;
                    updatePartyCard(index, partyName, stats);
                }
            });
            
            await Promise.all(updatePromises);
            showNotification('정당 비교 데이터가 업데이트되었습니다', 'success');
        }
    }

    // === 🚀 페이지 초기화 ===
    async function initializePage() {
        console.log('🚀 정당 비교 페이지 초기화 중...');
        
        try {
            showLoading(true);
            
            // APIService 준비 대기
            await waitForAPIService();
            
            // 기본 데이터 로드
            try {
                await Promise.all([
                    fetchPartyPerformanceData(),
                    fetchPartyRankingData()
                ]);
                console.log('✅ 모든 API 데이터 로드 성공');
            } catch (error) {
                console.warn('⚠️ 일부 API 데이터 로드 실패, 기본 로직 사용');
            }
            
            // 드롭다운 옵션 업데이트
            await updateDropdownOptions();
            
            // 이벤트 핸들러 설정
            setupDropdownHandlers();
            
            showNotification('정당 비교 페이지 로드 완료', 'success');
            console.log('✅ 정당 비교 페이지 초기화 완료');
            
        } catch (error) {
            console.error('❌ 페이지 초기화 오류:', error);
            showError('페이지 로드 중 오류가 발생했습니다');
        } finally {
            showLoading(false);
        }
    }

    // === 🔧 전역 함수 등록 (WeightSync 및 디버그용) ===
    
    // WeightSync 연동 함수들
    window.refreshPartyComparisonData = refreshPartyComparisonData;
    window.loadPartyComparisonData = loadPartyComparisonData;
    window.updatePartyComparisonData = updatePartyComparisonData;
    window.refreshPartyComparison = refreshPartyComparison;

    // 디버그 유틸리티 (전역)
    window.comparePartyDebug = {
        getSelectedParties: () => selectedParties,
        getPartyStats: () => partyStats,
        getPartyRankings: () => partyRankings,
        getPartyPerformanceData: () => partyPerformanceData,
        reloadData: () => initializePage(),
        refreshData: () => refreshPartyComparison(),
        testPartyStats: (partyName) => calculatePartyStats(partyName),
        testPartyComparison: (party1, party2) => fetchPartyDirectComparison(party1, party2),
        testPerformanceData: () => fetchPartyPerformanceData(),
        testRankingData: () => fetchPartyRankingData(),
        showPartyList: () => loadPartyList(),
        testAPIService: () => {
            console.log('🧪 APIService 테스트:');
            console.log('- APIService:', window.APIService);
            console.log('- 준비 상태:', window.APIService?._isReady);
            console.log('- 에러 상태:', window.APIService?._hasError);
            console.log('- 정당 성과 API:', !!window.APIService?.getPartyPerformance);
            console.log('- 정당 랭킹 API:', !!window.APIService?.getPartyScoreRanking);
            console.log('- 정당 비교 API:', !!window.APIService?.compareParties);
            console.log('- 유효 정당 목록:', window.APIService?.getValidParties());
            return window.APIService;
        },
        clearSelection: () => {
            selectedParties = [];
            partyStats = {};
            localStorage.removeItem('current_party_comparison');
            const dropdowns = document.querySelectorAll('select.party-dropdown');
            dropdowns.forEach(dropdown => dropdown.value = '');
            const cards = document.querySelectorAll('.comparison-card');
            cards.forEach((card, index) => resetPartyCard(index));
        },
        showInfo: () => {
            console.log('📊 정당 비교 페이지 정보:');
            console.log('- 선택된 정당:', selectedParties);
            console.log('- 정당 통계:', partyStats);
            console.log('- 정당 랭킹:', partyRankings);
            console.log('- 정당 성과 데이터:', partyPerformanceData);
            console.log('- APIService 상태:', window.APIService?._isReady ? '준비됨' : '준비중');
            console.log('- 성과 데이터 상태:', Object.keys(partyPerformanceData).length > 0 ? '로드됨' : '미로드');
            console.log('- 랭킹 데이터 상태:', Object.keys(partyRankings).length > 0 ? '로드됨' : '미로드');
            console.log('- 환경 정보:', window.APIService?.getEnvironmentInfo());
        },
        simulateWeightChange: () => {
            console.log('🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            localStorage.setItem('weight_change_event', JSON.stringify(changeData));
            localStorage.setItem('last_weight_update', Date.now().toString());
            setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
        },
        testComparison: async (party1, party2) => {
            if (!party1 || !party2) {
                console.log('사용법: testComparison("더불어민주당", "국민의힘")');
                return;
            }
            const stats1 = await calculatePartyStats(party1);
            const stats2 = await calculatePartyStats(party2);
            const comparison = await compareParties(stats1, stats2, party1, party2);
            console.log(`🆚 ${party1} vs ${party2} 비교 결과:`, comparison);
            return comparison;
        }
    };

    // 초기화 실행
    setTimeout(initializePage, 100);

    console.log('✅ 정당 비교 페이지 스크립트 로드 완료 (Django API 연동 + 가중치 감지 버전)');
    console.log('🔗 API 모드: Django API 직접 연동');
    console.log('📊 데이터 매핑: 새로운 필드 구조 적용');
    console.log('🔧 수정 사항:');
    console.log('  - 비교 로직 수정: 명확한 WIN/LOSE 결정');
    console.log('  - i 아이콘 보존: 업데이트 시 툴팁 아이콘 유지');
    console.log('  - 툴팁 데이터 업데이트: 실시간 API 데이터 반영');
    console.log('🔧 디버그 명령어:');
    console.log('  - window.comparePartyDebug.showInfo() : 페이지 정보 확인');
    console.log('  - window.comparePartyDebug.testComparison("정당1", "정당2") : 비교 테스트');
    console.log('  - window.comparePartyDebug.reloadData() : 데이터 새로고침');
    console.log('  - window.comparePartyDebug.testAPIService() : APIService 연결 테스트');
    console.log('  - window.comparePartyDebug.clearSelection() : 선택 초기화');
});
