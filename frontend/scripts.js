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
    return window.percentSync ? window.percentSync.isVercelDeployment : false;
}

// ===== 퍼센트 관리자 =====

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

    // 설정 저장
    async saveSettings(settings) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 퍼센트 설정 저장 중:`, settings);
            
            // global_sync.js의 PercentSettings 사용
            const result = await window.PercentSettings.save(settings);
            
            if (result) {
                console.log(`[${envType}] 퍼센트 설정 저장 완료`);
                
                // 서버에도 저장 시도
                try {
                    const backendFormat = this.convertToBackendFormat(settings);
                    await window.PercentSettings.saveToServer(backendFormat);
                    console.log(`[${envType}] 서버에 퍼센트 설정 저장 완료`);
                } catch (serverError) {
                    console.warn(`[${envType}] 서버 저장 실패, 로컬만 저장됨:`, serverError);
                }
            }
            
            return result;
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 퍼센트 설정 저장 실패:`, error);
            return false;
        }
    },

    // 설정 불러오기
    async getSettings() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 퍼센트 설정 불러오는 중...`);
            
            const settings = await window.PercentSettings.get();
            
            if (settings) {
                console.log(`[${envType}] 퍼센트 설정 로드:`, settings);
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
            const settings = await window.PercentSettings.get();
            return !!settings;
        } catch (error) {
            console.error('설정 존재 확인 실패:', error);
            return false;
        }
    },

    // 백엔드용 설정 형식으로 변환 
    convertToBackendFormat(settings) {
        return {
            attendance_weight: settings.attendance,
            bills_weight: settings.bills,
            questions_weight: settings.questions,
            petitions_weight: settings.petitions,
            committees_weight: settings.committees,
            parties_weight: settings.parties
        };
    },

    // 설정 변경 감지 콜백 등록
    onChange(callback) {
        if (window.PercentSettings) {
            window.PercentSettings.onChange(callback);
        }
    },

    // 🔧 실시간 동기화 시작 
    startSync() {
        if (window.PercentSettings) {
            window.PercentSettings.startSync();
        }
        
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 퍼센트 설정 실시간 동기화 시작`);
    },

    // 동기화 중지 
    stopSync() {
        if (window.PercentSettings) {
            window.PercentSettings.stopSync();
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

// ===== Django 연동 챗봇 시스템 =====

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

// 타이핑 효과 제거
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Django 챗봇 API 호출 함수
async function getChatbotResponse(message) {
    try {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] Django 챗봇 요청:`, message);
        
        // global_sync.js의 APIService 사용
        if (window.APIService && window.APIService.sendChatMessage) {
            const response = await window.APIService.sendChatMessage(message);
            console.log(`[${envType}] Django 응답:`, response);
            
            // Django API 응답 구조에 맞춰 처리
            if (response && response.message) {
                return response.message;
            } else if (response && response.data && response.data.message) {
                return response.data.message;
            } else if (typeof response === 'string') {
                return response;
            } else {
                throw new Error('Invalid response format');
            }
        } else {
            throw new Error('APIService not available');
        }

    } catch (error) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.error(`[${envType}] Django 챗봇 API 오류:`, error);
        
        // 폴백: 환경별 기본 응답
        return getFallbackResponse(message, envType);
    }
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
        // Django 챗봇으로부터 응답 받기
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
    
    // Django 챗봇 응답 요청
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
    console.log(`[${envType}] Django 챗봇 시스템 초기화 중...`);

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

    console.log(`[${envType}] Django 챗봇 시스템 초기화 완료`);
}

// ===== 페이지 초기화 =====

document.addEventListener('DOMContentLoaded', function() {
    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    console.log(`🚀 [${envType}] scripts.js 초기화 시작...`);
    
    try {
        // global_sync.js 로딩 대기
        if (!window.percentSync || !window.APIService) {
            console.log(`[${envType}] global_sync.js 로딩 대기 중...`);
            setTimeout(() => {
                document.dispatchEvent(new Event('DOMContentLoaded'));
            }, 100);
            return;
        }
        
        // 네비게이션 설정
        setupNavigation();
        console.log(`✅ [${envType}] 네비게이션 초기화 완료`);
        
        // 모달 설정
        setupModals();
        console.log(`✅ [${envType}] 모달 초기화 완료`);
        
        // Django 챗봇 초기화
        initializeChatbot();
        console.log(`✅ [${envType}] Django 챗봇 초기화 완료`);
        
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
        console.log(`global_sync 연동: ${!!(window.percentSync && window.APIService)}`);
    },
    testGlobalSync: () => {
        if (window.vercelDebug) {
            console.log('🔗 global_sync.js 연동 테스트');
            window.vercelDebug.showEnvInfo();
            return true;
        } else {
            console.error('❌ global_sync.js 연동 실패');
            return false;
        }
    }
};
