/**
 * 백일하(Baek-il-ha) - 안정성 개선된 버전 + 정당별 성과 조회 기능 추가
 */

(function() {
    'use strict';

    // APIService 로딩 실패 시에도 기본 객체 등록
    if (typeof window.APIService === 'undefined') {
        window.APIService = {
            // 기본 더미 함수들 (메뉴바가 작동하도록)
            showNotification: function(message, type = 'info') {
                console.log(`[알림] ${message} (${type})`);
            },
            getEnvironmentInfo: function() {
                return {
                    isVercel: window.location.hostname.includes('vercel'),
                    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                };
            },
            // 기본 상태 플래그
            _isReady: false,
            _hasError: false
        };
    }

    // API 설정
    const API_CONFIG = {
        // 다중 서버 지원
        SERVERS: {
            MAIN: 'https://osprojectapi.onrender.com',     // 기존 서버
            RANKING: 'https://baekilha.onrender.com'       // 새로운 랭킹/분석 서버
        },
        
        // 하위호환성을 위한 기본 URL (기존 코드 동작 보장)
        BASE_URL: 'https://osprojectapi.onrender.com',
        
        ENDPOINTS: {
            // === 기존 서버 (osprojectapi.onrender.com) ===
            MAIN_SERVER: {
                // 본회의 현황용 API
                ALL: '/legislation/all',
                COSTLY: '/legislation/costly',
                COST: '/legislation/cost',
                ETC: '/legislation/etc',
                LAW: '/legislation/law',
                
                // 퍼센트 계산 전용 API
                BILL: '/legislation/bill',
                BILL_COUNT: '/legislation/bill-count',
                
                // 기타 데이터 API
                COMMITTEE_MEMBER: '/legislation/committee-member/',
                MEMBER: '/legislation/member/',
                PETITION: '/legislation/petition',
                PETITION_INTRODUCER: '/legislation/petition-introducer/',
                PHOTO: '/legislation/photo',
                ATTENDANCE: '/attendance/attendance/',
                    PERFORMANCE_DATA: '/performance/api/performance/',
                    PARTY_WEIGHTED_PERFORMANCE: '/performance/api/party_performance/',
                PARTY_MEMBER_PERFORMANCE: '/performance/api/performance/by-party/', // 뒤에 party 파라미터 붙여야함
                
                // 퍼센트 변경 API
                SETTING: '/performance/api/update_weights/'
            },

                            // === 새로운 서버 (baekilha.onrender.com) ===
            RANKING_SERVER: {
                // 국회의원 랭킹 관련
                MEMBER_SCORE_RANKING: '/ranking/members/',
                // 정당 랭킹 관련
                PARTY_SCORE_RANKING: '/ranking/parties/score/',
                PARTY_STATS_RANKING: '/ranking/parties/stats/',
                
                // 챗봇 API
                CHATBOT: '/api/chatbot/',
                
                // 비교 기능 (파라미터 포함)
                COMPARE_MEMBERS: '/compare_members/', // ?member1=의원명1&member2=의원명2
                COMPARE_PARTIES: '/compare_parties/' // ?party1=정당명1&party2=정당명2
            }
        },
        TIMEOUT: 10000,  // 15초 → 10초로 단축
        MAX_RETRIES: 2   // 3번 → 2번으로 단축
    };

    // 유효한 정당 목록 상수
    const VALID_PARTIES = [
        '더불어민주당',
        '국민의힘', 
        '조국혁신당',
        '진보당',
        '개혁신당',
        '사회민주당',
        '기본소득당',
        '무소속'
    ];

    // 디버그 모드 (환경에 따라 자동 설정)
    const DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 안전한 로그 함수
    function log(level, message, data = null) {
        if (!DEBUG_MODE && level === 'debug') return;
        
        try {
            const timestamp = new Date().toLocaleTimeString('ko-KR');
            const emoji = {
                debug: '🔧',
                info: 'ℹ️',
                success: '✅',
                warning: '⚠️',
                error: '❌'
            };
            
            const logMethod = level === 'error' ? 'error' : 'log';
            console[logMethod](
                `${emoji[level]} [${timestamp}] ${message}`,
                data || ''
            );
        } catch (e) {
            // 로그 함수 자체에서 에러가 나도 전체를 중단하지 않음
            console.log(`[LOG ERROR] ${message}`);
        }
    }

    // 네트워크 상태 확인 (안전한 버전)
    function checkNetworkStatus() {
        try {
            return navigator.onLine !== false; // undefined일 경우 true 반환
        } catch (e) {
            return true; // 에러 시 네트워크 연결된 것으로 가정
        }
    }

    // HTTP 요청 함수 (에러 처리 강화)
    async function makeRequest(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: API_CONFIG.TIMEOUT
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        log('debug', `API 요청: ${url}`);

        // 네트워크 상태 확인
        if (!checkNetworkStatus()) {
            throw new Error('네트워크 연결이 없습니다');
        }

        // AbortController로 타임아웃 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

        try {
            const response = await fetch(url, {
                ...finalOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            log('success', `API 성공: ${url.split('/').pop()}`);
            
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`요청 시간 초과 (${finalOptions.timeout}ms)`);
            }
            
            log('error', `API 실패: ${url.split('/').pop()}`, error.message);
            throw error;
        }
    }

    // 재시도 로직
    async function apiCallWithRetry(url, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
            try {
                return await makeRequest(url, options);
                
            } catch (error) {
                lastError = error;
                
                if (attempt < API_CONFIG.MAX_RETRIES) {
                    const delay = attempt * 1000; // 1초, 2초 대기
                    log('warning', `재시도 ${attempt}/${API_CONFIG.MAX_RETRIES} (${delay}ms 후)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    // API 응답 데이터 정규화
    function normalizeApiResponse(rawData, apiType = 'unknown') {
        try {
            if (!rawData) return [];
            
            let data = rawData;
            
            // 다양한 응답 구조 처리
            if (rawData.tvAgendaInfoService?.row) {
                data = rawData.tvAgendaInfoService.row;
            } else if (Array.isArray(rawData.row)) {
                data = rawData.row;
            } else if (Array.isArray(rawData)) {
                data = rawData;
            } else if (typeof rawData === 'object') {
                // 객체인 경우 배열로 변환
                data = [rawData];
            } else {
                log('warning', `예상치 못한 API 응답 구조 (${apiType})`);
                return [];
            }

            // 배열이 아닌 경우 배열로 변환
            if (!Array.isArray(data)) {
                data = [data];
            }

            log('success', `${apiType} 정규화 완료: ${data.length}건`);
            return data;

        } catch (error) {
            log('error', `데이터 정규화 실패 (${apiType}):`, error.message);
            return [];
        }
    }

    // 정당명 유효성 검사 함수
    function validatePartyName(partyName) {
        if (!partyName || typeof partyName !== 'string') {
            return false;
        }
        
        const trimmedParty = partyName.trim();
        return VALID_PARTIES.includes(trimmedParty);
    }

    // 안전한 알림 표시 함수
    function showNotification(message, type = 'info', duration = 3000) {
        try {
            // 기존 알림 제거
            const existing = document.querySelector('.api-notification');
            if (existing) existing.remove();

            // 새 알림 생성
            const notification = document.createElement('div');
            notification.className = `api-notification ${type}`;
            notification.textContent = message;

            // 스타일 적용
            const styles = {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '12px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: '10000',
                fontSize: '13px',
                maxWidth: '350px',
                fontFamily: 'Blinker, sans-serif',
                transition: 'all 0.3s ease',
                opacity: '0',
                transform: 'translateX(100%)'
            };

            Object.assign(notification.style, styles);

            // 타입별 색상
            const colors = {
                success: { backgroundColor: '#4caf50', color: 'white' },
                error: { backgroundColor: '#f44336', color: 'white' },
                warning: { backgroundColor: '#ff9800', color: 'white' },
                info: { backgroundColor: '#2196f3', color: 'white' }
            };

            Object.assign(notification.style, colors[type] || colors.info);

            document.body.appendChild(notification);

            // 애니메이션
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 10);

            // 자동 제거
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);

        } catch (error) {
            // 알림 표시 실패 시 콘솔로 대체
            console.log(`[알림] ${message} (${type})`);
        }
    }

    // 안전한 API 서비스 생성
    function createAPIService() {
        try {
            return {
                // === 🔧 유틸리티 함수 (최우선) ===
                showNotification,
                
                getEnvironmentInfo() {
                    try {
                        return {
                            isVercel: window.location.hostname.includes('vercel'),
                            isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
                            hostname: window.location.hostname,
                            timestamp: new Date().toISOString()
                        };
                    } catch (e) {
                        return { isVercel: false, isLocal: true, error: e.message };
                    }
                },

                // === 📊 주요 API 함수들 ===

                // 🏆 메인페이지용 실적 데이터 조회
                async getPerformanceData() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PERFORMANCE_DATA;
                        log('debug', '국회의원 실적 데이터 조회 시작');
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'MEMBER_PERFORMANCE');
                        
                        // 데이터 구조 확인 및 정규화
                        const processedData = normalizedData.map(item => ({
                            name: item.lawmaker_name || item.name || '알 수 없음',
                            party: item.party || '정보없음',
                            score: parseFloat(item.total_score || item.total_socre || 0), // 오타 대응
                            rawData: item
                        }));
                        
                        log('success', `국회의원 실적 데이터 ${processedData.length}건 로드 완료`);
                        return processedData;
                    } catch (error) {
                        log('error', '국회의원 실적 데이터 조회 실패:', error.message);
                        throw new Error(`국회의원 실적 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPartyWeightedPerformanceData() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PARTY_WEIGHTED_PERFORMANCE;
                        log('debug', '정당 실적 데이터 조회 시작');
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'PARTY_PERFORMANCE');
                        
                        // 데이터 구조 확인 및 정규화
                        const processedData = normalizedData.map(item => ({
                            party: item.party || item.party_name || '알 수 없음',
                            score: parseFloat(item.avg_total_score || item.total_score || 0),
                            rawData: item
                        }));
                        
                        log('success', `정당 실적 데이터 ${processedData.length}건 로드 완료`);
                        return processedData;
                    } catch (error) {
                        log('error', '정당 실적 데이터 조회 실패:', error.message);
                        throw new Error(`정당 실적 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // 호환성을 위한 별칭 함수들
                async getPartyPerformanceStatsData() {
                    return this.getPartyWeightedPerformanceData();
                },

                async getAllLegislation() {
                    const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.ALL;
                    const rawData = await apiCallWithRetry(url);
                    return normalizeApiResponse(rawData, 'ALL');
                },
                
                async getAllLegislation() {
                    const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.ALL;
                    const rawData = await apiCallWithRetry(url);
                    return normalizeApiResponse(rawData, 'ALL');
                },

                async getCostlyLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.COSTLY;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'COSTLY');
                    } catch (error) {
                        log('error', '예산안 입법 조회 실패:', error.message);
                        throw new Error(`예산안 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getCostLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.COST;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'COST');
                    } catch (error) {
                        log('error', '결산안 입법 조회 실패:', error.message);
                        throw new Error(`결산안 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getEtcLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.ETC;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'ETC');
                    } catch (error) {
                        log('error', '기타 입법 조회 실패:', error.message);
                        throw new Error(`기타 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getLawLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.LAW;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'LAW');
                    } catch (error) {
                        log('error', '법률안 조회 실패:', error.message);
                        throw new Error(`법률안 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPetitions() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PETITION;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PETITIONS');
                    } catch (error) {
                        log('error', '청원 데이터 조회 실패:', error.message);
                        throw new Error(`청원 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPartyStats() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PARTY_WEIGHTED_PERFORMANCE;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PARTY_STATS');
                    } catch (error) {
                        log('error', '정당 통계 조회 실패:', error.message);
                        throw new Error(`정당 통계 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },
                
                async getPartyRanking() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PARTY_WEIGHTED_PERFORMANCE;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PARTY_RANKING');
                    } catch (error) {
                        log('error', '정당 랭킹 조회 실패:', error.message);
                        throw new Error(`정당 랭킹 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getMemberRanking() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PERFORMANCE_DATA;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'MEMBER_RANKING');
                    } catch (error) {
                        log('error', '의원 랭킹 조회 실패:', error.message);
                        throw new Error(`의원 랭킹 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // === 👥 국회의원 관련 API ===
                async getAllMembers() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.MEMBER;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'MEMBERS');
                    } catch (error) {
                        log('error', '국회의원 명단 조회 실패:', error.message);
                        throw new Error(`국회의원 명단을 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getMemberPhotos() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PHOTO;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PHOTOS');
                    } catch (error) {
                        log('error', '의원 사진 데이터 조회 실패:', error.message);
                        throw new Error(`의원 사진 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getMemberPerformance() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PERFORMANCE_DATA;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PERFORMANCE');
                    } catch (error) {
                        log('error', '의원 실적 데이터 조회 실패:', error.message);
                        throw new Error(`의원 실적 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // === 🎯 정당별 의원 성과 조회 API (NEW) ===
                async getPartyMemberPerformance(partyName) {
                    try {
                        // 입력값 검증
                        if (!validatePartyName(partyName)) {
                            throw new Error(`유효하지 않은 정당명입니다. 가능한 정당: ${VALID_PARTIES.join(', ')}`);
                        }

                        const trimmedParty = partyName.trim();
                        
                        // URL 구성 (URL 인코딩 적용)
                        const encodedParty = encodeURIComponent(trimmedParty);
                        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MAIN_SERVER.PARTY_MEMBER_PERFORMANCE}${encodedParty}`;
                        
                        log('debug', `정당별 의원 성과 조회: ${trimmedParty}`);
                        
                        // API 호출
                        const rawData = await apiCallWithRetry(url);
                        
                        // 응답 데이터 정규화
                        const normalizedData = normalizeApiResponse(rawData, `PARTY_PERFORMANCE_${trimmedParty}`);
                        
                        log('success', `${trimmedParty} 의원 성과 조회 완료: ${normalizedData.length}건`);
                        
                        return {
                            party: trimmedParty,
                            memberCount: normalizedData.length,
                            data: normalizedData,
                            timestamp: new Date().toISOString()
                        };
                        
                    } catch (error) {
                        log('error', `정당별 의원 성과 조회 실패 (${partyName}):`, error.message);
                        throw new Error(`${partyName} 의원 성과 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // 모든 정당의 의원 성과를 한번에 조회
                async getAllPartiesMemberPerformance() {
                    try {
                        log('info', '모든 정당의 의원 성과 조회 시작');
                        
                        const results = {};
                        const promises = VALID_PARTIES.map(async (party) => {
                            try {
                                const data = await this.getPartyMemberPerformance(party);
                                results[party] = data;
                            } catch (error) {
                                log('warning', `${party} 조회 실패:`, error.message);
                                results[party] = {
                                    party: party,
                                    memberCount: 0,
                                    data: [],
                                    error: error.message,
                                    timestamp: new Date().toISOString()
                                };
                            }
                        });
                        
                        await Promise.all(promises);
                        
                        const totalMembers = Object.values(results)
                            .filter(result => !result.error)
                            .reduce((sum, result) => sum + result.memberCount, 0);
                            
                        log('success', `모든 정당 의원 성과 조회 완료: 총 ${totalMembers}명`);
                        
                        return {
                            summary: {
                                totalParties: VALID_PARTIES.length,
                                totalMembers: totalMembers,
                                timestamp: new Date().toISOString()
                            },
                            parties: results
                        };
                        
                    } catch (error) {
                        log('error', '모든 정당 의원 성과 조회 실패:', error.message);
                        throw new Error(`정당별 의원 성과 일괄 조회에 실패했습니다: ${error.message}`);
                    }
                },

                // 정당별 성과 비교
                async comparePartiesPerformance(partyNames = []) {
                    try {
                        // 파라미터가 없으면 모든 정당 비교
                        const targetParties = partyNames.length > 0 ? partyNames : VALID_PARTIES;
                        
                        // 유효성 검사
                        const invalidParties = targetParties.filter(party => !validatePartyName(party));
                        if (invalidParties.length > 0) {
                            throw new Error(`유효하지 않은 정당명: ${invalidParties.join(', ')}`);
                        }
                        
                        log('info', `정당 성과 비교 시작: ${targetParties.join(', ')}`);
                        
                        const comparisonData = {};
                        
                        for (const party of targetParties) {
                            try {
                                const data = await this.getPartyMemberPerformance(party);
                                comparisonData[party] = data;
                            } catch (error) {
                                log('warning', `${party} 비교 데이터 조회 실패:`, error.message);
                                comparisonData[party] = {
                                    party: party,
                                    memberCount: 0,
                                    data: [],
                                    error: error.message
                                };
                            }
                        }
                        
                        // 비교 결과 정리
                        const comparison = {
                            partiesCompared: targetParties,
                            results: comparisonData,
                            summary: {
                                totalMembers: Object.values(comparisonData)
                                    .filter(data => !data.error)
                                    .reduce((sum, data) => sum + data.memberCount, 0),
                                successfulQueries: Object.values(comparisonData)
                                    .filter(data => !data.error).length,
                                failedQueries: Object.values(comparisonData)
                                    .filter(data => data.error).length,
                                timestamp: new Date().toISOString()
                            }
                        };
                        
                        log('success', `정당 성과 비교 완료: ${comparison.summary.successfulQueries}/${targetParties.length} 성공`);
                        
                        return comparison;
                        
                    } catch (error) {
                        log('error', '정당 성과 비교 실패:', error.message);
                        throw new Error(`정당 성과 비교에 실패했습니다: ${error.message}`);
                    }
                },

                // 유효한 정당 목록 반환
                getValidParties() {
                    return [...VALID_PARTIES]; // 복사본 반환
                },

                // 정당명 유효성 검사
                validatePartyName(partyName) {
                    return validatePartyName(partyName);
                },

                // === 🆚 새로운 서버 비교 기능 (baekilha.onrender.com) ===
                async compareMembersAdvanced(member1, member2) {
                    try {
                        if (!member1 || !member2) {
                            throw new Error('두 명의 의원명을 모두 입력해주세요');
                        }
                        
                        if (typeof member1 !== 'string' || typeof member2 !== 'string') {
                            throw new Error('의원명은 문자열이어야 합니다');
                        }

                        const trimmedMember1 = member1.trim();
                        const trimmedMember2 = member2.trim();
                        
                        if (trimmedMember1 === trimmedMember2) {
                            throw new Error('같은 의원을 비교할 수 없습니다');
                        }

                        // URL 파라미터 구성
                        const params = new URLSearchParams({
                            member1: trimmedMember1,
                            member2: trimmedMember2
                        });
                        
                        const url = `${API_CONFIG.SERVERS.RANKING}${API_CONFIG.ENDPOINTS.RANKING_SERVER.COMPARE_MEMBERS}?${params}`;
                        
                        log('debug', `의원 비교 조회: ${trimmedMember1} vs ${trimmedMember2}`);
                        
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, `MEMBER_COMPARE_${trimmedMember1}_${trimmedMember2}`);
                        
                        log('success', `의원 비교 완료: ${trimmedMember1} vs ${trimmedMember2}`);
                        
                        return {
                            comparison: {
                                member1: trimmedMember1,
                                member2: trimmedMember2,
                                timestamp: new Date().toISOString()
                            },
                            data: normalizedData
                        };
                        
                    } catch (error) {
                        log('error', `의원 비교 실패 (${member1} vs ${member2}):`, error.message);
                        throw new Error(`의원 비교에 실패했습니다: ${error.message}`);
                    }
                },

                async comparePartiesAdvanced(party1, party2) {
                    try {
                        // 입력값 검증
                        if (!party1 || !party2) {
                            throw new Error('두 개의 정당명을 모두 입력해주세요');
                        }
                        
                        if (!validatePartyName(party1)) {
                            throw new Error(`유효하지 않은 정당명: ${party1}. 가능한 정당: ${VALID_PARTIES.join(', ')}`);
                        }
                        
                        if (!validatePartyName(party2)) {
                            throw new Error(`유효하지 않은 정당명: ${party2}. 가능한 정당: ${VALID_PARTIES.join(', ')}`);
                        }

                        const trimmedParty1 = party1.trim();
                        const trimmedParty2 = party2.trim();
                        
                        if (trimmedParty1 === trimmedParty2) {
                            throw new Error('같은 정당을 비교할 수 없습니다');
                        }

                        // URL 파라미터 구성
                        const params = new URLSearchParams({
                            party1: trimmedParty1,
                            party2: trimmedParty2
                        });
                        
                        const url = `${API_CONFIG.SERVERS.RANKING}${API_CONFIG.ENDPOINTS.RANKING_SERVER.COMPARE_PARTIES}?${params}`;
                        
                        log('debug', `정당 비교 조회: ${trimmedParty1} vs ${trimmedParty2}`);
                        
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, `PARTY_COMPARE_${trimmedParty1}_${trimmedParty2}`);
                        
                        log('success', `정당 비교 완료: ${trimmedParty1} vs ${trimmedParty2}`);
                        
                        return {
                            comparison: {
                                party1: trimmedParty1,
                                party2: trimmedParty2,
                                timestamp: new Date().toISOString()
                            },
                            data: normalizedData
                        };
                        
                    } catch (error) {
                        log('error', `정당 비교 실패 (${party1} vs ${party2}):`, error.message);
                        throw new Error(`정당 비교에 실패했습니다: ${error.message}`);
                    }
                },

                // === 📊 새로운 서버 랭킹 기능 (baekilha.onrender.com) ===
                async getMemberScoreRanking() {
                    try {
                        const url = `${API_CONFIG.SERVERS.RANKING}${API_CONFIG.ENDPOINTS.RANKING_SERVER.MEMBER_SCORE_RANKING}`;
                        
                        log('debug', '의원 점수 랭킹 조회');
                        
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'MEMBER_SCORE_RANKING');
                        
                        log('success', `의원 점수 랭킹 조회 완료: ${normalizedData.length}건`);
                        
                        return {
                            totalMembers: normalizedData.length,
                            data: normalizedData,
                            timestamp: new Date().toISOString(),
                            source: 'ranking_server'
                        };
                        
                    } catch (error) {
                        log('error', '의원 점수 랭킹 조회 실패:', error.message);
                        throw new Error(`의원 점수 랭킹 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPartyScoreRanking() {
                    try {
                        const url = `${API_CONFIG.SERVERS.RANKING}${API_CONFIG.ENDPOINTS.RANKING_SERVER.PARTY_SCORE_RANKING}`;
                        
                        log('debug', '정당 점수 랭킹 조회');
                        
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'PARTY_SCORE_RANKING');
                        
                        log('success', `정당 점수 랭킹 조회 완료: ${normalizedData.length}건`);
                        
                        return {
                            totalParties: normalizedData.length,
                            data: normalizedData,
                            timestamp: new Date().toISOString(),
                            source: 'ranking_server'
                        };
                        
                    } catch (error) {
                        log('error', '정당 점수 랭킹 조회 실패:', error.message);
                        throw new Error(`정당 점수 랭킹 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPartyStatsRanking() {
                    try {
                        const url = `${API_CONFIG.SERVERS.RANKING}${API_CONFIG.ENDPOINTS.RANKING_SERVER.PARTY_STATS_RANKING}`;
                        
                        log('debug', '정당 통계 랭킹 조회');
                        
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'PARTY_STATS_RANKING');
                        
                        log('success', `정당 통계 랭킹 조회 완료: ${normalizedData.length}건`);
                        
                        return {
                            totalParties: normalizedData.length,
                            data: normalizedData,
                            timestamp: new Date().toISOString(),
                            source: 'ranking_server'
                        };
                        
                    } catch (error) {
                        log('error', '정당 통계 랭킹 조회 실패:', error.message);
                        throw new Error(`정당 통계 랭킹 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // === 🤖 챗봇 API (baekilha.onrender.com) ===
                async sendChatbotMessage(message, options = {}) {
                    try {
                        if (!message || typeof message !== 'string') {
                            throw new Error('메시지를 입력해주세요');
                        }

                        const trimmedMessage = message.trim();
                        if (trimmedMessage.length === 0) {
                            throw new Error('빈 메시지는 전송할 수 없습니다');
                        }

                        const url = `${API_CONFIG.SERVERS.RANKING}${API_CONFIG.ENDPOINTS.RANKING_SERVER.CHATBOT}`;
                        
                        const requestBody = {
                            message: trimmedMessage,
                            ...options
                        };
                        
                        log('debug', `챗봇 메시지 전송: ${trimmedMessage.substring(0, 50)}...`);
                        
                        const rawData = await apiCallWithRetry(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestBody)
                        });
                        
                        log('success', '챗봇 응답 수신 완료');
                        
                        return {
                            userMessage: trimmedMessage,
                            botResponse: rawData,
                            timestamp: new Date().toISOString(),
                            source: 'ranking_server'
                        };
                        
                    } catch (error) {
                        log('error', '챗봇 메시지 전송 실패:', error.message);
                        throw new Error(`챗봇과의 통신에 실패했습니다: ${error.message}`);
                    }
                },

                async updateWeights(weights) {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.SETTING;
                        const rawData = await apiCallWithRetry(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(weights)
                        });
                        return normalizeApiResponse(rawData, 'SETTINGS');
                    } catch (error) {
                        log('error', '가중치 업데이트 실패:', error.message);
                        throw new Error(`가중치 업데이트에 실패했습니다: ${error.message}`);
                    }
                },

                // === 🔄 호환성 메서드 ===
                async getAllAttendance() {
                    // 기존 출석 데이터 API가 있다면 사용, 없으면 getMemberPerformance와 통합
                    return this.getMemberPerformance();
                },

                async getAllPerformance() {
                    return this.getMemberRanking();
                },

                // 본회의 관련 호환성 메서드
                async getBillLegislation() {
                    return this.getAllLegislation();
                },

                // === 📱 챗봇 API ===
                async fetchFromAPI(service, endpoint, options = {}) {
                    try {
                        if (service === 'chatbot') {
                            // 챗봇 API는 별도 서버로 가정
                            const chatbotUrl = 'https://api.example.com' + endpoint;
                            return await apiCallWithRetry(chatbotUrl, options);
                        }
                        
                        // 기본 API 서버 사용
                        const url = API_CONFIG.BASE_URL + endpoint;
                        return await apiCallWithRetry(url, options);
                        
                    } catch (error) {
                        log('error', `API 호출 실패 (${service}${endpoint}):`, error.message);
                        throw error;
                    }
                },

                // === ⚙️ 설정 및 상태 ===
                config: {
                    getBaseUrl: () => API_CONFIG.BASE_URL,
                    getRankingServerUrl: () => API_CONFIG.SERVERS.RANKING,
                    getTimeout: () => API_CONFIG.TIMEOUT,
                    isDebugMode: () => DEBUG_MODE,
                    getValidParties: () => [...VALID_PARTIES],
                    getServers: () => ({ ...API_CONFIG.SERVERS }),
                    getEndpoints: () => ({ ...API_CONFIG.ENDPOINTS })
                },

                // API 서비스 상태
                _isReady: false,
                _hasError: false,
                _initTime: Date.now()
            };

        } catch (error) {
            log('error', 'APIService 생성 실패:', error);
            
            // 최소한의 더미 서비스라도 제공
            return {
                showNotification: (msg, type) => console.log(`[${type}] ${msg}`),
                getEnvironmentInfo: () => ({ isVercel: false, isLocal: true, error: 'Service creation failed' }),
                _isReady: false,
                _hasError: true,
                _error: error.message
            };
        }
    }

    // 🚀 APIService 초기화 및 등록
    try {
        const apiService = createAPIService();
        
        // 기존 APIService 확장 (덮어쓰지 않고 병합)
        if (window.APIService && typeof window.APIService === 'object') {
            Object.assign(window.APIService, apiService);
            window.APIService._isReady = true;
        } else {
            window.APIService = apiService;
            window.APIService._isReady = true;
        }

        log('success', '🚀 APIService 초기화 완료 (정당별 성과 조회 + 비교/랭킹 기능 포함)');

    } catch (error) {
        log('error', '🚨 APIService 초기화 실패:', error);
        
        // 그래도 기본 객체는 보장
        if (!window.APIService) {
            window.APIService = {
                showNotification: (msg, type) => console.log(`[${type}] ${msg}`),
                getEnvironmentInfo: () => ({ error: 'Init failed' }),
                _isReady: false,
                _hasError: true
            };
        }
    }

    // 🔧 전역 유틸리티 함수들 (안전한 버전)
    try {
        if (typeof window.formatNumber === 'undefined') {
            window.formatNumber = function(num) {
                try {
                    return new Intl.NumberFormat('ko-KR').format(num);
                } catch (e) {
                    return String(num);
                }
            };
        }

        if (typeof window.debounce === 'undefined') {
            window.debounce = function(func, delay) {
                let timeoutId;
                return function (...args) {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => func.apply(this, args), delay);
                };
            };
        }

    } catch (error) {
        log('error', '전역 함수 등록 실패:', error);
    }

    // 🎯 DOM 로드 후 추가 설정 (선택적)
    function initializeAfterDOM() {
        try {
            log('info', `🌐 환경: ${window.APIService.getEnvironmentInfo().isVercel ? 'Vercel' : 'Local'}`);
            log('info', `🔧 메인 서버: ${API_CONFIG.BASE_URL}`);
            log('info', `🆚 랭킹 서버: ${API_CONFIG.SERVERS.RANKING}`);
            log('info', `🏛️ 지원 정당: ${VALID_PARTIES.length}개`);
            
            // 네트워크 상태 모니터링 (중복 방지)
            if (!window._networkListenersAdded) {
                window.addEventListener('online', () => {
                    showNotification('네트워크 연결 복구', 'success', 2000);
                });
                
                window.addEventListener('offline', () => {
                    showNotification('네트워크 연결 끊어짐', 'warning', 2000);
                });
                
                window._networkListenersAdded = true;
            }

        } catch (error) {
            log('error', 'DOM 초기화 실패:', error);
        }
    }

    // DOM 로드 이벤트 (안전한 등록)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAfterDOM);
    } else {
        // 이미 로드된 경우 즉시 실행
        setTimeout(initializeAfterDOM, 0);
    }

    log('success', '✅ global_sync.js 로드 완료 (정당별 성과 + 비교/랭킹 기능 추가)');

})();
