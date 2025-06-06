document.addEventListener('DOMContentLoaded', function() {
    // 네비게이션 탭 선택 효과
    const navItems = document.querySelectorAll('nav li');
    const submenuWrappers = document.querySelectorAll('.submenu-wrapper');
    
    // 모든 서브메뉴 숨기기
    function hideAllSubmenus() {
        submenuWrappers.forEach(submenu => {
            submenu.style.display = 'none';
        });
    }
    
    // 메뉴 클릭 이벤트
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const submenuId = this.getAttribute('data-submenu');
            const submenu = document.getElementById(submenuId);
            
            // 이미 활성화된 탭을 클릭한 경우
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                hideAllSubmenus();
                return;
            }
            
            // 모든 탭에서 active 클래스 제거
            navItems.forEach(i => i.classList.remove('active'));
            
            // 클릭한 탭에 active 클래스 추가
            this.classList.add('active');
            
            // 서브메뉴가 있는 메뉴인 경우 서브메뉴 표시
            if (submenuId && submenu) {
                hideAllSubmenus();
                submenu.style.display = 'block';
            } else {
                hideAllSubmenus();
            }
        });
    });
    
    // 메뉴 호버 이벤트
    navItems.forEach(item => {
        const submenuId = item.getAttribute('data-submenu');
        const submenu = document.getElementById(submenuId);
        
        if (submenuId && submenu) {
            // 마우스 진입 시 서브메뉴 표시
            item.addEventListener('mouseenter', function() {
                hideAllSubmenus();
                submenu.style.display = 'block';
            });
            
            // 마우스 이탈 시 서브메뉴 숨기기 (활성화된 탭이 없을 경우)
            item.addEventListener('mouseleave', function(e) {
                if (!item.classList.contains('active')) {
                    // 마우스가 서브메뉴로 이동했는지 확인
                    const rect = submenu.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    
                    // 마우스가 서브메뉴 영역을 향해 이동하는 경우
                    if (y >= rect.top && y <= rect.bottom) {
                        return;
                    }
                    
                    submenu.style.display = 'none';
                }
            });
        }
    });
    
    // 서브메뉴 호버 이벤트
    submenuWrappers.forEach(submenu => {
        submenu.addEventListener('mouseenter', function() {
            // 서브메뉴에 마우스가 진입하면 표시 유지
        });
        
        submenu.addEventListener('mouseleave', function() {
            // 관련 메뉴가 활성화되어 있지 않으면 서브메뉴 숨기기
            const relatedMenuId = submenu.id;
            const relatedMenu = document.querySelector(`[data-submenu="${relatedMenuId}"]`);
            
            if (relatedMenu && !relatedMenu.classList.contains('active')) {
                submenu.style.display = 'none';
            }
        });
    });
    
    // 다른 곳 클릭 시 서브메뉴 닫기
    document.addEventListener('click', function(e) {
        const isMenu = e.target.closest('nav li');
        const isSubmenu = e.target.closest('.submenu-wrapper');
        
        if (!isMenu && !isSubmenu) {
            navItems.forEach(item => item.classList.remove('active'));
            hideAllSubmenus();
        }
    });
    
    // 페이지 로드 시 활성 탭 설정
    function setActiveTab() {
        // 기본적으로 아무 탭도 활성화하지 않음
    }
    
    setActiveTab();
    
    // 챗봇 관련 코드는 그대로 유지...
    
    // 챗봇 관련 코드
    const chatbotIcon = document.querySelector('.robot-icon');
    const chatbotModal = document.getElementById('chatbotModal');
    const closeButton = document.querySelector('.close-button');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.querySelector('.send-button');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const suggestionButtons = document.querySelectorAll('.suggestion-btn');
    
    // 현재 시간 가져오기
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // 0시는 12시로 표시
        
        return `${ampm} ${hours}:${minutes}`;
    }
    
    // 사용자 메시지 추가
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user');
        
        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        timestamp.textContent = getCurrentTime();
        
        messageElement.innerHTML = `${message}`;
        messageElement.appendChild(timestamp);
        
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    // 챗봇 메시지 추가
    function addBotMessage(messages, buttons = []) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'bot');
        
        const botAvatar = document.createElement('div');
        botAvatar.classList.add('bot-avatar');
        botAvatar.innerHTML = '<img src="https://raw.githubusercontent.com/moody1317/osbasicproject_4/946d8f24f9c780853862670da370ad174c3def6c/chat.png" alt="챗봇 아바타">';
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        // 메시지 내용 추가
        if (typeof messages === 'string') {
            messageContent.innerHTML = `<p>${messages}</p>`;
        } else {
            messages.forEach(msg => {
                messageContent.innerHTML += `<p>${msg}</p>`;
            });
        }
        
        // 타임스탬프 추가
        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        timestamp.textContent = getCurrentTime();
        messageContent.appendChild(timestamp);
        
        messageElement.appendChild(botAvatar);
        messageElement.appendChild(messageContent);
        
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    // 메시지 처리 함수
    function handleMessage(message) {
        addUserMessage(message);
        
        // 간단한 챗봇 응답 로직
        setTimeout(() => {
            if (message.includes('나경원') || message.includes('의원')) {
                addBotMessage([
                    '나경원 의원에 대한 정보입니다.',
                    '현재 나경원 의원은 국민의힘 소속 의원으로 전체 00위',
                    '국민의힘에서는 00위에 있습니다.',
                    '나경원 의원에 대한 어떤 정보를 더 얻고싶은가요?'
                ]);
            } else if (message.includes('상세') || message.includes('퍼센트')) {
                addBotMessage([
                    '나경원 의원의 상세 퍼센트입니다.',
                    '출석: 00%',
                    '가결: 00%',
                    '청원 소개: 00%',
                    '..',
                    '나경원 의원이 가장 높게 평가받는 부분은 청원 소개이고 가장 낮게 평가받는 부분은 가결입니다.'
                ]);
            } else if (message.includes('표결') || message.includes('정보')) {
                addBotMessage([
                    '나경원 의원의 표결 정보입니다.',
                    '전체 표결 참여: 000회',
                    '찬성: 000회',
                    '반대: 000회',
                    '기권: 000회'
                ]);
            } else if (message.includes('청원') || message.includes('소개')) {
                addBotMessage([
                    '나경원 의원의 청원 소개 내역입니다.',
                    '전체 청원 소개: 00건',
                    '가결: 00건',
                    '부결: 00건',
                    '진행중: 00건'
                ]);
            } else if (message.includes('경력')) {
                addBotMessage([
                    '나경원 의원의 경력입니다.',
                    '20대 국회의원',
                    '21대 국회의원',
                    '국민의힘 원내대표 역임',
                    '국회 외교통상통일위원회 위원'
                ]);
            } else {
                addBotMessage([
                    '죄송합니다. 질문을 이해하지 못했습니다.',
                    '다음 중 어떤 정보를 원하시나요?'
                ]);
            }
        }, 500);
    }
    
    // 챗봇 아이콘 클릭 이벤트
    if (chatbotIcon) {
        chatbotIcon.addEventListener('click', function() {
            chatbotModal.style.display = 'block';
        });
    }
    
    // 닫기 버튼 클릭 이벤트
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            chatbotModal.style.display = 'none';
        });
    }
    
    // 메시지 전송 이벤트
    if (sendButton && messageInput) {
        // 전송 버튼 클릭 이벤트
        sendButton.addEventListener('click', function() {
            const message = messageInput.value.trim();
            if (message) {
                handleMessage(message);
                messageInput.value = '';
            }
        });
        
        // 엔터 키 이벤트
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const message = messageInput.value.trim();
                if (message) {
                    handleMessage(message);
                    messageInput.value = '';
                }
            }
        });
    }
    
    // 제안 버튼 클릭 이벤트
    if (suggestionButtons) {
        suggestionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const message = this.textContent;
                handleMessage(message);
            });
        });
    }
    
    // ESC 키를 눌러 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && chatbotModal.style.display === 'block') {
            chatbotModal.style.display = 'none';
        }
    });
    
    // 페이지네이션 버튼 이벤트 설정
    const paginationLinks = document.querySelectorAll('.pagination a');
    paginationLinks.forEach(link => {
        if (!link.classList.contains('navigate')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                paginationLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        }
    });
    
    // 이전/다음 페이지네이션 버튼 기능
    const prevButton = document.querySelector('.pagination .navigate:first-child');
    const nextButton = document.querySelector('.pagination .navigate:last-child');
    
    if (prevButton && nextButton) {
        const pageButtons = Array.from(document.querySelectorAll('.pagination a:not(.navigate)'));
        
        prevButton.addEventListener('click', function(e) {
            e.preventDefault();
            const activePage = document.querySelector('.pagination a.active');
            const activeIndex = pageButtons.indexOf(activePage);
            
            if (activeIndex > 0) {
                activePage.classList.remove('active');
                pageButtons[activeIndex - 1].classList.add('active');
            }
        });
        
        nextButton.addEventListener('click', function(e) {
            e.preventDefault();
            const activePage = document.querySelector('.pagination a.active');
            const activeIndex = pageButtons.indexOf(activePage);
            
            if (activeIndex < pageButtons.length - 1) {
                activePage.classList.remove('active');
                pageButtons[activeIndex + 1].classList.add('active');
            }
        });
    }
});