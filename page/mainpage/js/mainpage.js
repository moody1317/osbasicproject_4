// 페이지 로드 시 실행되는 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 네비게이션 탭 선택 효과
    const navItems = document.querySelectorAll('nav li');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // 모든 탭에서 밑줄 제거
            navItems.forEach(i => i.style.borderBottom = 'none');
            // 선택된 탭에 밑줄 추가
            this.style.borderBottom = '2px solid var(--light-blue)';
        });
    });

    // 기본적으로 첫 번째 탭 선택
    navItems[0].style.borderBottom = '2px solid var(--light-blue)';

    // 더보기 기능
    const showMoreLinks = document.querySelectorAll('.show-more');
    showMoreLinks.forEach(link => {
        link.addEventListener('click', function() {
            alert('더 많은 내용을 불러옵니다.');
        });
    });

    // 상세 퍼센트 및 공지사항 더보기 기능
    const moreLinks = document.querySelectorAll('.more-link');
    moreLinks.forEach(link => {
        link.addEventListener('click', function() {
            const section = this.closest('div').querySelector('ul');
            
            if (section.style.maxHeight) {
                section.style.maxHeight = null;
            } else {
                section.style.maxHeight = section.scrollHeight + 'px';
            }
        });
    });

    // 챗봇 아이콘 클릭 이벤트
    const chatbotIcon = document.querySelector('.robot-icon');
    chatbotIcon.addEventListener('click', function() {
        alert('챗봇 서비스를 시작합니다.');
    });
});

// 퍼센트 데이터 가져오기 (실제 구현 시 서버 API와 연동)
function fetchPercentageData() {
    // API 호출 예시 (실제 구현 시 이 부분 구현)
    // fetch('/api/percentages')
    //     .then(response => response.json())
    //     .then(data => updatePercentages(data));
    
    // 더미 데이터
    const dummyData = {
        parties: [
            { name: "A 정당", percentage: 78 },
            { name: "B 정당", percentage: 65 },
            { name: "C 정당", percentage: 52 }
        ],
        members: [
            { name: "A 의원", party: "정당명", percentage: 89 },
            { name: "A 의원", party: "정당명", percentage: 84 },
            { name: "A 의원", party: "정당명", percentage: 79 }
        ]
    };
    
    // 더미 데이터로 화면 업데이트
    updatePercentages(dummyData);
}

// 퍼센트 데이터 화면에 표시
function updatePercentages(data) {
    // 정당 퍼센트 업데이트
    const partyItems = document.querySelectorAll('.card:first-child .ranking-item');
    data.parties.forEach((party, index) => {
        if (partyItems[index]) {
            partyItems[index].querySelector('.name').textContent = party.name;
            partyItems[index].querySelector('.percentage').textContent = party.percentage + '%';
        }
    });
    
    // 의원 퍼센트 업데이트
    const memberItems = document.querySelectorAll('.card:last-child .ranking-item');
    data.members.forEach((member, index) => {
        if (memberItems[index]) {
            memberItems[index].querySelector('.name').textContent = member.name;
            memberItems[index].querySelector('.party-name').textContent = member.party;
            memberItems[index].querySelector('.percentage').textContent = member.percentage + '%';
        }
    });
}

// 페이지 로드 시 한 번만 실행 (나중에 주석 해제)
// fetchPercentageData();
