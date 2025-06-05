// ===== 전역 변수 및 설정 =====

// 정당 데이터 정의
const partyData = {
    "국민의힘": { cssPrefix: "ppp", url: "https://www.peoplepowerparty.kr/" },
    "더불어민주당": { cssPrefix: "dp", url: "https://theminjoo.kr/" },
    "조국혁신당": { cssPrefix: "rk", url: "https://rebuildingkoreaparty.kr" },
    "개혁신당": { cssPrefix: "reform", url: "https://www.reformparty.kr/" },
    "진보당": { cssPrefix: "jp", url: "https://jinboparty.com/" },
    "기본소득당": { cssPrefix: "bip", url: "https://basicincomeparty.kr/" },
    "사회민주당": { cssPrefix: "sdp", url: "https://www.samindang.kr/" },
    "무소속": { cssPrefix: "ind", url: "" }
};

// 전역 변수로 설정
window.partyData = partyData;

// ===== 환경 감지 함수 =====

// 배포 환경 감지 
function isVercelEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('vercel.app')) return true;
    if (hostname.includes('.vercel.app')) return true;
    
    if (hostname !== 'localhost' && 
        hostname !== '127.0.0.1' && 
        !hostname.includes('github.io') && 
        !hostname.includes('netlify.app')) {
        return true;
    }
    
    return false;
}

// ===== 퍼센트 관리자 (PercentManager) =====

const PercentManager = {
    // 기본 퍼센트 설정
    defaultSettings: {
        attendance: 25,
        bills: 25,
        questions: 20,
        petitions: 15,
        committees: 10,
        parties: 5
    },

    // 🔧 설정 저장 (환경별 로깅)
    async saveSettings(settings) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 퍼센트 설정 저장 중:`, settings);
            
            if (window.APIService && window.APIService.savePercentSettings) {
                await window.APIService.savePercentSettings(settings);
                console.log(`[${envType}] 서버에 퍼센트 설정 저장 완료`);
            }
            
            // 로컬 저장소에도 백업 저장
            localStorage.setItem('percentSettings', JSON.stringify(settings));
            
            // 설정 변경 이벤트 발생
            this.notifySettingsChange(settings);
            
            return true;
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 퍼센트 설정 저장 실패:`, error);
            // 서버 저장 실패 시 로컬 저장소에만 저장
            localStorage.setItem('percentSettings', JSON.stringify(settings));
            this.notifySettingsChange(settings);
            return false;
        }
    },

    // 🔧 설정 불러오기 (환경별 로깅)
    async getSettings() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 퍼센트 설정 불러오는 중...`);
            
            // 서버에서 설정 가져오기 시도
            if (window.APIService && window.APIService.getPercentSettings) {
                const serverSettings = await window.APIService.getPercentSettings();
                if (serverSettings) {
                    console.log(`[${envType}] 서버에서 퍼센트 설정 로드:`, serverSettings);
                    return serverSettings;
                }
            }
            
            // 서버에서 실패 시 로컬 저장소에서 가져오기
            const localSettings = localStorage.getItem('percentSettings');
            if (localSettings) {
                const settings = JSON.parse(localSettings);
                console.log(`[${envType}] 로컬에서 퍼센트 설정 로드:`, settings);
                return settings;
            }
            
            console.log(`[${envType}] 기본 퍼센트 설정 사용`);
            return this.defaultSettings;
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 퍼센트 설정 불러오기 실패:`, error);
            return this.defaultSettings;
        }
    },

    // 설정 존재 여부 확인 
    async hasSettings() {
        try {
            if (window.APIService && window.APIService.hasPercentSettings) {
                return await window.APIService.hasPercentSettings();
            }
            
            return localStorage.getItem('percentSettings') !== null;
        } catch (error) {
            console.error('설정 존재 확인 실패:', error);
            return false;
        }
    },

    // 백엔드용 설정 형식으로 변환 
    async getSettingsForBackend() {
        const settings = await this.getSettings();
        return {
            attendance_weight: settings.attendance,
            bills_weight: settings.bills,
            questions_weight: settings.questions,
            petitions_weight: settings.petitions,
            committees_weight: settings.committees,
            parties_weight: settings.parties
        };
    },

    // 🔧 설정 변경 알림 (환경별 로깅)
    notifySettingsChange(newSettings) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 퍼센트 설정 변경 알림:`, newSettings);
        
        // 커스텀 이벤트 발생
        const event = new CustomEvent('percentSettingsChanged', {
            detail: newSettings
        });
        window.dispatchEvent(event);
        
        // 콜백 함수들 실행
        if (this.changeCallbacks) {
            this.changeCallbacks.forEach(callback => {
                try {
                    callback(newSettings);
                } catch (error) {
                    console.error('설정 변경 콜백 실행 오류:', error);
                }
            });
        }
    },

    // 설정 변경 감지 콜백 등록
    onChange(callback) {
        if (!this.changeCallbacks) {
            this.changeCallbacks = [];
        }
        this.changeCallbacks.push(callback);
    },

    // 🔧 실시간 동기화 시작 (환경별 최적화)
    startSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const syncInterval = isVercelEnvironment() ? 10000 : 5000; // Vercel에서는 더 긴 간격
        
        this.syncInterval = setInterval(async () => {
            try {
                const currentSettings = await this.getSettings();
                this.notifySettingsChange(currentSettings);
            } catch (error) {
                console.error(`[${envType}] 설정 동기화 오류:`, error);
            }
        }, syncInterval);
        
        console.log(`[${envType}] 퍼센트 설정 실시간 동기화 시작 (${syncInterval}ms 간격)`);
    },

    // 동기화 중지 
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 퍼센트 설정 실시간 동기화 중지`);
    }
};

