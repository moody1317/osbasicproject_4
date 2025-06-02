document.addEventListener('DOMContentLoaded', function() {
    // Django API 서버 설정
    const API_BASE_URL = 'http://localhost:8000/api'; // Django 서버 주소로 변경
    const API_ENDPOINTS = {
        getSettings: '/percent-settings/',
        saveSettings: '/percent-settings/',
    };

    // 초기값 설정
    const defaultValues = {
        '간사': 3,
        '무효표 및 기권': 2,
        '본회의 가결': 40,
        '위원장': 5,
        '청원 소개': 8,
        '청원 결과': 23,
        '출석': 8,
        '투표 결과 일치': 7,
        '투표 결과 불일치': 4
    };

    // 체크박스와 퍼센트 입력 필드 연결
    const checkboxItems = document.querySelectorAll('.checkbox-item');
    const percentInputs = document.querySelectorAll('.percent-input');
    const resetButton = document.querySelector('.reset-button');

    // 체크박스와 입력 필드 매핑
    const fieldMapping = {
        '간사': '간사',
        '무효표 및 기권': '무효표 및 기권',
        '본회의 가결': '본회의 가결',
        '위원장': '위원장',
        '청원 소개': '청원 소개',
        '청원 결과': '청원 결과',
        '출석': '출석',
        '투표 결과 일치': '투표 결과 일치',
        '투표 결과 불일치': '투표 결과 불일치'
    };

    // API 요청 헬퍼 함수
    async function apiRequest(endpoint, method = 'GET', data = null) {
        const url = API_BASE_URL + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                // CSRF 토큰이 필요한 경우
                'X-CSRFToken': getCookie('csrftoken'),
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API 요청 오류:', error);
            throw error;
        }
    }

    // CSRF 토큰 가져오기 함수
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // 숫자 값을 정리하는 함수 (음수 처리 제거)
    function cleanNumericValue(value) {
        let cleanValue = value.replace('%', '').trim();
        cleanValue = cleanValue.replace(/[^\d.]/g, ''); // 숫자와 소수점만 허용
        
        if (cleanValue === '') {
            return '0';
        }
        
        // 불필요한 앞의 0 제거 (소수점 앞 제외)
        if (cleanValue.length > 1) {
            if (cleanValue.startsWith('0') && cleanValue[1] !== '.') {
                cleanValue = cleanValue.replace(/^0+/, '') || '0';
            }
        }
        
        return cleanValue;
    }

    // 퍼센트 값을 서버에 저장하는 함수
    async function savePercentValues() {
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

        try {
            // 서버에 저장
            await apiRequest(API_ENDPOINTS.saveSettings, 'POST', percentData);
            console.log('설정이 서버에 저장되었습니다:', percentData);
            
            // 로컬스토리지에도 백업 저장
            localStorage.setItem('percentSettings', JSON.stringify(percentData));
        } catch (error) {
            console.error('서버 저장 실패:', error);
            alert('설정 저장에 실패했습니다. 다시 시도해주세요.');
            
            // 서버 저장 실패시 로컬스토리지에만 저장
            localStorage.setItem('percentSettings', JSON.stringify(percentData));
        }
    }

    // 서버에서 설정값을 불러오는 함수
    async function loadPercentValues() {
        try {
            // 서버에서 데이터 로드 시도
            const percentData = await apiRequest(API_ENDPOINTS.getSettings);
            
            if (percentData && Object.keys(percentData).length > 0) {
                applySettings(percentData);
                return true;
            }
        } catch (error) {
            console.warn('서버에서 설정 로드 실패:', error);
            console.log('로컬 저장소에서 데이터를 불러옵니다.');
        }

        // 서버 로드 실패시 로컬스토리지에서 시도
        const savedData = localStorage.getItem('percentSettings');
        if (savedData) {
            try {
                const percentData = JSON.parse(savedData);
                applySettings(percentData);
                return true;
            } catch (error) {
                console.error('로컬 데이터 파싱 오류:', error);
            }
        }
        
        return false;
    }

    // 설정값을 UI에 적용하는 함수
    function applySettings(percentData) {
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
        
        calculateAndDisplayTotal();
        savePercentValues(); // 자동 저장
    }

    // 초기화 함수
    async function resetToDefaults() {
        checkboxItems.forEach(item => {
            const checkbox = item.querySelector('.checkbox-input');
            checkbox.checked = true;
        });

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

        calculateAndDisplayTotal();
        await savePercentValues(); // 서버에 초기값 저장
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

        console.log('활성화된 항목 수:', activeCount);
        console.log('전체 합계:', total.toFixed(1) + '%');

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

    // 이벤트 리스너 설정
    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('.checkbox-input');
        const label = item.querySelector('.checkbox-label').textContent.trim();
        
        checkbox.addEventListener('change', function() {
            updatePercentField(label, this.checked);
        });
    });

    resetButton.addEventListener('click', async function() {
        if (confirm('모든 값을 초기값으로 되돌리시겠습니까?')) {
            await resetToDefaults();
        }
    });

    // 퍼센트 입력 필드 이벤트 리스너
    percentInputs.forEach(input => {
        let saveTimeout;

        input.addEventListener('input', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }

            const cursorPosition = this.selectionStart;
            
            const cleanedValue = cleanNumericValue(this.value);
            this.value = cleanedValue + '%';
            
            const newCursorPosition = Math.min(cursorPosition, this.value.length - 1);
            this.setSelectionRange(newCursorPosition, newCursorPosition);
            
            calculateAndDisplayTotal();
            
            // 자동 저장 (디바운싱 적용)
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                savePercentValues();
            }, 1000); // 1초 후 저장
        });

        input.addEventListener('keydown', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }

            const cursorPosition = this.selectionStart;
            const valueLength = this.value.length;
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (cursorPosition >= valueLength - 1) {
                    e.preventDefault();
                    
                    if (e.key === 'Backspace' && cursorPosition === valueLength - 1) {
                        const newValue = this.value.slice(0, -2) + '%';
                        this.value = newValue.length > 1 ? newValue : '0%';
                        const newPosition = Math.max(0, this.value.length - 1);
                        this.setSelectionRange(newPosition, newPosition);
                        
                        calculateAndDisplayTotal();
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(() => {
                            savePercentValues();
                        }, 1000);
                    }
                }
            }
            
            if (e.key === 'ArrowRight' && cursorPosition >= valueLength - 1) {
                e.preventDefault();
            }
        });

        input.addEventListener('click', function() {
            if (this.disabled) return;
            
            if (this.value === '0%') {
                this.value = '%';
            }
            
            const valueLength = this.value.length;
            if (this.selectionStart >= valueLength - 1) {
                this.setSelectionRange(valueLength - 1, valueLength - 1);
            }
        });

        input.addEventListener('focus', function() {
            if (this.disabled) {
                this.blur();
                return;
            }
            
            if (this.value === '0%') {
                this.value = '%';
            }
            
            const valueLength = this.value.length;
            this.setSelectionRange(valueLength - 1, valueLength - 1);
        });

        input.addEventListener('blur', function() {
            if (this.disabled) return;
            
            let cleanedValue = cleanNumericValue(this.value);
            
            if (cleanedValue === '') {
                cleanedValue = '0';
            }
            
            this.value = cleanedValue + '%';
            
            calculateAndDisplayTotal();
            savePercentValues(); // 포커스 잃을 때 즉시 저장
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

    // 초기 설정 로드
    loadPercentValues().then(hasData => {
        if (!hasData) {
            resetToDefaults();
        }
    });
});

// 전역 함수
window.getPercentSettings = async function() {
    try {
        return await apiRequest('/percent-settings/');
    } catch (error) {
        const savedData = localStorage.getItem('percentSettings');
        return savedData ? JSON.parse(savedData) : null;
    }
};
