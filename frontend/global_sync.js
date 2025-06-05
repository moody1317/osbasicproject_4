class PercentSettingsSync {
    constructor() {
        // 배포 환경 감지
        this.isVercelDeployment = this.detectVercelEnvironment();
        
        // 환경별 API 엔드포인트 설정
        if (this.isVercelDeployment) {
            // Vercel 배포 시: 프록시 경로 사용 (CORS 문제 없음)
            this.apiEndpoints = {
                legislation: '/api/legislation',
                attendance: '/api/attendance',
                performance: '/api/performance',
                chatbot: '/api/chatbot'
            };
            console.log('🚀 Vercel 배포 환경 감지 - 프록시 API 사용');
        } else {
            // 로컬 개발 시: 직접 API 호출 + CORS 프록시 백업
            this.apiEndpoints = {
                legislation: 'https://osprojectapi.onrender.com/legislation',
                attendance: 'https://osprojectapi.onrender.com/attendance',
                performance: 'https://osprojectapi.onrender.com/performance',
                chatbot: 'https://osprojectapi.onrender.com/chatbot'
            };
            
            // 로컬 개발용 CORS 프록시들
            this.corsProxies = [
                'https://api.allorigins.win/raw?url=',
                'https://corsproxy.io/?',
                'https://cors-anywhere.herokuapp.com/'
            ];
            this.currentProxyIndex = 0;
            
            console.log('🏠 로컬 개발 환경 감지 - CORS 프록시 준비');
        }
        
        this.listeners = [];
        this.currentSettings = null;
        this.syncInterval = null;
        this.lastSyncTime = 0;
    }

    // Vercel 환경 감지
    detectVercelEnvironment() {
        // Vercel 배포 시 특징들로 감지
        const hostname = window.location.hostname;
        
        // Vercel 도메인들
        if (hostname.includes('vercel.app')) return true;
        if (hostname.includes('.vercel.app')) return true;
        
        // 사용자 정의 도메인이지만 Vercel 배포인 경우
        // (vercel.json이 있으면 /api/ 경로가 작동함)
        if (hostname !== 'localhost' && 
            hostname !== '127.0.0.1' && 
            !hostname.includes('github.io') && 
            !hostname.includes('netlify.app')) {
            // 프로덕션 도메인으로 추정
            return true;
        }
        
        return false;
    }

    // CORS 프록시 URL 생성 (로컬 개발용)
    getProxyUrl(originalUrl) {
        const proxy = this.corsProxies[this.currentProxyIndex];
        
        if (proxy.includes('allorigins.win')) {
            return `${proxy}${encodeURIComponent(originalUrl)}`;
        } else {
            return `${proxy}${originalUrl}`;
        }
    }

    // 환경별 API 호출
    async fetchFromAPI(apiType, endpoint, options = {}) {
        const baseUrl = this.apiEndpoints[apiType];
        if (!baseUrl) {
            throw new Error(`Unknown API type: ${apiType}`);
        }

        const url = `${baseUrl}${endpoint}`;
        console.log(`[${this.isVercelDeployment ? 'VERCEL' : 'LOCAL'}] API 호출: ${url}`);

        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            ...options
        };

        // Vercel 배포 환경: 프록시 사용 (CORS 문제 없음)
        if (this.isVercelDeployment) {
            try {
                const response = await fetch(url, fetchOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('[VERCEL] API 호출 성공:', data);
                return data;

            } catch (error) {
                console.error('[VERCEL] API 호출 실패:', error);
                throw error;
            }
        } 
        // 로컬 개발 환경: 직접 호출 + CORS 프록시 백업
        else {
            // 1차 시도: 직접 호출
            try {
                const response = await fetch(url, fetchOptions);
                if (response.ok) {
                    const data = await response.json();
                    console.log('[LOCAL] 직접 호출 성공:', data);
                    return data;
                }
            } catch (error) {
                console.log('[LOCAL] 직접 호출 실패, CORS 프록시 시도:', error.message);
            }

            // 2차 시도: CORS 프록시 사용
            for (let i = 0; i < this.corsProxies.length; i++) {
                try {
                    this.currentProxyIndex = i;
                    const proxyUrl = this.getProxyUrl(url);
                    console.log(`[LOCAL] 프록시 ${i + 1} 시도: ${proxyUrl}`);

                    const response = await fetch(proxyUrl, fetchOptions);
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`[LOCAL] 프록시 ${i + 1} 성공:`, data);
                        return data;
                    }
                } catch (error) {
                    console.error(`[LOCAL] 프록시 ${i + 1} 실패:`, error.message);
                    continue;
                }
            }

            throw new Error('모든 API 호출 방법 실패');
        }
    }

    // 특정 API의 healthcheck (연결 상태 확인)
    async checkApiHealth(apiType) {
        try {
            // 간단한 엔드포인트로 테스트
            let testEndpoint;
            switch (apiType) {
                case 'performance':
                    testEndpoint = '/party-weighted-performance/';
                    break;
                case 'legislation':
                    testEndpoint = '/all';
                    break;
                case 'attendance':
                    testEndpoint = '/attendance/';
                    break;
                case 'chatbot':
                    testEndpoint = '/health/';
                    break;
                default:
                    testEndpoint = '/';
            }
            
            await this.fetchFromAPI(apiType, testEndpoint);
            return true;
        } catch (error) {
            console.warn(`[HEALTH] ${apiType} API 상태 불량:`, error.message);
            return false;
        }
    }

    // 나머지 메서드들
    onSettingsChange(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(settings) {
        this.listeners.forEach(callback => {
            try {
                callback(settings);
            } catch (error) {
                console.error('리스너 실행 오류:', error);
            }
        });
    }

    startSync(intervalMs = 30000) {
        const envType = this.isVercelDeployment ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 동기화 시작 (${intervalMs}ms 간격)`);
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Vercel에서는 동기화 간격을 더 길게 설정 (비용 절약)
        const adjustedInterval = this.isVercelDeployment ? intervalMs * 2 : intervalMs;
        
        this.syncInterval = setInterval(async () => {
            try {
                // 간단한 연결 상태 체크
                const isHealthy = await this.checkApiHealth('performance');
                if (isHealthy) {
                    console.log(`[${envType}] API 연결 상태 정상`);
                }
            } catch (error) {
                console.warn(`[${envType}] 동기화 체크 실패:`, error);
            }
        }, adjustedInterval);
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('동기화 중지');
    }
}

// 전역 인스턴스 생성
window.percentSync = new PercentSettingsSync();

// 환경별 최적화된 API 서비스
window.APIService = {
    // 환경 정보 표시
    getEnvironmentInfo() {
        return {
            isVercel: window.percentSync.isVercelDeployment,
            hostname: window.location.hostname,
            apiEndpoints: window.percentSync.apiEndpoints,
            corsProxies: window.percentSync.corsProxies || '사용 안 함'
        };
    },

    // 환경별 알림 표시
    showNotification(message, type = 'info') {
        const colors = {
            info: '#2196f3',
            warning: '#ff9800', 
            error: '#f44336',
            success: '#4caf50'
        };

        const envBadge = window.percentSync.isVercelDeployment ? '[VERCEL]' : '[LOCAL]';
        const fullMessage = `${envBadge} ${message}`;

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: 'Courier New', monospace;
        `;
        notification.textContent = fullMessage;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },

    // 안전한 API 호출 (환경별 최적화)
    async safeApiCall(apiCall, fallbackData = null) {
        try {
            return await apiCall();
        } catch (error) {
            console.error('API 호출 실패:', error);
            
            const envType = window.percentSync.isVercelDeployment ? 'Vercel' : '로컬';
            
            if (fallbackData) {
                this.showNotification(`${envType} 환경에서 API 오류 발생, 기본 데이터 사용`, 'warning');
                return fallbackData;
            }
            
            this.showNotification(`${envType} 환경에서 API 호출 실패`, 'error');
            throw error;
        }
    },

    // === 입법 관련 API 메서드들 ===

    // 본회의
    async getAllLegislation() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/all'),
            []
        );
    },

    // 발의 법률안
    async getBills() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/bill'),
            []
        );
    },

    // 법률안 국회의원카운트
    async getBillCount() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/bill-count'),
            []
        );
    },

    // 위원회
    async getCommitteeMembers() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/committee-member/'),
            []
        );
    },

    // 국회의원명단
    async getMembers() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/member/'),
            []
        );
    },

    // 청원
    async getPetitions() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/petition'),
            []
        );
    },

    // 예산안
    async getCostlyBills() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/costly'),
            []
        );
    },

    // 결산
    async getCostBills() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/cost'),
            []
        );
    },

    // 기타
    async getEtcBills() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/etc'),
            []
        );
    },

    // 법률안
    async getLawBills() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/law'),
            []
        );
    },

    // 청원 소개의원
    async getPetitionIntroducers() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/petition-introducer/'),
            []
        );
    },

    // 사진
    async getPhotos() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('legislation', '/photo'),
            []
        );
    },

    // === 출석 관련 API 메서드들 ===

    // 출석
    async getAttendance() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('attendance', '/attendance/'),
            []
        );
    },

    // === 성과 관련 API 메서드들 ===

    // 국회의원 순위
    async getMemberRanking() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('performance', '/performance-data/'),
            []
        );
    },

    // 정당순위
    async getPartyRanking() {
        const fallbackData = [
            { party_name: "국민의힘", weighted_performance: 85.2, member_count: 108 },
            { party_name: "더불어민주당", weighted_performance: 82.7, member_count: 170 },
            { party_name: "조국혁신당", weighted_performance: 78.1, member_count: 12 },
            { party_name: "개혁신당", weighted_performance: 74.8, member_count: 3 },
            { party_name: "사회민주당", weighted_performance: 71.3, member_count: 1 },
            { party_name: "기본소득당", weighted_performance: 68.9, member_count: 1 },
            { party_name: "진보당", weighted_performance: 65.4, member_count: 1 },
            { party_name: "무소속", weighted_performance: 62.1, member_count: 4 }
        ];

        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('performance', '/party-weighted-performance/'),
            fallbackData
        );
    },

    // 정당별 실적 통계 전체
    async getPartyPerformanceStats() {
        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('performance', '/party-performance-stats/'),
            []
        );
    },

    // 퍼센트 설정 업데이트 (POST 요청)
    async updateWeights(weights) {
        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(weights)
        };

        return await this.safeApiCall(
            () => window.percentSync.fetchFromAPI('performance', '/api/update_weights/', options),
            null
        );
    },

    // API 연결 상태 종합 체크
    async checkAllAPIs() {
        const apis = ['performance', 'legislation', 'attendance', 'chatbot'];
        const results = {};
        
        for (const api of apis) {
            results[api] = await window.percentSync.checkApiHealth(api);
        }
        
        console.table(results);
        return results;
    },

    // === 그룹별 API 호출 메서드들 ===

    // 모든 입법 관련 데이터 한번에 가져오기
    async getAllLegislationData() {
        try {
            const [
                all, bills, billCount, committee, members, petitions, 
                costly, cost, etc, law, petitionIntroducers, photos
            ] = await Promise.all([
                this.getAllLegislation(),
                this.getBills(),
                this.getBillCount(),
                this.getCommitteeMembers(),
                this.getMembers(),
                this.getPetitions(),
                this.getCostlyBills(),
                this.getCostBills(),
                this.getEtcBills(),
                this.getLawBills(),
                this.getPetitionIntroducers(),
                this.getPhotos()
            ]);

            return {
                all, bills, billCount, committee, members, petitions,
                costly, cost, etc, law, petitionIntroducers, photos
            };
        } catch (error) {
            console.error('입법 데이터 일괄 로드 실패:', error);
            throw error;
        }
    },

    // 모든 성과 관련 데이터 한번에 가져오기
    async getAllPerformanceData() {
        try {
            const [memberRanking, partyRanking, partyStats] = await Promise.all([
                this.getMemberRanking(),
                this.getPartyRanking(),
                this.getPartyPerformanceStats()
            ]);

            return {
                memberRanking,
                partyRanking,
                partyStats
            };
        } catch (error) {
            console.error('성과 데이터 일괄 로드 실패:', error);
            throw error;
        }
    }
};