// 전역에서 접근 가능하도록 설정
window.PercentManager = PercentManager;

// ===== 퍼센트 설정 UI 관리 =====

const PercentSettings = {
    // 설정 UI 표시
    show() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 퍼센트 설정 UI 표시`);
        // 실제 설정 UI 구현 필요
        alert('퍼센트 설정 기능은 추후 구현 예정입니다.');
    },

    // 설정 변경 감지
    onChange(callback) {
        PercentManager.onChange(callback);
    }
};

window.PercentSettings = PercentSettings;

// ===== 네비게이션 관련 함수 ===== 

function setupNavigation() {
    // 서브메뉴 토글 기능
    const menuItems = document.querySelectorAll('.has-submenu');
    
    menuItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const submenuId = this.getAttribute('data-submenu');
            showSubmenu(submenuId);
        });

        item.addEventListener('mouseleave', function() {
            const submenuId = this.getAttribute('data-submenu');
            hideSubmenu(submenuId);
        });
    });

    // 서브메뉴도 hover 유지
    const submenus = document.querySelectorAll('.submenu-wrapper');
    submenus.forEach(submenu => {
        submenu.addEventListener('mouseenter', function() {
            this.style.display = 'block';
        });

        submenu.addEventListener('mouseleave', function() {
            this.style.display = 'none';
        });
    });
}

function showSubmenu(submenuId) {
    // 모든 서브메뉴 숨기기
    hideAllSubmenus();
    
    // 해당 서브메뉴 표시
    const submenu = document.getElementById(submenuId);
    if (submenu) {
        submenu.style.display = 'block';
    }
}

function hideSubmenu(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (submenu) {
        setTimeout(() => {
            const isHovered = submenu.matches(':hover');
            if (!isHovered) {
                submenu.style.display = 'none';
            }
        }, 100);
    }
}

function hideAllSubmenus() {
    const submenus = document.querySelectorAll('.submenu-wrapper');
    submenus.forEach(submenu => {
        submenu.style.display = 'none';
    });
}

// ===== 모달 관련 함수 ===== 

function setupModals() {
    // 문의하기 모달
    const inquiryModal = document.getElementById('inquiryModal');
    const inquiryTrigger = document.querySelector('[data-modal="inquiry"]');
    const inquiryClose = document.querySelector('.inquiry-modal .close-button');
    
    if (inquiryTrigger && inquiryModal) {
        inquiryTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            inquiryModal.classList.add('active');
        });
    }
    
    if (inquiryClose && inquiryModal) {
        inquiryClose.addEventListener('click', function() {
            inquiryModal.classList.remove('active');
        });
    }
    
    // 도움말 모달
    const helpModal = document.getElementById('helpModal');
    const helpTrigger = document.querySelector('[data-modal="help"]');
    const helpClose = document.querySelector('.help-modal .close-button');
    
    if (helpTrigger && helpModal) {
        helpTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            helpModal.classList.add('active');
        });
    }
    
    if (helpClose && helpModal) {
        helpClose.addEventListener('click', function() {
            helpModal.classList.remove('active');
        });
    }
    
    // 모달 외부 클릭 시 닫기
    [inquiryModal, helpModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });
}

// ===== SpringAI 연동 챗봇 시스템 (환경별 최적화) =====

// 챗봇 모달 토글
function toggleChatbot() {
    const modal = document.getElementById('chatbotModal');
    if (modal) {
        modal.classList.toggle('active');
        
        if (modal.classList.contains('active')) {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }
    }
}

// 메시지 추가 함수
function addMessage(content, isBot = false) {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isBot ? 'bot' : 'user'}`;

    if (isBot) {
        messageDiv.innerHTML = `
            <div class="bot-avatar">
                <img src="https://raw.githubusercontent.com/moody1317/osbasicproject_4/946d8f24f9c780853862670da370ad174c3def6c/chat.png" alt="챗봇 아바타">
            </div>
            <div class="message-content">
                <p>${content}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 타이핑 효과 표시
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;

    // 기존 타이핑 인디케이터 제거
    hideTypingIndicator();

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="bot-avatar">
            <img src="https://raw.githubusercontent.com/moody1317/osbasicproject_4/946d8f24f9c780853862670da370ad174c3def6c/chat.png" alt="챗봇 아바타">
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 타이핑 효과 제거 (기존과 동일)
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 🔧 SpringAI API 호출 함수 (환경별 최적화)
async function getChatbotResponse(message) {
    try {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] SpringAI 챗봇 요청:`, message);
        
        // 환경별 챗봇 API 엔드포인트 설정
        let apiUrl;
        if (isVercelEnvironment()) {
            // Vercel 배포 시: 프록시 경로 사용
            apiUrl = '/api/chatbot/chat';
        } else {
            // 로컬 개발 시: 실제 SpringAI 서버 또는 폴백
            apiUrl = '/api/chatbot/chat'; // 로컬에서도 프록시 경로 시도
        }
        
        // SpringAI 엔드포인트 호출
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: getCurrentPageContext() // 현재 페이지 컨텍스트 전달
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[${envType}] SpringAI 응답:`, data);
        
        return data.response || data.message || '응답을 받을 수 없습니다.';

    } catch (error) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.error(`[${envType}] SpringAI 챗봇 API 오류:`, error);
        
        // 폴백: 환경별 기본 응답
        return getFallbackResponse(message, envType);
    }
}

// 현재 페이지 컨텍스트 정보 수집 (기존과 동일)
function getCurrentPageContext() {
    const currentPath = window.location.pathname;
    const context = {
        page: currentPath,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        environment: isVercelEnvironment() ? 'vercel' : 'local'
    };

    // 페이지별 특화 정보 추가
    if (currentPath.includes('percent_party')) {
        const partyName = document.getElementById('party-name')?.textContent;
        if (partyName) {
            context.party = partyName;
            context.type = 'party_detail';
        }
    } else if (currentPath.includes('percent_member')) {
        const memberName = document.querySelector('.member-name')?.textContent;
        if (memberName) {
            context.member = memberName;
            context.type = 'member_detail';
        }
    } else if (currentPath.includes('rank_party')) {
        context.type = 'party_ranking';
    } else if (currentPath.includes('rank_member')) {
        context.type = 'member_ranking';
    } else if (currentPath.includes('compare_party')) {
        context.type = 'party_comparison';
    } else if (currentPath.includes('compare_member')) {
        context.type = 'member_comparison';
    } else if (currentPath.includes('meeting')) {
        context.type = 'meeting';
        if (currentPath.includes('more_meeting')) {
            context.subtype = 'meeting_detail';
        }
    } else if (currentPath.includes('petition')) {
        context.type = 'petition';
        if (currentPath.includes('more_petition')) {
            context.subtype = 'petition_detail';
        }
    } else if (currentPath.includes('announcements')) {
        context.type = 'announcements';
    } else if (currentPath.includes('inquiry')) {
        context.type = 'inquiry';
    }

    return context;
}

// 🔧 폴백 응답 (환경별 메시지)
function getFallbackResponse(message, envType = null) {
    const env = envType || (isVercelEnvironment() ? 'VERCEL' : 'LOCAL');
    
    const fallbackResponses = {
        '정책': `죄송합니다. ${env} 환경에서 현재 정책 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '표결': `죄송합니다. ${env} 환경에서 현재 표결 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '참여율': `죄송합니다. ${env} 환경에서 현재 참여율 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '의원': `죄송합니다. ${env} 환경에서 현재 의원 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '비교': `죄송합니다. ${env} 환경에서 현재 비교 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '활동': `죄송합니다. ${env} 환경에서 현재 활동 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '법안': `죄송합니다. ${env} 환경에서 현재 법안 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '지역구': `죄송합니다. ${env} 환경에서 현재 지역구 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '안건': `죄송합니다. ${env} 환경에서 현재 안건 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`,
        '결과': `죄송합니다. ${env} 환경에서 현재 결과 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.`
    };

    // 키워드 매칭
    for (const [keyword, response] of Object.entries(fallbackResponses)) {
        if (message.includes(keyword)) {
            return response;
        }
    }

    return `죄송합니다. ${env} 환경에서 현재 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.`;
}

// 🔧 메시지 전송 함수 (환경별 로깅)
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';

    // 사용자 메시지 추가
    addMessage(message, false);
    input.value = '';

    // 타이핑 효과 표시
    showTypingIndicator();

    try {
        // SpringAI로부터 응답 받기
        const response = await getChatbotResponse(message);
        
        // 타이핑 효과 제거
        hideTypingIndicator();
        
        // 봇 응답 추가
        addMessage(response, true);

        console.log(`[${envType}] 챗봇 응답 완료`);

    } catch (error) {
        console.error(`[${envType}] 메시지 전송 오류:`, error);
        
        // 타이핑 효과 제거
        hideTypingIndicator();
        
        // 환경별 오류 메시지 표시
        const errorMsg = `죄송합니다. ${envType} 환경에서 일시적인 오류가 발생했습니다. 다시 시도해주세요.`;
        addMessage(errorMsg, true);
    }
}

// 🔧 제안 버튼 클릭 처리 (환경별 로깅)
function handleSuggestionClick(suggestion) {
    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    console.log(`[${envType}] 제안 버튼 클릭:`, suggestion);
    
    addMessage(suggestion, false);
    
    // 타이핑 효과 표시
    showTypingIndicator();
    
    // SpringAI 응답 요청
    getChatbotResponse(suggestion).then(response => {
        hideTypingIndicator();
        addMessage(response, true);
        console.log(`[${envType}] 제안 버튼 응답 완료`);
    }).catch(error => {
        console.error(`[${envType}] 제안 버튼 응답 오류:`, error);
        hideTypingIndicator();
        const errorMsg = `죄송합니다. ${envType} 환경에서 일시적인 오류가 발생했습니다.`;
        addMessage(errorMsg, true);
    });
}

// 🔧 챗봇 초기화 (환경별 로깅)
function initializeChatbot() {
    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    console.log(`[${envType}] SpringAI 챗봇 시스템 초기화 중...`);

    // 챗봇 아이콘 클릭 이벤트
    const robotIcon = document.querySelector('.robot-icon');
    if (robotIcon) {
        robotIcon.addEventListener('click', toggleChatbot);
    }

    // 닫기 버튼 이벤트
    const closeButton = document.querySelector('.chatbot-modal .close-button');
    if (closeButton) {
        closeButton.addEventListener('click', toggleChatbot);
    }

    // 전송 버튼 이벤트
    const sendButton = document.querySelector('.send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    // Enter 키 이벤트
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // 제안 버튼들 이벤트
    const suggestionButtons = document.querySelectorAll('.suggestion-btn');
    suggestionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const suggestion = this.textContent.trim();
            handleSuggestionClick(suggestion);
        });
    });

    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('chatbotModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                toggleChatbot();
            }
        });
    }

    console.log(`[${envType}] SpringAI 챗봇 시스템 초기화 완료`);
}

// ===== 유틸리티 함수 =====

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

// ===== 페이지네이션 함수 =====

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

// ===== 페이지 초기화 (환경별 최적화) =====

document.addEventListener('DOMContentLoaded', function() {
    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    console.log(`🚀 [${envType}] scripts.js 초기화 시작...`);
    
    try {
        // 네비게이션 설정
        setupNavigation();
        console.log(`✅ [${envType}] 네비게이션 초기화 완료`);
        
        // 모달 설정
        setupModals();
        console.log(`✅ [${envType}] 모달 초기화 완료`);
        
        // SpringAI 챗봇 초기화
        initializeChatbot();
        console.log(`✅ [${envType}] SpringAI 챗봇 초기화 완료`);
        
        // 퍼센트 관리자 실시간 동기화 시작
        PercentManager.startSync();
        console.log(`✅ [${envType}] 퍼센트 관리자 초기화 완료`);
        
        console.log(`🎉 [${envType}] scripts.js 초기화 완료!`);
        
    } catch (error) {
        console.error(`❌ [${envType}] scripts.js 초기화 중 오류:`, error);
    }
});

// 🔧 페이지 언로드 시 정리 (환경별 로깅)
window.addEventListener('beforeunload', function() {
    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    PercentManager.stopSync();
    console.log(`[${envType}] 페이지 정리 완료`);
});

// 🆕 디버그 유틸리티
window.scriptsDebug = {
    env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
    testChatbot: (message) => {
        return getChatbotResponse(message || '테스트 메시지');
    },
    showEnvInfo: () => {
        const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`현재 환경: ${env}`);
        console.log(`호스트명: ${window.location.hostname}`);
        console.log(`챗봇 활성화: ${!!document.getElementById('chatbotModal')}`);
        console.log(`PercentManager 활성화: ${!!window.PercentManager}`);
    }
};
