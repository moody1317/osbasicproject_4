// 정당별 색상 데이터
const partyData = {
    "더불어민주당": {
        color: "#152484",
        lightColor: "#15248480" // 50% 투명도
    },
    "국민의힘": {
        color: "#E61E2B",
        lightColor: "#E61E2B80" // 50% 투명도
    },
    "조국혁신당": {
        color: "#06275E",
        lightColor: "#0073CF"
    },
    "개혁신당": {
        color: "#FF7210", 
        lightColor: "#FF721080" // 50% 투명도
    },
    "진보당": {
        color: "#D6001C",
        lightColor: "#D6001C80" // 50% 투명도
    },
    "기본소득당": {
        color: "#091E3A",
        lightColor: "#00D2C3"
    },
    "사회민주당": {
        color: "#43A213",
        lightColor: "#F58400"
    },
    "무소속": {
        color: "#4B5563",
        lightColor: "#9CA3AF"
    }
};

// 국회의원 가상 데이터 (실제 구현 시에는 API에서 가져와야 함)
const mpData = [
    {
        id: 1,
        name: "김민석",
        party: "더불어민주당",
        district: "서울 영등포구갑",
        stats: {
            attendance: 98,
            billProposed: 75,
            billPassRate: 32,
            mainProposer: 21,
            speeches: 43,
            committeeAttendance: 95,
            partyVoteMatch: 97,
            petitionResponse: 8
        }
    },
    {
        id: 2,
        name: "김병욱",
        party: "국민의힘",
        district: "경북 포항시남구울릉군",
        stats: {
            attendance: 92,
            billProposed: 52,
            billPassRate: 45,
            mainProposer: 15,
            speeches: 36,
            committeeAttendance: 89,
            partyVoteMatch: 94,
            petitionResponse: 12
        }
    },
    {
        id: 3,
        name: "김상훈",
        party: "국민의힘",
        district: "대구 서구",
        stats: {
            attendance: 94,
            billProposed: 63,
            billPassRate: 39,
            mainProposer: 18,
            speeches: 29,
            committeeAttendance: 92,
            partyVoteMatch: 96,
            petitionResponse: 5
        }
    }
];

// DOM이 완전히 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', function() {
    
    // 검색 필터 태그 선택 효과
    const filterTags = document.querySelectorAll('.filter-tag');
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            if (this.textContent === '전체') {
                filterTags.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            } else {
                const allTag = document.querySelector('.filter-tag:first-child');
                allTag.classList.remove('active');
                this.classList.toggle('active');
            }
        });
    });
    
    // 국회의원 검색 기능
    const searchInputs = document.querySelectorAll('.mp-search-input');
    const searchResults = document.querySelectorAll('.mp-search-results');
    
    searchInputs.forEach((input, index) => {
        input.addEventListener('focus', function() {
            searchResults[index].classList.add('show');
        });
        
        input.addEventListener('blur', function() {
            setTimeout(() => {
                searchResults[index].classList.remove('show');
            }, 200);
        });
        
        input.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase();
            
            // 실제 구현 시에는 여기서 검색 결과를 동적으로 가져와야 함
            // 예시 코드만 작성
            if (searchValue.length > 0) {
                searchResults[index].innerHTML = '';
                
                // 간단한 필터링 예시
                const filteredMPs = mpData.filter(mp => 
                    mp.name.toLowerCase().includes(searchValue) || 
                    mp.district.toLowerCase().includes(searchValue) ||
                    mp.party.toLowerCase().includes(searchValue)
                );
                
                filteredMPs.forEach(mp => {
                    const item = document.createElement('div');
                    item.className = 'mp-search-item';
                    
                    // 정당 색상 가져오기
                    const partyStyle = partyData[mp.party] ? 
                        `background-color: ${partyData[mp.party].color};` : 
                        'background-color: #999;';
                    
                    item.innerHTML = `
                        <img src="/api/placeholder/50/50" alt="${mp.name} 의원 사진">
                        <span>${mp.name}</span>
                        <span class="mp-party-tag" style="${partyStyle}">${mp.party}</span>
                    `;
                    
                    item.addEventListener('click', function() {
                        // 선택된 국회의원 정보 업데이트
                        const mpSelected = document.querySelectorAll('.mp-selected')[index];
                        const mpImage = mpSelected.querySelector('img');
                        
                        // 실제 의원 사진으로 변경 (현재는 placeholder 사용)
                        mpImage.src = '/api/placeholder/50/50';
                        mpSelected.querySelector('.mp-selected-name').textContent = mp.name;
                        mpSelected.querySelector('.mp-selected-party').textContent = `${mp.party} · ${mp.district}`;
                        
                        // 통계 정보 업데이트
                        const card = input.closest('.comparison-card');
                        updateMPStats(card, mp);
                        
                        // 검색창 비우기
                        input.value = '';
                        searchResults[index].classList.remove('show');
                    });
                    
                    searchResults[index].appendChild(item);
                });
                
                searchResults[index].classList.add('show');
            } else {
                searchResults[index].classList.remove('show');
            }
        });
    });
    
    // 국회의원 제거 버튼
    const removeButtons = document.querySelectorAll('.mp-remove');
    
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mpSelected = this.closest('.mp-selected');
            mpSelected.querySelector('.mp-selected-name').textContent = '국회의원을 검색하세요';
            mpSelected.querySelector('.mp-selected-party').textContent = '';
            
            // 통계 정보 초기화
            const card = button.closest('.comparison-card');
            resetMPStats(card);
        });
    });
    
    // 초기 필터 태그 설정
    document.querySelector('.filter-tag:first-child').classList.add('active');
});