window.PercentSettings = {
    async get() {
        // 로컬 저장소에서 가져오기 (환경 무관)
        const settings = localStorage.getItem('percentSettings');
        return settings ? JSON.parse(settings) : null;
    },

    async save(settings) {
        // 로컬 저장소에 저장 (환경 무관)
        localStorage.setItem('percentSettings', JSON.stringify(settings));
        window.percentSync.notifyListeners(settings);
        return true;
    },

    async saveToServer(weights) {
        // 서버에 가중치 저장
        try {
            const result = await window.APIService.updateWeights(weights);
            console.log('서버에 가중치 저장 성공:', result);
            return result;
        } catch (error) {
            console.error('서버에 가중치 저장 실패:', error);
            throw error;
        }
    },

    onChange(callback) {
        window.percentSync.onSettingsChange(callback);
    },

    removeListener(callback) {
        window.percentSync.removeListener(callback);
    },

    startSync(intervalMs = 5000) {
        window.percentSync.startSync(intervalMs);
    },

    stopSync() {
        window.percentSync.stopSync();
    }
};

// 페이지 로드 시 환경별 초기화
document.addEventListener('DOMContentLoaded', () => {
    const envInfo = window.APIService.getEnvironmentInfo();
    console.log('🌍 환경 정보:', envInfo);
    
    if (envInfo.isVercel) {
        console.log('✅ Vercel 환경: CORS 문제 없음, 안정적 API 호출 가능');
        window.APIService.showNotification('Vercel 배포 환경에서 실행 중', 'success');
    } else {
        console.log('🏠 로컬 환경: CORS 프록시 사용 준비됨');
        window.APIService.showNotification('로컬 개발 환경에서 실행 중', 'info');
    }
    
    // 동기화 시작
    window.percentSync.startSync(30000);
});

