// 선택된 정당을 저장할 변수
let selectedParties = [];

// 정당별 데이터
const partyData = {
    "더불어 민주당": {
        winColor: "#152484",
        loseColor: "#15248480" // 50% 투명도
    },
    "국민의 힘": {
        winColor: "#E61E2B",
        loseColor: "#E61E2B80" // 50% 투명도
    },
    "조국혁신당": {
        winColor: "#06275E",
        loseColor: "#0073CF"
    },
    "개혁신당": {
        winColor: "#FF7210", 
        loseColor: "#FF721080" // 50% 투명도
    },
    "진보당": {
        winColor: "#D6001C",
        loseColor: "#D6001C80" // 50% 투명도
    },
    "기본소득당": {
        winColor: "#091E3A",
        loseColor: "#00D2C3"
    },
    "사회민주당": {
        winColor: "#43A213",
        loseColor: "#F58400"
    },
    "무소속": {
        winColor: "#4B5563",
        loseColor: "#9CA3AF"
    }
};

// DOM이 완전히 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', function() {    
    // 드롭다운 변경 시 이벤트 처리
    const dropdowns = document.querySelectorAll('select.party-dropdown');
    
    dropdowns.forEach((dropdown, index) => {
        dropdown.addEventListener('change', function() {
            const selectedParty = this.value;
            console.log('선택된 정당:', selectedParty);
            
            // 이미 선택된 정당인지 확인
            if (selectedParties.includes(selectedParty) && selectedParty !== "") {
                alert("이미 다른 칸에서 선택된 정당입니다. 다른 정당을 선택해주세요.");
                this.value = selectedParties[index] || ""; // 이전 값으로 복원
                return;
            }
            
            // 선택된 정당 업데이트
            selectedParties[index] = selectedParty;
            
            // 다른 드롭다운에서 이미 선택된 정당 비활성화
            dropdowns.forEach((otherDropdown, otherIndex) => {
                if (otherIndex !== index) {
                    Array.from(otherDropdown.options).forEach(option => {
                        if (selectedParties.includes(option.value) && option.value !== selectedParties[otherIndex] && option.value !== "") {
                            option.disabled = true;
                        } else {
                            option.disabled = false;
                        }
                    });
                }
            });
            
            // 선택된 정당에 따라 스타일 변경
            if (selectedParty && partyData[selectedParty]) {
                // 해당 카드 내의 WIN, LOSE 요소 색상 변경
                const card = dropdown.closest('.comparison-card');
                const winElements = card.querySelectorAll('.win');
                const loseElements = card.querySelectorAll('.lose');
                
                winElements.forEach(el => {
                    el.style.color = partyData[selectedParty].winColor;
                });
                
                loseElements.forEach(el => {
                    el.style.color = partyData[selectedParty].loseColor;
                });
            }
        });
    });
});