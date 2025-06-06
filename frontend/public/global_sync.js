/**
 * 백일하(Baek-il-ha) - 안정성 개선된 버전
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
        BASE_URL: 'https://osprojectapi.onrender.com',
        ENDPOINTS: {
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
            PERFORMANCE_DATA: '/performance/api/performance/', // 국회의원 실적
            PARTY_WEIGHTED_PERFORMANCE: '/performance/api/party_performance/',

            // 퍼센트 변경 API
            SETTING: '/performance/api/update_weights/'
        },
        TIMEOUT: 10000,  // 15초 → 10초로 단축
        MAX_RETRIES: 2   // 3번 → 2번으로 단축
    };

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
                async getAllLegislation() {
                    const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.ALL;
                    const rawData = await apiCallWithRetry(url);
                    return normalizeApiResponse(rawData, 'ALL');
                },

                async getCostlyLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.COSTLY;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'COSTLY');
                    } catch (error) {
                        log('error', '예산안 입법 조회 실패:', error.message);
                        throw new Error(`예산안 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getCostLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.COST;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'COST');
                    } catch (error) {
                        log('error', '결산안 입법 조회 실패:', error.message);
                        throw new Error(`결산안 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getEtcLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.ETC;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'ETC');
                    } catch (error) {
                        log('error', '기타 입법 조회 실패:', error.message);
                        throw new Error(`기타 입법 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getLawLegislation() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.LAW;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'LAW');
                    } catch (error) {
                        log('error', '법률안 조회 실패:', error.message);
                        throw new Error(`법률안 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPetitions() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PETITION;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PETITIONS');
                    } catch (error) {
                        log('error', '청원 데이터 조회 실패:', error.message);
                        throw new Error(`청원 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getPartyRanking() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PARTY_WEIGHTED_PERFORMANCE;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PARTY_RANKING');
                    } catch (error) {
                        log('error', '정당 랭킹 조회 실패:', error.message);
                        throw new Error(`정당 랭킹 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getMemberRanking() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PERFORMANCE_DATA;
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
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'MEMBERS');
                    } catch (error) {
                        log('error', '국회의원 명단 조회 실패:', error.message);
                        throw new Error(`국회의원 명단을 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getMemberPhotos() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PHOTO;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PHOTOS');
                    } catch (error) {
                        log('error', '의원 사진 데이터 조회 실패:', error.message);
                        throw new Error(`의원 사진 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async getMemberPerformance() {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PERFORMANCE_DATA;
                        const rawData = await apiCallWithRetry(url);
                        return normalizeApiResponse(rawData, 'PERFORMANCE');
                    } catch (error) {
                        log('error', '의원 실적 데이터 조회 실패:', error.message);
                        throw new Error(`의원 실적 데이터를 가져올 수 없습니다: ${error.message}`);
                    }
                },

                async updateWeights(weights) {
                    try {
                        const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SETTING;
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
                    getTimeout: () => API_CONFIG.TIMEOUT,
                    isDebugMode: () => DEBUG_MODE
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

        log('success', '🚀 APIService 초기화 완료');

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
            log('info', `🔧 API 서버: ${API_CONFIG.BASE_URL}`);
            
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

    log('success', '✅ global_sync.js 로드 완료 (안정성 개선)');

})();
