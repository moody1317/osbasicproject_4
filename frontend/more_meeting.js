document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 법안 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const billData = {
        id: urlParams.get('bill_id'),
        billNumber: urlParams.get('bill_number'),
        title: urlParams.get('title'),
        proposer: urlParams.get('proposer'),
        date: urlParams.get('date'),
        status: urlParams.get('status'),
        committee: urlParams.get('committee')
    };

    // 법안 데이터가 있으면 페이지 업데이트
    if (billData.id) {
        updatePageContent(billData);
    }

    // 페이지 내용 업데이트 함수
    function updatePageContent(data) {
        // 페이지 제목 업데이트
        const pageTitle = document.querySelector('.bill-title');
        if (pageTitle) {
            pageTitle.innerHTML = `
                [${data.billNumber}] ${data.title}
                <a href="#" class="home-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.1L1 12h3v9h7v-6h2v6h7v-9h3L12 2.1zm0 2.691l6 5.4V19h-3v-6H9v6H6v-8.809l6-5.4z"/>
                    </svg>
                </a>
            `;
        }

        // 브라우저 탭 제목 업데이트
        document.title = `백일하 - ${data.title}`;

        // 진행 단계 업데이트 (상태에 따라)
        updateProgressSteps(data.status);

        // 의안 접수 정보 업데이트
        updateBillInfo(data);
    }

    // 진행 단계 업데이트
    function updateProgressSteps(status) {
        const steps = document.querySelectorAll('.step');
        
        // 모든 단계를 비활성화
        steps.forEach(step => step.classList.remove('active'));
        
        // 상태에 따라 활성화할 단계 결정
        let activeSteps = 0;
        switch(status) {
            case '심의중':
                activeSteps = 2; // 접수, 본회의 심의
                break;
            case '가결':
                activeSteps = 3; // 접수, 본회의 심의, 정부 이송
                break;
            case '부결':
                activeSteps = 2; // 접수, 본회의 심의
                break;
            default:
                activeSteps = 1; // 접수
        }

        // 해당 단계까지 활성화
        for (let i = 0; i < activeSteps && i < steps.length; i++) {
            steps[i].classList.add('active');
        }
    }

    // 의안 접수 정보 업데이트
    function updateBillInfo(data) {
        const infoCells = document.querySelectorAll('.info-table .table-cell');
        
        if (infoCells.length >= 8) {
            infoCells[1].textContent = data.billNumber || '정보 없음';
            infoCells[3].textContent = data.date || '정보 없음';
            infoCells[5].textContent = data.proposer || '정보 없음';
            infoCells[7].textContent = '제22대 (2024~2028) 제424회'; // 기본값
        }
    }

    // 홈 아이콘 클릭 이벤트
    const homeIcon = document.querySelector('.home-icon');
    if (homeIcon) {
        homeIcon.addEventListener('click', function(e) {
            e.preventDefault();
            // 본회의 현황 페이지로 이동
            window.location.href = 'meeting.html';
        });
    }
    
    // 진행 단계 툴팁 추가
    const steps = document.querySelectorAll('.step');
    const stepDescriptions = {
        '접수': '법안이 국회에 제출되어 접수된 상태입니다.',
        '본회의 심의': '본회의에서 법안을 심의 중입니다.',
        '정부 이송': '가결된 법안이 정부로 이송된 상태입니다.',
        '공포': '대통령이 법안을 공포하여 법률로 확정된 상태입니다.'
    };
    
    steps.forEach(step => {
        const stepName = step.textContent.trim();
        
        // 툴팁 요소 생성
        const tooltip = document.createElement('div');
        tooltip.className = 'step-tooltip';
        tooltip.textContent = stepDescriptions[stepName] || '';
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
    });
    
    // 정보 섹션 접기/펼치기 기능
    const infoTitles = document.querySelectorAll('.info-title');
    
    infoTitles.forEach(title => {
        title.style.cursor = 'pointer';
        
        title.addEventListener('click', function() {
            const section = this.parentElement;
            const content = section.querySelector('.info-table, .vote-info');
            
            if (content) {
                if (content.style.display === 'none') {
                    content.style.display = '';
                    this.classList.remove('collapsed');
                } else {
                    content.style.display = 'none';
                    this.classList.add('collapsed');
                }
            }
        });
    });
    
    // 테이블 행 애니메이션
    const tableRows = document.querySelectorAll('.table-row');
    
    tableRows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            row.style.transition = 'all 0.5s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
        }, index * 100);
    });
    
    // 페이지 로드 시 진행 단계 애니메이션
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

    // 뒤로가기 버튼 기능 추가
    window.addEventListener('popstate', function(event) {
        // 뒤로가기 시 meeting.html로 이동
        if (!urlParams.get('bill_id')) {
            window.location.href = 'meeting.html';
        }
    });

    // 상태에 따른 알림 메시지 표시
    if (billData.status) {
        showStatusNotification(billData.status);
    }

    // 상태 알림 메시지 표시
    function showStatusNotification(status) {
        const statusMessages = {
            '가결': '✅ 이 법안은 본회의에서 가결되었습니다.',
            '부결': '❌ 이 법안은 본회의에서 부결되었습니다.',
            '심의중': '⏳ 이 법안은 현재 심의 중입니다.'
        };

        const message = statusMessages[status];
        if (message) {
            // 알림 요소 생성
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: ${status === '가결' ? '#4caf50' : status === '부결' ? '#f44336' : '#ff9800'};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 1000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // 애니메이션으로 표시
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // 3초 후 자동 숨기기
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }
    }

    // 투표 정보에 애니메이션 효과 추가
    function addVoteAnimations() {
        // 투표 결과 카운터 애니메이션
        const voteItems = document.querySelectorAll('.vote-item');
        voteItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.5s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // 정당별 투표 현황 애니메이션
        const partyItems = document.querySelectorAll('.party-vote-item');
        partyItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.5s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 500 + (index * 100));
        });
    }

    // 페이지 로드 시 투표 애니메이션 실행
    setTimeout(() => {
        if (document.querySelector('.vote-info')) {
            addVoteAnimations();
        }
    }, 500);

    console.log('More meeting page initialized with data:', billData);
});