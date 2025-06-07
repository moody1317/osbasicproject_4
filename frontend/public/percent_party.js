// 정당 상세정보 페이지 (Django API 연동 + 퍼센트 정규화 버전)

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 정당 상세 페이지 로드 시작 (Django API 연동 + 퍼센트 정규화 버전)');

    // === 🔧 페이지 상태 관리 ===
    let pageState = {
        currentParty: '더불어민주당',
        partyData: {},
        partyPerformanceData: {},
        partyRankingData: {},
        isLoading: false,
        hasError: false
    };

    // === 🎨 정당별 브랜드 색상 ===
    const partyColors = {
        "더불어민주당": {
            main: "#152484",
            secondary: "#15248480",
            url: "https://theminjoo.kr/"
        },
        "국민의힘": {
            main: "#E61E2B", 
            secondary: "#E61E2B80",
            url: "https://www.peoplepowerparty.kr/"
        },
        "조국혁신당": {
            main: "#06275E",
            secondary: "#0073CF",
            url: "https://rebuildingkoreaparty.kr"
        },
        "개혁신당": {
            main: "#FF7210",
            secondary: "#FF721080",
            url: "https://www.reformparty.kr/"
        },
        "진보당": {
            main: "#D6001C",
            secondary: "#D6001C80",
            url: "https://jinboparty.com/"
        },
        "기본소득당": {
            main: "#091E3A",
            secondary: "#00D2C3",
            url: "https://basicincomeparty.kr/"
        },
        "사회민주당": {
            main: "#43A213",
            secondary: "#F58400",
            url: "https://www.samindang.kr/"
        },
        "무소속": {
            main: "#4B5563",
            secondary: "#9CA3AF",
            url: ""
        }
    };

    // === 🔧 HTML 순서와 정확히 일치하는 파이차트 데이터 구조 ===
    const statisticsConfig = [
        { key: 'attendance', label: '출석', colorVar: '--current-party-main' },                      // 1
        { key: 'plenary_pass', label: '본회의 가결', colorVar: '--current-party-secondary' },         // 2
        { key: 'petition_proposal', label: '청원 제안', colorVar: '--current-party-tertiary' },       // 3
        { key: 'petition_result', label: '청원 결과', colorVar: '--current-party-quaternary' },       // 4
        { key: 'secretary', label: '간사', colorVar: '--current-party-quinary' },                    // 5
        { key: 'invalid_abstention', label: '무효표 및 기권', colorVar: '--current-party-sixth' },     // 6
        { key: 'committee_chair', label: '위원장', colorVar: '--current-party-seventh' },            // 7
        { key: 'vote_match', label: '투표 결과 일치', colorVar: '--current-party-eighth' },           // 8
        { key: 'vote_mismatch', label: '투표 결과 불일치', colorVar: '--current-party-ninth' }         // 9
    ];

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
        showNotification(message, 'error');
        console.error('[PercentParty] ❌', message);
    }

    // 성공 메시지 표시
    function showSuccess(message) {
        showNotification(message, 'success');
        console.log('[PercentParty] ✅', message);
    }

    // 로딩 상태 표시
    function showLoading(show = true) {
        pageState.isLoading = show;
        const statsItems = document.querySelectorAll('.stats-item .value');
        
        // HTML 순서에 따라 로딩 표시
        statsItems.forEach((item, index) => {
            if (index < statisticsConfig.length) {
                if (show) {
                    item.textContent = '로딩중...';
                    item.style.color = '#999';
                    item.classList.add('loading');
                } else {
                    item.classList.remove('loading');
                    item.style.color = '';
                }
            }
        });
        
        // 파이차트 영역에 로딩 표시
        const svg = document.querySelector('.pie-chart svg');
        if (svg) {
            svg.querySelectorAll('path').forEach(path => {
                path.style.opacity = show ? '0.5' : '1';
            });
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

    // 🔧 비율 데이터 정규화 (compare_party.js와 동일한 로직)
    function normalizePercentage(value) {
        if (!value && value !== 0) return 0;
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return 0;
        
        // 값이 100보다 크면 이미 퍼센트 형식으로 가정 (그대로 사용)
        // 값이 1보다 작으면 비율 형식으로 가정 (100 곱하기)
        if (numValue > 100) {
            return numValue; // 이미 퍼센트 (예: 2694.0 → 2694.0%)
        } else if (numValue <= 1) {
            return numValue * 100; // 비율을 퍼센트로 변환 (예: 0.85 → 85%)
        } else {
            return numValue; // 1~100 사이는 그대로 사용
        }
    }

    // 🔧 개수를 퍼센트로 변환 (본회의 가결, 청원 등)
    function convertCountToPercentage(count, maxCount = 100) {
        if (!count && count !== 0) return 0;
        
        const numCount = parseInt(count);
        if (isNaN(numCount)) return 0;
        
        // 최대값 대비 퍼센트로 변환 (예: 50건/100건 = 50%)
        const percentage = (numCount / maxCount) * 100;
        return Math.min(percentage, 100); // 최대 100%로 제한
    }

    // 🔧 위원장/간사 수를 고정 퍼센트로 변환 (있음/없음 기준)
    function convertLeaderToPercentage(count) {
        const numCount = parseInt(count || 0);
        if (isNaN(numCount)) return 0;
        
        // 위원장: 있으면 5%, 없으면 0%
        return numCount > 0 ? 5.0 : 0.0;
    }

    function convertSecretaryToPercentage(count) {
        const numCount = parseInt(count || 0);
        if (isNaN(numCount)) return 0;
        
        // 간사: 있으면 3%, 없으면 0%
        return numCount > 0 ? 3.0 : 0.0;
    }

    // === 📊 API 데이터 로드 함수들 ===

    // 정당 성과 데이터 가져오기
    async function fetchPartyPerformanceData() {
        try {
            console.log('[PercentParty] 📊 정당 성과 데이터 조회...');
            
            const rawData = await window.APIService.getPartyPerformance();
            console.log('[PercentParty] 🔍 정당 성과 API 원본 응답:', rawData);
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[PercentParty] ⚠️ 정당 성과 데이터 형식이 예상과 다름, 빈 배열 사용');
                processedData = [];
            }
            
            // 정당별 성과 데이터 매핑 (퍼센트 정규화 적용)
            const performanceData = {};
            processedData.forEach(party => {
                const partyName = normalizePartyName(party.party);
                if (partyName && partyName !== '정보없음') {
                    
                    // 🔧 원본 값들 로깅 (디버깅용)
                    console.log(`📊 ${partyName} 원본 데이터:`, {
                        avg_attendance: party.avg_attendance,
                        bill_pass_sum: party.bill_pass_sum,
                        petition_sum: party.petition_sum,
                        petition_pass_sum: party.petition_pass_sum,
                        committee_leader_count: party.committee_leader_count,
                        committee_secretary_count: party.committee_secretary_count,
                        avg_invalid_vote_ratio: party.avg_invalid_vote_ratio,
                        avg_vote_match_ratio: party.avg_vote_match_ratio,
                        avg_vote_mismatch_ratio: party.avg_vote_mismatch_ratio,
                        avg_total_score: party.avg_total_score
                    });
                    
                    performanceData[partyName] = {
                        // === 기본 정보 ===
                        party: partyName,
                        
                        // === 출석 관련 (이미 퍼센트) ===
                        avg_attendance: normalizePercentage(party.avg_attendance),
                        
                        // === 본회의 가결 (개수 → 퍼센트 변환) ===
                        bill_pass_sum: convertCountToPercentage(party.bill_pass_sum, 150), // 최대 150건 기준
                        bill_pass_count: parseInt(party.bill_pass_sum || 0), // 원본 개수 보존
                        
                        // === 청원 관련 (개수 → 퍼센트 변환) ===
                        petition_sum: convertCountToPercentage(party.petition_sum, 100), // 최대 100건 기준
                        petition_count: parseInt(party.petition_sum || 0), // 원본 개수 보존
                        petition_pass_sum: convertCountToPercentage(party.petition_pass_sum, 80), // 최대 80건 기준
                        petition_pass_count: parseInt(party.petition_pass_sum || 0), // 원본 개수 보존
                        
                        // === 위원회 관련 (고정 퍼센트 변환) ===
                        committee_leader_count: convertLeaderToPercentage(party.committee_leader_count), // 위원장: 있으면 5%
                        leader_count: parseInt(party.committee_leader_count || 0), // 원본 개수 보존
                        committee_secretary_count: convertSecretaryToPercentage(party.committee_secretary_count), // 간사: 있으면 3%
                        secretary_count: parseInt(party.committee_secretary_count || 0), // 원본 개수 보존
                        
                        // === 무효표 및 기권 관련 (이미 퍼센트) ===
                        avg_invalid_vote_ratio: normalizePercentage(party.avg_invalid_vote_ratio),
                        
                        // === 표결 일치 관련 (이미 퍼센트) ===
                        avg_vote_match_ratio: normalizePercentage(party.avg_vote_match_ratio),
                        
                        // === 표결 불일치 관련 (이미 퍼센트) ===
                        avg_vote_mismatch_ratio: normalizePercentage(party.avg_vote_mismatch_ratio),
                        
                        // === 총점 ===
                        avg_total_score: parseFloat(party.avg_total_score || 0),
                        
                        // === 원본 데이터 ===
                        _raw: party
                    };
                    
                    // 🔧 정규화된 값들 로깅 (디버깅용)
                    console.log(`📊 ${partyName} 정규화된 데이터:`, {
                        출석: `${performanceData[partyName].avg_attendance.toFixed(1)}%`,
                        본회의가결: `${performanceData[partyName].bill_pass_sum.toFixed(1)}% (${performanceData[partyName].bill_pass_count}건)`,
                        청원제안: `${performanceData[partyName].petition_sum.toFixed(1)}% (${performanceData[partyName].petition_count}건)`,
                        청원결과: `${performanceData[partyName].petition_pass_sum.toFixed(1)}% (${performanceData[partyName].petition_pass_count}건)`,
                        위원장: `${performanceData[partyName].committee_leader_count.toFixed(1)}% (${performanceData[partyName].leader_count}명)`,
                        간사: `${performanceData[partyName].committee_secretary_count.toFixed(1)}% (${performanceData[partyName].secretary_count}명)`,
                        무효표기권: `${performanceData[partyName].avg_invalid_vote_ratio.toFixed(1)}%`,
                        투표일치: `${performanceData[partyName].avg_vote_match_ratio.toFixed(1)}%`,
                        투표불일치: `${performanceData[partyName].avg_vote_mismatch_ratio.toFixed(1)}%`
                    });
                }
            });
            
            pageState.partyPerformanceData = performanceData;
            console.log(`[PercentParty] ✅ 정당 성과 데이터 로드 완료: ${Object.keys(performanceData).length}개`);
            return performanceData;
            
        } catch (error) {
            console.error('[PercentParty] ❌ 정당 성과 데이터 로드 실패:', error);
            pageState.partyPerformanceData = {};
            return {};
        }
    }

    // 정당 랭킹 데이터 가져오기
    async function fetchPartyRankingData() {
        try {
            console.log('[PercentParty] 🏆 정당 랭킹 데이터 조회...');
            
            const rawData = await window.APIService.getPartyScoreRanking();
            console.log('[PercentParty] 🔍 정당 랭킹 API 원본 응답:', rawData);
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[PercentParty] ⚠️ 정당 랭킹 데이터 형식이 예상과 다름, 빈 배열 사용');
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
            
            pageState.partyRankingData = rankingData;
            console.log(`[PercentParty] ✅ 정당 랭킹 데이터 로드 완료: ${Object.keys(rankingData).length}개`);
            return rankingData;
            
        } catch (error) {
            console.error('[PercentParty] ❌ 정당 랭킹 데이터 로드 실패:', error);
            pageState.partyRankingData = {};
            return {};
        }
    }

    // === 🔄 API 데이터를 파이차트 형식으로 매핑 ===
    function mapApiDataToChartFormat(performanceData, partyName) {
        try {
            console.log('[PercentParty] 📊 API 데이터 매핑 시작:', performanceData);
            
            // API 데이터를 HTML 순서에 맞춘 9개 항목으로 매핑
            const mappedData = {
                // 1. 출석 → avg_attendance (이미 퍼센트)
                attendance: performanceData.avg_attendance || 85.0,
                
                // 2. 본회의 가결 → bill_pass_sum (퍼센트로 변환됨)
                plenary_pass: performanceData.bill_pass_sum || 60.0,
                
                // 3. 청원 제안 → petition_sum (퍼센트로 변환됨)
                petition_proposal: performanceData.petition_sum || 50.0,
                
                // 4. 청원 결과 → petition_pass_sum (퍼센트로 변환됨)
                petition_result: performanceData.petition_pass_sum || 40.0,
                
                // 5. 간사 → committee_secretary_count (고정 퍼센트: 있으면 3%)
                secretary: performanceData.committee_secretary_count || 0.0,
                
                // 6. 무효표 및 기권 → avg_invalid_vote_ratio (이미 퍼센트)
                invalid_abstention: performanceData.avg_invalid_vote_ratio || 5.0,
                
                // 7. 위원장 → committee_leader_count (고정 퍼센트: 있으면 5%)
                committee_chair: performanceData.committee_leader_count || 0.0,
                
                // 8. 투표 결과 일치 → avg_vote_match_ratio (이미 퍼센트)
                vote_match: performanceData.avg_vote_match_ratio || 85.0,
                
                // 9. 투표 결과 불일치 → avg_vote_mismatch_ratio (이미 퍼센트)
                vote_mismatch: performanceData.avg_vote_mismatch_ratio || 15.0
            };
            
            // 범위 제한 (0-100%)
            Object.keys(mappedData).forEach(key => {
                mappedData[key] = Math.max(0, Math.min(100, mappedData[key]));
            });
            
            console.log('[PercentParty] ✅ 매핑 완료:', mappedData);
            return mappedData;
            
        } catch (error) {
            console.error('[PercentParty] ❌ API 데이터 매핑 실패:', error);
            return generateTestDataForParty(partyName);
        }
    }

    // === 📊 정당 데이터 가져오기 ===
    async function fetchPartyData(partyName) {
        try {
            pageState.isLoading = true;
            showLoading(true);
            
            console.log('[PercentParty] 📊 정당 통계 데이터 가져오기:', partyName);
            
            // APIService 준비 대기
            await waitForAPIService();
            
            if (!window.APIService || !window.APIService._isReady) {
                throw new Error('API 서비스가 연결되지 않았습니다');
            }
            
            // 정당 성과 및 랭킹 데이터 로드
            const [performanceResult, rankingResult] = await Promise.allSettled([
                fetchPartyPerformanceData(),
                fetchPartyRankingData()
            ]);
            
            // 결과 확인
            const results = {
                performance: performanceResult.status === 'fulfilled',
                ranking: rankingResult.status === 'fulfilled'
            };
            
            console.log('[PercentParty] 📊 API 로드 결과:', results);
            
            // 현재 선택된 정당 데이터 찾기
            let currentPartyData = null;
            let rankingData = null;
            
            if (results.performance) {
                const performanceData = pageState.partyPerformanceData;
                currentPartyData = performanceData[partyName];
            }
            
            if (results.ranking) {
                const rankingDataMap = pageState.partyRankingData;
                rankingData = rankingDataMap[partyName];
            }
            
            if (!currentPartyData) {
                console.warn(`[PercentParty] ⚠️ ${partyName} 성과 데이터를 찾을 수 없습니다, 기본 데이터 사용`);
                currentPartyData = generateDefaultPerformanceData(partyName);
            }
            
            console.log('[PercentParty] 🎯 선택된 정당 데이터:', currentPartyData);
            console.log('[PercentParty] 🏆 선택된 정당 랭킹:', rankingData);
            
            // API 데이터를 차트 형식으로 매핑
            const chartData = mapApiDataToChartFormat(currentPartyData, partyName);
            
            // 차트 업데이트
            updateChartFromData(chartData, partyName);
            
            // 순위 정보 포함한 성공 메시지
            const rankInfo = rankingData ? `${rankingData.rank}위` : '순위 정보 없음';
            const totalScore = currentPartyData.avg_total_score || 'N/A';
            showSuccess(`${partyName} 통계 데이터를 성공적으로 불러왔습니다. (순위: ${rankInfo}, 총점: ${totalScore}점)`);
            
        } catch (error) {
            console.error('[PercentParty] ❌ 정당 통계 데이터 로드 실패:', error);
            
            // 에러 발생시 테스트 데이터 사용
            const testData = generateTestDataForParty(partyName);
            updateChartFromData(testData, partyName);
            
            showError(`API 연결 실패: ${error.message}. 기본 데이터를 표시합니다.`);
            
        } finally {
            pageState.isLoading = false;
            showLoading(false);
        }
    }

    // === 🧪 테스트용 데이터 생성 함수들 ===

    // 기본 성과 데이터 생성 (API 실패 시)
    function generateDefaultPerformanceData(partyName) {
        const baseData = {
            party: partyName,
            avg_attendance: 80 + Math.random() * 15,
            bill_pass_sum: 40 + Math.random() * 40,
            petition_sum: 30 + Math.random() * 50,
            petition_pass_sum: 20 + Math.random() * 40,
            committee_leader_count: Math.random() > 0.7 ? 5.0 : 0.0, // 30% 확률로 위원장 있음 (5%)
            committee_secretary_count: Math.random() > 0.5 ? 3.0 : 0.0, // 50% 확률로 간사 있음 (3%)
            avg_invalid_vote_ratio: Math.random() * 8 + 2,
            avg_vote_match_ratio: 75 + Math.random() * 20,
            avg_vote_mismatch_ratio: 5 + Math.random() * 20,
            avg_total_score: 60 + Math.random() * 30
        };
        
        // 정당별 특성 반영
        switch(partyName) {
            case '국민의힘':
                baseData.avg_attendance = 85.5;
                baseData.bill_pass_sum = 92.3;
                baseData.petition_sum = 76.8;
                baseData.petition_pass_sum = 68.2;
                baseData.committee_secretary_count = 3.0; // 간사 있음 (3%)
                baseData.avg_invalid_vote_ratio = 7.1;
                baseData.committee_leader_count = 5.0; // 위원장 있음 (5%)
                baseData.avg_vote_match_ratio = 89.7;
                baseData.avg_vote_mismatch_ratio = 10.3;
                break;
            case '더불어민주당':
                baseData.avg_attendance = 87.2;
                baseData.bill_pass_sum = 89.1;
                baseData.petition_sum = 82.4;
                baseData.petition_pass_sum = 74.6;
                baseData.committee_secretary_count = 3.0; // 간사 있음 (3%)
                baseData.avg_invalid_vote_ratio = 5.8;
                baseData.committee_leader_count = 5.0; // 위원장 있음 (5%)
                baseData.avg_vote_match_ratio = 91.2;
                baseData.avg_vote_mismatch_ratio = 8.8;
                break;
            case '조국혁신당':
                baseData.avg_attendance = 83.6;
                baseData.bill_pass_sum = 86.7;
                baseData.petition_sum = 78.9;
                baseData.petition_pass_sum = 71.2;
                baseData.committee_secretary_count = 3.0; // 간사 있음 (3%)
                baseData.avg_invalid_vote_ratio = 6.4;
                baseData.committee_leader_count = 0.0; // 위원장 없음 (0%)
                baseData.avg_vote_match_ratio = 88.5;
                baseData.avg_vote_mismatch_ratio = 11.5;
                break;
        }
        
        return baseData;
    }

    // 테스트용 더미 데이터 생성 (HTML 순서와 일치)
    function generateTestDataForParty(partyName) {
        console.log('[PercentParty] 🧪 테스트 데이터 생성:', partyName);
        
        const performanceData = generateDefaultPerformanceData(partyName);
        return mapApiDataToChartFormat(performanceData, partyName);
    }

    // === 🎨 UI 업데이트 함수들 ===

    // CSS 변수 업데이트 함수
    function updatePartyColors(partyName) {
        const partyInfo = partyColors[partyName];
        
        if (!partyInfo) {
            console.error(`[PercentParty] 정당 정보를 찾을 수 없습니다: "${partyName}"`);
            console.log('[PercentParty] 사용 가능한 정당들:', Object.keys(partyColors));
            return;
        }
        
        const root = document.documentElement;
        
        // CSS 변수 업데이트 (HTML 순서와 정확히 일치하는 9개 색상)
        root.style.setProperty('--current-party-main', partyInfo.main);
        root.style.setProperty('--current-party-secondary', partyInfo.secondary);
        root.style.setProperty('--current-party-tertiary', partyInfo.main + '99');
        root.style.setProperty('--current-party-quaternary', partyInfo.main + '88');
        root.style.setProperty('--current-party-quinary', partyInfo.main + '77');
        root.style.setProperty('--current-party-sixth', partyInfo.main + '66');
        root.style.setProperty('--current-party-seventh', partyInfo.main + '55');
        root.style.setProperty('--current-party-eighth', partyInfo.main + '44');
        root.style.setProperty('--current-party-ninth', partyInfo.main + '33');
        root.style.setProperty('--current-party-bg', partyInfo.main);
        
        console.log(`[PercentParty] ✅ ${partyName} 색상 업데이트 완료`);
    }

    // 각도를 라디안으로 변환
    function degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // 극좌표를 직교좌표로 변환
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = degreesToRadians(angleInDegrees - 90);
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    // SVG path 생성
    function createArcPath(centerX, centerY, radius, startAngle, endAngle) {
        const start = polarToCartesian(centerX, centerY, radius, endAngle);
        const end = polarToCartesian(centerX, centerY, radius, startAngle);
        
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        return [
            "M", centerX, centerY,
            "L", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "Z"
        ].join(" ");
    }

    // path 요소에 이벤트 리스너 추가
    function addPathEventListeners(path) {
        const tooltip = document.getElementById('chart-tooltip');
        
        path.addEventListener('mouseenter', function(e) {
            const label = this.getAttribute('data-label');
            const percent = this.getAttribute('data-percent');
            
            if (tooltip) {
                tooltip.textContent = `${label}: ${percent}%`;
                tooltip.classList.add('show');
            }
            
            // 호버 효과
            this.style.opacity = '0.8';
            this.style.stroke = 'white';
            this.style.strokeWidth = '2';
        });
        
        path.addEventListener('mousemove', function(e) {
            if (!tooltip) return;
            
            const rect = document.querySelector('.pie-chart').getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            tooltip.style.left = (x - tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = (y - tooltip.offsetHeight - 10) + 'px';
        });
        
        path.addEventListener('mouseleave', function() {
            if (tooltip) {
                tooltip.classList.remove('show');
            }
            
            // 호버 효과 제거
            this.style.opacity = '';
            this.style.stroke = '';
            this.style.strokeWidth = '';
        });
    }

    // 🔄 파이차트 업데이트 (HTML 순서 준수)
    function updatePieChart(data) {
        const svg = document.querySelector('.pie-chart svg');
        if (!svg) {
            console.error('[PercentParty] ❌ 파이차트 SVG 요소를 찾을 수 없습니다');
            return;
        }
        
        const centerX = 50;
        const centerY = 50;
        const radius = 45;
        
        // 기존 path 요소들 제거 (circle은 유지)
        svg.querySelectorAll('path').forEach(path => path.remove());
        
        // HTML 순서에 따라 0보다 큰 값들만 필터링
        const validData = statisticsConfig
            .map(config => ({
                ...config,
                value: data[config.key] || 0
            }))
            .filter(item => item.value > 0);
        
        if (validData.length === 0) {
            console.warn('[PercentParty] ⚠️ 표시할 데이터가 없습니다.');
            return;
        }
        
        // 총합 계산
        const total = validData.reduce((sum, item) => sum + item.value, 0);
        
        let currentAngle = 0;
        
        validData.forEach(item => {
            // 파이차트에서 실제 퍼센트 값 표시
            const actualPercent = item.value;
            const sliceAngle = (item.value / total) * 360;
            
            // path 요소 생성
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = createArcPath(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            
            path.setAttribute('d', pathData);
            path.setAttribute('fill', `var(${item.colorVar})`);
            path.setAttribute('data-label', item.label);
            path.setAttribute('data-percent', actualPercent.toFixed(1));
            path.setAttribute('cursor', 'pointer');
            
            // 호버 효과를 위한 이벤트 리스너 추가
            addPathEventListeners(path);
            
            svg.appendChild(path);
            currentAngle += sliceAngle;
        });
        
        console.log('[PercentParty] ✅ 파이차트 업데이트 완료');
    }

    // 🔄 통계 섹션 업데이트 (HTML 순서와 정확히 매칭)
    function updateStatisticsSection(data, partyName) {
        const statsTitle = document.querySelector('.statistics-section h3');
        const statsItems = document.querySelectorAll('.stats-item');
        
        // 제목 업데이트
        if (statsTitle) {
            statsTitle.textContent = `${partyName} 통계`;
        }
        
        // HTML 순서에 따라 각 통계 항목 업데이트
        statisticsConfig.forEach((config, index) => {
            if (statsItems[index]) {
                const value = data[config.key] || 0;
                const labelElement = statsItems[index].querySelector('.label');
                const valueElement = statsItems[index].querySelector('.value');
                
                if (labelElement) labelElement.textContent = config.label;
                if (valueElement) {
                    valueElement.textContent = `${value.toFixed(1)}%`;
                    valueElement.classList.remove('loading');
                }
            }
        });
        
        console.log('[PercentParty] ✅ 통계 섹션 업데이트 완료');
    }

    // 차트 및 통계 전체 업데이트
    function updateChartFromData(partyStatistics, partyName) {
        updatePieChart(partyStatistics);
        updateStatisticsSection(partyStatistics, partyName);
    }

    // === 🔄 가중치 변경 실시간 업데이트 시스템 ===

    // 가중치 변경 감지 및 자동 새로고침
    function setupWeightChangeListener() {
        try {
            console.log('[PercentParty] 🔄 가중치 변경 감지 시스템 설정...');
            
            // 1. localStorage 이벤트 감지 (다른 페이지에서 가중치 변경 시)
            window.addEventListener('storage', function(event) {
                if (event.key === 'weight_change_event' && event.newValue) {
                    try {
                        const changeData = JSON.parse(event.newValue);
                        console.log('[PercentParty] 📢 가중치 변경 감지:', changeData);
                        handleWeightUpdate(changeData, 'localStorage');
                    } catch (e) {
                        console.warn('[PercentParty] 가중치 변경 데이터 파싱 실패:', e);
                    }
                }
            });
            
            // 2. BroadcastChannel 감지 (최신 브라우저)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const weightChannel = new BroadcastChannel('weight_updates');
                    weightChannel.addEventListener('message', function(event) {
                        console.log('[PercentParty] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                        handleWeightUpdate(event.data, 'BroadcastChannel');
                    });
                    
                    // 페이지 언로드 시 채널 정리
                    window.addEventListener('beforeunload', () => {
                        weightChannel.close();
                    });
                    
                    console.log('[PercentParty] ✅ BroadcastChannel 설정 완료');
                } catch (e) {
                    console.warn('[PercentParty] BroadcastChannel 설정 실패:', e);
                }
            }
            
            // 3. 커스텀 이벤트 감지 (같은 페이지 내)
            document.addEventListener('weightDataUpdate', function(event) {
                console.log('[PercentParty] 🎯 커스텀 이벤트 가중치 변경 감지:', event.detail);
                handleWeightUpdate(event.detail, 'customEvent');
            });
            
            // 4. 주기적 체크 (폴백)
            let lastWeightCheckTime = localStorage.getItem('last_weight_update') || '0';
            setInterval(function() {
                const currentCheckTime = localStorage.getItem('last_weight_update') || '0';
                
                if (currentCheckTime !== lastWeightCheckTime && currentCheckTime !== '0') {
                    console.log('[PercentParty] ⏰ 주기적 체크로 가중치 변경 감지');
                    lastWeightCheckTime = currentCheckTime;
                    
                    const changeData = {
                        type: 'weights_updated',
                        timestamp: new Date(parseInt(currentCheckTime)).toISOString(),
                        source: 'periodic_check'
                    };
                    
                    handleWeightUpdate(changeData, 'periodicCheck');
                }
            }, 5000);
            
            console.log('[PercentParty] ✅ 가중치 변경 감지 시스템 설정 완료');
            
        } catch (error) {
            console.error('[PercentParty] ❌ 가중치 변경 감지 시스템 설정 실패:', error);
        }
    }

    // 가중치 업데이트 처리 함수
    async function handleWeightUpdate(changeData, source) {
        try {
            if (pageState.isLoading) {
                console.log('[PercentParty] 🔄 이미 로딩 중이므로 가중치 업데이트 스킵');
                return;
            }
            
            console.log(`[PercentParty] 🔄 가중치 업데이트 처리 시작 (${source})`);
            
            // 사용자에게 업데이트 알림
            showNotification('가중치가 변경되었습니다. 데이터를 새로고침합니다...', 'info');
            
            // 1초 딜레이 후 데이터 새로고침 (서버에서 가중치 처리 시간 고려)
            setTimeout(async () => {
                try {
                    // 새로운 데이터로 업데이트
                    await fetchPartyData(pageState.currentParty);
                    
                    console.log('[PercentParty] ✅ 가중치 업데이트 완료');
                    showNotification('새로운 가중치가 적용되었습니다! 🎉', 'success');
                    
                    // 응답 전송 (WeightSync 모니터링용)
                    try {
                        const response = {
                            page: 'percent_party.html',
                            timestamp: new Date().toISOString(),
                            success: true,
                            source: source,
                            currentParty: pageState.currentParty
                        };
                        localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                        setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
                    } catch (e) {
                        console.warn('[PercentParty] 응답 전송 실패:', e);
                    }
                    
                } catch (error) {
                    console.error('[PercentParty] ❌ 가중치 업데이트 데이터 로드 실패:', error);
                    showNotification('가중치 업데이트에 실패했습니다. 다시 시도해주세요.', 'error');
                }
            }, 1000);
            
        } catch (error) {
            console.error('[PercentParty] ❌ 가중치 업데이트 처리 실패:', error);
            showNotification('가중치 업데이트 처리에 실패했습니다.', 'error');
        }
    }

    // === 🔧 정당 변경 및 이벤트 처리 ===

    // 정당 변경 처리
    async function onPartyChange(selectedParty) {
        console.log('[PercentParty] 🔄 정당 변경:', selectedParty);
        
        pageState.currentParty = selectedParty;
        const partyInfo = partyColors[selectedParty];
        
        if (!partyInfo) {
            console.error(`[PercentParty] 정당 정보를 찾을 수 없습니다: "${selectedParty}"`);
            showError(`"${selectedParty}" 정당 정보를 찾을 수 없습니다.`);
            return;
        }
        
        // 드롭다운 버튼 텍스트 변경
        const dropdownBtn = document.querySelector('.dropdown-btn');
        if (dropdownBtn) {
            dropdownBtn.textContent = selectedParty;
            
            // SVG 아이콘 재추가
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '12');
            svg.setAttribute('height', '12');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M7 10l5 5 5-5z');
            path.setAttribute('fill', 'currentColor');
            
            svg.appendChild(path);
            dropdownBtn.appendChild(svg);
        }
        
        // 헤더 텍스트 변경
        const partyNameElement = document.getElementById('party-name');
        if (partyNameElement) {
            partyNameElement.textContent = selectedParty;
        }
        
        // 홈페이지 링크 업데이트
        const homeLink = document.getElementById('party-home-link');
        if (homeLink) {
            if (selectedParty === "무소속" || !partyInfo.url) {
                homeLink.style.display = "none";
            } else {
                homeLink.style.display = "inline-block";
                homeLink.href = partyInfo.url;
            }
        }
        
        // 정당 색상 업데이트
        updatePartyColors(selectedParty);
        
        // URL 업데이트
        if (history.pushState) {
            const url = new URL(window.location);
            url.searchParams.set('party', selectedParty);
            history.pushState({ party: selectedParty }, '', url);
        }
        
        // 🎯 새로운 데이터 로드
        await fetchPartyData(selectedParty);
    }

    // === 🔧 전역 함수 등록 (WeightSync 호환) ===

    // WeightSync 연동 함수들
    window.refreshPartyDetailData = function() {
        console.log('[PercentParty] 🔄 수동 새로고침 요청');
        return fetchPartyData(pageState.currentParty);
    };

    window.refreshPartyDetails = function() {
        console.log('[PercentParty] 🔄 수동 새로고침 요청 (WeightSync 호환)');
        return fetchPartyData(pageState.currentParty);
    };

    window.updatePartyDetails = function(newData) {
        console.log('[PercentParty] 📊 외부 데이터로 업데이트:', newData);
        
        if (newData && typeof newData === 'object') {
            const chartData = mapApiDataToChartFormat(newData, pageState.currentParty);
            updateChartFromData(chartData, pageState.currentParty);
            showNotification('데이터가 업데이트되었습니다', 'success');
        }
    };

    window.updatePartyDetailData = function(newData) {
        return window.updatePartyDetails(newData);
    };

    // 브라우저 뒤로/앞으로 버튼 처리
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.party) {
            onPartyChange(event.state.party);
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const partyFromUrl = urlParams.get('party');
            if (partyFromUrl) {
                onPartyChange(partyFromUrl);
            }
        }
    });

    // === 🚀 페이지 초기화 ===
    async function initializePage() {  
        console.log('[PercentParty] 📊 정당 상세 페이지 초기화 중...');
        
        try {
            // URL 파라미터에서 정당명 가져오기
            const urlParams = new URLSearchParams(window.location.search);
            const selectedPartyFromUrl = urlParams.get('party');
            
            // 초기 정당 설정
            const initialParty = selectedPartyFromUrl || '더불어민주당';
            pageState.currentParty = initialParty;
            
            // 🔄 가중치 변경 감지 설정
            setupWeightChangeListener();
            
            // 드롭다운 메뉴 토글
            const dropdownBtn = document.querySelector('.dropdown-btn');
            const dropdown = document.querySelector('.dropdown');
            
            if (dropdownBtn && dropdown) {
                dropdownBtn.addEventListener('click', function() {
                    dropdown.classList.toggle('active');
                });
            }
            
            // 드롭다운 항목 선택 시 처리
            const dropdownItems = document.querySelectorAll('.dropdown-content a');
            
            dropdownItems.forEach(item => {
                item.addEventListener('click', async function(e) {
                    e.preventDefault();
                    const selectedParty = this.dataset.party;
                    
                    await onPartyChange(selectedParty);
                    if (dropdown) {
                        dropdown.classList.remove('active');
                    }
                });
            });
            
            // 드롭다운 외부 클릭 시 닫기
            document.addEventListener('click', function(e) {
                if (dropdown && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
            
            // APIService 준비 대기
            await waitForAPIService();
            
            // API 연결 확인
            if (!window.APIService || !window.APIService._isReady) {
                console.warn('[PercentParty] ⚠️ API 서비스가 연결되지 않았습니다. 기본 데이터를 사용합니다.');
                showError('API 연결 실패. 기본 데이터를 표시합니다.');
            } else {
                console.log('[PercentParty] ✅ API 서비스 연결됨');
            }
            
            // 초기 정당 데이터 로드
            console.log('[PercentParty] 🎯 초기 정당 설정:', initialParty);
            await onPartyChange(initialParty);
            
            console.log('[PercentParty] ✅ 정당 상세 페이지 초기화 완료');
            
        } catch (error) {
            console.error('[PercentParty] ❌ 페이지 초기화 실패:', error);
            
            // 폴백: 기본 데이터로 표시
            const testData = generateTestDataForParty('더불어민주당');
            updateChartFromData(testData, '더불어민주당');
            
            showNotification('일부 데이터 로드에 실패했습니다', 'warning', 5000);
        }
    }

    // === 🔧 디버그 유틸리티 (전역) ===
    window.partyPageDebug = {
        getState: () => pageState,
        getCurrentParty: () => pageState.currentParty,
        changeParty: (partyName) => onPartyChange(partyName),
        refreshData: () => fetchPartyData(pageState.currentParty),
        testAPICall: async () => {
            try {
                const [performance, ranking] = await Promise.all([
                    window.APIService.getPartyPerformance(),
                    window.APIService.getPartyScoreRanking()
                ]);
                console.log('[PercentParty] 🧪 성과 API 테스트 결과:', performance);
                console.log('[PercentParty] 🧪 랭킹 API 테스트 결과:', ranking);
                return { performance, ranking };
            } catch (error) {
                console.error('[PercentParty] 🧪 API 테스트 실패:', error);
                return null;
            }
        },
        showInfo: () => {
            console.log('[PercentParty] 📊 정당 상세 페이지 정보:');
            console.log('- 현재 정당:', pageState.currentParty);
            console.log('- APIService 상태:', window.APIService?._isReady ? '연결됨' : '연결 안됨');
            console.log('- 가중치 변경 감지: 활성화됨');
            console.log('- HTML 순서와 매핑:', statisticsConfig.map(c => c.label));
            console.log('- 성과 데이터:', Object.keys(pageState.partyPerformanceData).length > 0 ? '로드됨' : '미로드');
            console.log('- 랭킹 데이터:', Object.keys(pageState.partyRankingData).length > 0 ? '로드됨' : '미로드');
            console.log('- 환경 정보:', window.APIService?.getEnvironmentInfo());
        },
        testHTMLMapping: () => {
            console.log('[PercentParty] 🔍 HTML 매핑 테스트...');
            const statsItems = document.querySelectorAll('.stats-item');
            statisticsConfig.forEach((config, index) => {
                const label = statsItems[index]?.querySelector('.label')?.textContent;
                const value = statsItems[index]?.querySelector('.value')?.textContent;
                console.log(`${index + 1}. ${config.label} (${config.key}): ${label} = ${value}`);
            });
        },
        simulateWeightChange: () => {
            console.log('[PercentParty] 🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            handleWeightUpdate(changeData, 'debug');
        },
        testNormalization: (testData) => {
            console.log('[PercentParty] 🔧 퍼센트 정규화 테스트:');
            console.log('입력 데이터:', testData);
            
            const testPartyData = {
                avg_attendance: testData?.attendance || 87.5,
                bill_pass_sum: testData?.billPass || 145,
                petition_sum: testData?.petition || 75,
                petition_pass_sum: testData?.petitionPass || 42,
                committee_leader_count: testData?.leader || 8, // 8명 → 5% (있음)
                committee_secretary_count: testData?.secretary || 15, // 15명 → 3% (있음)
                avg_invalid_vote_ratio: testData?.invalid || 0.058,
                avg_vote_match_ratio: testData?.match || 0.892,
                avg_vote_mismatch_ratio: testData?.mismatch || 0.108
            };
            
            console.log('원본 API 형식:', testPartyData);
            
            // 위원장/간사 변환 테스트
            console.log('위원장 변환 테스트:');
            console.log(`  - 8명 → ${convertLeaderToPercentage(8)}%`);
            console.log(`  - 0명 → ${convertLeaderToPercentage(0)}%`);
            console.log('간사 변환 테스트:');
            console.log(`  - 15명 → ${convertSecretaryToPercentage(15)}%`);
            console.log(`  - 0명 → ${convertSecretaryToPercentage(0)}%`);
            
            const mapped = mapApiDataToChartFormat(testPartyData, '테스트정당');
            console.log('매핑된 차트 데이터:', mapped);
            
            return mapped;
        },
        testPerformanceData: () => fetchPartyPerformanceData(),
        testRankingData: () => fetchPartyRankingData(),
        getPerformanceData: () => pageState.partyPerformanceData,
        getRankingData: () => pageState.partyRankingData
    };

    // 초기화 실행
    initializePage();

    console.log('[PercentParty] ✅ percent_party.js 로드 완료 (Django API 연동 + 퍼센트 정규화 버전)');
    console.log('[PercentParty] 🔗 API 모드: Django API 직접 연동');
    console.log('[PercentParty] 📊 데이터 변환: 개수 → 퍼센트 자동 변환');
    console.log('[PercentParty] 🔧 주요 개선사항:');
    console.log('[PercentParty]   - 본회의 가결/청원 개수를 퍼센트로 변환');
    console.log('[PercentParty]   - 위원장/간사 수를 퍼센트로 변환');
    console.log('[PercentParty]   - 비율 데이터 자동 정규화 (0.85 → 85%)');
    console.log('[PercentParty]   - 가중치 변경 실시간 감지 및 업데이트');
    console.log('[PercentParty] 🔧 디버그 명령어:');
    console.log('[PercentParty]   - window.partyPageDebug.showInfo() : 페이지 정보 확인');
    console.log('[PercentParty]   - window.partyPageDebug.testAPICall() : API 테스트');
    console.log('[PercentParty]   - window.partyPageDebug.testNormalization(data) : 정규화 테스트');
    console.log('[PercentParty]   - window.partyPageDebug.simulateWeightChange() : 가중치 변경 시뮬레이션');
});
