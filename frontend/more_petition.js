document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 청원 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const petitionId = urlParams.get('petition_id');
    
    // Django API 연결 설정 (나중에 수정할 부분)
    const API_BASE_URL = ''; // 나중에 Django API 서버 주소로 변경
    const USE_API = false; // true로 변경하면 API 사용
    
    // 더미 데이터
    const DUMMY_PETITIONS = [
        {
            id: 1,
            title: '청년 주택 구입 지원을 위한 특별법 제정 청원',
            introducerMember: '김영호',
            introduceDate: '2025.05.20',
            referralDate: '2025.05.22',
            status: 'committee',
            committee: '국토교통위원회'
        },
        {
            id: 2,
            title: '반려동물 의료비 부담 완화를 위한 건강보험 적용 청원',
            introducerMember: '박민정',
            introduceDate: '2025.05.18',
            referralDate: '2025.05.21',
            status: 'review',
            committee: '보건복지위원회'
        },
        {
            id: 3,
            title: '대학생 등록금 부담 경감을 위한 정책 개선 청원',
            introducerMember: '이준석',
            introduceDate: '2025.05.15',
            referralDate: '2025.05.18',
            status: 'complete',
            committee: '교육위원회'
        },
        {
            id: 4,
            title: '소상공인 임대료 지원 확대 방안 마련 청원',
            introducerMember: '최수진',
            introduceDate: '2025.05.12',
            referralDate: '2025.05.15',
            status: 'committee',
            committee: '중소벤처기업위원회'
        },
        {
            id: 5,
            title: '육아휴직 급여 인상 및 기간 연장 청원',
            introducerMember: '한민수',
            introduceDate: '2025.05.10',
            referralDate: '2025.05.13',
            status: 'complete',
            committee: '환경노동위원회'
        },
        {
            id: 6,
            title: '온라인 게임 셧다운제 개선 청원',
            introducerMember: '정하늘',
            introduceDate: '2025.05.08',
            referralDate: '2025.05.11',
            status: 'review',
            committee: '과학기술정보방송통신위원회'
        },
        {
            id: 7,
            title: '택시 요금 현실화 및 승차거부 방지 청원',
            introducerMember: '윤상호',
            introduceDate: '2025.05.05',
            referralDate: '2025.05.08',
            status: 'committee',
            committee: '국토교통위원회'
        },
        {
            id: 8,
            title: '농산물 가격 안정화를 위한 정책 수립 청원',
            introducerMember: '강은미',
            introduceDate: '2025.05.03',
            referralDate: '2025.05.06',
            status: 'pending',
            committee: '농림축산식품해양수산위원회'
        },
        {
            id: 9,
            title: '치킨집 영업시간 규제 완화 청원',
            introducerMember: '오세훈',
            introduceDate: '2025.05.01',
            referralDate: '2025.05.04',
            status: 'rejected',
            committee: '행정안전위원회'
        },
        {
            id: 10,
            title: '전기차 충전소 확대 설치 청원',
            introducerMember: '임종석',
            introduceDate: '2025.04.28',
            referralDate: '2025.05.01',
            status: 'complete',
            committee: '산업통상자원중소벤처기업위원회'
        },
        {
            id: 11,
            title: '학교급식 친환경 식재료 의무 사용 청원',
            introducerMember: '김희경',
            introduceDate: '2025.04.25',
            referralDate: '2025.04.28',
            status: 'committee',
            committee: '교육위원회'
        },
        {
            id: 12,
            title: '펜션 및 민박업 규제 개선 청원',
            introducerMember: '박주민',
            introduceDate: '2025.04.22',
            referralDate: '2025.04.25',
            status: 'review',
            committee: '문화체육관광위원회'
        },
        {
            id: 13,
            title: '외국인 관광객 대상 의료관광 활성화 청원',
            introducerMember: '안철수',
            introduceDate: '2025.04.20',
            referralDate: '2025.04.23',
            status: 'complete',
            committee: '보건복지위원회'
        },
        {
            id: 14,
            title: '공공병원 확충 및 의료 접근성 개선 청원',
            introducerMember: '심상정',
            introduceDate: '2025.04.18',
            referralDate: '2025.04.21',
            status: 'committee',
            committee: '보건복지위원회'
        },
        {
            id: 15,
            title: '재택근무 확산을 위한 근로기준법 개정 청원',
            introducerMember: '류호정',
            introduceDate: '2025.04.15',
            referralDate: '2025.04.18',
            status: 'review',
            committee: '환경노동위원회'
        }
    ];

    // API 함수들 (나중에 Django API로 교체할 부분)
    async function fetchPetitionDetail(petitionId) {
        if (USE_API) {
            // Django API 연결 시 사용할 코드
            try {
                const response = await fetch(`${API_BASE_URL}/api/petitions/${petitionId}/`);
                if (!response.ok) throw new Error('청원 정보를 가져올 수 없습니다');
                return await response.json();
            } catch (error) {
                console.error('API 오류:', error);
                return null;
            }
        } else {
            // 현재 더미 데이터 사용
            const basePetition = DUMMY_PETITIONS.find(p => p.id == petitionId);
            return basePetition ? createDetailedPetition(basePetition) : getDefaultPetition();
        }
    }

    // 기본 청원 (기본값)
    function getDefaultPetition() {
        return {
            id: 'default',
            title: '채 상병 사망 사건 수사 방해 및 사건 은폐 등의 진상규명 국정조사 계획 수립 촉구에 관한 청원',
            introducerMember: '김용민 의원 외 6인',
            receiptDate: '2024-11-14',
            referralDate: '2024-11-16',
            status: 'committee',
            statusText: '위원회 회부',
            committee: '국방위원회',
            petitionNumber: '2200055',
            sessionInfo: '제22대 (2024~2028) 제418회',
            currentStep: 2,
            content: '채 상병 사망 사건과 관련하여 수사 과정에서의 방해 행위 및 사건 은폐 의혹에 대한 철저한 진상규명을 위한 국정조사가 필요합니다.',
            details: [
                '채 상병 사망 사건의 진상 규명',
                '수사 과정에서의 방해 행위 조사',
                '사건 은폐 의혹에 대한 철저한 조사',
                '관련 책임자 처벌 및 재발 방지 대책 마련'
            ]
        };
    }

    // 더미 데이터를 상세 데이터로 변환 (API 전환 전까지 사용)
    function createDetailedPetition(basePetition) {
        const statusMap = {
            'pending': '접수',
            'review': '심사중', 
            'committee': '위원회 회부',
            'complete': '처리완료',
            'rejected': '폐기'
        };

        const stepMap = {
            'pending': 1,
            'review': 2,
            'committee': 2,
            'complete': 5,
            'rejected': 2
        };

        const contentMap = {
            1: {
                content: '청년층의 주거 안정을 위한 특별법 제정을 요구하는 청원입니다. 현재 청년들이 직면한 주택 구입의 어려움을 해결하기 위한 정책적 지원이 필요합니다.',
                details: ['청년 주택 구입 자금 지원 확대', '청년 전용 주택 공급 확대', '주택 대출 금리 우대 혜택 강화', '청년 주거 정책 통합 관리 체계 구축']
            },
            2: {
                content: '반려동물의 의료비 부담을 줄이기 위해 건강보험 적용을 요구하는 청원입니다.',
                details: ['반려동물 의료비 건강보험 적용', '반려동물 병원 의료비 투명화', '응급 의료 지원 체계 구축', '예방 접종 비용 지원 확대']
            },
            3: {
                content: '대학생들의 등록금 부담을 줄이기 위한 정책 개선을 요구하는 청원입니다.',
                details: ['국가장학금 지원 확대', '대학 등록금 인상률 제한', '저금리 학자금 대출 확대', '대학 재정 투명성 강화']
            },
            4: {
                content: '소상공인들의 임대료 부담 완화를 위한 지원 확대 방안을 요구하는 청원입니다.',
                details: ['소상공인 임대료 지원금 확대', '상가건물 임대차 보호법 강화', '임대료 인상률 제한 강화', '소상공인 경영 안정화 지원']
            },
            5: {
                content: '육아휴직 급여 인상 및 기간 연장을 통한 육아 지원 확대를 요구하는 청원입니다.',
                details: ['육아휴직 급여 인상', '육아휴직 기간 연장', '아버지 육아휴직 활성화', '육아휴직 복귀 지원 강화']
            },
            6: {
                content: '온라인 게임 셧다운제의 개선과 합리적 운영을 요구하는 청원입니다.',
                details: ['셧다운제 운영 개선', '게임 이용 시간 자율 규제 강화', '부모 동의 시스템 개선', '게임 중독 예방 교육 확대']
            },
            7: {
                content: '택시 요금 현실화와 승차거부 방지를 위한 제도 개선을 요구하는 청원입니다.',
                details: ['택시 요금 현실화', '승차거부 신고 시스템 강화', '택시 서비스 품질 개선', '택시 기사 처우 개선']
            },
            8: {
                content: '농산물 가격 안정화를 위한 정책 수립을 요구하는 청원입니다.',
                details: ['농산물 가격 안정화 정책 수립', '농업인 소득 보장 강화', '농산물 유통 구조 개선', '농업 재해 지원 확대']
            },
            9: {
                content: '치킨집 영업시간 규제 완화를 요구하는 청원입니다.',
                details: ['영업시간 규제 완화', '소상공인 영업 자유 확대', '지역별 규제 차별화', '소음 방지 대책 마련']
            },
            10: {
                content: '전기차 충전소 확대 설치를 요구하는 청원입니다.',
                details: ['전기차 충전소 확대 설치', '충전 인프라 표준화', '충전 요금 투명화', '충전소 접근성 개선']
            },
            11: {
                content: '학교급식에 친환경 식재료 의무 사용을 요구하는 청원입니다.',
                details: ['친환경 식재료 의무 사용', '급식 품질 향상', '지역 농산물 우선 구매', '급식비 지원 확대']
            },
            12: {
                content: '펜션 및 민박업 규제 개선을 요구하는 청원입니다.',
                details: ['펜션 민박업 규제 개선', '관광업 활성화 지원', '지역 경제 활성화', '관광 인프라 개선']
            },
            13: {
                content: '외국인 관광객 대상 의료관광 활성화를 요구하는 청원입니다.',
                details: ['의료관광 활성화 정책', '의료 서비스 품질 향상', '관광 수입 증대', '의료진 전문성 강화']
            },
            14: {
                content: '공공병원 확충 및 의료 접근성 개선을 요구하는 청원입니다.',
                details: ['공공병원 확충', '의료 접근성 개선', '의료비 부담 완화', '지역 의료 격차 해소']
            },
            15: {
                content: '재택근무 확산을 위한 근로기준법 개정을 요구하는 청원입니다.',
                details: ['재택근무 제도 개선', '근로자 권익 보호', '일과 삶의 균형', '유연 근무제 확산']
            }
        };

        const contentInfo = contentMap[basePetition.id] || {
            content: `${basePetition.title}에 관한 청원입니다.`,
            details: ['관련 정책 개선', '제도 정비', '지원 확대', '문제 해결']
        };
        
        return {
            id: basePetition.id,
            title: basePetition.title,
            introducerMember: `${basePetition.introducerMember} 의원 외 ${Math.floor(Math.random() * 10) + 3}인`,
            receiptDate: basePetition.introduceDate,
            referralDate: basePetition.referralDate,
            status: basePetition.status,
            statusText: statusMap[basePetition.status] || basePetition.status,
            committee: basePetition.committee,
            petitionNumber: `22000${55 + basePetition.id}`,
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: stepMap[basePetition.status] || 1,
            content: contentInfo.content,
            details: contentInfo.details
        };
    }

    // 페이지 로드 및 표시 함수들
    async function loadPetitionInfo() {
        try {
            const petition = await fetchPetitionDetail(petitionId);
            
            if (!petition) {
                console.error('청원 정보를 찾을 수 없습니다');
                return;
            }
            
            // 제목 업데이트
            const titleWithNumber = `[${petition.petitionNumber}] ${petition.title}`;
            document.getElementById('petitionTitle').textContent = titleWithNumber;
            document.title = `백일하 - [${petition.petitionNumber}] ${petition.title}`;
            
            // 접수 정보 업데이트
            document.getElementById('petitionNumber').textContent = petition.petitionNumber;
            document.getElementById('receiptDate').textContent = petition.receiptDate;
            document.getElementById('introducerMember').textContent = petition.introducerMember;
            document.getElementById('sessionInfo').textContent = petition.sessionInfo;
            document.getElementById('statusBadge').textContent = petition.statusText;
            document.getElementById('committee').textContent = petition.committee;
            
            // 진행 단계 업데이트
            updateProgressSteps(petition.currentStep);
            
            // 청원 내용 업데이트
            updatePetitionContent(petition);
            
            console.log('청원 정보 로드 완료:', petition.title);
            
            // 상태 알림 표시
            showStatusNotification(petition.status);
            
        } catch (error) {
            console.error('청원 정보 로드 중 오류:', error);
        }
    }

    // 진행 단계 업데이트
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
    }

    // 청원 내용 업데이트
    function updatePetitionContent(petition) {
        const contentSection = document.querySelector('.petition-content');
        if (contentSection) {
            contentSection.innerHTML = `
                <p>${petition.content}</p>
                <p>본 청원은 다음과 같은 사항에 대한 조사를 요구합니다:</p>
                <ul>
                    ${petition.details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
            `;
        }
    }

    // 홈 아이콘 클릭 이벤트
    const homeIcon = document.querySelector('.home-icon');
    if (homeIcon) {
        homeIcon.addEventListener('click', function(e) {
            e.preventDefault();
            // 청원 현황 페이지로 이동(나중에는 각 청원 의안정보페이지 연결)
            window.location.href = 'petition.html';
        });
    }

    // 상태 알림
    function showStatusNotification(status) {
        const statusMessages = {
            'pending': '📝 이 청원은 접수되어 검토를 기다리고 있습니다.',
            'review': '🔍 이 청원은 현재 심사 중입니다.',
            'committee': '🏛️ 이 청원은 위원회에서 심사 중입니다.',
            'complete': '✅ 이 청원은 처리가 완료되었습니다.',
            'rejected': '❌ 이 청원은 폐기되었습니다.'
        };

        const message = statusMessages[status];
        if (message) {
            // 알림 요소 생성
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: ${status === 'complete' ? '#4caf50' : status === 'rejected' ? '#f44336' : '#ff9800'};
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
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    }

    // 진행 단계 툴팁 추가
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

    // 초기화 실행
    console.log('청원 상세 페이지 초기화 중...');
    
    // 청원 정보 로드
    loadPetitionInfo();
    
    console.log('청원 상세 페이지 초기화 완료');
});
