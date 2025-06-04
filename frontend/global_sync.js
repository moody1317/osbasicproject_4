class PercentSettingsSync {
    constructor() {
        // 여러 API 서버 주소 설정 (백엔드팀에서 받은 주소로 변경)
        this.apiEndpoints = {
            members: 'https://api-members.example.com/api',      // 국회의원 API
            meetings: 'https://api-meetings.example.com/api',    // 본회의 API  
            petitions: 'https://api-petitions.example.com/api', // 청원 API
            settings: 'https://api-settings.example.com/api',   // 설정 API
            parties: 'https://api-parties.example.com/api',     // 정당 API
            announcements: 'https://api-announcements.example.com/api', // 공지사항 API
            chat: 'https://api-chat.example.com/api'            // 챗봇 API
        };
        
        this.listeners = [];
        this.currentSettings = null;
        this.syncInterval = null;
        this.lastSyncTime = 0;
    }

    // 설정 변경 리스너 등록
    onSettingsChange(callback) {
        this.listeners.push(callback);
    }

    // 리스너 제거
    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    // 모든 리스너에게 변경사항 알림
    notifyListeners(settings) {
        this.listeners.forEach(callback => {
            try {
                callback(settings);
            } catch (error) {
                console.error('리스너 실행 오류:', error);
            }
        });
    }

    // 특정 API 서버로 요청하는 범용 메서드
    async fetchFromAPI(apiType, endpoint, options = {}) {
        const baseUrl = this.apiEndpoints[apiType];
        if (!baseUrl) {
            throw new Error(`Unknown API type: ${apiType}`);
        }

        const response = await fetch(`${baseUrl}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCookie('csrftoken'),
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // 서버에서 최신 설정 가져오기
    async fetchSettings() {
        try {
            const response = await fetch(`${this.apiEndpoints.settings}/percent-settings/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken'),
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const settings = await response.json();
            
            // 설정이 변경되었는지 확인
            if (JSON.stringify(settings) !== JSON.stringify(this.currentSettings)) {
                this.currentSettings = settings;
                this.notifyListeners(settings);
                console.log('설정이 업데이트되었습니다:', settings);
            }

            this.lastSyncTime = Date.now();
            return settings;
        } catch (error) {
            console.error('설정 가져오기 실패:', error);
            throw error;
        }
    }

    // 설정을 서버에 저장
    async saveSettings(settings) {
        try {
            const response = await fetch(`${this.apiEndpoints.settings}/percent-settings/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken'),
                },
                body: JSON.stringify(settings),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // 현재 설정 업데이트
            this.currentSettings = settings;
            
            console.log('설정이 서버에 저장되었습니다:', result);
            return result;
        } catch (error) {
            console.error('설정 저장 실패:', error);
            throw error;
        }
    }

    // 실시간 동기화 시작 (폴링 방식)
    startSync(intervalMs = 5000) {
        // 기존 동기화 중지
        this.stopSync();
        
        // 주기적으로 서버에서 최신 설정 확인
        this.syncInterval = setInterval(async () => {
            try {
                await this.fetchSettings();
            } catch (error) {
                console.warn('동기화 실패:', error);
            }
        }, intervalMs);

        console.log(`실시간 동기화 시작 (${intervalMs}ms 간격)`);
    }

    // 실시간 동기화 중지
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('실시간 동기화 중지');
        }
    }

    // WebSocket 기반 실시간 동기화 (선택사항)
    connectWebSocket() {
        const wsUrl = this.apiEndpoints.settings.replace('http', 'ws') + '/ws/percent-settings/';
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket 연결 성공');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'settings_update') {
                        this.currentSettings = data.settings;
                        this.notifyListeners(data.settings);
                        console.log('WebSocket으로 설정 업데이트 수신:', data.settings);
                    }
                } catch (error) {
                    console.error('WebSocket 메시지 파싱 오류:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket 연결 종료');
                // 연결이 끊어지면 폴링으로 대체
                this.startSync(5000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                // WebSocket 실패시 폴링으로 대체
                this.startSync(5000);
            };
        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            // WebSocket 실패시 폴링으로 대체
            this.startSync(5000);
        }
    }

    // CSRF 토큰 가져오기
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // 페이지 언로드시 정리
    cleanup() {
        this.stopSync();
        if (this.ws) {
            this.ws.close();
        }
        this.listeners = [];
    }
}

// 전역 인스턴스 생성
window.percentSync = new PercentSettingsSync();

// 페이지 언로드시 정리
window.addEventListener('beforeunload', () => {
    window.percentSync.cleanup();
});

// 확장된 API 서비스 객체
window.APIService = {
    // 설정 관련
    async getSettings() {
        return await window.percentSync.fetchSettings();
    },

    async saveSettings(settings) {
        return await window.percentSync.saveSettings(settings);
    },

    // 국회의원 관련
    async getMembers() {
        return await window.percentSync.fetchFromAPI('members', '/members/');
    },

    async getMemberDetail(memberName) {
        return await window.percentSync.fetchFromAPI('members', `/members/${encodeURIComponent(memberName)}/`);
    },

    async getMemberById(memberId) {
        return await window.percentSync.fetchFromAPI('members', `/members/${memberId}/`);
    },

    async searchMembers(query) {
        return await window.percentSync.fetchFromAPI('members', `/members/search/?q=${encodeURIComponent(query)}`);
    },

    async getMemberRanking(percentSettings = null) {
        const params = percentSettings ? `?settings=${encodeURIComponent(JSON.stringify(percentSettings))}` : '';
        return await window.percentSync.fetchFromAPI('members', `/members/ranking/${params}`);
    },

    // 정당 관련
    async getParties() {
        return await window.percentSync.fetchFromAPI('parties', '/parties/');
    },

    async getPartyStatistics(partyName) {
        return await window.percentSync.fetchFromAPI('parties', `/parties/${encodeURIComponent(partyName)}/statistics/`);
    },

    async getPartyRanking() {
        return await window.percentSync.fetchFromAPI('parties', '/parties/ranking/');
    },

    // 본회의 관련
    async getMeetings(page = 1, limit = 10) {
        return await window.percentSync.fetchFromAPI('meetings', `/meetings/?page=${page}&limit=${limit}`);
    },

    async searchMeetings(query, page = 1) {
        return await window.percentSync.fetchFromAPI('meetings', `/meetings/search/?q=${encodeURIComponent(query)}&page=${page}`);
    },

    async getMeetingDetail(meetingId) {
        return await window.percentSync.fetchFromAPI('meetings', `/meetings/${meetingId}/`);
    },

    // 청원 관련
    async getPetitions(page = 1, limit = 10) {
        return await window.percentSync.fetchFromAPI('petitions', `/petitions/?page=${page}&limit=${limit}`);
    },

    async searchPetitions(query, page = 1) {
        return await window.percentSync.fetchFromAPI('petitions', `/petitions/search/?q=${encodeURIComponent(query)}&page=${page}`);
    },

    async getPetitionDetail(petitionId) {
        return await window.percentSync.fetchFromAPI('petitions', `/petitions/${petitionId}/`);
    },

    // 공지사항 관련
    async getAnnouncements() {
        return await window.percentSync.fetchFromAPI('announcements', '/announcements/');
    },

    async getAnnouncementDetail(announcementId) {
        return await window.percentSync.fetchFromAPI('announcements', `/announcements/${announcementId}/`);
    },

    // 챗봇 관련
    async sendChatMessage(message) {
        return await window.percentSync.fetchFromAPI('chat', '/chat/', {
            method: 'POST',
            body: JSON.stringify({ message: message })
        });
    },

    // 실시간 동기화 제어
    startSync(intervalMs = 5000) {
        window.percentSync.startSync(intervalMs);
    },

    stopSync() {
        window.percentSync.stopSync();
    },

    connectWebSocket() {
        window.percentSync.connectWebSocket();
    }
};

// 기존 PercentSettings 객체 (하위 호환성)
window.PercentSettings = {
    // 현재 설정 가져오기
    async get() {
        return await window.APIService.getSettings();
    },

    // 설정 저장하기
    async save(settings) {
        return await window.APIService.saveSettings(settings);
    },

    // 설정 변경 리스너 등록
    onChange(callback) {
        window.percentSync.onSettingsChange(callback);
    },

    // 리스너 제거
    removeListener(callback) {
        window.percentSync.removeListener(callback);
    },

    // 실시간 동기화 시작
    startSync(intervalMs = 5000) {
        window.percentSync.startSync(intervalMs);
    },

    // 실시간 동기화 중지
    stopSync() {
        window.percentSync.stopSync();
    },

    // WebSocket 연결
    connectWebSocket() {
        window.percentSync.connectWebSocket();
    }
};

// 페이지 로드시 자동으로 실시간 동기화 시작
document.addEventListener('DOMContentLoaded', () => {
    // WebSocket 시도, 실패시 폴링으로 대체
    try {
        window.percentSync.connectWebSocket();
    } catch (error) {
        console.log('WebSocket 사용 불가, 폴링 모드로 시작');
        window.percentSync.startSync(5000);
    }
});