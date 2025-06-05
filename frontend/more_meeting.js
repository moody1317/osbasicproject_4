document.addEventListener('DOMContentLoaded', function() {
    // ===== 환경 감지 및 설정 =====
    
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

    // 환경별 알림 시스템
    function showEnvironmentNotification(message, type = 'info') {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const envBadge = `[${envType}]`;
        
        const colors = {
            info: '#2196f3',
            warning: '#ff9800', 
            error: '#f44336',
            success: '#4caf50'
        };

        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification env-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 400px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: 'Courier New', monospace;
        `;
        notification.textContent = `${envBadge} ${message}`;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 환경별 자동 제거 시간 조정
        const autoRemoveTime = isVercelEnvironment() ? 4000 : 5000;
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, autoRemoveTime);
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

    // ===== 데이터 관리 =====
    
    // URL 파라미터에서 법안 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('bill_id');
    
    let billData = {
        id: billId,
        billNumber: urlParams.get('bill_number'),
        title: urlParams.get('title'),
        proposer: urlParams.get('proposer'),
        date: urlParams.get('date'),
        status: urlParams.get('status'),
        committee: urlParams.get('committee')
    };

    // ===== API 연동 함수들 (환경별 최적화) =====

    // 🔧 법안 상세 정보 가져오기 (환경별 로깅)
    async function fetchBillDetail(billId) {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 법안 상세 정보를 가져오는 중:`, billId);
            
            if (!window.APIService) {
                throw new Error('API 서비스가 연결되지 않았습니다');
            }
            
            // 환경별 최적화된 API 호출
            const detailData = await window.APIService.safeApiCall(
                () => window.APIService.getBillDetail ? 
                      window.APIService.getBillDetail(billId) : 
                      window.APIService.getBills().then(bills => bills.find(bill => bill.id == billId)),
                null
            );
            
            if (detailData) {
                console.log(`[${envType}] 법안 상세 정보 로드 성공:`, detailData.title || detailData.bill_number);
                
                return {
                    id: detailData.id,
                    billNumber: detailData.bill_number || detailData.billNumber,
                    title: detailData.title,
                    proposer: detailData.proposer,
                    date: detailData.date,
                    status: detailData.status,
                    committee: detailData.committee,
                    sessionInfo: detailData.session_info || '제22대 (2024~2028) 제424회',
                    voteResult: detailData.vote_result || generateSampleVoteResult(),
                    partyVotes: detailData.party_votes || generateSamplePartyVotes(),
                    relatedDocuments: detailData.related_documents || []
                };
            } else {
                throw new Error('법안 정보를 찾을 수 없습니다');
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 법안 상세 정보 로드 실패:`, error);
            
            // API 실패 시 URL 파라미터 데이터 + 샘플 데이터 사용
            return {
                ...billData,
                sessionInfo: '제22대 (2024~2028) 제424회',
                voteResult: generateSampleVoteResult(),
                partyVotes: generateSamplePartyVotes(),
                relatedDocuments: []
            };
        }
    }

    // 샘플 투표 결과 생성 (환경별 데이터)
    function generateSampleVoteResult() {
        const isVercel = isVercelEnvironment();
        
        // Vercel 환경에서는 더 현실적인 데이터, 로컬에서는 테스트 데이터
        if (isVercel) {
            return {
                total: 298,
                favor: 162,
                against: 98,
                abstention: 28,
                absent: 10
            };
        } else {
            return {
                total: 250,
                favor: 135,
                against: 85,
                abstention: 20,
                absent: 10
            };
        }
    }

    // 샘플 정당별 투표 현황 생성 (환경별 데이터)
    function generateSamplePartyVotes() {
        const isVercel = isVercelEnvironment();
        
        if (isVercel) {
            return [
                { party: '국민의힘', favor: 108, against: 0, abstention: 0, absent: 3 },
                { party: '더불어민주당', favor: 42, against: 98, abstention: 25, absent: 5 },
                { party: '조국혁신당', favor: 8, against: 0, abstention: 3, absent: 1 },
                { party: '개혁신당', favor: 3, against: 0, abstention: 0, absent: 0 },
                { party: '무소속', favor: 1, against: 0, abstention: 0, absent: 1 }
            ];
        } else {
            return [
                { party: '국민의힘', favor: 95, against: 5, abstention: 8, absent: 2 },
                { party: '더불어민주당', favor: 35, against: 80, abstention: 10, absent: 5 },
                { party: '조국혁신당', favor: 5, against: 0, abstention: 2, absent: 1 },
                { party: '개혁신당', favor: 0, against: 0, abstention: 0, absent: 2 }
            ];
        }
    }

    // 기본 투표 결과 (API 실패 시 사용)
    function getDefaultVoteResult() {
        return {
            total: 0,
            favor: 0,
            against: 0,
            abstention: 0,
            absent: 0
        };
    }

    // 기본 정당별 투표 현황 (API 실패 시 사용)
    function getDefaultPartyVotes() {
        return [
            { party: '국민의힘', favor: 0, against: 0, abstention: 0, absent: 0 },
            { party: '더불어민주당', favor: 0, against: 0, abstention: 0, absent: 0 },
            { party: '조국혁신당', favor: 0, against: 0, abstention: 0, absent: 0 },
            { party: '개혁신당', favor: 0, against: 0, abstention: 0, absent: 0 }
        ];
    }

    // 에러 메시지 표시 (환경별 최적화)
    function showError(message) {
        showEnvironmentNotification(message, 'error');
    }

    // ===== UI 업데이트 함수들 =====

    // 🔧 페이지 내용 업데이트 함수 (환경별 로깅)
    function updatePageContent(data) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 페이지 내용 업데이트 중:`, data.title);
        
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

        // 투표 결과 업데이트 (API 데이터가 있는 경우)
        if (data.voteResult) {
            updateVoteResult(data.voteResult);
        }

        // 정당별 투표 현황 업데이트
        if (data.partyVotes) {
            updatePartyVotes(data.partyVotes);
        }
        
        console.log(`[${envType}] 페이지 내용 업데이트 완료`);
    }

    // 🔧 투표 결과 업데이트 (환경별 로깅)
    function updateVoteResult(voteResult) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 투표 결과 업데이트:`, voteResult);
        
        const voteItems = document.querySelectorAll('.vote-item');
        
        if (voteItems.length >= 4) {
            // 찬성, 반대, 기권, 불참 순서로 업데이트
            const voteNumbers = [
                voteResult.favor || 0,
                voteResult.against || 0,
                voteResult.abstention || 0,
                voteResult.absent || 0
            ];
            
            voteItems.forEach((item, index) => {
                const numberElement = item.querySelector('.vote-number');
                if (numberElement && voteNumbers[index] !== undefined) {
                    // 환경별 애니메이션 속도 조정
                    const animationDuration = isVercelEnvironment() ? 1200 : 1000;
                    animateCounter(numberElement, 0, voteNumbers[index], animationDuration);
                }
            });
        }
    }

    // 숫자 카운터 애니메이션
    function animateCounter(element, start, end, duration) {
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.round(start + (end - start) * progress);
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // 🔧 정당별 투표 현황 업데이트 (환경별 로깅)
    function updatePartyVotes(partyVotes) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 정당별 투표 현황 업데이트:`, partyVotes.length, '개 정당');
        
        const partyVoteContainer = document.querySelector('.party-vote-list');
        
        if (partyVoteContainer && Array.isArray(partyVotes)) {
            partyVoteContainer.innerHTML = '';
            
            partyVotes.forEach(partyVote => {
                const partyItem = document.createElement('div');
                partyItem.className = 'party-vote-item';
                
                partyItem.innerHTML = `
                    <div class="party-name">${partyVote.party}</div>
                    <div class="party-vote-details">
                        <span class="vote-favor">찬성 ${partyVote.favor}</span>
                        <span class="vote-against">반대 ${partyVote.against}</span>
                        <span class="vote-abstention">기권 ${partyVote.abstention}</span>
                        <span class="vote-absent">불참 ${partyVote.absent}</span>
                    </div>
                `;
                
                partyVoteContainer.appendChild(partyItem);
            });
        }
    }

    // 진행 단계 업데이트
    function updateProgressSteps(status) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 진행 단계 업데이트:`, status);
        
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
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 의안 접수 정보 업데이트`);
        
        const infoCells = document.querySelectorAll('.info-table .table-cell');
        
        if (infoCells.length >= 8) {
            infoCells[1].textContent = data.billNumber || '정보 없음';
            infoCells[3].textContent = data.date || '정보 없음';
            infoCells[5].textContent = data.proposer || '정보 없음';
            infoCells[7].textContent = data.sessionInfo || '제22대 (2024~2028) 제424회';
        }
    }

    // ===== 이벤트 핸들러 및 UI 기능 =====

    // 홈 아이콘 클릭 이벤트
    function setupHomeIcon() {
        const homeIcon = document.querySelector('.home-icon');
        if (homeIcon) {
            homeIcon.addEventListener('click', function(e) {
                e.preventDefault();
                const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
                console.log(`[${envType}] 본회의 현황 페이지로 이동`);
                // 본회의 현황 페이지로 이동
                window.location.href = 'meeting.html';
            });
        }
    }
    
    // 🔧 진행 단계 툴팁 추가 (환경별 최적화)
    function setupStepTooltips() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 진행 단계 툴팁 설정 중...`);
        
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
        
        console.log(`[${envType}] 진행 단계 툴팁 설정 완료`);
    }
    
    // 정보 섹션 접기/펼치기 기능
    function setupInfoSections() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 정보 섹션 접기/펼치기 설정 중...`);
        
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
    }
    
    // 🔧 애니메이션 효과 추가 (환경별 최적화)
    function addPageAnimations() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const animationDelay = isVercelEnvironment() ? 150 : 100; // Vercel에서는 약간 느리게
        
        // 테이블 행 애니메이션
        const tableRows = document.querySelectorAll('.table-row');
        
        tableRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.5s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, index * animationDelay);
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
        
        console.log(`[${envType}] 페이지 애니메이션 설정 완료`);
    }

    // 🔧 상태 알림 메시지 표시 (환경별 최적화)
    function showStatusNotification(status) {
        const statusMessages = {
            '가결': '✅ 이 법안은 본회의에서 가결되었습니다.',
            '부결': '❌ 이 법안은 본회의에서 부결되었습니다.',
            '심의중': '⏳ 이 법안은 현재 심의 중입니다.'
        };

        const message = statusMessages[status];
        if (message) {
            // 환경별 상태 색상 조정
            const statusColor = status === '가결' ? '#4caf50' : 
                               status === '부결' ? '#f44336' : 
                               '#ff9800';
            
            showEnvironmentNotification(message, 
                status === '가결' ? 'success' : 
                status === '부결' ? 'error' : 
                'warning'
            );
        }
    }

    // 🔧 투표 정보에 애니메이션 효과 추가 (환경별 최적화)
    function addVoteAnimations() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const baseDelay = isVercelEnvironment() ? 120 : 100;
        
        // 투표 결과 카운터 애니메이션
        const voteItems = document.querySelectorAll('.vote-item');
        voteItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.5s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * baseDelay);
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
            }, 500 + (index * baseDelay));
        });
        
        console.log(`[${envType}] 투표 애니메이션 설정 완료`);
    }

    // ===== 페이지 초기화 (환경별 최적화) =====

    // 🔧 페이지 초기화 (환경별 로깅)
    async function initializePage() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 본회의 상세 페이지 초기화 중...`);
        
        try {
            // URL 파라미터 검증
            if (!billData.id) {
                console.warn(`[${envType}] 법안 ID가 없습니다. URL 파라미터를 확인하세요.`);
                showEnvironmentNotification('법안 정보가 없습니다', 'warning');
            }
            
            // API 서비스 확인 및 상세 정보 로드
            if (billId && window.APIService) {
                console.log(`[${envType}] API에서 법안 상세 정보를 가져옵니다:`, billId);
                
                const detailData = await fetchBillDetail(billId);
                billData = { ...billData, ...detailData };
                
                console.log(`[${envType}] 법안 상세 정보 로드 완료:`, billData.title);
                showEnvironmentNotification('법안 상세 정보 로드 완료', 'success');
                
            } else if (!window.APIService) {
                console.warn(`[${envType}] API 서비스가 연결되지 않았습니다. URL 파라미터 데이터를 사용합니다.`);
                showEnvironmentNotification('API 연결 실패, 기본 정보 사용', 'warning');
                
                // API 없을 때 샘플 데이터 추가
                billData.voteResult = generateSampleVoteResult();
                billData.partyVotes = generateSamplePartyVotes();
            }
            
            // 페이지 내용 업데이트
            if (billData.id) {
                updatePageContent(billData);
                
                // 상태 알림 표시 (환경별 지연)
                if (billData.status) {
                    const notificationDelay = isVercelEnvironment() ? 1000 : 500;
                    setTimeout(() => {
                        showStatusNotification(billData.status);
                    }, notificationDelay);
                }
            } else {
                console.error(`[${envType}] 법안 정보가 없습니다.`);
                showEnvironmentNotification('법안 정보를 찾을 수 없습니다', 'error');
            }
            
            // UI 기능 설정
            setupHomeIcon();
            setupStepTooltips();
            setupInfoSections();
            addPageAnimations();
            
            console.log(`[${envType}] 본회의 상세 페이지 초기화 완료`);
            
        } catch (error) {
            console.error(`[${envType}] 페이지 초기화 오류:`, error);
            showEnvironmentNotification('페이지 로드 중 오류가 발생했습니다', 'error');
        }
    }

    // 🔧 환경별 최적화된 초기화 및 애니메이션 실행
    const initDelay = isVercelEnvironment() ? 200 : 100;
    setTimeout(initializePage, initDelay);

    // 페이지 로드 시 투표 애니메이션 실행 (환경별 지연)
    const voteAnimationDelay = isVercelEnvironment() ? 800 : 500;
    setTimeout(() => {
        if (document.querySelector('.vote-info')) {
            addVoteAnimations();
        }
    }, voteAnimationDelay);

    // 🆕 디버그 유틸리티 (환경별)
    window.moreMeetingDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        getBillData: () => billData,
        reloadData: () => fetchBillDetail(billId),
        testVoteResult: () => updateVoteResult(generateSampleVoteResult()),
        testPartyVotes: () => updatePartyVotes(generateSamplePartyVotes()),
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`API 서비스: ${!!window.APIService}`);
            console.log(`법안 데이터:`, billData);
            console.log(`URL 파라미터:`, Object.fromEntries(urlParams.entries()));
        }
    };

    console.log(`🚀 [${isVercelEnvironment() ? 'VERCEL' : 'LOCAL'}] 본회의 상세 페이지 스크립트 로드 완료`);
    console.log('🔧 디버그: window.moreMeetingDebug.showEnvInfo()');
    console.log('📊 법안 데이터:', billData);
});