// 디버그 유틸리티
window.vercelDebug = {
    env: () => window.APIService.getEnvironmentInfo(),
    testAPIs: () => window.APIService.checkAllAPIs(),
    isVercel: () => window.percentSync.isVercelDeployment,
    
    // API 테스트 메서드들
    testLegislation: async () => {
        console.log('📋 입법 API 테스트 시작...');
        try {
            const data = await window.APIService.getAllLegislationData();
            console.log('✅ 입법 API 테스트 성공:', data);
            return data;
        } catch (error) {
            console.error('❌ 입법 API 테스트 실패:', error);
            return null;
        }
    },
    
    testPerformance: async () => {
        console.log('📊 성과 API 테스트 시작...');
        try {
            const data = await window.APIService.getAllPerformanceData();
            console.log('✅ 성과 API 테스트 성공:', data);
            return data;
        } catch (error) {
            console.error('❌ 성과 API 테스트 실패:', error);
            return null;
        }
    },
    
    testAttendance: async () => {
        console.log('📅 출석 API 테스트 시작...');
        try {
            const data = await window.APIService.getAttendance();
            console.log('✅ 출석 API 테스트 성공:', data);
            return data;
        } catch (error) {
            console.error('❌ 출석 API 테스트 실패:', error);
            return null;
        }
    },
    
    testWeights: async (testWeights = { bill: 30, attendance: 25, petition: 20, committee: 25 }) => {
        console.log('⚖️ 가중치 업데이트 테스트 시작...');
        try {
            const result = await window.APIService.updateWeights(testWeights);
            console.log('✅ 가중치 업데이트 테스트 성공:', result);
            return result;
        } catch (error) {
            console.error('❌ 가중치 업데이트 테스트 실패:', error);
            return null;
        }
    },
    
    testChatbot: async (message = '테스트 메시지입니다') => {
        console.log('🤖 Django 챗봇 API 테스트 시작...');
        try {
            const response = await window.APIService.sendChatMessage(message);
            console.log('✅ Django 챗봇 API 테스트 성공:', response);
            
            // 헬스체크도 테스트
            const health = await window.APIService.getChatbotHealth();
            console.log('✅ Django 챗봇 헬스체크:', health);
            
            return { response, health };
        } catch (error) {
            console.error('❌ Django 챗봇 API 테스트 실패:', error);
            return null;
        }
    },
    
    forceLocal: () => {
        window.percentSync.isVercelDeployment = false;
        console.log('강제로 로컬 모드로 전환됨');
        location.reload();
    },
    
    forceVercel: () => {
        window.percentSync.isVercelDeployment = true;
        console.log('강제로 Vercel 모드로 전환됨');
        location.reload();
    }
};

