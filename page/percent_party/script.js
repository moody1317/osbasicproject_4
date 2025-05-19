// 정당별 홈페이지 URL, 로고, 색상 매핑
const partyData = {
    "국민의 힘": {
        url: "https://www.peoplepowerparty.kr/",
        logo: "https://www.peoplepowerparty.kr/renewal2020/img/logo.png",
        colors: {
            main: "#E61E2B",
            secondary: "#D32036",
            tertiary: "#E84C56",
            quaternary: "#F37A82",
            quinary: "#FAA8AD",
            bg: "#FEECED"
        }
    },
    "더불어민주당": {
        url: "https://theminjoo.kr/",
        logo: "https://theminjoo.kr/img/logo.png",
        colors: {
            main: "#152484",
            secondary: "#004EA2",
            tertiary: "#1A6CBD",
            quaternary: "#5280C7",
            quinary: "#8AA8D8",
            bg: "#E8EFF9"
        }
    },
    "조국혁신당": {
        url: "https://jokukparty.kr/",
        logo: "https://jokukparty.kr/assets/images/logo.svg",
        colors: {
            main: "#06275E",
            secondary: "#004098",
            tertiary: "#0073CF",
            quaternary: "#3A95E4",
            quinary: "#7FB7ED",
            bg: "#E6F0FA"
        }
    },
    "개혁신당": {
        url: "https://www.reformparty.kr/",
        logo: "https://www.reformparty.kr/themes/reform/img/common/logo.png",
        colors: {
            main: "#FF7210",
            secondary: "#F15A22",
            tertiary: "#FF8A3D",
            quaternary: "#FFA06A",
            quinary: "#FFC097",
            bg: "#FFEEE3"
        }
    },
    "진보당": {
        url: "https://jinbo.party/",
        logo: "https://jinbo.party/wp-content/uploads/2022/02/jinboparty_logo.png",
        colors: {
            main: "#D6001C",
            secondary: "#B20017",
            tertiary: "#9A0416",
            quaternary: "#E3425C",
            quinary: "#EB7A8D",
            bg: "#FADDE3"
        }
    },
    "기본소득당": {
        url: "https://basicincomeparty.kr/",
        logo: "https://basicincomeparty.kr/wp-content/uploads/2020/03/200222_basicincomeparty_logo_big.png",
        colors: {
            main: "#091E3A",
            secondary: "#00D2C3",
            tertiary: "#0B355A",
            quaternary: "#31A8A0",
            quinary: "#7BD9D1",
            bg: "#E8F7F6"
        }
    },
    "사회민주당": {
        url: "https://socialdemocrats.kr/",
        logo: "https://socialdemocrats.kr/wp-content/themes/socialdemokrat/img/logo.svg",
        colors: {
            main: "#43A213",
            secondary: "#368D0F",
            tertiary: "#5BBF2E",
            quaternary: "#7FD454",
            quinary: "#A9E48A",
            bg: "#EBF7E4"
        }
    },
    "무소속": {
        url: "",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Unofficial_JavaScript_logo_2.svg/480px-Unofficial_JavaScript_logo_2.svg.png",
        colors: {
            main: "#4B5563",
            secondary: "#6B7280",
            tertiary: "#9CA3AF",
            quaternary: "#D1D5DB",
            quinary: "#E5E7EB",
            bg: "#F9FAFB"
        }
    }
};

// DOM이 완전히 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', function() {
    // 네비게이션 탭 선택 효과
    const navItems = document.querySelectorAll('nav li');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 드롭다운 메뉴 토글
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdown = document.querySelector('.dropdown');
    
    dropdownBtn.addEventListener('click', function() {
        dropdown.classList.toggle('active');
    });
    
    // 드롭다운 항목 선택 시 텍스트 변경
    const dropdownItems = document.querySelectorAll('.dropdown-content a');
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedParty = this.textContent;
            const partyInfo = partyData[selectedParty];
            
            // 드롭다운 버튼 텍스트 변경
            dropdownBtn.textContent = selectedParty;
            
            // SVG 아이콘 재추가
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '12');
            svg.setAttribute('height', '12');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M7 10l5 5 5-5z');
            path.setAttribute('fill', 'currentColor');
            
            svg.appendChild(path);
            dropdownBtn.appendChild(svg);
            
            // 헤더 텍스트 변경
            document.getElementById('party-name').textContent = selectedParty;
            
            // 홈페이지 링크 업데이트 및 무소속일 경우 아이콘 숨기기
            const homeLink = document.getElementById('party-home-link');
            if(selectedParty === "무소속") {
                homeLink.style.display = "none";
            } else {
                homeLink.style.display = "inline-block";
                homeLink.href = partyInfo.url;
            }
            
            // 로고 이미지 업데이트
            document.getElementById('party-logo').setAttribute('href', partyInfo.logo);
            
            // 통계 제목 업데이트
            const statsTitle = document.querySelector('.statistics-section h3');
            statsTitle.textContent = selectedParty + ' 통계';
            
            // 차트 색상 업데이트
            const paths = document.querySelectorAll('.pie-chart svg path');
            paths[0].setAttribute('fill', partyInfo.colors.main);
            paths[1].setAttribute('fill', partyInfo.colors.secondary);
            paths[2].setAttribute('fill', partyInfo.colors.tertiary);
            paths[3].setAttribute('fill', partyInfo.colors.quaternary);
            paths[4].setAttribute('fill', partyInfo.colors.quinary);
            paths[5].setAttribute('fill', partyInfo.colors.main);
            paths[6].setAttribute('fill', partyInfo.colors.secondary);
            
            // 통계 섹션 배경색 업데이트
            document.querySelector('.statistics-section').style.backgroundColor = partyInfo.colors.bg;
            
            // 통계 항목 값 색상 업데이트
            const values = document.querySelectorAll('.stats-item .value');
            values.forEach(value => {
                value.style.color = partyInfo.colors.main;
            });
            
            // 드롭다운 닫기
            dropdown.classList.remove('active');
        });
    });
    
    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // 챗봇 아이콘 클릭 효과
    const chatbotIcon = document.querySelector('.robot-icon');
    chatbotIcon.addEventListener('click', function() {
        alert('챗봇 서비스를 시작합니다.');
    });
    
    // 초기화 함수 호출
    initializePartyColors();
});

    // 초기 정당 색상 설정 함수
function initializePartyColors() {
    const initialParty = "국민의 힘";
    const partyInfo = partyData[initialParty];
    
    // 초기 홈페이지 링크 설정 (국민의 힘이므로 표시)
    const homeLink = document.getElementById('party-home-link');
    homeLink.style.display = "inline-block";
    homeLink.href = partyInfo.url;
    
    // 차트 색상 설정
    const paths = document.querySelectorAll('.pie-chart svg path');
    paths[0].setAttribute('fill', partyInfo.colors.main);
    paths[1].setAttribute('fill', partyInfo.colors.secondary);
    paths[2].setAttribute('fill', partyInfo.colors.tertiary);
    paths[3].setAttribute('fill', partyInfo.colors.quaternary);
    paths[4].setAttribute('fill', partyInfo.colors.quinary);
    paths[5].setAttribute('fill', partyInfo.colors.main);
    paths[6].setAttribute('fill', partyInfo.colors.secondary);
    
    // 통계 섹션 배경색 설정
    document.querySelector('.statistics-section').style.backgroundColor = partyInfo.colors.bg;
    
    // 통계 항목 값 색상 설정
    const values = document.querySelectorAll('.stats-item .value');
    values.forEach(value => {
        value.style.color = partyInfo.colors.main;
    });
}