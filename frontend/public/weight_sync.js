/**
 * weight_sync.js (v2.0.0)
 */

(function() {
    'use strict';

    // === 📋 가중치 영향 받는 API 엔드포인트 매핑 (새로운 구조) ===
    const WEIGHT_AFFECTED_APIS = {
        MAIN_APIs: {
            memberPerformance: 'getMemberPerformance',
            memberAttendance: 'getMemberAttendance',
            memberRanking: 'getMemberRanking',
            memberBillCount: 'getMemberBillCount',
            partyPerformance: 'getPartyPerformance',
            partyScoreRanking: 'getPartyScoreRanking',
            partyStatsRanking: 'getPartyStatsRanking',
            partyMemberPerformance: 'getPartyMemberPerformance',
            compareMembers: 'compareMembers',
            compareParties: 'compareParties'
        }
    };

    // === 🎯 페이지별 매핑 정보 (업데이트) ===
    const PAGE_API_MAPPING = {
        'rank_member.html': {
            primaryAPIs: ['memberPerformance', 'memberRanking'],
            secondaryAPIs: ['memberAttendance', 'memberBillCount'],
            refreshFunctions: ['refreshMemberRankingData', 'loadMemberData', 'updateMemberRanking', 'fetchMemberData']
        },
        'rank_party.html': {
            primaryAPIs: ['partyPerformance', 'partyScoreRanking'],
            secondaryAPIs: ['partyStatsRanking'],
            refreshFunctions: ['refreshPartyRankingData', 'loadPartyData', 'updatePartyRanking', 'fetchPartyData']
        },
        'percent_member.html': {
            primaryAPIs: ['memberPerformance'],
            secondaryAPIs: ['memberAttendance', 'memberBillCount'],
            refreshFunctions: ['refreshMemberDetails', 'loadMemberDetailData', 'updateMemberDetails']
        },
        'percent_party.html': {
            primaryAPIs: ['partyPerformance'],
            secondaryAPIs: ['partyMemberPerformance', 'partyStatsRanking'],
            refreshFunctions: ['refreshPartyDetails', 'loadPartyDetailData', 'updatePartyDetails']
        },
        'compare_member.html': {
            primaryAPIs: ['compareMembers', 'memberPerformance'],
            secondaryAPIs: ['memberRanking', 'memberAttendance'],
            refreshFunctions: ['refreshCompareMemberData', 'fetchMemberData', 'updateCompareMemberData', 'loadComparisonData']
        },
        'compare_party.html': {
            primaryAPIs: ['compareParties', 'partyPerformance'],
            secondaryAPIs: ['partyScoreRanking', 'partyStatsRanking'],
            refreshFunctions: ['refreshPartyComparison', 'updatePartyComparisonData', 'loadPartyComparison']
        },
        'meeting.html': {
            primaryAPIs: [],
            secondaryAPIs: ['memberPerformance'],
            refreshFunctions: ['refreshMeetingData', 'loadMeetingData']
        },
        'petition.html': {
            primaryAPIs: [],
            secondaryAPIs: ['memberPerformance'],
            refreshFunctions: ['refreshPetitionData', 'loadPetitionData']
        }
    };

    // === 🔧 시스템 상태 관리 ===
    let weightSyncState = {
        isRefreshing: false,
        lastWeightCheck: localStorage.getItem('last_weight_update') || '0',
        refreshAttempts: 0,
        maxRefreshAttempts: 3,
        refreshCooldown: false,
        currentPage: window.location.pathname.split('/').pop(),
        apiConnected: false,
        initialized: false,
        version: '2.0.0'
    };

    // === 🔍 API 연결 상태 확인 ===
    async function checkAPIConnection() {
        try {
            const isReady = window.APIService && window.APIService._isReady && !window.APIService._hasError;
            
            if (isReady) {
                // 간단한 API 테스트
                try {
                    await window.APIService.getAllMembers();
                    weightSyncState.apiConnected = true;
                } catch (e) {
                    console.warn('[WeightSync] API 테스트 실패:', e.message);
                    weightSyncState.apiConnected = false;
                }
            } else {
                weightSyncState.apiConnected = false;
            }
            
            console.log('🔗 [WeightSync] API 연결 상태:', weightSyncState.apiConnected);
            return weightSyncState.apiConnected;
            
        } catch (error) {
            console.warn('[WeightSync] API 연결 상태 확인 실패:', error);
            weightSyncState.apiConnected = false;
            return false;
        }
    }

    // === 🔔 알림 시스템 ===
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
                    max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-family: 'Blinker', sans-serif;
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

    // === 🔄 가중치 변경 처리 함수 ===
    async function handleWeightChange(source, eventData = null) {
        if (weightSyncState.isRefreshing || weightSyncState.refreshCooldown) {
            console.log('[WeightSync] 🔄 이미 새로고침 중이거나 쿨다운 상태입니다.');
            return;
        }

        try {
            weightSyncState.isRefreshing = true;
            weightSyncState.refreshAttempts++;
            
            console.log(`[WeightSync] 🔄 가중치 변경 감지 (${source}) - ${weightSyncState.currentPage} 페이지 새로고침 시작`);
            
            const isConnected = await checkAPIConnection();
            if (!isConnected) {
                throw new Error('API 서버에 연결할 수 없습니다');
            }
            
            showWeightChangeNotification('가중치가 변경되었습니다. 데이터를 새로고침합니다...', 'info');
            
            await refreshCurrentPageData();
            
            weightSyncState.refreshAttempts = 0;
            console.log('[WeightSync] ✅ 가중치 변경 적용 완료');
            
            showWeightChangeNotification('새로운 가중치가 적용되었습니다! 🎉', 'success');
            
            weightSyncState.refreshCooldown = true;
            setTimeout(() => {
                weightSyncState.refreshCooldown = false;
            }, 5000);
            
            // 응답 전송 (percent 페이지 모니터링용)
            try {
                const response = {
                    page: weightSyncState.currentPage,
                    timestamp: new Date().toISOString(),
                    success: true,
                    source: source
                };
                localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
            } catch (e) {
                console.warn('[WeightSync] 응답 전송 실패:', e);
            }
            
        } catch (error) {
            console.error('[WeightSync] ❌ 가중치 변경 적용 실패:', error);
            
            if (weightSyncState.refreshAttempts < weightSyncState.maxRefreshAttempts) {
                console.log(`[WeightSync] 🔄 재시도 예정 (${weightSyncState.refreshAttempts}/${weightSyncState.maxRefreshAttempts})`);
                
                showWeightChangeNotification(`새로고침 실패. 재시도 중... (${weightSyncState.refreshAttempts}/${weightSyncState.maxRefreshAttempts})`, 'warning');
                
                setTimeout(() => {
                    weightSyncState.isRefreshing = false;
                    handleWeightChange(`재시도 ${weightSyncState.refreshAttempts}`);
                }, 2000 * weightSyncState.refreshAttempts);
                
            } else {
                weightSyncState.refreshAttempts = 0;
                showWeightChangeNotification('가중치 적용에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
                
                if (confirm('자동 가중치 적용에 실패했습니다. 페이지를 새로고침하시겠습니까?')) {
                    window.location.reload();
                }
            }
        } finally {
            weightSyncState.isRefreshing = false;
        }
    }

    // === 📄 페이지별 데이터 새로고침 함수 ===
    async function refreshCurrentPageData() {
        const currentPage = weightSyncState.currentPage;
        const pageConfig = PAGE_API_MAPPING[currentPage];
        
        if (!pageConfig) {
            console.log(`[WeightSync] ${currentPage}는 가중치 영향을 받지 않는 페이지입니다.`);
            return;
        }

        console.log(`[WeightSync] 🔄 ${currentPage} 페이지 새로고침 시작...`);
        console.log(`[WeightSync] 📊 영향 받는 API: ${pageConfig.primaryAPIs.join(', ')}`);

        // 페이지별 전용 새로고침 함수 시도
        for (const funcName of pageConfig.refreshFunctions) {
            if (typeof window[funcName] === 'function') {
                console.log(`[WeightSync] ✅ ${funcName} 함수 실행`);
                await window[funcName]();
                return;
            }
        }

        // 전용 함수가 없으면 API별 새로고침
        await refreshByAPIType(currentPage, pageConfig);
    }

    // === 🎯 API 타입별 새로고침 ===
    async function refreshByAPIType(currentPage, pageConfig) {
        try {
            switch(currentPage) {
                case 'rank_member.html':
                    await refreshMemberRankingPage();
                    break;
                    
                case 'rank_party.html':
                    await refreshPartyRankingPage();
                    break;
                    
                case 'percent_member.html':
                    await refreshMemberDetailsPage();
                    break;
                    
                case 'percent_party.html':
                    await refreshPartyDetailsPage();
                    break;
                    
                case 'compare_member.html':
                    await refreshMemberComparisonPage();
                    break;
                    
                case 'compare_party.html':
                    await refreshPartyComparisonPage();
                    break;
                    
                default:
                    console.log(`[WeightSync] ${currentPage}: 기본 새로고침 수행`);
                    await performGenericRefresh();
                    break;
            }
        } catch (error) {
            console.error(`[WeightSync] ${currentPage} 새로고침 실패:`, error);
            throw error;
        }
    }

    // === 📊 페이지별 세부 새로고침 함수들 (새로운 API 함수명 사용) ===
    
    async function refreshMemberRankingPage() {
        console.log('[WeightSync] 🏆 의원 랭킹 페이지 새로고침...');
        
        try {
            let newData = null;
            
            // 새로운 API 함수 사용
            try {
                const [performanceData, rankingData, attendanceData] = await Promise.allSettled([
                    window.APIService.getMemberPerformance(),
                    window.APIService.getMemberRanking(),
                    window.APIService.getMemberAttendance()
                ]);
                
                newData = {
                    performance: performanceData.status === 'fulfilled' ? performanceData.value : null,
                    ranking: rankingData.status === 'fulfilled' ? rankingData.value : null,
                    attendance: attendanceData.status === 'fulfilled' ? attendanceData.value : null,
                    source: 'django_api'
                };
                
                console.log('[WeightSync] ✅ 의원 랭킹 데이터 로드 완료');
            } catch (e) {
                console.error('[WeightSync] 의원 랭킹 데이터 로드 실패:', e.message);
                throw e;
            }
            
            if (!newData) {
                throw new Error('의원 데이터를 가져올 수 없습니다');
            }
            
            await updatePageWithNewData('member_ranking', newData);
            
        } catch (error) {
            console.error('[WeightSync] 의원 랭킹 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshPartyRankingPage() {
        console.log('[WeightSync] 🏛️ 정당 랭킹 페이지 새로고침...');
        
        try {
            let newData = null;
            
            try {
                const [performanceData, scoreRanking, statsRanking] = await Promise.allSettled([
                    window.APIService.getPartyPerformance(),
                    window.APIService.getPartyScoreRanking(),
                    window.APIService.getPartyStatsRanking()
                ]);

                newData = {
                    performance: performanceData.status === 'fulfilled' ? performanceData.value : null,
                    scoreRanking: scoreRanking.status === 'fulfilled' ? scoreRanking.value : null,
                    statsRanking: statsRanking.status === 'fulfilled' ? statsRanking.value : null,
                    source: 'django_api'
                };
                
                console.log('[WeightSync] ✅ 정당 랭킹 데이터 로드 완료');
            } catch (e) {
                console.error('[WeightSync] 정당 랭킹 데이터 로드 실패:', e.message);
                throw e;
            }
            
            if (!newData) {
                throw new Error('정당 데이터를 가져올 수 없습니다');
            }
            
            await updatePageWithNewData('party_ranking', newData);
            
        } catch (error) {
            console.error('[WeightSync] 정당 랭킹 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshMemberDetailsPage() {
        console.log('[WeightSync] 👤 의원 상세 정보 페이지 새로고침...');
        
        try {
            const [performanceData, attendanceData, billCountData] = await Promise.allSettled([
                window.APIService.getMemberPerformance(),
                window.APIService.getMemberAttendance(),
                window.APIService.getMemberBillCount()
            ]);
            
            const memberData = {
                performance: performanceData.status === 'fulfilled' ? performanceData.value : null,
                attendance: attendanceData.status === 'fulfilled' ? attendanceData.value : null,
                billCount: billCountData.status === 'fulfilled' ? billCountData.value : null,
                source: 'django_api'
            };
            
            console.log('[WeightSync] ✅ 의원 상세 데이터 로드 완료');
            await updatePageWithNewData('member_details', memberData);
            
        } catch (error) {
            console.error('[WeightSync] 의원 상세 정보 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshPartyDetailsPage() {
        console.log('[WeightSync] 🏛️ 정당 상세 정보 페이지 새로고침...');
        
        try {
            const [performanceData, statsData] = await Promise.allSettled([
                window.APIService.getPartyPerformance(),
                window.APIService.getPartyStats()
            ]);
            
            const partyData = {
                performance: performanceData.status === 'fulfilled' ? performanceData.value : null,
                stats: statsData.status === 'fulfilled' ? statsData.value : null,
                source: 'django_api'
            };
            
            console.log('[WeightSync] ✅ 정당 상세 데이터 로드 완료');
            await updatePageWithNewData('party_details', partyData);
            
        } catch (error) {
            console.error('[WeightSync] 정당 상세 정보 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshMemberComparisonPage() {
        console.log('[WeightSync] ⚖️ 의원 비교 페이지 새로고침...');
        
        try {
            const currentComparison = getCurrentComparisonData('member');
            
            if (currentComparison && currentComparison.member1 && currentComparison.member2) {
                try {
                    const comparisonData = await window.APIService.compareMembers(
                        currentComparison.member1, 
                        currentComparison.member2
                    );
                    console.log('[WeightSync] ✅ 의원 비교 데이터 로드 완료');
                    await updatePageWithNewData('member_comparison', comparisonData);
                } catch (e) {
                    console.warn('[WeightSync] 직접 비교 실패, 전체 데이터로 폴백:', e.message);
                    
                    // 폴백: 전체 의원 데이터로 비교 구성
                    const memberData = await window.APIService.getMemberPerformance();
                    const filteredData = filterComparisonData(memberData, currentComparison);
                    await updatePageWithNewData('member_comparison', filteredData);
                }
            } else {
                // 현재 비교 중인 의원이 없으면 전체 데이터 새로고침
                console.log('[WeightSync] 현재 비교 중인 의원이 없어 전체 데이터를 새로고침합니다.');
                const memberData = await window.APIService.getMemberPerformance();
                await updatePageWithNewData('member_comparison_all', memberData);
            }
            
        } catch (error) {
            console.error('[WeightSync] 의원 비교 새로고침 실패:', error);
            throw error;
        }
    }
    
    async function refreshPartyComparisonPage() {
        console.log('[WeightSync] ⚖️ 정당 비교 페이지 새로고침...');
        
        try {
            const currentComparison = getCurrentComparisonData('party');
            
            if (currentComparison && currentComparison.party1 && currentComparison.party2) {
                try {
                    const comparisonData = await window.APIService.compareParties(
                        currentComparison.party1, 
                        currentComparison.party2
                    );
                    console.log('[WeightSync] ✅ 정당 비교 데이터 로드 완료');
                    await updatePageWithNewData('party_comparison', comparisonData);
                } catch (e) {
                    console.warn('[WeightSync] 직접 비교 실패, 전체 데이터로 폴백:', e.message);
                    
                    // 폴백: 전체 정당 데이터로 비교 구성
                    const partyData = await window.APIService.getPartyPerformance();
                    const filteredData = filterComparisonData(partyData, currentComparison);
                    await updatePageWithNewData('party_comparison', filteredData);
                }
            } else {
                // 현재 비교 중인 정당이 없으면 전체 데이터 새로고침
                console.log('[WeightSync] 현재 비교 중인 정당이 없어 전체 데이터를 새로고침합니다.');
                const partyData = await window.APIService.getPartyPerformance();
                await updatePageWithNewData('party_comparison_all', partyData);
            }
            
        } catch (error) {
            console.error('[WeightSync] 정당 비교 새로고침 실패:', error);
            throw error;
        }
    }
    
    // === 🔧 헬퍼 함수들 ===
    
    function getCurrentComparisonData(type) {
        try {
            if (type === 'member') {
                // DOM에서 현재 선택된 의원 정보 찾기
                const member1Element = document.querySelector('[data-member1]') || 
                                    document.querySelector('.mp-selected-name:first-of-type') ||
                                    document.querySelector('.comparison-card:first-child .mp-selected-name') ||
                                    document.querySelector('#member1-name') ||
                                    document.querySelector('.member1-display');
                
                const member2Element = document.querySelector('[data-member2]') ||
                                     document.querySelector('.mp-selected-name:last-of-type') ||
                                     document.querySelector('.comparison-card:last-child .mp-selected-name') ||
                                     document.querySelector('#member2-name') ||
                                     document.querySelector('.member2-display');
                
                if (member1Element && member2Element) {
                    const member1 = member1Element.dataset?.member1 || member1Element.textContent?.trim();
                    const member2 = member2Element.dataset?.member2 || member2Element.textContent?.trim();
                    
                    if (member1 && member2 && 
                        member1 !== '국회의원을 검색하세요' && member2 !== '국회의원을 검색하세요' &&
                        member1 !== '선택된 의원이 없습니다' && member2 !== '선택된 의원이 없습니다') {
                        return { member1, member2 };
                    }
                }
            } else if (type === 'party') {
                // 정당 비교 데이터 찾기
                const party1Element = document.querySelector('[data-party1]') ||
                                    document.querySelector('.party-selected:first-of-type') ||
                                    document.querySelector('#party1-name') ||
                                    document.querySelector('.party1-display');
                                    
                const party2Element = document.querySelector('[data-party2]') ||
                                    document.querySelector('.party-selected:last-of-type') ||
                                    document.querySelector('#party2-name') ||
                                    document.querySelector('.party2-display');
                
                if (party1Element && party2Element) {
                    const party1 = party1Element.dataset?.party1 || party1Element.textContent?.trim();
                    const party2 = party2Element.dataset?.party2 || party2Element.textContent?.trim();
                    
                    if (party1 && party2 && 
                        party1 !== '정당을 선택하세요' && party2 !== '정당을 선택하세요') {
                        return { party1, party2 };
                    }
                }
            }
            
            // localStorage에서 백업 데이터 시도
            const saved = localStorage.getItem(`current_${type}_comparison`);
            return saved ? JSON.parse(saved) : null;
            
        } catch (error) {
            console.warn('[WeightSync] 현재 비교 데이터 가져오기 실패:', error);
            return null;
        }
    }
    
    function filterComparisonData(allData, comparison) {
        try {
            if (!Array.isArray(allData)) return allData;
            
            const keys = Object.keys(comparison);
            const values = Object.values(comparison);
            
            return allData.filter(item => {
                const itemName = item.name || item.member_name || item.party_name || 
                               item.lawmaker_name || item.party || item.HG_NM || item.POLY_NM;
                return values.includes(itemName);
            });
            
        } catch (error) {
            console.warn('[WeightSync] 비교 데이터 필터링 실패:', error);
            return allData;
        }
    }
    
    async function updatePageWithNewData(dataType, newData) {
        try {
            // 페이지별 업데이트 함수들 (우선순위 순)
            const updateFunctionNames = [
                // 페이지별 특화 함수들
                `update${dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/_/g, '')}Data`,
                `refresh${dataType.charAt(0).toUpperCase() + dataType.slice(1).replace(/_/g, '')}`,
                // 일반적인 함수들
                'updatePageData',
                'refreshData',
                'reloadData',
                'loadData',
                'fetchMemberData', // compare_member.html용
                'loadPartyData',   // rank_party.html용
                'updateChartData', // 차트 업데이트용
                'refreshCharts',   // 차트 새로고침용
                'renderData'       // 데이터 렌더링용
            ];
            
            for (const funcName of updateFunctionNames) {
                if (typeof window[funcName] === 'function') {
                    console.log(`[WeightSync] 📊 ${funcName} 함수로 데이터 업데이트`);
                    await window[funcName](newData);
                    return;
                }
            }
            
            // 함수가 없으면 커스텀 이벤트 발생
            const event = new CustomEvent('weightDataUpdate', {
                detail: { dataType, newData, timestamp: new Date().toISOString() }
            });
            document.dispatchEvent(event);
            
            console.log('[WeightSync] 📊 커스텀 이벤트로 데이터 업데이트 알림');
            
        } catch (error) {
            console.warn('[WeightSync] 페이지 데이터 업데이트 실패:', error);
            throw new Error('데이터 업데이트 실패 - 페이지 새로고침 필요');
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

    // === 🔧 개발자 도구용 디버그 함수 ===
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugWeightSync = {
            state: weightSyncState,
            apis: WEIGHT_AFFECTED_APIS,
            pageMapping: PAGE_API_MAPPING,
            
            manualRefresh: () => handleWeightChange('수동 테스트'),
            checkConnection: checkAPIConnection,
            
            simulateWeightChange: () => {
                const event = {
                    type: 'weights_updated',
                    timestamp: new Date().toISOString(),
                    source: 'debug_test'
                };
                localStorage.setItem('weight_change_event', JSON.stringify(event));
                localStorage.setItem('last_weight_update', Date.now().toString());
                setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
            },
            
            testNotification: (message = '테스트 알림입니다', type = 'info') => {
                showWeightChangeNotification(message, type);
            },
            
            testPageRefresh: async (pageType) => {
                const functions = {
                    member: refreshMemberRankingPage,
                    party: refreshPartyRankingPage,
                    comparison_member: refreshMemberComparisonPage,
                    comparison_party: refreshPartyComparisonPage,
                    member_details: refreshMemberDetailsPage,
                    party_details: refreshPartyDetailsPage
                };
                
                if (functions[pageType]) {
                    return await functions[pageType]();
                } else {
                    console.log('[WeightSync] 사용 가능한 타입: member, party, comparison_member, comparison_party, member_details, party_details');
                }
            },
            
            getCurrentComparison: (type) => getCurrentComparisonData(type),
            
            testAPI: async (apiName) => {
                if (window.APIService && typeof window.APIService[apiName] === 'function') {
                    try {
                        console.log(`[WeightSync] ${apiName} API 테스트 시작...`);
                        const result = await window.APIService[apiName]();
                        console.log(`[WeightSync] ${apiName} API 테스트 성공:`, result);
                        return result;
                    } catch (error) {
                        console.error(`[WeightSync] ${apiName} API 테스트 실패:`, error);
                        throw error;
                    }
                } else {
                    console.error(`[WeightSync] ${apiName} API 함수를 찾을 수 없습니다.`);
                }
            },
            
            help: () => {
                console.log('[WeightSync] 🔧 가중치 동기화 디버그 함수 (v2.0.0):');
                console.log('  - manualRefresh(): 수동 새로고침 테스트');
                console.log('  - simulateWeightChange(): 가중치 변경 시뮬레이션');
                console.log('  - testNotification(message, type): 알림 테스트');
                console.log('  - testPageRefresh(type): 페이지별 새로고침 테스트');
                console.log('  - getCurrentComparison(type): 현재 비교 데이터 확인');
                console.log('  - checkConnection(): API 연결 상태 확인');
                console.log('  - testAPI(apiName): 특정 API 테스트');
                console.log('  - state: 현재 시스템 상태');
            }
        };
        
        console.log('[WeightSync] 🔧 디버그 모드: window.debugWeightSync.help()');
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
        state: () => weightSyncState,
        version: weightSyncState.version
    };

    console.log('[WeightSync] ✅ weight_sync.js 로드 완료 (v2.0.0 - Django API 연동)');

})();
