// 파이차트 데이터 구조 정의
const statisticsConfig = [
    { key: 'attendance', label: '출석', colorVar: '--current-party-main' },
    { key: 'plenary_pass', label: '본회의 가결', colorVar: '--current-party-secondary' },
    { key: 'petition_proposal', label: '청원 제안', colorVar: '--current-party-tertiary' },
    { key: 'petition_result', label: '청원 결과', colorVar: '--current-party-quaternary' },
    { key: 'invalid_abstention', label: '무효표 및 기권', colorVar: '--current-party-quinary' },
    { key: 'committee_chair', label: '위원장', colorVar: '--current-party-sixth' },
    { key: 'vote_match', label: '투표 결과 일치', colorVar: '--current-party-seventh' },
    { key: 'vote_mismatch', label: '투표 결과 불일치', colorVar: '--current-party-eighth' }
];

// scripts.js에서 partyData를 가져오는 함수
function getPartyData() {
    // scripts.js에 정의된 partyData를 찾아서 반환
    // DOM이 로드된 후에는 window 객체에서 접근 가능
    if (window.partyData) {
        return window.partyData;
    }
    
    // 폴백: scripts.js가 아직 로드되지 않았거나 찾을 수 없는 경우
    return {
        "국민의 힘": { cssPrefix: "ppp", url: "https://www.peoplepowerparty.kr/" },
        "더불어민주당": { cssPrefix: "dp", url: "https://theminjoo.kr/" },
        "조국혁신당": { cssPrefix: "rk", url: "https://rebuildingkoreaparty.kr" },
        "개혁신당": { cssPrefix: "reform", url: "https://www.reformparty.kr/" },
        "진보당": { cssPrefix: "jp", url: "https://jinboparty.com/" },
        "기본소득당": { cssPrefix: "bip", url: "https://basicincomeparty.kr/" },
        "사회민주당": { cssPrefix: "sdp", url: "https://www.samindang.kr/" },
        "무소속": { cssPrefix: "ind", url: "" }
    };
}

// CSS 변수 업데이트 함수
function updatePartyColors(partyName) {
    const partyInfo = partyData[partyName];
    const root = document.documentElement;
    
    // CSS 변수 업데이트
    root.style.setProperty('--current-party-main', `var(--party-${partyInfo.cssPrefix}-main)`);
    root.style.setProperty('--current-party-secondary', `var(--party-${partyInfo.cssPrefix}-secondary)`);
    root.style.setProperty('--current-party-tertiary', `var(--party-${partyInfo.cssPrefix}-tertiary)`);
    root.style.setProperty('--current-party-quaternary', `var(--party-${partyInfo.cssPrefix}-quaternary)`);
    root.style.setProperty('--current-party-quinary', `var(--party-${partyInfo.cssPrefix}-quinary)`);
    root.style.setProperty('--current-party-sixth', `var(--party-${partyInfo.cssPrefix}-sixth)`);
    root.style.setProperty('--current-party-seventh', `var(--party-${partyInfo.cssPrefix}-seventh)`);
    root.style.setProperty('--current-party-eighth', `var(--party-${partyInfo.cssPrefix}-eighth)`);
    root.style.setProperty('--current-party-bg', `var(--party-${partyInfo.cssPrefix}-bg)`);
}

// 각도를 라디안으로 변환
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// 극좌표를 직교좌표로 변환
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = degreesToRadians(angleInDegrees - 90);
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

// SVG path 생성
function createArcPath(centerX, centerY, radius, startAngle, endAngle) {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
        "M", centerX, centerY,
        "L", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "Z"
    ].join(" ");
}

