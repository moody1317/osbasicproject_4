/**
 * weight_sync.js
 * 가중치 변경 감지 및 자동 적용 시스템
 * 모든 페이지에서 import하여 사용
 */

(function() {
    'use strict';

    // === 📋 가중치 영향 받는 API 엔드포인트 매핑 ===
    const WEIGHT_AFFECTED_APIS = {
        // 메인 서버 (osprojectapi.onrender.com)
        MAIN_SERVER: {
            memberPerformance: '/performance/api/performance/',
            attendance: '/attendance/attendance/',
            partyPerformance: '/performance/api/party_performance/',
            partyMemberPerformance: '/performance/api/performance/by-party/'
        },
        
        // 랭킹 서버 (baekilha.onrender.com)
        RANKING_SERVER: {
            memberRanking: '/ranking/members/',
            partyScoreRanking: '/ranking/parties/score/',
            partyStatsRanking: '/ranking/parties/stats/',
            chatbot: '/api/chatbot/',
            compareMember: '/compare_members/',
            compareParty: '/compare_parties/'
        }
    };

    // === 🎯 페이지별 매핑 정보 ===
    const PAGE_API_MAPPING = {
        'rank_member.html': {
            primaryAPIs: ['memberPerformance', 'memberRanking'],
            secondaryAPIs: ['attendance'],
            refreshFunctions: ['refreshMemberRanking', 'loadMemberData', 'updateMemberRanking']
        },
        'rank_party.html': {
            primaryAPIs: ['partyPerformance', 'partyScoreRanking', 'partyStatsRanking'],
            secondaryAPIs: [],
            refreshFunctions: ['refreshPartyRanking', 'loadPartyData', 'updatePartyRanking']
        },
        'percent_member.html': {
            primaryAPIs: ['memberPerformance', 'memberRanking'],
            secondaryAPIs: ['attendance', 'partyMemberPerformance'],
            refreshFunctions: ['refreshMemberDetails', 'loadMemberDetailData']
        },
        'percent_party.html': {
            primaryAPIs: ['partyPerformance', 'partyScoreRanking'],
            secondaryAPIs: ['partyMemberPerformance'],
            refreshFunctions: ['refreshPartyDetails', 'loadPartyDetailData']
        },
        'compare_member.html': {
            primaryAPIs: ['compareMember', 'memberPerformance'],
            secondaryAPIs: ['memberRanking'],
            refreshFunctions: ['refreshComparison', 'updateComparisonData', 'reloadComparison']
        },
        'compare_party.html': {
            primaryAPIs: ['compareParty', 'partyPerformance'],
            secondaryAPIs: ['partyScoreRanking'],
            refreshFunctions: ['refreshPartyComparison', 'updatePartyComparisonData', 'reloadPartyComparison']
        },
        'meeting.html': {
            primaryAPIs: [],
            secondaryAPIs: ['memberPerformance'],
            refreshFunctions: ['refreshMeetingData']
        },
        'petition.html': {
            primaryAPIs: [],
            secondaryAPIs: ['memberPerformance'],
            refreshFunctions: ['refreshPetitionData']
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
        connectedAPIs: {
            main: false,
            ranking: false
        },
        initialized: false
    };

    // === 🔍 API 연결 상태 확인 ===
    async function checkAPIConnections() {
        try {
            weightSyncState.connectedAPIs.main = window.APIService && window.APIService._isReady;
            
            if (weightSyncState.connectedAPIs.main) {
                try {
                    weightSyncState.connectedAPIs.ranking = 
                        typeof window.APIService.getMemberScoreRanking === 'function' &&
                        typeof window.APIService.getPartyScoreRanking === 'function';
                } catch (e) {
                    weightSyncState.connectedAPIs.ranking = false;
                }
            }
            
            console.log('🔗 [WeightSync] API 연결 상태:', weightSyncState.connectedAPIs);
            return weightSyncState.connectedAPIs.main || weightSyncState.connectedAPIs.ranking;
            
        } catch (error) {
            console.warn('[WeightSync] API 연결 상태 확인 실패:', error);
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
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
                    color: white;
                    border-radius: 8px;
                    z-index: 10000;
                    font-size: 13px;
                    max-width: 300px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
            
            const isConnected = await checkAPIConnections();
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

    // === 📊 페이지별 세부 새로고침 함수들 ===
    
    async function refreshMemberRankingPage() {
        console.log('[WeightSync] 🏆 의원 랭킹 페이지 새로고침...');
        
        try {
            let newData = null;
            
            if (weightSyncState.connectedAPIs.ranking) {
                try {
                    newData = await window.APIService.getMemberScoreRanking();
                    console.log('[WeightSync] ✅ 랭킹 서버에서 의원 랭킹 데이터 로드');
                } catch (e) {
                    console.warn('[WeightSync] 랭킹 서버 실패, 메인 서버로 폴백:', e.message);
                }
            }
            
            if (!newData && weightSyncState.connectedAPIs.main) {
                newData = await window.APIService.getMemberPerformance();
                console.log('[WeightSync] ✅ 메인 서버에서 의원 성과 데이터 로드');
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
            
            if (weightSyncState.connectedAPIs.ranking) {
                try {
                    const [scoreRanking, statsRanking] = await Promise.all([
                        window.APIService.getPartyScoreRanking(),
                        window.APIService.getPartyStatsRanking()
                    ]);
                    
                    newData = {
                        scoreRanking: scoreRanking,
                        statsRanking: statsRanking,
                        source: 'ranking_server'
                    };
                    
                    console.log('[WeightSync] ✅ 랭킹 서버에서 정당 랭킹 데이터 로드');
                } catch (e) {
                    console.warn('[WeightSync] 랭킹 서버 실패, 메인 서버로 폴백:', e.message);
                }
            }
            
            if (!newData && weightSyncState.connectedAPIs.main) {
                newData = await window.APIService.getPartyRanking();
                console.log('[WeightSync] ✅ 메인 서버에서 정당 성과 데이터 로드');
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
            const memberData = await window.APIService.getMemberPerformance();
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
            const partyData = await window.APIService.getPartyStats();
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
                let newData = null;
                
                if (weightSyncState.connectedAPIs.ranking) {
                    try {
                        newData = await window.APIService.compareMembersAdvanced(
                            currentComparison.member1, 
                            currentComparison.member2
                        );
                        console.log('[WeightSync] ✅ 랭킹 서버에서 의원 비교 데이터 로드');
                    } catch (e) {
                        console.warn('[WeightSync] 랭킹 서버 비교 실패:', e.message);
                    }
                }
                
                if (!newData && weightSyncState.connectedAPIs.main) {
                    const memberData = await window.APIService.getMemberPerformance();
                    newData = filterComparisonData(memberData, currentComparison);
                    console.log('[WeightSync] ✅ 메인 서버 데이터로 의원 비교 구성');
                }
                
                if (newData) {
                    await updatePageWithNewData('member_comparison', newData);
                }
            } else {
                console.log('[WeightSync] 현재 비교 중인 의원이 없어 전체 데이터를 새로고침합니다.');
                const memberData = await window.APIService.getMemberPerformance();
                await updatePageWithNewData('member_comparison', memberData);
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
                let newData = null;
                
                if (weightSyncState.connectedAPIs.ranking) {
                    try {
                        newData = await window.APIService.comparePartiesAdvanced(
                            currentComparison.party1, 
                            currentComparison.party2
                        );
                        console.log('[WeightSync] ✅ 랭킹 서버에서 정당 비교 데이터 로드');
                    } catch (e) {
                        console.warn('[WeightSync] 랭킹 서버 비교 실패:', e.message);
                    }
                }
                
                if (!newData && weightSyncState.connectedAPIs.main) {
                    const partyData = await window.APIService.getPartyStats();
                    newData = filterComparisonData(partyData, currentComparison);
                    console.log('[WeightSync] ✅ 메인 서버 데이터로 정당 비교 구성');
                }
                
                if (newData) {
                    await updatePageWithNewData('party_comparison', newData);
                }
            } else {
                console.log('[WeightSync] 현재 비교 중인 정당이 없어 전체 데이터를 새로고침합니다.');
                const partyData = await window.APIService.getPartyStats();
                await updatePageWithNewData('party_comparison', partyData);
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
                const member1Element = document.querySelector('[data-member1]');
                const member2Element = document.querySelector('[data-member2]');
                
                if (member1Element && member2Element) {
                    return {
                        member1: member1Element.dataset.member1 || member1Element.textContent?.trim(),
                        member2: member2Element.dataset.member2 || member2Element.textContent?.trim()
                    };
                }
            } else if (type === 'party') {
                const party1Element = document.querySelector('[data-party1]');
                const party2Element = document.querySelector('[data-party2]');
                
                if (party1Element && party2Element) {
                    return {
                        party1: party1Element.dataset.party1 || party1Element.textContent?.trim(),
                        party2: party2Element.dataset.party2 || party2Element.textContent?.trim()
                    };
                }
            }
            
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
                const itemName = item.name || item.member_name || item.party_name || item.정당명 || item.의원명;
                return values.includes(itemName);
            });
            
        } catch (error) {
            console.warn('[WeightSync] 비교 데이터 필터링 실패:', error);
            return allData;
        }
    }
    
    async function updatePageWithNewData(dataType, newData) {
        try {
            const updateFunctions = [
                `update${dataType.charAt(0).toUpperCase() + dataType.slice(1)}Data`,
                `refresh${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`,
                'updatePageData',
                'refreshData',
                'reloadData'
            ];
            
            for (const funcName of updateFunctions) {
                if (typeof window[funcName] === 'function') {
                    console.log(`[WeightSync] 📊 ${funcName} 함수로 데이터 업데이트`);
                    await window[funcName](newData);
                    return;
                }
            }
            
            const event = new CustomEvent('weightDataUpdate', {
                detail: { dataType, newData }
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
            'refreshPageData',
            'reloadPageData', 
            'updateAllData',
            'init',
            'initialize',
            'loadData'
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
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 1000;
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 25px;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
                font-family: 'Blinker', sans-serif;
                font-weight: 500;
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
            console.log('[WeightSync] 🚀 가중치 동기화 시스템 초기화...');
            
            // API 연결 상태 확인
            const isConnected = await checkAPIConnections();
            console.log(`[WeightSync] 🔗 API 연결 상태: 메인(${weightSyncState.connectedAPIs.main}) 랭킹(${weightSyncState.connectedAPIs.ranking})`);
            
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
            console.log('[WeightSync] ✅ 가중치 동기화 시스템 초기화 완료');
            
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
            checkConnections: checkAPIConnections,
            
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
            
            testPageRefresh: (pageType) => {
                const functions = {
                    member: refreshMemberRankingPage,
                    party: refreshPartyRankingPage,
                    comparison: refreshMemberComparisonPage
                };
                
                if (functions[pageType]) {
                    return functions[pageType]();
                } else {
                    console.log('[WeightSync] 사용 가능한 타입: member, party, comparison');
                }
            },
            
            help: () => {
                console.log('[WeightSync] 🔧 가중치 동기화 디버그 함수:');
                console.log('  - manualRefresh(): 수동 새로고침 테스트');
                console.log('  - simulateWeightChange(): 가중치 변경 시뮬레이션');
                console.log('  - testNotification(message, type): 알림 테스트');
                console.log('  - testPageRefresh(type): 페이지별 새로고침 테스트');
                console.log('  - checkConnections(): API 연결 상태 확인');
            }
        };
        
        console.log('[WeightSync] 🔧 디버그 모드: window.debugWeightSync.help()');
    }

    // === 🚀 자동 초기화 ===
    // DOM 로드 후 초기화
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
        version: '1.0.0'
    };

    console.log('[WeightSync] ✅ weight_sync.js 로드 완료');

})();