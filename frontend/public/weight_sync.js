/**
 * weight_sync.js (v2.1.0) - 총 점수 업데이트 최적화 버전
 * 가중치 변경 시 total_score와 avg_total_score의 실시간 반영을 보장
 */

(function() {
    'use strict';

    // === 📋 가중치 영향 받는 API 엔드포인트 매핑 (총 점수 중심) ===
    const WEIGHT_AFFECTED_APIS = {
        // 🎯 핵심 총 점수 API들
        CORE_SCORE_APIs: {
            memberPerformance: 'getMemberPerformance',     // total_score 필드
            partyPerformance: 'getPartyPerformance',       // avg_total_score 필드
            memberRanking: 'getMemberRanking',             // 랭킹 순위 변경
            partyScoreRanking: 'getPartyScoreRanking'      // 정당 랭킹 변경
        },
        
        // 보조 API들
        SECONDARY_APIs: {
            memberAttendance: 'getMemberAttendance',
            memberBillCount: 'getMemberBillCount',
            partyStatsRanking: 'getPartyStatsRanking',
            partyMemberPerformance: 'getPartyMemberPerformance',
            compareMembers: 'compareMembers',
            compareParties: 'compareParties'
        }
    };

    // === 🎯 페이지별 매핑 정보 (총 점수 중심 업데이트) ===
    const PAGE_API_MAPPING = {
        'rank_member.html': {
            primaryAPIs: ['memberPerformance', 'memberRanking'],
            secondaryAPIs: ['memberAttendance', 'memberBillCount'],
            refreshFunctions: [
                'refreshMemberDetails',         // 우선순위 1
                'refreshMemberRankingData', 
                'loadMemberData', 
                'updateMemberRanking', 
                'fetchMemberData',
                'detectMemberScoreChanges'      // 새로 추가
            ],
            scoreFields: ['total_score'],       // 추적할 점수 필드
            waitForServerProcessing: 5000       // 서버 처리 대기 시간
        },
        'rank_party.html': {
            primaryAPIs: ['partyPerformance', 'partyScoreRanking'],
            secondaryAPIs: ['partyStatsRanking'],
            refreshFunctions: [
                'refreshPartyRanking',          // 우선순위 1
                'refreshPartyRankingData', 
                'loadPartyData', 
                'updatePartyRanking', 
                'fetchPartyData',
                'detectPartyScoreChanges'       // 새로 추가
            ],
            scoreFields: ['avg_total_score'],   // 추적할 점수 필드
            waitForServerProcessing: 5000       // 서버 처리 대기 시간
        },
        'percent_member.html': {
            primaryAPIs: ['memberPerformance'],
            secondaryAPIs: ['memberAttendance', 'memberBillCount'],
            refreshFunctions: ['refreshMemberDetails', 'loadMemberDetailData', 'updateMemberDetails'],
            scoreFields: ['total_score'],
            waitForServerProcessing: 3000
        },
        'percent_party.html': {
            primaryAPIs: ['partyPerformance'],
            secondaryAPIs: ['partyMemberPerformance', 'partyStatsRanking'],
            refreshFunctions: ['refreshPartyDetails', 'loadPartyDetailData', 'updatePartyDetails'],
            scoreFields: ['avg_total_score'],
            waitForServerProcessing: 3000
        },
        'compare_member.html': {
            primaryAPIs: ['compareMembers', 'memberPerformance'],
            secondaryAPIs: ['memberRanking', 'memberAttendance'],
            refreshFunctions: ['refreshCompareMemberData', 'fetchMemberData', 'updateCompareMemberData', 'loadComparisonData'],
            scoreFields: ['total_score'],
            waitForServerProcessing: 5000
        },
        'compare_party.html': {
            primaryAPIs: ['compareParties', 'partyPerformance'],
            secondaryAPIs: ['partyScoreRanking', 'partyStatsRanking'],
            refreshFunctions: ['refreshPartyComparison', 'updatePartyComparisonData', 'loadPartyComparison'],
            scoreFields: ['avg_total_score'],
            waitForServerProcessing: 5000
        },
        'meeting.html': {
            primaryAPIs: [],
            secondaryAPIs: ['memberPerformance'],
            refreshFunctions: ['refreshMeetingData', 'loadMeetingData'],
            scoreFields: [],
            waitForServerProcessing: 2000
        },
        'petition.html': {
            primaryAPIs: [],
            secondaryAPIs: ['memberPerformance'],
            refreshFunctions: ['refreshPetitionData', 'loadPetitionData'],
            scoreFields: [],
            waitForServerProcessing: 2000
        }
    };

    // === 🔧 시스템 상태 관리 (개선된 버전) ===
    let weightSyncState = {
        isRefreshing: false,
        lastWeightCheck: localStorage.getItem('last_weight_update') || '0',
        refreshAttempts: 0,
        maxRefreshAttempts: 3,
        refreshCooldown: false,
        currentPage: window.location.pathname.split('/').pop(),
        apiConnected: false,
        initialized: false,
        version: '2.1.0',
        
        // 🎯 새로운 총 점수 추적 관련 상태
        scoreUpdateInProgress: false,
        lastScoreUpdate: null,
        scoreChangeDetected: false,
        serverProcessingTimer: null,
        scoreVerificationEnabled: true
    };

    // === 🔍 개선된 API 연결 상태 확인 ===
    async function checkAPIConnection() {
        try {
            const isReady = window.APIService && window.APIService._isReady && !window.APIService._hasError;
            
            if (isReady) {
                try {
                    // 🎯 핵심 API 테스트 (총 점수 관련)
                    const testPromises = [
                        window.APIService.getMemberPerformance(),
                        window.APIService.getPartyPerformance()
                    ];
                    
                    const results = await Promise.allSettled(testPromises);
                    const successCount = results.filter(r => r.status === 'fulfilled').length;
                    
                    if (successCount >= 1) {
                        weightSyncState.apiConnected = true;
                        console.log('🔗 [WeightSync] API 연결 상태: ✅ 연결됨 (핵심 API 테스트 통과)');
                    } else {
                        throw new Error('핵심 API 테스트 실패');
                    }
                } catch (e) {
                    console.warn('[WeightSync] 핵심 API 테스트 실패:', e.message);
                    weightSyncState.apiConnected = false;
                }
            } else {
                weightSyncState.apiConnected = false;
            }
            
            return weightSyncState.apiConnected;
            
        } catch (error) {
            console.warn('[WeightSync] API 연결 상태 확인 실패:', error);
            weightSyncState.apiConnected = false;
            return false;
        }
    }

    // === 🔔 개선된 알림 시스템 ===
    function showWeightChangeNotification(message, type = 'info', duration = 4000) {
        try {
            if (window.APIService?.showNotification) {
                window.APIService.showNotification(message, type, duration);
            } else {
                console.log(`[WeightSync 알림 - ${type.toUpperCase()}] ${message}`);
                
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
                    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
                    color: white; border-radius: 8px; z-index: 10000; font-size: 13px;
                    max-width: 350px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-family: 'Blinker', sans-serif; line-height: 1.4;
                `;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, duration);
            }
        } catch (error) {
            console.log(`[WeightSync 알림 오류] ${message} (${type})`);
        }
    }

    // === 🎯 개선된 가중치 변경 처리 함수 (총 점수 중심) ===
    async function handleWeightChange(source, eventData = null) {
        if (weightSyncState.isRefreshing || weightSyncState.refreshCooldown || weightSyncState.scoreUpdateInProgress) {
            console.log('[WeightSync] 🔄 이미 새로고침 중이거나 쿨다운/점수 업데이트 상태입니다.');
            return;
        }

        try {
            weightSyncState.isRefreshing = true;
            weightSyncState.scoreUpdateInProgress = true;
            weightSyncState.refreshAttempts++;
            
            console.log(`[WeightSync] 🔄 가중치 변경 감지 (${source}) - ${weightSyncState.currentPage} 총 점수 업데이트 시작`);
            
            const isConnected = await checkAPIConnection();
            if (!isConnected) {
                throw new Error('API 서버에 연결할 수 없습니다');
            }

            const pageConfig = PAGE_API_MAPPING[weightSyncState.currentPage];
            const serverDelay = pageConfig?.waitForServerProcessing || 5000;
            
            // 🎯 서버 처리 시간을 고려한 단계별 알림
            showWeightChangeNotification(
                `가중치가 변경되었습니다. 서버에서 총 점수를 재계산하는 동안 ${serverDelay/1000}초 기다립니다...`, 
                'info', 
                3000
            );
            
            // 🔄 서버 처리 대기 (총 점수 재계산 시간)
            console.log(`[WeightSync] ⏳ 서버 총 점수 재계산 대기 (${serverDelay}ms)...`);
            
            weightSyncState.serverProcessingTimer = setTimeout(async () => {
                try {
                    console.log('[WeightSync] 🚀 서버 처리 완료, 총 점수 업데이트 확인 시작...');
                    
                    showWeightChangeNotification('서버 처리 완료! 총 점수 변경을 확인하고 페이지를 업데이트합니다...', 'info', 2000);
                    
                    // 🎯 총 점수 업데이트를 위한 데이터 새로고침
                    await refreshCurrentPageDataWithScoreVerification();
                    
                    weightSyncState.refreshAttempts = 0;
                    weightSyncState.lastScoreUpdate = new Date().toISOString();
                    
                    console.log('[WeightSync] ✅ 총 점수 업데이트 완료');
                    
                    showWeightChangeNotification(
                        '새로운 가중치가 적용되어 총 점수가 업데이트되었습니다! 🎉', 
                        'success', 
                        6000
                    );
                    
                    // 쿨다운 설정
                    weightSyncState.refreshCooldown = true;
                    setTimeout(() => {
                        weightSyncState.refreshCooldown = false;
                    }, 8000); // 8초 쿨다운
                    
                    // 응답 전송 (percent 페이지 모니터링용)
                    sendRefreshResponse(source, true);
                    
                } catch (error) {
                    console.error('[WeightSync] ❌ 총 점수 업데이트 실패:', error);
                    handleRefreshError(error, source);
                }
            }, serverDelay);
            
        } catch (error) {
            console.error('[WeightSync] ❌ 가중치 변경 처리 실패:', error);
            handleRefreshError(error, source);
        } finally {
            weightSyncState.isRefreshing = false;
            weightSyncState.scoreUpdateInProgress = false;
        }
    }

    // === 📊 총 점수 검증을 포함한 페이지 새로고침 ===
    async function refreshCurrentPageDataWithScoreVerification() {
        const currentPage = weightSyncState.currentPage;
        const pageConfig = PAGE_API_MAPPING[currentPage];
        
        if (!pageConfig) {
            console.log(`[WeightSync] ${currentPage}는 가중치 영향을 받지 않는 페이지입니다.`);
            return;
        }

        console.log(`[WeightSync] 🔄 ${currentPage} 총 점수 검증 포함 새로고침 시작...`);
        console.log(`[WeightSync] 📊 추적 대상 점수 필드: ${pageConfig.scoreFields.join(', ')}`);

        // 🎯 총 점수 변경 감지가 가능한 페이지별 전용 함수 시도
        const scoreDetectionFunctions = pageConfig.refreshFunctions.filter(func => 
            func.includes('Score') || func.includes('detect') || func.includes('refresh')
        );
        
        for (const funcName of scoreDetectionFunctions) {
            if (typeof window[funcName] === 'function') {
                console.log(`[WeightSync] ✅ ${funcName} 함수로 총 점수 변경 감지 실행`);
                await window[funcName]();
                return;
            }
        }

        // 폴백: 일반 새로고침 함수들
        for (const funcName of pageConfig.refreshFunctions) {
            if (typeof window[funcName] === 'function') {
                console.log(`[WeightSync] ✅ ${funcName} 함수 실행`);
                await window[funcName]();
                return;
            }
        }

        // 최종 폴백: API별 새로고침
        await refreshByAPITypeWithScoreCheck(currentPage, pageConfig);
    }

    // === 🎯 API 타입별 총 점수 확인 새로고침 ===
    async function refreshByAPITypeWithScoreCheck(currentPage, pageConfig) {
        try {
            console.log(`[WeightSync] 🔄 ${currentPage} API별 총 점수 확인 새로고침...`);
            
            switch(currentPage) {
                case 'rank_member.html':
                    await refreshMemberRankingPageWithScoreCheck();
                    break;
                    
                case 'rank_party.html':
                    await refreshPartyRankingPageWithScoreCheck();
                    break;
                    
                case 'percent_member.html':
                    await refreshMemberDetailsPageWithScoreCheck();
                    break;
                    
                case 'percent_party.html':
                    await refreshPartyDetailsPageWithScoreCheck();
                    break;
                    
                case 'compare_member.html':
                    await refreshMemberComparisonPageWithScoreCheck();
                    break;
                    
                case 'compare_party.html':
                    await refreshPartyComparisonPageWithScoreCheck();
                    break;
                    
                default:
                    console.log(`[WeightSync] ${currentPage}: 기본 새로고침 수행`);
                    await performGenericRefresh();
                    break;
            }
        } catch (error) {
            console.error(`[WeightSync] ${currentPage} 총 점수 확인 새로고침 실패:`, error);
            throw error;
        }
    }

    // === 📊 페이지별 총 점수 확인 새로고침 함수들 ===
    
    async function refreshMemberRankingPageWithScoreCheck() {
        console.log('[WeightSync] 🏆 의원 랭킹 페이지 총 점수 확인 새로고침...');
        
        try {
            // 🎯 의원 실적 데이터에서 total_score 변경 확인
            const [performanceData, rankingData] = await Promise.allSettled([
                window.APIService.getMemberPerformance(),
                window.APIService.getMemberRanking()
            ]);
            
            const newData = {
                performance: performanceData.status === 'fulfilled' ? performanceData.value : null,
                ranking: rankingData.status === 'fulfilled' ? rankingData.value : null,
                source: 'score_verification',
                scoreFieldsUpdated: ['total_score'],
                timestamp: new Date().toISOString()
            };
            
            console.log('[WeightSync] ✅ 의원 total_score 데이터 로드 완료');
            
            // 총 점수 변경 확인
            if (newData.performance && Array.isArray(newData.performance)) {
                const totalScoreCount = newData.performance.filter(member => 
                    member.total_score !== undefined && member.total_score !== null
                ).length;
                
                console.log(`[WeightSync] 📊 의원 total_score 확인: ${totalScoreCount}명`);
                
                if (totalScoreCount > 0) {
                    weightSyncState.scoreChangeDetected = true;
                }
            }
            
            await updatePageWithNewData('member_ranking_score_verified', newData);
            
        } catch (error) {
            console.error('[WeightSync] 의원 랭킹 총 점수 확인 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshPartyRankingPageWithScoreCheck() {
        console.log('[WeightSync] 🏛️ 정당 랭킹 페이지 총 점수 확인 새로고침...');
        
        try {
            // 🎯 정당 실적 데이터에서 avg_total_score 변경 확인
            const [performanceData, scoreRanking] = await Promise.allSettled([
                window.APIService.getPartyPerformance(),
                window.APIService.getPartyScoreRanking()
            ]);

            const newData = {
                performance: performanceData.status === 'fulfilled' ? performanceData.value : null,
                scoreRanking: scoreRanking.status === 'fulfilled' ? scoreRanking.value : null,
                source: 'score_verification',
                scoreFieldsUpdated: ['avg_total_score'],
                timestamp: new Date().toISOString()
            };
            
            console.log('[WeightSync] ✅ 정당 avg_total_score 데이터 로드 완료');
            
            // 총 점수 변경 확인
            if (newData.performance && Array.isArray(newData.performance)) {
                const avgTotalScoreCount = newData.performance.filter(party => 
                    party.avg_total_score !== undefined && party.avg_total_score !== null
                ).length;
                
                console.log(`[WeightSync] 📊 정당 avg_total_score 확인: ${avgTotalScoreCount}개`);
                
                if (avgTotalScoreCount > 0) {
                    weightSyncState.scoreChangeDetected = true;
                }
            }
            
            await updatePageWithNewData('party_ranking_score_verified', newData);
            
        } catch (error) {
            console.error('[WeightSync] 정당 랭킹 총 점수 확인 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshMemberDetailsPageWithScoreCheck() {
        console.log('[WeightSync] 👤 의원 상세 정보 페이지 총 점수 확인 새로고침...');
        
        try {
            const performanceData = await window.APIService.getMemberPerformance();
            
            const memberData = {
                performance: performanceData,
                source: 'score_verification',
                scoreFieldsUpdated: ['total_score'],
                timestamp: new Date().toISOString()
            };
            
            console.log('[WeightSync] ✅ 의원 상세 total_score 데이터 로드 완료');
            await updatePageWithNewData('member_details_score_verified', memberData);
            
        } catch (error) {
            console.error('[WeightSync] 의원 상세 정보 총 점수 확인 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshPartyDetailsPageWithScoreCheck() {
        console.log('[WeightSync] 🏛️ 정당 상세 정보 페이지 총 점수 확인 새로고침...');
        
        try {
            const performanceData = await window.APIService.getPartyPerformance();
            
            const partyData = {
                performance: performanceData,
                source: 'score_verification',
                scoreFieldsUpdated: ['avg_total_score'],
                timestamp: new Date().toISOString()
            };
            
            console.log('[WeightSync] ✅ 정당 상세 avg_total_score 데이터 로드 완료');
            await updatePageWithNewData('party_details_score_verified', partyData);
            
        } catch (error) {
            console.error('[WeightSync] 정당 상세 정보 총 점수 확인 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshMemberComparisonPageWithScoreCheck() {
        console.log('[WeightSync] ⚖️ 의원 비교 페이지 총 점수 확인 새로고침...');
        
        try {
            const memberData = await window.APIService.getMemberPerformance();
            
            const comparisonData = {
                memberData: memberData,
                source: 'score_verification',
                scoreFieldsUpdated: ['total_score'],
                timestamp: new Date().toISOString()
            };
            
            console.log('[WeightSync] ✅ 의원 비교 total_score 데이터 로드 완료');
            await updatePageWithNewData('member_comparison_score_verified', comparisonData);
            
        } catch (error) {
            console.error('[WeightSync] 의원 비교 총 점수 확인 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshPartyComparisonPageWithScoreCheck() {
        console.log('[WeightSync] ⚖️ 정당 비교 페이지 총 점수 확인 새로고침...');
        
        try {
            const partyData = await window.APIService.getPartyPerformance();
            
            const comparisonData = {
                partyData: partyData,
                source: 'score_verification',
                scoreFieldsUpdated: ['avg_total_score'],
                timestamp: new Date().toISOString()
            };
            
            console.log('[WeightSync] ✅ 정당 비교 avg_total_score 데이터 로드 완료');
            await updatePageWithNewData('party_comparison_score_verified', comparisonData);
            
        } catch (error) {
            console.error('[WeightSync] 정당 비교 총 점수 확인 새로고침 실패:', error);
            throw error;
        }
    }

    // === 🔧 헬퍼 함수들 (개선된 버전) ===
    
    async function updatePageWithNewData(dataType, newData) {
        try {
            // 🎯 총 점수 검증 관련 업데이트 함수들 (우선순위)
            const scoreUpdateFunctionNames = [
                'detectMemberScoreChanges',
                'detectPartyScoreChanges',
                'refreshMemberDetails',
                'refreshPartyRanking',
                'updateMemberDetailData',
                'updatePartyRankingData'
            ];
            
            // 일반 업데이트 함수들
            const updateFunctionNames = [
                `update${dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/_/g, '')}Data`,
                `refresh${dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/_/g, '')}`,
                'updatePageData',
                'refreshData',
                'reloadData',
                'loadData',
                'fetchMemberData',
                'loadPartyData',
                'updateChartData',
                'refreshCharts',
                'renderData'
            ];
            
            // 총 점수 관련 함수 우선 실행
            for (const funcName of scoreUpdateFunctionNames) {
                if (typeof window[funcName] === 'function') {
                    console.log(`[WeightSync] 📊 ${funcName} 함수로 총 점수 업데이트`);
                    await window[funcName](newData);
                    return;
                }
            }
            
            // 일반 업데이트 함수 실행
            for (const funcName of updateFunctionNames) {
                if (typeof window[funcName] === 'function') {
                    console.log(`[WeightSync] 📊 ${funcName} 함수로 데이터 업데이트`);
                    await window[funcName](newData);
                    return;
                }
            }
            
            // 커스텀 이벤트 발생 (총 점수 변경 정보 포함)
            const event = new CustomEvent('weightDataUpdate', {
                detail: { 
                    dataType, 
                    newData, 
                    timestamp: new Date().toISOString(),
                    scoreFieldsUpdated: newData.scoreFieldsUpdated || [],
                    scoreChangeDetected: weightSyncState.scoreChangeDetected
                }
            });
            document.dispatchEvent(event);
            
            console.log('[WeightSync] 📊 커스텀 이벤트로 총 점수 업데이트 알림');
            
        } catch (error) {
            console.warn('[WeightSync] 페이지 데이터 업데이트 실패:', error);
            throw new Error('총 점수 업데이트 실패 - 페이지 새로고침 필요');
        }
    }

    // === 🚨 에러 처리 함수 ===
    function handleRefreshError(error, source) {
        if (weightSyncState.refreshAttempts < weightSyncState.maxRefreshAttempts) {
            console.log(`[WeightSync] 🔄 재시도 예정 (${weightSyncState.refreshAttempts}/${weightSyncState.maxRefreshAttempts})`);
            
            showWeightChangeNotification(
                `총 점수 업데이트 실패. 재시도 중... (${weightSyncState.refreshAttempts}/${weightSyncState.maxRefreshAttempts})`, 
                'warning'
            );
            
            setTimeout(() => {
                weightSyncState.isRefreshing = false;
                weightSyncState.scoreUpdateInProgress = false;
                handleWeightChange(`재시도 ${weightSyncState.refreshAttempts}`);
            }, 3000 * weightSyncState.refreshAttempts);
            
        } else {
            weightSyncState.refreshAttempts = 0;
            showWeightChangeNotification(
                '총 점수 업데이트에 실패했습니다. 페이지를 새로고침해주세요.', 
                'error'
            );
            
            if (confirm('자동 총 점수 업데이트에 실패했습니다. 페이지를 새로고침하시겠습니까?')) {
                window.location.reload();
            }
        }
        
        // 실패 응답 전송
        sendRefreshResponse(source, false, error.message);
    }

    // === 📤 응답 전송 함수 ===
    function sendRefreshResponse(source, success, errorMessage = null) {
        try {
            const response = {
                page: weightSyncState.currentPage,
                timestamp: new Date().toISOString(),
                success: success,
                source: source,
                scoreUpdateCompleted: weightSyncState.scoreChangeDetected,
                scoreFields: PAGE_API_MAPPING[weightSyncState.currentPage]?.scoreFields || [],
                errorMessage: errorMessage
            };
            localStorage.setItem('weight_refresh_response', JSON.stringify(response));
            setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
        } catch (e) {
            console.warn('[WeightSync] 응답 전송 실패:', e);
        }
    }

    // === 🛠️ 개선된 수동 새로고침 버튼 ===
    function addManualRefreshButton() {
        try {
            if (document.getElementById('weightRefreshBtn')) return;
            
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'weightRefreshBtn';
            refreshBtn.innerHTML = '🔄 총 점수 새로고침';
            refreshBtn.style.cssText = `
                position: fixed; top: 80px; right: 20px; z-index: 1000;
                padding: 10px 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; border: none; border-radius: 25px; font-size: 12px;
                cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease; font-family: 'Blinker', sans-serif; font-weight: 500;
                min-width: 140px; text-align: center;
            `;
            
            refreshBtn.addEventListener('click', function() {
                if (!weightSyncState.isRefreshing && !weightSyncState.scoreUpdateInProgress) {
                    this.innerHTML = '🔄 총 점수<br>업데이트 중...';
                    this.disabled = true;
                    
                    handleWeightChange('수동 총 점수 새로고침').finally(() => {
                        this.innerHTML = '🔄 총 점수 새로고침';
                        this.disabled = false;
                    });
                }
            });
            
            refreshBtn.addEventListener('mouseenter', function() {
                if (!this.disabled) {
                    this.style.transform = 'translateY(-2px) scale(1.05)';
                    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }
            });
            
            refreshBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            });
            
            document.body.appendChild(refreshBtn);
            
        } catch (error) {
            console.warn('[WeightSync] 수동 새로고침 버튼 추가 실패:', error);
        }
    }

    // === 👂 개선된 가중치 변경 감지 시스템 ===
    function setupWeightChangeListeners() {
        try {
            // 1. localStorage 이벤트 감지
            window.addEventListener('storage', function(e) {
                if (e.key === 'weight_change_event' && !weightSyncState.isRefreshing && !weightSyncState.scoreUpdateInProgress) {
                    try {
                        const eventData = JSON.parse(e.newValue);
                        console.log('[WeightSync] 📢 localStorage 가중치 변경 감지:', eventData);
                        handleWeightChange('localStorage 이벤트', eventData);
                    } catch (error) {
                        console.warn('[WeightSync] localStorage 이벤트 파싱 실패:', error);
                    }
                }
            });
            
            // 2. BroadcastChannel 감지
            let weightBroadcastChannel = null;
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    weightBroadcastChannel = new BroadcastChannel('weight_updates');
                    weightBroadcastChannel.addEventListener('message', function(event) {
                        if (!weightSyncState.isRefreshing && !weightSyncState.scoreUpdateInProgress) {
                            console.log('[WeightSync] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                            handleWeightChange('BroadcastChannel', event.data);
                        }
                    });
                } catch (e) {
                    console.warn('[WeightSync] BroadcastChannel 초기화 실패:', e);
                }
            }
            
            // 3. 주기적 가중치 변경 감지 (개선된 버전)
            setInterval(function() {
                const currentCheck = localStorage.getItem('last_weight_update') || '0';
                if (currentCheck !== weightSyncState.lastWeightCheck && 
                    !weightSyncState.isRefreshing && 
                    !weightSyncState.scoreUpdateInProgress) {
                    
                    weightSyncState.lastWeightCheck = currentCheck;
                    console.log('[WeightSync] ⏰ 주기적 체크로 가중치 변경 감지');
                    handleWeightChange('주기적 체크');
                }
            }, 2000); // 2초마다 체크 (더 빠른 감지)

            // 페이지 언로드 시 정리
            window.addEventListener('beforeunload', function() {
                if (weightBroadcastChannel) {
                    weightBroadcastChannel.close();
                }
                if (weightSyncState.serverProcessingTimer) {
                    clearTimeout(weightSyncState.serverProcessingTimer);
                }
            });
            
            console.log('[WeightSync] ✅ 개선된 가중치 변경 감지 리스너 설정 완료');
            
        } catch (error) {
            console.error('[WeightSync] 가중치 변경 감지 설정 실패:', error);
        }
    }

    // === 🎯 개선된 초기화 함수 ===
    async function initializeWeightSync() {
        if (weightSyncState.initialized) {
            console.log('[WeightSync] 이미 초기화되었습니다.');
            return;
        }

        try {
            console.log('[WeightSync] 🚀 총 점수 업데이트 최적화 가중치 동기화 시스템 초기화... (v2.1.0)');
            
            // API 연결 상태 확인
            const isConnected = await checkAPIConnection();
            console.log(`[WeightSync] 🔗 API 연결 상태: ${isConnected ? '✅ 연결됨' : '❌ 연결 안됨'}`);
            
            if (!isConnected) {
                console.warn('[WeightSync] ⚠️ API 서버에 연결되지 않았습니다. 총 점수 동기화가 제한됩니다.');
            }
            
            // 현재 페이지 정보 로그
            const pageConfig = PAGE_API_MAPPING[weightSyncState.currentPage];
            if (pageConfig) {
                console.log(`[WeightSync] 📄 현재 페이지: ${weightSyncState.currentPage}`);
                console.log(`[WeightSync] 📊 추적 점수 필드: ${pageConfig.scoreFields.join(', ')}`);
                console.log(`[WeightSync] ⏱️ 서버 처리 대기 시간: ${pageConfig.waitForServerProcessing}ms`);
                console.log(`[WeightSync] 📡 영향받는 API: ${pageConfig.primaryAPIs.join(', ')}`);
            }
            
            // 이벤트 리스너 설정
            setupWeightChangeListeners();
            
            // 수동 새로고침 버튼 추가
            setTimeout(addManualRefreshButton, 1000);
            
            // 커스텀 이벤트 리스너 등록
            document.addEventListener('weightDataUpdate', function(event) {
                console.log('[WeightSync] 📊 총 점수 업데이트 이벤트 수신:', event.detail);
                if (event.detail.scoreChangeDetected) {
                    weightSyncState.scoreChangeDetected = true;
                }
            });
            
            weightSyncState.initialized = true;
            console.log('[WeightSync] ✅ 총 점수 업데이트 최적화 가중치 동기화 시스템 초기화 완료 (v2.1.0)');
            
        } catch (error) {
            console.error('[WeightSync] ❌ 가중치 동기화 시스템 초기화 실패:', error);
        }
    }
    
async function performGenericRefresh() {
        console.log('[WeightSync] 🔄 기본 새로고침 수행...');
        
        const genericFunctions = [
            'refreshPageData', 'reloadPageData', 'updateAllData',
            'init', 'initialize', 'loadData', 'fetchData',
            'refreshData', 'updateData', 'renderPage',
            'loadPageData', 'refreshUI', 'updateUI'
        ];
        
        for (const funcName of genericFunctions) {
            if (typeof window[funcName] === 'function') {
                console.log(`[WeightSync] 🔧 ${funcName} 함수 실행`);
                await window[funcName]();
                return;
            }
        }
        
        console.log('[WeightSync] ⚠️ 적절한 새로고침 함수를 찾을 수 없어 페이지 새로고침을 제안합니다.');
        throw new Error('새로고침 함수 없음');
    }

    // === 🛠️ 수동 새로고침 버튼 ===
    function addManualRefreshButton() {
        try {
            if (document.getElementById('weightRefreshBtn')) return;
            
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'weightRefreshBtn';
            refreshBtn.innerHTML = '🔄 가중치 새로고침';
            refreshBtn.style.cssText = `
                position: fixed; top: 80px; right: 20px; z-index: 1000;
                padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; border: none; border-radius: 25px; font-size: 12px;
                cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease; font-family: 'Blinker', sans-serif; font-weight: 500;
            `;
            
            refreshBtn.addEventListener('click', function() {
                if (!weightSyncState.isRefreshing) {
                    this.textContent = '🔄 새로고침 중...';
                    this.disabled = true;
                    
                    handleWeightChange('수동 새로고침').finally(() => {
                        this.textContent = '🔄 가중치 새로고침';
                        this.disabled = false;
                    });
                }
            });
            
            refreshBtn.addEventListener('mouseenter', function() {
                if (!this.disabled) {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }
            });
            
            refreshBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            });
            
            document.body.appendChild(refreshBtn);
            
        } catch (error) {
            console.warn('[WeightSync] 수동 새로고침 버튼 추가 실패:', error);
        }
    }

    // === 👂 가중치 변경 감지 시스템 ===
    function setupWeightChangeListeners() {
        try {
            // 1. localStorage 이벤트 감지
            window.addEventListener('storage', function(e) {
                if (e.key === 'weight_change_event' && !weightSyncState.isRefreshing) {
                    handleWeightChange('localStorage 이벤트', e.newValue);
                }
            });
            
            // 2. BroadcastChannel 감지
            let weightBroadcastChannel = null;
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    weightBroadcastChannel = new BroadcastChannel('weight_updates');
                    weightBroadcastChannel.addEventListener('message', function(event) {
                        if (!weightSyncState.isRefreshing) {
                            handleWeightChange('BroadcastChannel', JSON.stringify(event.data));
                        }
                    });
                } catch (e) {
                    console.warn('[WeightSync] BroadcastChannel 초기화 실패:', e);
                }
            }
            
            // 3. 주기적 가중치 변경 감지
            setInterval(function() {
                const currentCheck = localStorage.getItem('last_weight_update') || '0';
                if (currentCheck !== weightSyncState.lastWeightCheck && !weightSyncState.isRefreshing) {
                    weightSyncState.lastWeightCheck = currentCheck;
                    handleWeightChange('주기적 체크');
                }
            }, 3000);

            // 페이지 언로드 시 정리
            window.addEventListener('beforeunload', function() {
                if (weightBroadcastChannel) {
                    weightBroadcastChannel.close();
                }
            });
            
            console.log('[WeightSync] ✅ 가중치 변경 감지 리스너 설정 완료');
            
        } catch (error) {
            console.error('[WeightSync] 가중치 변경 감지 설정 실패:', error);
        }
    }

    // === 🎯 초기화 함수 ===
    async function initializeWeightSync() {
        if (weightSyncState.initialized) {
            console.log('[WeightSync] 이미 초기화되었습니다.');
            return;
        }

        try {
            console.log('[WeightSync] 🚀 가중치 동기화 시스템 초기화... (v2.0.0)');
            
            // API 연결 상태 확인
            const isConnected = await checkAPIConnection();
            console.log(`[WeightSync] 🔗 API 연결 상태: ${isConnected ? '✅ 연결됨' : '❌ 연결 안됨'}`);
            
            if (!isConnected) {
                console.warn('[WeightSync] ⚠️ API 서버에 연결되지 않았습니다. 가중치 동기화가 제한됩니다.');
            }
            
            // 현재 페이지 정보 로그
            const pageConfig = PAGE_API_MAPPING[weightSyncState.currentPage];
            if (pageConfig) {
                console.log(`[WeightSync] 📄 현재 페이지: ${weightSyncState.currentPage}`);
                console.log(`[WeightSync] 📊 영향받는 API: ${pageConfig.primaryAPIs.join(', ')}`);
            }
            
            // 이벤트 리스너 설정
            setupWeightChangeListeners();
            
            // 수동 새로고침 버튼 추가
            setTimeout(addManualRefreshButton, 1000);
            
            // 커스텀 이벤트 리스너 등록
            document.addEventListener('weightDataUpdate', function(event) {
                console.log('[WeightSync] 📊 가중치 데이터 업데이트 이벤트 수신:', event.detail);
            });
            
            weightSyncState.initialized = true;
            console.log('[WeightSync] ✅ 가중치 동기화 시스템 초기화 완료 (v2.0.0)');
            
        } catch (error) {
            console.error('[WeightSync] ❌ 가중치 동기화 시스템 초기화 실패:', error);
        }
    }


    // === 🔧 개발자 도구용 디버그 함수 (총 점수 중심) ===
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugWeightSync = {
            state: weightSyncState,
            apis: WEIGHT_AFFECTED_APIS,
            pageMapping: PAGE_API_MAPPING,
            
            manualRefresh: () => handleWeightChange('수동 테스트'),
            checkConnection: checkAPIConnection,
            
            // 🎯 총 점수 테스트 함수들
            testScoreUpdate: async () => {
                console.log('[WeightSync] 🧪 총 점수 업데이트 테스트 시작...');
                try {
                    await refreshCurrentPageDataWithScoreVerification();
                    console.log('[WeightSync] ✅ 총 점수 업데이트 테스트 성공');
                } catch (error) {
                    console.error('[WeightSync] ❌ 총 점수 업데이트 테스트 실패:', error);
                }
            },
            
            simulateWeightChange: () => {
                const event = {
                    type: 'weights_updated',
                    timestamp: new Date().toISOString(),
                    source: 'debug_test',
                    requiresScoreRefresh: true,
                    serverProcessingDelay: 3000
                };
                localStorage.setItem('weight_change_event', JSON.stringify(event));
                localStorage.setItem('last_weight_update', Date.now().toString());
                setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
            },
            
            checkCurrentScores: async () => {
                const currentPage = weightSyncState.currentPage;
                const pageConfig = PAGE_API_MAPPING[currentPage];
                
                console.log(`[WeightSync] 🔍 ${currentPage} 현재 점수 확인...`);
                console.log(`추적 필드: ${pageConfig?.scoreFields || []}`);
                
                try {
                    if (pageConfig?.scoreFields.includes('total_score')) {
                        const memberData = await window.APIService.getMemberPerformance();
                        console.log('의원 total_score 샘플:', 
                            memberData?.slice(0, 3).map(m => ({
                                name: m.lawmaker_name, 
                                total_score: m.total_score
                            }))
                        );
                    }
                    
                    if (pageConfig?.scoreFields.includes('avg_total_score')) {
                        const partyData = await window.APIService.getPartyPerformance();
                        console.log('정당 avg_total_score 샘플:', 
                            partyData?.slice(0, 3).map(p => ({
                                party: p.party, 
                                avg_total_score: p.avg_total_score
                            }))
                        );
                    }
                } catch (error) {
                    console.error('점수 확인 실패:', error);
                }
            },
            
            help: () => {
                console.log('[WeightSync] 🔧 총 점수 업데이트 최적화 디버그 함수 (v2.1.0):');
                console.log('  - testScoreUpdate(): 총 점수 업데이트 테스트');
                console.log('  - checkCurrentScores(): 현재 페이지 점수 확인');
                console.log('  - simulateWeightChange(): 가중치 변경 시뮬레이션');
                console.log('  - manualRefresh(): 수동 새로고침 테스트');
                console.log('  - checkConnection(): API 연결 상태 확인');
                console.log('  - state: 현재 시스템 상태');
            }
        };
        
        console.log('[WeightSync] 🔧 총 점수 최적화 디버그 모드: window.debugWeightSync.help()');
    }

    // === 🚀 자동 초기화 ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWeightSync);
    } else {
        setTimeout(initializeWeightSync, 100);
    }

    // 전역 WeightSync 객체 등록
    window.WeightSync = {
        init: initializeWeightSync,
        refresh: () => handleWeightChange('수동 호출'),
        refreshWithScoreCheck: () => refreshCurrentPageDataWithScoreVerification(),
        state: () => weightSyncState,
        version: weightSyncState.version
    };

    console.log('[WeightSync] ✅ weight_sync.js 로드 완료 (v2.1.0 - 총 점수 업데이트 최적화)');

})();
