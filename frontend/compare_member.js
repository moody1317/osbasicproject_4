function getPartyColors() {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    return {
        "더불어민주당": {
            color: computedStyle.getPropertyValue('--party-dp-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-dp-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-dp-bg').trim()
        },
        "국민의힘": {
            color: computedStyle.getPropertyValue('--party-ppp-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-ppp-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-ppp-bg').trim()
        },
        "조국혁신당": {
            color: computedStyle.getPropertyValue('--party-rk-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-rk-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-rk-bg').trim()
        },
        "개혁신당": {
            color: computedStyle.getPropertyValue('--party-reform-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-reform-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-reform-bg').trim()
        },
        "진보당": {
            color: computedStyle.getPropertyValue('--party-jp-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-jp-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-jp-bg').trim()
        },
        "기본소득당": {
            color: computedStyle.getPropertyValue('--party-bip-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-bip-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-bip-bg').trim()
        },
        "사회민주당": {
            color: computedStyle.getPropertyValue('--party-sdp-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-sdp-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-sdp-bg').trim()
        },
        "무소속": {
            color: computedStyle.getPropertyValue('--party-ind-main').trim(),
            lightColor: computedStyle.getPropertyValue('--party-ind-secondary').trim(),
            bgColor: computedStyle.getPropertyValue('--party-ind-bg').trim()
        }
    };
}

// 정당별 색상 데이터 (DOM 로드 후 초기화됨)
let partyData = {};

// 국회의원 데이터 저장 변수 (Django API에서 로드)
let mpData = [];

// Django API에서 국회의원 데이터 가져오기
async function fetchMemberData() {
    try {
        console.log('국회의원 데이터를 가져오는 중...');
        
        // Django API 호출
        const data = await APIService.getMembers();
        
        if (data && Array.isArray(data)) {
            mpData = data.map(member => ({
                id: member.id,
                name: member.name,
                party: member.party,
                district: member.district,
                photo: member.photo || 'https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png',
                stats: {
                    attendance: member.attendance || 0,
                    billProposed: member.bill_proposed || 0,
                    billPassRate: member.bill_pass_rate || 0,
                    mainProposer: member.main_proposer || 0,
                    speeches: member.speeches || 0,
                    committeeAttendance: member.committee_attendance || 0,
                    partyVoteMatch: member.party_vote_match || 0,
                    petitionResponse: member.petition_response || 0
                }
            }));
            
            console.log('국회의원 데이터 로드 완료:', mpData.length, '명');
            
        } else {
            throw new Error('잘못된 데이터 형식');
        }
        
    } catch (error) {
        console.error('국회의원 데이터 로드 실패:', error);
        
        // API 실패 시 기본 데이터 사용
        mpData = getDefaultMemberData();
        showError('국회의원 데이터를 불러오는데 실패했습니다. 기본 데이터를 사용합니다.');
    }
}

// 기본 국회의원 데이터 (API 실패 시 사용)
function getDefaultMemberData() {
    return [
        {
            id: 1,
            name: "김민석",
            party: "더불어민주당",
            district: "서울 영등포구갑",
            photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
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
            photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
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
            photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
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
        },
        {
            id: 4,
            name: "한동훈",
            party: "국민의힘",
            district: "서울 강남구을",
            photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
            stats: {
                attendance: 89,
                billProposed: 45,
                billPassRate: 38,
                mainProposer: 12,
                speeches: 31,
                committeeAttendance: 87,
                partyVoteMatch: 93,
                petitionResponse: 7
            }
        }
    ];
}

// 에러 메시지 표시
function showError(message) {
    const notification = document.createElement('div');
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
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}