console.log('🚀 Vercel 준비된 API 서비스 초기화 완료!');
console.log('🔧 환경 확인: window.vercelDebug.env()');
console.log('🧪 전체 API 테스트: window.vercelDebug.testAPIs()');
console.log('📋 입법 API 테스트: window.vercelDebug.testLegislation()');
console.log('📊 성과 API 테스트: window.vercelDebug.testPerformance()');
console.log('📅 출석 API 테스트: window.vercelDebug.testAttendance()');
console.log('⚖️ 가중치 테스트: window.vercelDebug.testWeights()');
console.log('🤖 Django 챗봇 테스트: window.vercelDebug.testChatbot()');
console.log('⚙️ 강제 모드 변경: window.vercelDebug.forceLocal() / forceVercel()');

// 기존 percentSync 호환성 보장
window.percentSync = new PercentSettingsSync();

// ===== 페이지네이션 유틸리티 함수들 =====

// 페이지네이션 생성 함수
function createPagination(totalItems, currentPage, itemsPerPage, onPageChange) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        console.error('pagination container not found!');
        return;
    }

    // 총 페이지 수 계산
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // 페이지네이션 컨테이너 초기화
    paginationContainer.innerHTML = '';
    
    // 페이지가 1페이지뿐이거나 데이터가 없으면 페이지네이션 숨김
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // 페이지네이션 래퍼 생성
    const paginationWrapper = document.createElement('div');
    paginationWrapper.className = 'pagination-wrapper';
    
    // 이전 페이지 버튼
    if (currentPage > 1) {
        const prevButton = createPaginationButton('‹', currentPage - 1, onPageChange);
        prevButton.setAttribute('aria-label', '이전 페이지');
        paginationWrapper.appendChild(prevButton);
    }
    
    // 페이지 번호 계산 (최대 5개 표시)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 끝 페이지가 부족하면 시작 페이지 조정
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 첫 페이지 (1)과 생략 표시
    if (startPage > 1) {
        paginationWrapper.appendChild(createPaginationButton('1', 1, onPageChange));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.setAttribute('aria-hidden', 'true');
            paginationWrapper.appendChild(ellipsis);
        }
    }
    
    // 중간 페이지 번호들
    for (let i = startPage; i <= endPage; i++) {
        const button = createPaginationButton(i.toString(), i, onPageChange);
        if (i === currentPage) {
            button.classList.add('active');
            button.setAttribute('aria-current', 'page');
        }
        paginationWrapper.appendChild(button);
    }
    
    // 마지막 페이지와 생략 표시
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.setAttribute('aria-hidden', 'true');
            paginationWrapper.appendChild(ellipsis);
        }
        paginationWrapper.appendChild(createPaginationButton(totalPages.toString(), totalPages, onPageChange));
    }
    
    // 다음 페이지 버튼
    if (currentPage < totalPages) {
        const nextButton = createPaginationButton('›', currentPage + 1, onPageChange);
        nextButton.setAttribute('aria-label', '다음 페이지');
        paginationWrapper.appendChild(nextButton);
    }
    
    paginationContainer.appendChild(paginationWrapper);
    
    console.log(`페이지네이션 생성 완료: ${currentPage}/${totalPages} (총 ${totalItems}개 항목)`);
}

// 페이지네이션 버튼 생성 헬퍼 함수
function createPaginationButton(text, page, onPageChange) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'pagination-btn';
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', `${page}페이지로 이동`);
    
    // 클릭 이벤트
    button.addEventListener('click', function(e) {
        e.preventDefault();
        if (!this.classList.contains('active')) {
            console.log(`페이지 변경: ${page}`);
            onPageChange(page);
            
            // 포커스 관리 (접근성)
            setTimeout(() => {
                const newActiveButton = document.querySelector('.pagination-btn.active');
                if (newActiveButton) {
                    newActiveButton.focus();
                }
            }, 100);
        }
    });
    
    // 키보드 접근성
    button.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
    
    return button;
}

// 전역에서 접근 가능하도록 설정
window.createPagination = createPagination;
window.createPaginationButton = createPaginationButton;

// ===== 유틸리티 함수들 =====

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatNumber(number) {
    return number.toLocaleString('ko-KR');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 전역에서 접근 가능하도록 설정
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.debounce = debounce;
