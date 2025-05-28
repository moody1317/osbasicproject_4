document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 청원 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const petitionId = urlParams.get('petition_id');
    
    // 청원 더미 데이터 (실제로는 API에서 가져와야 함)
    const petitionDatabase = {
        1: {
            id: 1,
            title: '청년 주택 구입 지원을 위한 특별법 제정 청원',
            introducerMember: '김영호 의원 외 5인',
            receiptDate: '2025.05.20',
            referralDate: '2025.05.22',
            status: 'committee',
            statusText: '위원회 회부',
            committee: '국토교통위원회',
            petitionNumber: '2200056',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 2,
            content: '청년층의 주거 안정을 위한 특별법 제정을 요구하는 청원입니다. 현재 청년들이 직면한 주택 구입의 어려움을 해결하기 위한 정책적 지원이 필요합니다.',
            details: [
                '청년 주택 구입 자금 지원 확대',
                '청년 전용 주택 공급 확대',
                '주택 대출 금리 우대 혜택 강화',
                '청년 주거 정책 통합 관리 체계 구축'
            ]
        },
        2: {
            id: 2,
            title: '반려동물 의료비 부담 완화를 위한 건강보험 적용 청원',
            introducerMember: '박민정 의원 외 8인',
            receiptDate: '2025.05.18',
            referralDate: '2025.05.21',
            status: 'review',
            statusText: '심사중',
            committee: '보건복지위원회',
            petitionNumber: '2200057',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 2,
            content: '반려동물의 의료비 부담을 줄이기 위해 건강보험 적용을 요구하는 청원입니다.',
            details: [
                '반려동물 의료비 건강보험 적용',
                '반려동물 병원 의료비 투명화',
                '응급 의료 지원 체계 구축',
                '예방 접종 비용 지원 확대'
            ]
        },
        3: {
            id: 3,
            title: '대학생 등록금 부담 경감을 위한 정책 개선 청원',
            introducerMember: '이준석 의원 외 12인',
            receiptDate: '2025.05.15',
            referralDate: '2025.05.18',
            status: 'complete',
            statusText: '처리완료',
            committee: '교육위원회',
            petitionNumber: '2200058',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 5,
            content: '대학생들의 등록금 부담을 줄이기 위한 정책 개선을 요구하는 청원입니다.',
            details: [
                '국가장학금 지원 확대',
                '대학 등록금 인상률 제한',
                '저금리 학자금 대출 확대',
                '대학 재정 투명성 강화'
            ]
        },
        4: {
            id: 4,
            title: '소상공인 임대료 지원 확대 방안 마련 청원',
            introducerMember: '최수진 의원 외 7인',
            receiptDate: '2025.05.12',
            referralDate: '2025.05.15',
            status: 'committee',
            statusText: '위원회 심사',
            committee: '중소벤처기업위원회',
            petitionNumber: '2200059',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 2,
            content: '소상공인들의 임대료 부담 완화를 위한 지원 확대 방안을 요구하는 청원입니다.',
            details: [
                '소상공인 임대료 지원금 확대',
                '상가건물 임대차 보호법 강화',
                '임대료 인상률 제한 강화',
                '소상공인 경영 안정화 지원'
            ]
        },
        5: {
            id: 5,
            title: '육아휴직 급여 인상 및 기간 연장 청원',
            introducerMember: '한민수 의원 외 9인',
            receiptDate: '2025.05.10',
            referralDate: '2025.05.13',
            status: 'complete',
            statusText: '처리완료',
            committee: '환경노동위원회',
            petitionNumber: '2200060',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 5,
            content: '육아휴직 급여 인상 및 기간 연장을 통한 육아 지원 확대를 요구하는 청원입니다.',
            details: [
                '육아휴직 급여 인상',
                '육아휴직 기간 연장',
                '아버지 육아휴직 활성화',
                '육아휴직 복귀 지원 강화'
            ]
        },
        6: {
            id: 6,
            title: '온라인 게임 셧다운제 개선 청원',
            introducerMember: '정하늘 의원 외 6인',
            receiptDate: '2025.05.08',
            referralDate: '2025.05.11',
            status: 'review',
            statusText: '심사중',
            committee: '과학기술정보방송통신위원회',
            petitionNumber: '2200061',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 2,
            content: '온라인 게임 셧다운제의 개선과 합리적 운영을 요구하는 청원입니다.',
            details: [
                '셧다운제 운영 개선',
                '게임 이용 시간 자율 규제 강화',
                '부모 동의 시스템 개선',
                '게임 중독 예방 교육 확대'
            ]
        },
        7: {
            id: 7,
            title: '택시 요금 현실화 및 승차거부 방지 청원',
            introducerMember: '윤상호 의원 외 10인',
            receiptDate: '2025.05.05',
            referralDate: '2025.05.08',
            status: 'committee',
            statusText: '위원회 심사',
            committee: '국토교통위원회',
            petitionNumber: '2200062',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 2,
            content: '택시 요금 현실화와 승차거부 방지를 위한 제도 개선을 요구하는 청원입니다.',
            details: [
                '택시 요금 현실화',
                '승차거부 신고 시스템 강화',
                '택시 서비스 품질 개선',
                '택시 기사 처우 개선'
            ]
        },
        8: {
            id: 8,
            title: '농산물 가격 안정화를 위한 정책 수립 청원',
            introducerMember: '강은미 의원 외 11인',
            receiptDate: '2025.05.03',
            referralDate: '2025.05.06',
            status: 'pending',
            statusText: '접수',
            committee: '농림축산식품해양수산위원회',
            petitionNumber: '2200063',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 1,
            content: '농산물 가격 안정화를 위한 정책 수립을 요구하는 청원입니다.',
            details: [
                '농산물 가격 안정화 정책 수립',
                '농업인 소득 보장 강화',
                '농산물 유통 구조 개선',
                '농업 재해 지원 확대'
            ]
        },
        9: {
            id: 9,
            title: '치킨집 영업시간 규제 완화 청원',
            introducerMember: '오세훈 의원 외 4인',
            receiptDate: '2025.05.01',
            referralDate: '2025.05.04',
            status: 'rejected',
            statusText: '폐기',
            committee: '행정안전위원회',
            petitionNumber: '2200064',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 2,
            content: '치킨집 영업시간 규제 완화를 요구하는 청원입니다.',
            details: [
                '영업시간 규제 완화',
                '소상공인 영업 자유 확대',
                '지역별 규제 차별화',
                '소음 방지 대책 마련'
            ]
        },
        10: {
            id: 10,
            title: '전기차 충전소 확대 설치 청원',
            introducerMember: '임종석 의원 외 13인',
            receiptDate: '2025.04.28',
            referralDate: '2025.05.01',
            status: 'complete',
            statusText: '처리완료',
            committee: '산업통상자원중소벤처기업위원회',
            petitionNumber: '2200065',
            sessionInfo: '제22대 (2024~2028) 제419회',
            currentStep: 5,
            content: '전기차 충전소 확대 설치를 요구하는 청원입니다.',
            details: [
                '전기차 충전소 확대 설치',
                '충전 인프라 표준화',
                '충전 요금 투명화',
                '충전소 접근성 개선'
            ]
        },
        // 기본 청원 (파라미터가 없거나 잘못된 경우)
        default: {
            id: 'default',
            title: '채 상병 사망 사건 수사 방해 및 사건 은폐 등의 진상규명 국정조사 계획 수립 촉구에 관한 청원',
            introducerMember: '김용민 의원 외 6인',
            receiptDate: '2024-11-14',
            referralDate: '2024-11-16',
            status: 'committee',
            statusText: '위원회 심사',
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
        }
    };

    // 상태별 진행 단계 매핑
    const statusStepMap = {
        'pending': 1,
        'review': 2,
        'committee': 2,
        'plenary': 3,
        'government': 4,
        'complete': 5,
        'rejected': 2
    };

    // 청원 정보 로드 및 표시
    function loadPetitionInfo() {
        const petition = petitionDatabase[petitionId] || petitionDatabase.default;
        
        // 제목 업데이트
        document.getElementById('petitionTitle').textContent = petition.title;
        document.title = `백일하 - ${petition.title}`;
        
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

    // 뉴스 링크 클릭 이벤트
    function setupNewsLinks() {
        const newsLinks = document.querySelectorAll('.news-link');
        newsLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                alert('뉴스 기사 링크 기능은 현재 개발 중입니다.');
            });
        });
    }

    // 진행 단계 클릭 이벤트 (정보 표시)
    function setupProgressSteps() {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            step.addEventListener('click', function() {
                showStepInfo(index + 1, step.textContent);
            });
        });
    }

    // 단계별 정보 모달 표시
    function showStepInfo(stepNumber, stepName) {
        const stepDescriptions = {
            1: '청원이 국회에 정식으로 접수된 단계입니다.',
            2: '해당 상임위원회에서 청원을 검토하고 심사하는 단계입니다.',
            3: '상임위원회 심사를 거쳐 본회의에서 심의하는 단계입니다.',
            4: '본회의 의결 후 정부로 이송되어 처리되는 단계입니다.',
            5: '정부에서 처리 결과를 국회로 통지하는 최종 단계입니다.'
        };

        const description = stepDescriptions[stepNumber] || '해당 단계에 대한 정보가 없습니다.';
        
        alert(`${stepName}\n\n${description}`);
    }

    // 챗봇 메시지 처리 (청원 관련)
    function handlePetitionChatbot() {
        const originalHandleMessage = window.handleMessage;
        
        // 챗봇 응답을 청원 관련으로 커스터마이즈
        window.handleMessage = function(message) {
            if (typeof window.addUserMessage === 'function') {
                window.addUserMessage(message);
            }
            
            setTimeout(() => {
                let response = [];
                
                if (message.includes('진행') || message.includes('현황') || message.includes('단계')) {
                    response = [
                        '현재 이 청원은 위원회 심사 단계에 있습니다.',
                        '위원회에서 청원을 검토한 후 본회의로 회부됩니다.',
                        '더 자세한 진행 상황은 위의 진행 단계를 참고하세요.'
                    ];
                } else if (message.includes('소개의원') || message.includes('의원')) {
                    const petition = petitionDatabase[petitionId] || petitionDatabase.default;
                    response = [
                        `이 청원의 소개의원은 ${petition.introducerMember}입니다.`,
                        '소개의원은 청원을 국회에 소개하고 지원하는 역할을 합니다.',
                        '의원에 대한 더 자세한 정보를 원하시면 국회의원 메뉴를 이용해주세요.'
                    ];
                } else if (message.includes('법안') || message.includes('관련')) {
                    response = [
                        '이 청원과 관련된 법안들을 검토 중입니다.',
                        '관련 법안 정보는 본회의 현황 메뉴에서 확인하실 수 있습니다.',
                        '청원이 채택되면 관련 법안 발의로 이어질 수 있습니다.'
                    ];
                } else if (message.includes('절차') || message.includes('처리')) {
                    response = [
                        '청원 처리 절차는 다음과 같습니다:',
                        '1. 접수 → 2. 위원회 심사 → 3. 본회의 심의 → 4. 정부 이송 → 5. 처리 통지',
                        '각 단계별로 소요 기간이 다를 수 있습니다.'
                    ];
                } else {
                    response = [
                        '청원에 대해 궁금한 점이 있으시군요.',
                        '청원 진행 현황, 소개의원 정보, 처리 절차 등에 대해 문의해주시면',
                        '더 자세한 정보를 제공해드릴 수 있습니다.'
                    ];
                }
                
                if (typeof window.addBotMessage === 'function') {
                    window.addBotMessage(response);
                }
            }, 500);
        };
    }

    // 초기화 함수
    function init() {
        console.log('청원 상세 페이지 초기화 중...');
        
        // 청원 정보 로드
        loadPetitionInfo();
        
        // 이벤트 리스너 설정
        setupNewsLinks();
        setupProgressSteps();
        
        // 챗봇 커스터마이즈
        setTimeout(handlePetitionChatbot, 1000);
        
        console.log('청원 상세 페이지 초기화 완료');
    }

    // 페이지 로드 시 초기화
    init();
});