// path 요소에 이벤트 리스너 추가
function addPathEventListeners(path) {
    const tooltip = document.getElementById('chart-tooltip');
    
    path.addEventListener('mouseenter', function(e) {
        const label = this.getAttribute('data-label');
        const percent = this.getAttribute('data-percent');
        
        tooltip.textContent = `${label}: ${percent}%`;
        tooltip.classList.add('show');
        
        // 호버 효과
        this.style.opacity = '0.8';
        this.style.stroke = 'white';
        this.style.strokeWidth = '2';
    });
    
    path.addEventListener('mousemove', function(e) {
        const rect = document.querySelector('.pie-chart').getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        tooltip.style.left = (x - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (y - tooltip.offsetHeight - 10) + 'px';
    });
    
    path.addEventListener('mouseleave', function() {
        tooltip.classList.remove('show');
        
        // 호버 효과 제거
        this.style.opacity = '';
        this.style.stroke = '';
        this.style.strokeWidth = '';
    });
}

// 파이차트 업데이트
function updatePieChart(data) {
    const svg = document.querySelector('.pie-chart svg');
    const centerX = 50;
    const centerY = 50;
    const radius = 45;
    
    // 기존 path 요소들 제거 (circle은 유지)
    svg.querySelectorAll('path').forEach(path => path.remove());
    
    // 0보다 큰 값들만 필터링
    const validData = statisticsConfig
        .map(config => ({
            ...config,
            value: data[config.key] || 0
        }))
        .filter(item => item.value > 0);
    
    if (validData.length === 0) {
        console.warn('표시할 데이터가 없습니다.');
        return;
    }
    
    // 총합 계산
    const total = validData.reduce((sum, item) => sum + item.value, 0);
    
    let currentAngle = 0;
    
    validData.forEach(item => {
        // 파이차트에서도 실제 퍼센트 값 표시 (통계 섹션과 동일)
        const actualPercent = item.value;
        const sliceAngle = (item.value / total) * 360;
        
        // path 요소 생성
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = createArcPath(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        
        path.setAttribute('d', pathData);
        path.setAttribute('fill', `var(${item.colorVar})`);
        path.setAttribute('data-label', item.label);
        path.setAttribute('data-percent', actualPercent.toFixed(1)); // 실제 퍼센트 값 사용
        path.setAttribute('cursor', 'pointer');
        
        // 호버 효과를 위한 이벤트 리스너 추가
        addPathEventListeners(path);
        
        svg.appendChild(path);
        currentAngle += sliceAngle;
    });
}

// 통계 섹션 업데이트
function updateStatisticsSection(data, partyName) {
    const statsTitle = document.querySelector('.statistics-section h3');
    const statsItems = document.querySelectorAll('.stats-item');
    
    // 제목 업데이트
    if (statsTitle) {
        statsTitle.textContent = `${partyName} 통계`;
    }
    
    // 각 통계 항목 업데이트
    statisticsConfig.forEach((config, index) => {
        if (statsItems[index]) {
            const value = data[config.key] || 0;
            const labelElement = statsItems[index].querySelector('.label');
            const valueElement = statsItems[index].querySelector('.value');
            
            if (labelElement) labelElement.textContent = config.label;
            if (valueElement) valueElement.textContent = `${value.toFixed(1)}%`;
        }
    });
}

// SQL 데이터를 받아서 차트 업데이트
function updateChartFromData(partyStatistics, partyName) {
    updatePieChart(partyStatistics);
    updateStatisticsSection(partyStatistics, partyName);
}

// API 호출 함수
async function fetchPartyData(partyName) {
    try {
        // 실제 API 엔드포인트로 변경 필요
        const response = await fetch(`/api/party-statistics?party=${encodeURIComponent(partyName)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        updateChartFromData(data, partyName);
        
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        
        // 에러 발생시 테스트 데이터 사용
        const testData = generateTestDataForParty(partyName);
        updateChartFromData(testData, partyName);
    }
}

// 테스트용 더미 데이터 생성 (개발용)
function generateTestDataForParty(partyName) {
    // 정당별로 다른 특성을 가진 테스트 데이터
    const baseData = {
        attendance: 80 + Math.random() * 20,
        plenary_pass: 70 + Math.random() * 30,
        petition_proposal: 60 + Math.random() * 40,
        petition_result: 50 + Math.random() * 50,
        invalid_abstention: Math.random() * 20,
        committee_chair: Math.random() * 30,
        vote_match: 80 + Math.random() * 20,
        vote_mismatch: Math.random() * 20
    };
    
    // 정당별 특성 반영 (예시)
    switch(partyName) {
        case '국민의힘':
            baseData.attendance = 85.5;
            baseData.plenary_pass = 92.3;
            break;
        case '더불어민주당':
            baseData.attendance = 87.2;
            baseData.plenary_pass = 89.1;
            break;
        // 다른 정당들도 추가 가능
    }
    
    return baseData;
}

// 정당 변경 처리
function onPartyChange(selectedParty) {
    const partyInfo = partyData[selectedParty];
    
    // 드롭다운 버튼 텍스트 변경
    const dropdownBtn = document.querySelector('.dropdown-btn');
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
    const partyNameElement = document.getElementById('party-name');
    if (partyNameElement) {
        partyNameElement.textContent = selectedParty;
    }
    
    // 홈페이지 링크 업데이트
    const homeLink = document.getElementById('party-home-link');
    if (homeLink) {
        if (selectedParty === "무소속") {
            homeLink.style.display = "none";
        } else {
            homeLink.style.display = "inline-block";
            homeLink.href = partyInfo.url;
        }
    }
    
    // 정당 색상 업데이트
    updatePartyColors(selectedParty);
    
    // 새로운 데이터 로드
    fetchPartyData(selectedParty);
}

// DOM이 완전히 로드된 후 스크립트 실행
// DOM이 완전히 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', function() {  
    // URL 파라미터에서 정당명 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPartyFromUrl = urlParams.get('party');
    
    // 초기 정당 설정 (URL 파라미터가 있으면 그것을 사용, 없으면 기본값)
    const initialParty = selectedPartyFromUrl || '국민의힘';
    
    // partyData 전역 변수 설정 (scripts.js에서 가져오기)
    window.partyData = getPartyData();
    
    // 드롭다운 메뉴 토글
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdown = document.querySelector('.dropdown');
    
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function() {
            dropdown.classList.toggle('active');
        });
    }
    
    // 드롭다운 항목 선택 시 처리
    const dropdownItems = document.querySelectorAll('.dropdown-content a');
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedParty = this.dataset.party;
            
            // 정당 변경 처리
            onPartyChange(selectedParty);
            
            // 드롭다운 닫기
            dropdown.classList.remove('active');
        });
    });
    
    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // 초기 정당 데이터 로드 (URL 파라미터 고려)
    console.log('초기 정당 설정:', initialParty);
    onPartyChange(initialParty);
});
