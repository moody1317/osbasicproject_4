document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 청원 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const petitionId = urlParams.get('petition_id');
    
    // ===== 환경별 대응 함수 =====

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

    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    console.log(`[${envType}] 청원 상세 페이지 로드됨, 청원 ID:`, petitionId);

    // 🔧 API에서 청원 상세 정보 가져오기 (환경별 로깅)
    async function fetchPetitionDetail(petitionId) {
        console.log(`[${envType}] 청원 상세 정보를 가져오는 중:`, petitionId);
        
        if (!window.APIService) {
            throw new Error('API 서비스가 연결되지 않았습니다');
        }
        
        try {
            // API에서 청원 상세 정보 호출
            const detailData = await window.APIService.getPetitionDetail(petitionId);
            
            if (detailData) {
                console.log(`[${envType}] API에서 받은 청원 상세 데이터:`, detailData);
                return detailData;
            } else {
                throw new Error('청원 정보를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error(`[${envType}] 청원 상세 정보 API 호출 실패:`, error);
            throw error; // 에러를 다시 던져서 호출자가 처리하도록 함
        }
    }

    // 기본 청원 데이터
    function getDefaultPetition(petitionId) {
        // 기본 청원들 중에서 해당 ID와 일치하는 것 찾기
        const defaultPetitions = [
            {
                id: 1,
                title: '인공지능 기본법 제정 촉구에 관한 청원',
                introducerMember: '오병일 의원 외 12인',
                introduceDate: '2024.12.03',
                referralDate: '2024.12.05',
                receiptDate: '2024.12.03',
                status: 'rejected',
                committee: '과학기술정보방송통신위원회',
                petitionNumber: '2200060',
                sessionInfo: '제22대 (2024~2028) 제420회',
                currentStep: 2,
                statusText: '불채택',
                billId: 'PRC_X2U4Y1O2J0N3D1Z7L1M7T1Y5V8H8K5'
            },
            {
                id: 2,
                title: '청년 주택 구입 지원을 위한 특별법 제정 청원',
                introducerMember: '김영호 의원 외 8인',
                introduceDate: '2024.11.20',
                referralDate: '2024.11.22',
                receiptDate: '2024.11.20',
                status: 'committee',
                committee: '국토교통위원회',
                petitionNumber: '2200061',
                sessionInfo: '제22대 (2024~2028) 제420회',
                currentStep: 2,
                statusText: '위원회 심사',
                billId: 'PRC_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5'
            },
            {
                id: 3,
                title: '반려동물 의료비 부담 완화를 위한 건강보험 적용 청원',
                introducerMember: '박민정 의원 외 15인',
                introduceDate: '2024.11.18',
                referralDate: '2024.11.21',
                receiptDate: '2024.11.18',
                status: 'review',
                committee: '보건복지위원회',
                petitionNumber: '2200062',
                sessionInfo: '제22대 (2024~2028) 제420회',
                currentStep: 2,
                statusText: '심사중',
                billId: 'PRC_B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'
            }
        ];
        
        const basePetition = defaultPetitions.find(p => p.id == petitionId);
        
        if (basePetition) {
            return {
                ...basePetition,
                attachments: [],
                processingHistory: [
                    {
                        date: basePetition.receiptDate,
                        status: '접수',
                        description: '청원이 정식으로 접수되었습니다.',
                        committee: ''
                    },
                    {
                        date: basePetition.referralDate,
                        status: basePetition.status === 'rejected' ? '본회의 불채택' : '위원회 회부',
                        description: basePetition.status === 'rejected' 
                            ? '본회의에서 불채택되었습니다.' 
                            : `${basePetition.committee}로 회부되었습니다.`,
                        committee: basePetition.committee
                    }
                ]
            };
        }
        
        // 기본값 (가장 최근 청원)
        return {
            id: 'default',
            title: '인공지능 기본법 제정 촉구에 관한 청원',
            introducerMember: '오병일 의원 외 12인',
            receiptDate: '2024.12.03',
            referralDate: '2024.12.05',
            introduceDate: '2024.12.03',
            status: 'rejected',
            statusText: '불채택',
            committee: '과학기술정보방송통신위원회',
            petitionNumber: '2200060',
            sessionInfo: '제22대 (2024~2028) 제420회',
            currentStep: 2,
            billId: 'PRC_X2U4Y1O2J0N3D1Z7L1M7T1Y5V8H8K5',
            attachments: [],
            processingHistory: [
                {
                    date: '2024.12.03',
                    status: '접수',
                    description: '청원이 정식으로 접수되었습니다.',
                    committee: ''
                },
                {
                    date: '2024.12.05',
                    status: '본회의 불채택',
                    description: '본회의에서 불채택되었습니다.',
                    committee: '과학기술정보방송통신위원회'
                }
            ]
        };
    }

    // 🔧 에러 메시지 표시 (환경별)
    function showError(message) {
        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">❌ ${envType} 오류</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    // 🔧 성공 메시지 표시 (환경별)
    function showSuccess(message) {
        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification success-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">✅ ${envType} 성공</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    // 🆕 경고 메시지 표시
    function showWarning(message) {
        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification warning-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #ff9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 350px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">⚠️ ${envType} 경고</div>
            <div>${message}</div>
        `;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 4초 후 자동 제거
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);
    }

    // 기존 알림 제거 
    function clearExistingNotifications() {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 200);
            }
        });
    }

    // 🔧 페이지 정보 업데이트 (환경별 로깅)
    function updatePageContent(petition) {
        console.log(`[${envType}] 페이지 내용 업데이트 중:`, petition);

        // 제목 업데이트
        const titleElement = document.getElementById('petitionTitle');
        if (titleElement) {
            const titleWithNumber = `[${petition.petitionNumber}] ${petition.title}`;
            titleElement.textContent = titleWithNumber;
            document.title = `백일하 - [${petition.petitionNumber}] ${petition.title}`;
        }
        
        // 접수 정보 업데이트
        const elements = {
            'petitionNumber': petition.petitionNumber || petition.id,
            'receiptDate': petition.receiptDate || petition.introduceDate,
            'introducerMember': petition.introducerMember,
            'sessionInfo': petition.sessionInfo || '제22대 국회',
            'statusBadge': petition.statusText || getStatusText(petition.status),
            'committee': petition.committee || '위원회 정보 없음'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '정보 없음';
                console.log(`[${envType}] ${id} 업데이트:`, value);
            } else {
                console.warn(`[${envType}] 요소를 찾을 수 없음: ${id}`);
            }
        });
        
        // 진행 단계 업데이트
        updateProgressSteps(petition.currentStep || calculateProgressStep(petition.status));
        
        // 첨부파일 업데이트 (있는 경우)
        if (petition.attachments && petition.attachments.length > 0) {
            updateAttachments(petition.attachments);
        }

        // 처리 이력 업데이트 (있는 경우)
        if (petition.processingHistory && petition.processingHistory.length > 0) {
            updateProcessingHistory(petition.processingHistory);
        }
        
        console.log(`[${envType}] 청원 정보 업데이트 완료:`, petition.title);
    }

    // 상태별 한국어 텍스트 반환 
    function getStatusText(status) {
        const statusTextMap = {
            'pending': '접수',
            'review': '심사중',
            'committee': '위원회 심사',
            'complete': '처리완료',
            'rejected': '불채택'
        };
        
        return statusTextMap[status] || status;
    }

    // 상태별 진행 단계 계산 
    function calculateProgressStep(status) {
        const stepMap = {
            'pending': 1,      // 접수
            'review': 2,       // 위원회 심사
            'committee': 2,    // 위원회 심사
            'complete': 5,     // 처리 통지
            'rejected': 2      // 위원회 심사에서 중단
        };
        
        return stepMap[status] || 1;
    }

    // 첨부파일 업데이트 
    function updateAttachments(attachments) {
        let attachmentSection = document.querySelector('.petition-attachments-section');
        
        if (!attachmentSection && attachments.length > 0) {
            // 첨부파일 섹션 생성
            attachmentSection = document.createElement('div');
            attachmentSection.className = 'petition-attachments-section';
            attachmentSection.style.cssText = `
                margin: 20px 0;
                padding: 20px;
                border: 1px solid var(--side2);
                border-radius: 8px;
                background-color: var(--main1);
            `;
            
            const attachmentList = attachments.map(attachment => `
                <div class="attachment-item" style="padding: 10px; border-bottom: 1px solid var(--side2); display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <a href="${attachment.url}" target="_blank" style="color: var(--light-blue); text-decoration: none; font-weight: 500;">
                            📎 ${attachment.name}
                        </a>
                        <span style="color: var(--example); font-size: 12px; margin-left: 10px;">
                            (${attachment.size || '크기 정보 없음'})
                        </span>
                    </div>
                    <span style="color: var(--example); font-size: 11px;">
                        ${attachment.type || 'file'}
                    </span>
                </div>
            `).join('');
            
            attachmentSection.innerHTML = `
                <h3 style="margin-bottom: 15px; color: var(--string); font-size: 16px; font-weight: 600;">첨부파일</h3>
                <div class="attachments-list">
                    ${attachmentList}
                </div>
            `;
            
            // 접수 정보 다음에 삽입
            const infoSection = document.querySelector('.info-section');
            if (infoSection && infoSection.parentNode) {
                infoSection.parentNode.insertBefore(attachmentSection, infoSection.nextSibling);
            }
        }
    }

    // 처리 이력 업데이트
    function updateProcessingHistory(processingHistory) {
        let historySection = document.querySelector('.petition-history-section');
        
        if (!historySection && processingHistory.length > 0) {
            // 처리 이력 섹션 생성
            historySection = document.createElement('div');
            historySection.className = 'petition-history-section';
            historySection.style.cssText = `
                margin: 20px 0;
                padding: 20px;
                border: 1px solid var(--side2);
                border-radius: 8px;
                background-color: white;
            `;
            
            const historyList = processingHistory.map((history, index) => `
                <div class="history-item" style="padding: 15px; border-bottom: ${index < processingHistory.length - 1 ? '1px solid var(--side2)' : 'none'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: 600; color: var(--string);">${history.status}</span>
                        <span style="color: var(--example); font-size: 12px;">${history.date}</span>
                    </div>
                    <div style="color: var(--string); font-size: 14px; line-height: 1.4;">
                        ${history.description}
                    </div>
                    ${history.committee ? `<div style="color: var(--example); font-size: 12px; margin-top: 5px;">담당: ${history.committee}</div>` : ''}
                </div>
            `).join('');
            
            historySection.innerHTML = `
                <h3 style="margin-bottom: 15px; color: var(--string); font-size: 16px; font-weight: 600;">처리 이력</h3>
                <div class="history-list">
                    ${historyList}
                </div>
            `;
            
            // 첨부파일 섹션 다음 또는 접수 정보 다음에 삽입
            const attachmentSection = document.querySelector('.petition-attachments-section');
            const infoSection = document.querySelector('.info-section');
            
            if (attachmentSection && attachmentSection.parentNode) {
                attachmentSection.parentNode.insertBefore(historySection, attachmentSection.nextSibling);
            } else if (infoSection && infoSection.parentNode) {
                infoSection.parentNode.insertBefore(historySection, infoSection.nextSibling);
            }
        }
    }

    // 🔧 진행 단계 업데이트 (환경별 로깅)
    function updateProgressSteps(currentStep) {
        const steps = document.querySelectorAll('.step');
        
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            if (stepNumber <= currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        console.log(`[${envType}] 진행 단계 업데이트 완료, 현재 단계:`, currentStep);
    }

    // 홈 아이콘 클릭 이벤트
    const homeIcon = document.querySelector('.home-icon');
    if (homeIcon) {
        homeIcon.addEventListener('click', function(e) {
            e.preventDefault();
            // 청원 현황 페이지로 이동
            console.log(`[${envType}] 청원 현황 페이지로 이동`);
            window.location.href = 'petition.html';
        });
    }

    // 🔧 상태 알림 표시 (환경별)
    function showStatusNotification(status) {
        const statusMessages = {
            'pending': '📝 이 청원은 접수되어 검토를 기다리고 있습니다.',
            'review': '🔍 이 청원은 현재 심사 중입니다.',
            'committee': '🏛️ 이 청원은 위원회에서 심사 중입니다.',
            'complete': '✅ 이 청원은 처리가 완료되었습니다.',
            'rejected': '❌ 이 청원은 본회의에서 불채택되었습니다.'
        };

        const message = statusMessages[status];
        if (message) {
            // 알림 요소 생성
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: ${status === 'complete' ? '#4caf50' : status === 'rejected' ? '#f44336' : '#ff9800'};
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 1000;
                transform: translateX(-50%) translateY(-100%);
                transition: transform 0.3s ease;
                max-width: 400px;
                text-align: center;
            `;
            notification.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 5px;">[${envType}] 청원 상태</div>
                <div>${message}</div>
            `;
            
            document.body.appendChild(notification);
            
            // 애니메이션으로 표시
            setTimeout(() => {
                notification.style.transform = 'translateX(-50%) translateY(0)';
            }, 100);
            
            // 4초 후 자동 숨기기
            setTimeout(() => {
                notification.style.transform = 'translateX(-50%) translateY(-100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 4000);
        }
    }

    // 진행 단계 툴팁 추가 
    function addStepTooltips() {
        const steps = document.querySelectorAll('.step');
        const stepDescriptions = {
            '접수': '청원이 국회에 정식으로 접수된 상태입니다.',
            '위원회 심사': '해당 상임위원회에서 청원을 검토하고 심사 중입니다.',
            '본회의 심의': '상임위원회 심사를 거쳐 본회의에서 심의 중입니다.',
            '정부 이송': '본회의 의결 후 정부로 이송되어 처리 중입니다.',
            '처리 통지': '정부에서 처리 결과를 국회로 통지된 상태입니다.'
        };
        
        steps.forEach(step => {
            const stepName = step.textContent.trim();
            const description = stepDescriptions[stepName];
            
            if (description) {
                // 툴팁 요소 생성
                const tooltip = document.createElement('div');
                tooltip.className = 'step-tooltip';
                tooltip.textContent = description;
                tooltip.style.cssText = `
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    width: 200px;
                    text-align: center;
                    opacity: 0;
                    transition: opacity 0.3s;
                    pointer-events: none;
                    margin-bottom: 10px;
                    z-index: 10;
                `;
                
                // 화살표 추가
                const arrow = document.createElement('div');
                arrow.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid rgba(0, 0, 0, 0.8);
                `;
                tooltip.appendChild(arrow);
                
                step.style.position = 'relative';
                step.appendChild(tooltip);
                
                // 호버 이벤트
                step.addEventListener('mouseenter', function() {
                    tooltip.style.opacity = '1';
                });
                
                step.addEventListener('mouseleave', function() {
                    tooltip.style.opacity = '0';
                });
            }
        });
    }

    // 진행 단계 애니메이션 
    function addProgressAnimation() {
        const progressSteps = document.querySelector('.progress-steps');
        if (progressSteps) {
            progressSteps.style.opacity = '0';
            progressSteps.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                progressSteps.style.transition = 'all 0.5s ease';
                progressSteps.style.opacity = '1';
                progressSteps.style.transform = 'translateY(0)';
            }, 300);
        }
    }

    // 정보 섹션 애니메이션
    function addInfoAnimation() {
        const infoRows = document.querySelectorAll('.table-row');
        
        infoRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.5s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, index * 100);
        });
    }

    // 🔧 로딩 표시 (환경별)
    function showLoading() {
        const content = document.querySelector('.content');
        if (content) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingIndicator';
            loadingDiv.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(255, 255, 255, 0.9);
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                color: var(--example);
                font-size: 14px;
                z-index: 100;
            `;
            loadingDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 5px;">[${envType}] 로딩 중</div>
                <div>청원 정보를 불러오는 중...</div>
                <div style="margin-top: 10px;">⏳</div>
            `;
            
            content.style.position = 'relative';
            content.appendChild(loadingDiv);
        }
    }

    // 로딩 숨기기 
    function hideLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    // 🔧 페이지 초기화 (환경별 최적화)
    async function initializePage() {
        console.log(`[${envType}] 청원 상세 페이지 초기화 중...`);
        
        try {
            showLoading();
            
            let petition;
            let isFromAPI = false;
            let errorMessage = null;
            
            // 청원 ID가 있는 경우 API에서 상세 정보 로드
            if (petitionId && window.APIService) {
                console.log(`[${envType}] API에서 청원 상세 정보를 가져옵니다:`, petitionId);
                
                try {
                    petition = await fetchPetitionDetail(petitionId);
                    if (petition) {
                        console.log(`[${envType}] 청원 상세 정보 로드 완료:`, petition.title);
                        isFromAPI = true;
                    } else {
                        throw new Error('청원 정보를 찾을 수 없습니다');
                    }
                } catch (apiError) {
                    console.warn(`[${envType}] API에서 청원 정보 로드 실패:`, apiError);
                    petition = getDefaultPetition(petitionId);
                    errorMessage = `${envType} 환경에서 API 연결 실패로 기본 정보를 표시합니다.`;
                }
                
            } else if (!window.APIService) {
                console.warn(`[${envType}] API 서비스가 연결되지 않았습니다. 기본 데이터를 사용합니다.`);
                petition = getDefaultPetition(petitionId);
                errorMessage = `${envType} 환경에서 API 연결 실패. 기본 정보만 표시됩니다.`;
                
            } else {
                console.warn(`[${envType}] 청원 ID가 없습니다. 기본 청원을 표시합니다.`);
                petition = getDefaultPetition('default');
                errorMessage = '청원 ID가 없습니다. 기본 청원을 표시합니다.';
            }
            
            // 페이지 내용 업데이트
            if (petition) {
                updatePageContent(petition);
                
                // 애니메이션 실행
                addProgressAnimation();
                setTimeout(() => {
                    addInfoAnimation();
                    addStepTooltips();
                }, 500);
                
                // 상태에 따른 적절한 알림 표시
                if (isFromAPI) {
                    showSuccess('청원 정보가 성공적으로 로드되었습니다.');
                    // 상태 알림은 약간의 지연 후 표시 (성공 알림과 겹치지 않도록)
                    setTimeout(() => {
                        showStatusNotification(petition.status);
                    }, 1000);
                } else if (errorMessage) {
                    showError(errorMessage);
                    // 에러 상황에서는 상태 알림 표시하지 않음
                }
                
            } else {
                throw new Error('청원 정보를 로드할 수 없습니다');
            }
            
        } catch (error) {
            console.error(`[${envType}] 페이지 초기화 오류:`, error);
            showError('페이지 로드 중 오류가 발생했습니다.');
            
            // 오류 시 기본 청원 표시
            const defaultPetition = getDefaultPetition('default');
            updatePageContent(defaultPetition);
            addProgressAnimation();
            setTimeout(() => {
                addInfoAnimation();
                addStepTooltips();
            }, 500);
            
        } finally {
            hideLoading();
        }
    }

    // 🆕 개발자 도구용 디버그 함수 (환경별 정보 추가)
    window.debugPetitionDetail = {
        env: () => envType,
        getPetitionId: () => petitionId,
        reloadData: () => initializePage(),
        testFetch: (id) => fetchPetitionDetail(id),
        showEnvInfo: () => {
            console.log(`현재 환경: ${envType}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`청원 ID: ${petitionId}`);
            console.log(`APIService 사용 가능: ${!!window.APIService}`);
        }
    };

    // 페이지 초기화 실행
    initializePage();
    
    console.log(`[${envType}] 청원 상세 페이지 스크립트 로드 완료`);
});