// 국회의원 통계 정보 업데이트 함수
function updateMPStats(card, mp) {
    // 출석률
    const attendance = card.querySelector('.status-item:nth-child(2) .status-value');
    attendance.textContent = mp.stats.attendance + '%';
    attendance.className = 'status-value ' + (mp.stats.attendance > 95 ? 'win' : 'lose');
    
    // 법안 발의
    const billProposed = card.querySelector('.status-item:nth-child(3) .status-value');
    billProposed.textContent = mp.stats.billProposed + '건';
    billProposed.className = 'status-value ' + (mp.stats.billProposed > 60 ? 'win' : 'lose');
    
    // 법안 가결률
    const billPassRate = card.querySelector('.status-item:nth-child(4) .status-value');
    billPassRate.textContent = mp.stats.billPassRate + '%';
    billPassRate.className = 'status-value ' + (mp.stats.billPassRate > 40 ? 'win' : 'lose');
    
    // 대표 발의
    const mainProposer = card.querySelector('.status-item:nth-child(5) .status-value');
    mainProposer.textContent = mp.stats.mainProposer + '건';
    mainProposer.className = 'status-value ' + (mp.stats.mainProposer > 18 ? 'win' : 'lose');
    
    // 본회의 발언
    const speeches = card.querySelector('.status-item:nth-child(6) .status-value');
    speeches.textContent = mp.stats.speeches + '회';
    
    // 상임위 출석률
    const committeeAttendance = card.querySelector('.status-item:nth-child(7) .status-value');
    committeeAttendance.textContent = mp.stats.committeeAttendance + '%';
    committeeAttendance.className = 'status-value ' + (mp.stats.committeeAttendance > 90 ? 'win' : 'lose');
    
    // 정당 투표 일치도
    const partyVoteMatch = card.querySelector('.status-item:nth-child(8) .status-value');
    partyVoteMatch.textContent = mp.stats.partyVoteMatch + '%';
    partyVoteMatch.className = 'status-value ' + (mp.stats.partyVoteMatch > 95 ? 'win' : 'lose');
    
    // 국민청원 답변
    const petitionResponse = card.querySelector('.status-item:nth-child(9) .status-value');
    petitionResponse.textContent = mp.stats.petitionResponse + '건';
    petitionResponse.className = 'status-value ' + (mp.stats.petitionResponse > 10 ? 'win' : 'lose');
}

// 국회의원 통계 정보 초기화 함수
function resetMPStats(card) {
    const statusValues = card.querySelectorAll('.status-value');
    
    statusValues.forEach(value => {
        value.textContent = '-';
        value.className = 'status-value';
    });
}