// DOM이 완전히 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', async function() {
    
    // CSS에서 정당별 색상 데이터 초기화
    partyData = getPartyColors();
    
    // Django API에서 국회의원 데이터 로드
    await fetchMemberData();
    
    // 검색 필터 태그 선택 효과
    const filterTags = document.querySelectorAll('.filter-tag');
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            if (this.textContent === '정당별 필터') {
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
            if (this.value.length > 0) {
                searchResults[index].classList.add('show');
            }
        });
        
        input.addEventListener('blur', function() {
            setTimeout(() => {
                searchResults[index].classList.remove('show');
            }, 200);
        });
        
        input.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase().trim();
            
            if (searchValue.length > 0) {
                searchResults[index].innerHTML = '';
                
                // 검색어로 필터링
                const filteredMPs = mpData.filter(mp => 
                    mp.name.toLowerCase().includes(searchValue) || 
                    mp.district.toLowerCase().includes(searchValue) ||
                    mp.party.toLowerCase().includes(searchValue)
                );
                
                if (filteredMPs.length > 0) {
                    filteredMPs.slice(0, 10).forEach(mp => { // 최대 10개만 표시
                        const item = document.createElement('div');
                        item.className = 'mp-search-item';
                        
                        // 정당 색상 가져오기
                        const partyStyle = partyData[mp.party] ? 
                            `background-color: ${partyData[mp.party].color};` : 
                            'background-color: #999;';
                        
                        item.innerHTML = `
                            <img src="${mp.photo}" alt="${mp.name} 의원 사진" 
                                 onerror="this.src='https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png'">
                            <span>${mp.name}</span>
                            <span class="mp-party-tag" style="${partyStyle}">${mp.party}</span>
                        `;
                        
                        item.addEventListener('click', function() {
                            selectMP(mp, index);
                            input.value = '';
                            searchResults[index].classList.remove('show');
                        });
                        
                        searchResults[index].appendChild(item);
                    });
                } else {
                    // 검색 결과가 없을 때
                    const noResult = document.createElement('div');
                    noResult.className = 'mp-search-item';
                    noResult.innerHTML = '<span>검색 결과가 없습니다.</span>';
                    noResult.style.color = '#999';
                    noResult.style.cursor = 'default';
                    searchResults[index].appendChild(noResult);
                }
                
                searchResults[index].classList.add('show');
            } else {
                searchResults[index].classList.remove('show');
            }
        });
    });
    
    // 국회의원 제거 버튼
    const removeButtons = document.querySelectorAll('.mp-remove');
    
    removeButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            resetMP(index);
        });
    });
    
    // 초기 필터 태그 설정
    if (filterTags.length > 0) {
        filterTags[0].classList.add('active');
    }

    console.log('국회의원 비교 페이지 초기화 완료');
});

// 국회의원 선택 함수
function selectMP(mp, cardIndex) {
    const comparisonCards = document.querySelectorAll('.comparison-card');
    const card = comparisonCards[cardIndex];
    
    if (card) {
        // 선택된 국회의원 정보 업데이트
        const mpSelected = card.querySelector('.mp-selected');
        const mpImage = mpSelected.querySelector('img');
        const mpName = mpSelected.querySelector('.mp-selected-name');
        const mpParty = mpSelected.querySelector('.mp-selected-party');
        
        // 의원 정보 업데이트
        mpImage.src = mp.photo;
        mpImage.onerror = function() {
            this.src = 'https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png';
        };
        mpName.textContent = mp.name;
        mpParty.textContent = `${mp.party} · ${mp.district}`;
        
        // 통계 정보 업데이트
        updateMPStats(card, mp);
    }
}

// 국회의원 초기화 함수
function resetMP(cardIndex) {
    const comparisonCards = document.querySelectorAll('.comparison-card');
    const card = comparisonCards[cardIndex];
    
    if (card) {
        const mpSelected = card.querySelector('.mp-selected');
        const mpName = mpSelected.querySelector('.mp-selected-name');
        const mpParty = mpSelected.querySelector('.mp-selected-party');
        
        mpName.textContent = '국회의원을 검색하세요';
        mpParty.textContent = '';
        
        // 통계 정보 초기화
        resetMPStats(card);
    }
}

// 국회의원 통계 정보 업데이트 함수
function updateMPStats(card, mp) {
    const statusItems = card.querySelectorAll('.status-item');
    
    // 첫 번째 status-item은 "국회의원 선택"이므로 제외하고 두 번째부터 시작
    const statsMapping = [
        { key: 'attendance', suffix: '%', threshold: 95 },
        { key: 'billProposed', suffix: '건', threshold: 60 },
        { key: 'billPassRate', suffix: '%', threshold: 40 },
        { key: 'mainProposer', suffix: '건', threshold: 18 },
        { key: 'speeches', suffix: '회', threshold: 40 },
        { key: 'committeeAttendance', suffix: '%', threshold: 90 },
        { key: 'partyVoteMatch', suffix: '%', threshold: 95 },
        { key: 'petitionResponse', suffix: '건', threshold: 10 }
    ];
    
    statusItems.forEach((item, index) => {
        // 첫 번째 아이템(국회의원 선택)은 건너뛰기
        if (index === 0) return;
        
        const statIndex = index - 1;
        if (statIndex < statsMapping.length) {
            const stat = statsMapping[statIndex];
            const valueElement = item.querySelector('.status-value');
            
            if (valueElement && mp.stats[stat.key] !== undefined) {
                const value = mp.stats[stat.key];
                valueElement.textContent = value + stat.suffix;
                
                // 성과에 따른 색상 적용
                valueElement.className = 'status-value ' + (value > stat.threshold ? 'win' : 'lose');
            }
        }
    });
}

// 국회의원 통계 정보 초기화 함수
function resetMPStats(card) {
    const statusItems = card.querySelectorAll('.status-item');
    
    statusItems.forEach((item, index) => {
        // 첫 번째 아이템(국회의원 선택)은 건너뛰기
        if (index === 0) return;
        
        const valueElement = item.querySelector('.status-value');
        if (valueElement) {
            valueElement.textContent = '-';
            valueElement.className = 'status-value';
        }
    });
}
