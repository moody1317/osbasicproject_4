/**
 * 백일하(Baek-il-ha) - 수정된 안정성 개선 버전
 */

(function() {
    'use strict';

    // APIService 로딩 실패 시에도 기본 객체 등록
    if (typeof window.APIService === 'undefined') {
        window.APIService = {
            showNotification: function(message, type = 'info') {
                console.log(`[알림] ${message} (${type})`);
            },
            getEnvironmentInfo: function() {
                return {
                    isVercel: window.location.hostname.includes('vercel'),
                    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                };
            },
            _isReady: false,
            _hasError: false
        };
    }

    // API 설정
    const API_CONFIG = {
        SERVERS: {
            MAIN: 'https://osprojectapi.onrender.com',
            RANKING: 'https://baekilha.onrender.com'
        },
        
        BASE_URL: 'https://osprojectapi.onrender.com',
        
        ENDPOINTS: {
            MAIN_SERVER: {
                ALL: '/legislation/all',
                COSTLY: '/legislation/costly',
                COST: '/legislation/cost',
                ETC: '/legislation/etc',
                LAW: '/legislation/law',
                BILL: '/legislation/bill',
                BILL_COUNT: '/legislation/bill-count',
                COMMITTEE_MEMBER: '/legislation/committee-member/',
                MEMBER: '/legislation/member/',
                PETITION: '/legislation/petition',
                PETITION_INTRODUCER: '/legislation/petition-introducer/',
                PHOTO: '/legislation/photo',
                ATTENDANCE: '/attendance/attendance/',
                PERFORMANCE_DATA: '/performance/api/performance/',
                PARTY_WEIGHTED_PERFORMANCE: '/performance/api/party_performance/',
                PARTY_MEMBER_PERFORMANCE: '/performance/api/performance/by-party/',
                SETTING: '/performance/api/update_weights/'
            },
            RANKING_SERVER: {
                MEMBER_SCORE_RANKING: '/ranking/members/',
                PARTY_SCORE_RANKING: '/ranking/parties/score/',
                PARTY_STATS_RANKING: '/ranking/parties/stats/',
                CHATBOT: '/api/chatbot/',
                COMPARE_MEMBERS: '/compare_members/',
                COMPARE_PARTIES: '/compare_parties/'
            }
        },
        TIMEOUT: 10000,
        MAX_RETRIES: 2
    };

    const VALID_PARTIES = [
        '더불어민주당', '국민의힘', '조국혁신당', '진보당',
        '개혁신당', '사회민주당', '기본소득당', '무소속'
    ];

    const DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 안전한 로그 함수
    function log(level, message, data = null) {
        if (!DEBUG_MODE && level === 'debug') return;
        
        try {
            const timestamp = new Date().toLocaleTimeString('ko-KR');
            const emoji = { debug: '🔧', info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
            const logMethod = level === 'error' ? 'error' : 'log';
            console[logMethod](`${emoji[level]} [${timestamp}] ${message}`, data || '');
        } catch (e) {
            console.log(`[LOG ERROR] ${message}`);
        }
    }

    function checkNetworkStatus() {
        try {
            return navigator.onLine !== false;
        } catch (e) {
            return true;
        }
    }

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

        if (!checkNetworkStatus()) {
            throw new Error('네트워크 연결이 없습니다');
        }

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

    async function apiCallWithRetry(url, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
            try {
                return await makeRequest(url, options);
            } catch (error) {
                lastError = error;
                
                if (attempt < API_CONFIG.MAX_RETRIES) {
                    const delay = attempt * 1000;
                    log('warning', `재시도 ${attempt}/${API_CONFIG.MAX_RETRIES} (${delay}ms 후)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    function normalizeApiResponse(rawData, apiType = 'unknown') {
        try {
            if (!rawData) return [];
            
            let data = rawData;
            
            if (rawData.tvAgendaInfoService?.row) {
                data = rawData.tvAgendaInfoService.row;
            } else if (Array.isArray(rawData.row)) {
                data = rawData.row;
            } else if (Array.isArray(rawData)) {
                data = rawData;
            } else if (typeof rawData === 'object') {
                data = [rawData];
            } else {
                log('warning', `예상치 못한 API 응답 구조 (${apiType})`);
                return [];
            }

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

    function validatePartyName(partyName) {
        if (!partyName || typeof partyName !== 'string') return false;
        return VALID_PARTIES.includes(partyName.trim());
    }

    function showNotification(message, type = 'info', duration = 3000) {
        try {
            const existing = document.querySelector('.api-notification');
            if (existing) existing.remove();

            const notification = document.createElement('div');
            notification.className = `api-notification ${type}`;
            notification.textContent = message;

            const styles = {
                position: 'fixed', top: '20px', right: '20px', padding: '12px 20px',
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: '10000', fontSize: '13px', maxWidth: '350px',
                fontFamily: 'Blinker, sans-serif', transition: 'all 0.3s ease',
                opacity: '0', transform: 'translateX(100%)'
            };

            Object.assign(notification.style, styles);

            const colors = {
                success: { backgroundColor: '#4caf50', color: 'white' },
                error: { backgroundColor: '#f44336', color: 'white' },
                warning: { backgroundColor: '#ff9800', color: 'white' },
                info: { backgroundColor: '#2196f3', color: 'white' }
            };

            Object.assign(notification.style, colors[type] || colors.info);
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 10);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);

        } catch (error) {
            console.log(`[알림] ${message} (${type})`);
        }
    }

    function createAPIService() {
        try {
            return {
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
                async getPerformanceData() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PERFORMANCE_DATA;
                        log('debug', '국회의원 실적 데이터 조회 시작');
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'MEMBER_PERFORMANCE');
                        
                        const processedData = normalizedData.map(item => ({
                            name: item.lawmaker_name || item.name || '알 수 없음',
                            party: item.party || '정보없음',
                            score: parseFloat(item.total_score || item.total_socre || 0),
                            rawData: item
                        }));
                        
                        log('success', `국회의원 실적 데이터 ${processedData.length}건 로드 완료`);
                        return processedData;
                    } catch (error) {
                        log('error', '국회의원 실적 데이터 조회 실패:', error.message);
                        throw new Error(`국회의원 실적 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // 🎯 수정된 정당 실적 데이터 조회 (가중치 적용됨)
                async getPartyWeightedPerformanceData() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.PARTY_WEIGHTED_PERFORMANCE;
                        log('debug', '정당 실적 데이터 조회 시작');
                        const rawData = await apiCallWithRetry(url);
                        const normalizedData = normalizeApiResponse(rawData, 'PARTY_PERFORMANCE');
                        
                        // ✅ 올바른 API 필드 매핑
                        const processedData = normalizedData.map(item => {
                            // 정당별 의원 수 추정 (API에서 제공되지 않는 경우)
                            const memberCounts = {
                                "더불어민주당": 170, "국민의힘": 108, "조국혁신당": 12,
                                "개혁신당": 3, "진보당": 1, "기본소득당": 1,
                                "사회민주당": 1, "무소속": 4
                            };
                            
                            return {
                                party: item.party || '알 수 없는 정당',
                                score: parseFloat(item.avg_total_score || 0), // ✅ 올바른 필드
                                memberCount: item.member_count || memberCounts[item.party] || 1,
                                rawData: item
                            };
                        });
                        
                        log('success', `정당 실적 데이터 ${processedData.length}건 로드 완료`);
                        return processedData;
                    } catch (error) {
                        log('error', '정당 실적 데이터 조회 실패:', error.message);
                        throw new Error(`정당 실적 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                // === 🔄 호환성을 위한 별칭 함수들 ===
                async getPartyRanking() {
                    return this.getPartyWeightedPerformanceData();
                },

                async getPartyStats() {
                    return this.getPartyWeightedPerformanceData();
                },

                async getMemberRanking() {
                    return this.getPerformanceData();
                },

                async getMemberPerformance() {
                    return this.getPerformanceData();
                },

                // === 📄 본회의 관련 API ===
                async getAllLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.ALL;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'ALL');
                    } catch (error) {
                        log('error', '전체 입법 조회 실패:', error.message);
                        throw new Error(`전체 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
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

                // === 🎯 정당별 의원 성과 조회 API ===
                async getPartyMemberPerformance(partyName) {
                    try {
                        if (!validatePartyName(partyName)) {
                            throw new Error(`유효하지 않은 정당명입니다. 가능한 정당: ${VALID_PARTIES.join(', ')}`);
                        }

                        const trimmedParty = partyName.trim();
                        const encodedParty = encodeURIComponent(trimmedParty);
                        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MAIN_SERVER.PARTY_MEMBER_PERFORMANCE}${encodedParty}`;
                        
                        log('debug', `정당별 의원 성과 조회: ${trimmedParty}`);
                        
                        const rawData = await apiCallWithRetry(url);
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

                // === 🆚 새로운 서버 비교 기능 ===
                async compareMembersAdvanced(member1, member2) {
                    try {
                        if (!member1 || !member2) {
                            throw new Error('두 명의 의원명을 모두 입력해주세요');
                        }

                        const trimmedMember1 = member1.trim();
                        const trimmedMember2 = member2.trim();
                        
                        if (trimmedMember1 === trimmedMember2) {
                            throw new Error('같은 의원을 비교할 수 없습니다');
                        }

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
                        if (!party1 || !party2) {
                            throw new Error('두 개의 정당명을 모두 입력해주세요');
                        }
                        
                        if (!validatePartyName(party1) || !validatePartyName(party2)) {
                            throw new Error(`유효하지 않은 정당명입니다. 가능한 정당: ${VALID_PARTIES.join(', ')}`);
                        }

                        const trimmedParty1 = party1.trim();
                        const trimmedParty2 = party2.trim();
                        
                        if (trimmedParty1 === trimmedParty2) {
                            throw new Error('같은 정당을 비교할 수 없습니다');
                        }

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

                // === 📊 새로운 서버 랭킹 기능 ===
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

                // === 🤖 챗봇 API ===
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
                            headers: { 'Content-Type': 'application/json' },
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

                // === ⚙️ 가중치 업데이트 API (핵심!) ===
                async updateWeights(weights) {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MAIN_SERVER.SETTING;
                        log('debug', '가중치 업데이트 요청:', weights);
                        
                        const rawData = await apiCallWithRetry(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(weights)
                        });
                        
                        log('success', '가중치 업데이트 성공');
                        return normalizeApiResponse(rawData, 'SETTINGS');
                    } catch (error) {
                        log('error', '가중치 업데이트 실패:', error.message);
                        throw new Error(`가중치 업데이트에 실패했습니다: ${error.message}`);
                    }
                },

                // === 🔧 유틸리티 함수들 ===
                getValidParties() {
                    return [...VALID_PARTIES];
                },

                validatePartyName(partyName) {
                    return validatePartyName(partyName);
                },

                config: {
                    getBaseUrl: () => API_CONFIG.BASE_URL,
                    getRankingServerUrl: () => API_CONFIG.SERVERS.RANKING,
                    getTimeout: () => API_CONFIG.TIMEOUT,
                    isDebugMode: () => DEBUG_MODE,
                    getValidParties: () => [...VALID_PARTIES],
                    getServers: () => ({ ...API_CONFIG.SERVERS }),
                    getEndpoints: () => ({ ...API_CONFIG.ENDPOINTS })
                },

                _isReady: false,
                _hasError: false,
                _initTime: Date.now()
            };

        } catch (error) {
            log('error', 'APIService 생성 실패:', error);
            
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
        
        if (window.APIService && typeof window.APIService === 'object') {
            Object.assign(window.APIService, apiService);
            window.APIService._isReady = true;
        } else {
            window.APIService = apiService;
            window.APIService._isReady = true;
        }

        log('success', '🚀 APIService 초기화 완료 (수정된 버전)');

    } catch (error) {
        log('error', '🚨 APIService 초기화 실패:', error);
        
        if (!window.APIService) {
            window.APIService = {
                showNotification: (msg, type) => console.log(`[${type}] ${msg}`),
                getEnvironmentInfo: () => ({ error: 'Init failed' }),
                _isReady: false,
                _hasError: true
            };
        }
    }

    // 🔧 전역 유틸리티 함수들
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

    function initializeAfterDOM() {
        try {
            log('info', `🌐 환경: ${window.APIService.getEnvironmentInfo().isVercel ? 'Vercel' : 'Local'}`);
            log('info', `🔧 메인 서버: ${API_CONFIG.BASE_URL}`);
            log('info', `🆚 랭킹 서버: ${API_CONFIG.SERVERS.RANKING}`);
            log('info', `🏛️ 지원 정당: ${VALID_PARTIES.length}개`);
            
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAfterDOM);
    } else {
        setTimeout(initializeAfterDOM, 0);
    }

    log('success', '✅ global_sync.js 로드 완료 (수정된 버전)');

})();
