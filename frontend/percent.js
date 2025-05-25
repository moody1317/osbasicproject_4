document.addEventListener('DOMContentLoaded', function() {
    // 초기값 설정
    const defaultValues = {
        '무효표 및 기권표': -2.5,
        '본회의 가결': 40,
        '위원장': 5,
        '청원 소개': 8,
        '청원 결과': 23,
        '출석': -10,
        '투표 결과 일치': 7.5,
        '투표 결과 불일치': 4
    };

    // 체크박스와 퍼센트 입력 필드 연결
    const checkboxItems = document.querySelectorAll('.checkbox-item');
    const percentInputs = document.querySelectorAll('.percent-input');

    // 초기화 버튼
    const resetButton = document.querySelector('.reset-button');

    // 체크박스와 입력 필드 매핑
    const fieldMapping = {
        '무효표 및 기권': '무효표 및 기권표',
        '본회의 가결': '본회의 가결',
        '위원장': '위원장',
        '청원 소개': '청원 소개',
        '청원 결과': '청원 결과',
        '출석': '출석',
        '투표 결과 일치': '투표 결과 일치',
        '투표 결과 불일치': '투표 결과 불일치'
    };

    // 퍼센트 값을 LocalStorage에 저장하는 함수
    function savePercentValues() {
        const percentData = {};
        
        percentInputs.forEach(input => {
            const label = input.closest('.percent-item').querySelector('.percent-label').textContent.trim();
            const value = parseFloat(input.value.replace('%', '')) || 0;
            const isEnabled = !input.disabled;
            
            percentData[label] = {
                value: value,
                enabled: isEnabled
            };
        });
        
        // LocalStorage에 저장
        localStorage.setItem('percentSettings', JSON.stringify(percentData));
        console.log('설정이 저장되었습니다:', percentData);
    }

    // 저장된 값을 불러오는 함수
    function loadPercentValues() {
        const savedData = localStorage.getItem('percentSettings');
        
        if (savedData) {
            const percentData = JSON.parse(savedData);
            
            // 체크박스와 입력값 복원
            Object.keys(percentData).forEach(label => {
                const data = percentData[label];
                
                // 체크박스 상태 복원
                checkboxItems.forEach(item => {
                    const checkboxLabel = item.querySelector('.checkbox-label').textContent.trim();
                    if (fieldMapping[checkboxLabel] === label) {
                        const checkbox = item.querySelector('.checkbox-input');
                        checkbox.checked = data.enabled;
                    }
                });
                
                // 입력값 복원
                percentInputs.forEach(input => {
                    const inputLabel = input.closest('.percent-item').querySelector('.percent-label').textContent.trim();
                    if (inputLabel === label) {
                        input.value = data.value + '%';
                        input.disabled = !data.enabled;
                        // 스타일 업데이트
                        if (data.enabled) {
                            input.style.opacity = '1';
                            input.style.backgroundColor = '#f9f9f9';
                            input.style.cursor = 'text';
                        } else {
                            input.style.opacity = '0.3';
                            input.style.backgroundColor = '#e0e0e0';
                            input.style.cursor = 'not-allowed';
                        }
                    }
                });
            });
            
            calculateAndDisplayTotal();
            return true; // 저장된 값이 있음
        }
        return false; // 저장된 값이 없음
    }

    // 체크박스 상태에 따라 퍼센트 입력 필드 활성화/비활성화
    function updatePercentField(checkboxLabel, isChecked) {
        const mappedLabel = fieldMapping[checkboxLabel];
        
        percentInputs.forEach(input => {
            const inputLabel = input.closest('.percent-item').querySelector('.percent-label').textContent.trim();
            
            if (inputLabel === mappedLabel) {
                if (isChecked) {
                    input.disabled = false;
                    input.style.opacity = '1';
                    input.style.backgroundColor = '#f9f9f9';
                    input.style.cursor = 'text';
                } else {
                    input.disabled = true;
                    input.style.opacity = '0.3';
                    input.style.backgroundColor = '#e0e0e0';
                    input.style.cursor = 'not-allowed';
                    input.value = '0%';
                }
            }
        });
        
        // 합계 재계산
        calculateAndDisplayTotal();
        // 변경사항 저장
        savePercentValues();
    }

    // 초기화 함수
    function resetToDefaults() {
        // 모든 체크박스 체크
        checkboxItems.forEach(item => {
            const checkbox = item.querySelector('.checkbox-input');
            checkbox.checked = true;
        });

        // 모든 입력 필드 활성화 및 초기값 설정
        percentInputs.forEach(input => {
            const label = input.closest('.percent-item').querySelector('.percent-label').textContent.trim();
            const defaultValue = defaultValues[label];
            
            if (defaultValue !== undefined) {
                input.value = defaultValue + '%';
                input.disabled = false;
                input.style.opacity = '1';
                input.style.backgroundColor = '#f9f9f9';
                input.style.cursor = 'text';
            }
        });

        // 합계 재계산
        calculateAndDisplayTotal();
        // 초기값으로 저장
        savePercentValues();
    }

    // 전체 퍼센트 합계 계산 및 표시
    function calculateAndDisplayTotal() {
        let total = 0;
        let activeCount = 0;

        percentInputs.forEach(input => {
            if (!input.disabled) {
                const value = parseFloat(input.value.replace('%', '')) || 0;
                total += value;
                activeCount++;
            }
        });

        // 합계 표시 (콘솔 및 UI)
        console.log('활성화된 항목 수:', activeCount);
        console.log('전체 합계:', total.toFixed(1) + '%');

        // 합계 표시 UI 추가 (선택사항)
        let totalDisplay = document.querySelector('.total-display');
        if (!totalDisplay) {
            totalDisplay = document.createElement('div');
            totalDisplay.className = 'total-display';
            totalDisplay.style.cssText = `
                text-align: center;
                margin-top: 20px;
                padding: 15px;
                background-color: var(--main1);
                border-radius: 5px;
                font-size: 18px;
                font-weight: 600;
                color: var(--string);
            `;
            document.querySelector('.percent-grid').after(totalDisplay);
        }
        
        totalDisplay.innerHTML = `
            <span>활성 항목: ${activeCount}개</span> | 
            <span>전체 합계: <span style="color: ${total === 100 ? 'var(--light-blue)' : 'var(--example)'}">${total.toFixed(1)}%</span></span>
        `;
    }

    // 체크박스 이벤트 리스너
    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('.checkbox-input');
        const label = item.querySelector('.checkbox-label').textContent.trim();
        
        checkbox.addEventListener('change', function() {
            updatePercentField(label, this.checked);
        });
    });

    // 초기화 버튼 이벤트
    resetButton.addEventListener('click', function() {
        if (confirm('모든 값을 초기값으로 되돌리시겠습니까?')) {
            resetToDefaults();
        }
    });

    // 퍼센트 입력 필드 포맷팅
    percentInputs.forEach(input => {
        // 입력 이벤트
        input.addEventListener('input', function(e) {
            // 비활성화된 경우 입력 방지
            if (this.disabled) {
                e.preventDefault();
                return;
            }

            // 현재 커서 위치 저장
            const cursorPosition = this.selectionStart;
            
            // % 기호와 숫자 외의 문자 제거
            let value = this.value.replace('%', '').replace(/[^\d.-]/g, '');
            
            // 값이 있으면 % 추가
            if (value !== '') {
                this.value = value + '%';
            } else {
                this.value = '0%';
            }
            
            // 커서를 % 기호 앞으로 이동
            const newCursorPosition = this.value.length - 1;
            this.setSelectionRange(newCursorPosition, newCursorPosition);
            
            // 합계 재계산
            calculateAndDisplayTotal();
            // 변경사항 저장
            savePercentValues();
        });

        // 키 다운 이벤트로 % 기호 삭제 방지
        input.addEventListener('keydown', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }

            const cursorPosition = this.selectionStart;
            const valueLength = this.value.length;
            
            // Delete 키나 Backspace 키를 눌렀을 때
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // 커서가 % 기호 앞이나 뒤에 있을 때 삭제 방지
                if (cursorPosition >= valueLength - 1) {
                    e.preventDefault();
                    
                    // % 앞의 숫자만 삭제
                    if (e.key === 'Backspace' && cursorPosition === valueLength - 1) {
                        const newValue = this.value.slice(0, -2) + '%';
                        this.value = newValue.length > 1 ? newValue : '0%';
                        const newPosition = Math.max(0, this.value.length - 1);
                        this.setSelectionRange(newPosition, newPosition);
                        
                        // 합계 재계산
                        calculateAndDisplayTotal();
                        // 변경사항 저장
                        savePercentValues();
                    }
                }
            }
            
            // 화살표 키로 % 기호를 넘어가지 못하도록
            if (e.key === 'ArrowRight' && cursorPosition >= valueLength - 1) {
                e.preventDefault();
            }
        });

        // 클릭 시 커서 위치 조정
        input.addEventListener('click', function() {
            if (this.disabled) return;
            
            // 0%인 경우 0을 지워줌
            if (this.value === '0%') {
                this.value = '%';
            }
            
            const valueLength = this.value.length;
            if (this.selectionStart >= valueLength - 1) {
                this.setSelectionRange(valueLength - 1, valueLength - 1);
            }
        });

        // 포커스 시 커서를 % 앞으로 이동
        input.addEventListener('focus', function() {
            if (this.disabled) {
                this.blur();
                return;
            }
            
            // 0%인 경우 0을 지워줌
            if (this.value === '0%') {
                this.value = '%';
            }
            
            const valueLength = this.value.length;
            this.setSelectionRange(valueLength - 1, valueLength - 1);
        });

        // 블러(포커스 잃음) 시 빈 값 처리
        input.addEventListener('blur', function() {
            if (this.disabled) return;
            
            const value = this.value.replace('%', '').trim();
            if (value === '') {
                this.value = '0%';
            } else {
                this.value = value + '%';
            }
            
            // 합계 재계산
            calculateAndDisplayTotal();
            // 변경사항 저장
            savePercentValues();
        });

        // 붙여넣기 이벤트 처리
        input.addEventListener('paste', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const cleanedText = pastedText.replace(/[^\d.-]/g, '');
            
            if (cleanedText !== '') {
                this.value = cleanedText + '%';
            }
            
            // 커서를 % 앞으로 이동
            const newPosition = this.value.length - 1;
            this.setSelectionRange(newPosition, newPosition);
            
            // 합계 재계산
            calculateAndDisplayTotal();
            // 변경사항 저장
            savePercentValues();
        });
    });

    // 페이지 로드 시 애니메이션
    const checkboxGrid = document.querySelector('.checkbox-grid');
    const percentGrid = document.querySelector('.percent-grid');

    if (checkboxGrid) {
        checkboxGrid.style.opacity = '0';
        checkboxGrid.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            checkboxGrid.style.transition = 'all 0.5s ease';
            checkboxGrid.style.opacity = '1';
            checkboxGrid.style.transform = 'translateY(0)';
        }, 100);
    }

    if (percentGrid) {
        percentGrid.style.opacity = '0';
        percentGrid.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            percentGrid.style.transition = 'all 0.5s ease';
            percentGrid.style.opacity = '1';
            percentGrid.style.transform = 'translateY(0)';
        }, 300);
    }

    // 초기 설정: 저장된 값이 있으면 불러오고, 없으면 초기값 사용
    if (!loadPercentValues()) {
        resetToDefaults();
    }
});

// 다른 페이지에서 사용할 수 있는 헬퍼 함수 (전역 함수로 노출)
window.getPercentSettings = function() {
    const savedData = localStorage.getItem('percentSettings');
    if (savedData) {
        return JSON.parse(savedData);
    }
    return null;
};