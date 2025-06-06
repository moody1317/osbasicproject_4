document.addEventListener('DOMContentLoaded', function() {
    // === 기본 설정 및 상태 관리 ===
    
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

    // 🆕 API 가중치 필드 매핑 (서버에서 기대하는 필드명)
    const apiFieldMapping = {
        '간사': 'secretary_weight',
        '무효표 및 기권': 'invalid_vote_weight', 
        '본회의 가결': 'bill_pass_weight',
        '위원장': 'chairman_weight',
        '청원 소개': 'petition_intro_weight',
        '청원 결과': 'petition_result_weight',
        '출석': 'attendance_weight',
        '투표 결과 일치': 'vote_match_weight',
        '투표 결과 불일치': 'vote_mismatch_weight'
    };

    // 애플리케이션 상태
    let appState = {
        isApiConnected: false,
        lastSaved: null,
        autoSaveEnabled: true,
        isSaving: false,
        hasUnsavedChanges: false,
        isUpdatingWeights: false // 🆕 가중치 업데이트 상태
    };

    // DOM 요소들
    const checkboxItems = document.querySelectorAll('.checkbox-item');
    const percentInputs = document.querySelectorAll('.percent-input');
    const resetButton = document.getElementById('resetButton');
    const saveToServerBtn = document.getElementById('saveToServerBtn');
    const loadFromServerBtn = document.getElementById('loadFromServerBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const lastSavedElement = document.getElementById('lastSaved');
    const autoSaveIndicator = document.getElementById('autoSaveIndicator');

    // 체크박스와 퍼센트 입력 필드 매핑
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

    // === API 연결 및 상태 관리 ===
    
    // 🆕 API 연결 상태 확인
    async function checkApiConnection() {
        try {
            updateConnectionStatus('loading', 'API 연결 확인 중...');
            
            if (typeof window.APIService !== 'undefined' && window.APIService._isReady) {
                // API 서비스가 준비되었는지 확인
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
                
                appState.isApiConnected = true;
                updateConnectionStatus('connected', 'API 서버 연결됨 - 가중치 업데이트 가능');
                console.log('✅ API 연결 성공 - 가중치 업데이트 API 사용 가능');
                
                // 서버에서 설정 불러오기 시도
                try {
                    await loadFromServer(false); // 자동 로드 (알림 없음)
                } catch (error) {
                    console.warn('서버 설정 자동 로드 실패:', error.message);
                }
                
                return true;
            } else {
                throw new Error('APIService를 사용할 수 없습니다');
            }
        } catch (error) {
            appState.isApiConnected = false;
            updateConnectionStatus('disconnected', '로컬 모드 (가중치 API 연결 안됨)');
            console.warn('⚠️ API 연결 실패, 로컬 모드로 작동:', error.message);
            return false;
        }
    }

    // 연결 상태 UI 업데이트
    function updateConnectionStatus(status, message) {
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = message;
        }

        // 서버 관련 버튼 활성화/비활성화
        if (saveToServerBtn) saveToServerBtn.disabled = status !== 'connected';
        if (loadFromServerBtn) loadFromServerBtn.disabled = status !== 'connected';
    }

    // === 🆕 가중치 API 업데이트 기능 ===
    
    // 가중치를 API 서버로 전송
    async function updateWeightsToAPI(weights, showNotification = true) {
        if (!appState.isApiConnected) {
            if (showNotification && window.APIService?.showNotification) {
                window.APIService.showNotification('API 서버에 연결되지 않았습니다', 'warning');
            }
            return false;
        }

        try {
            appState.isUpdatingWeights = true;
            updateSaveStatus('가중치 업데이트 중...');

            // 현재 설정을 API 형식으로 변환
            const apiWeights = convertToApiFormat(weights);
            
            console.log('🔄 API로 가중치 전송 중:', apiWeights);

            // APIService의 updateWeights 함수 사용
            if (window.APIService && typeof window.APIService.updateWeights === 'function') {
                const result = await window.APIService.updateWeights(apiWeights);
                console.log('✅ 가중치 업데이트 성공:', result);
                
                appState.lastSaved = new Date();
                appState.hasUnsavedChanges = false;
                updateSaveStatus('가중치 API 업데이트 완료');
                
                if (showNotification && window.APIService.showNotification) {
                    window.APIService.showNotification('가중치가 서버에 적용되었습니다', 'success');
                }

                // 다른 페이지들에게 가중치 변경 알림
                notifyOtherPages();
                
                return true;
            } else {
                throw new Error('updateWeights API를 사용할 수 없습니다');
            }

        } catch (error) {
            console.error('❌ 가중치 API 업데이트 실패:', error);
            updateSaveStatus('가중치 업데이트 실패');
            
            if (showNotification && window.APIService?.showNotification) {
                window.APIService.showNotification(`가중치 업데이트 실패: ${error.message}`, 'error');
            }
            
            return false;
        } finally {
            appState.isUpdatingWeights = false;
        }
    }

    // 현재 설정을 API 형식으로 변환
    function convertToApiFormat(settings) {
        const apiWeights = {};
        
        Object.keys(settings).forEach(itemName => {
            const data = settings[itemName];
            const apiFieldName = apiFieldMapping[itemName];
            
            if (apiFieldName && data.enabled) {
                // 퍼센트를 소수로 변환 (예: 40% -> 0.4)
                apiWeights[apiFieldName] = data.value / 100;
            }
        });
        
        console.log('변환된 API 가중치:', apiWeights);
        return apiWeights;
    }

    // 다른 페이지들에게 가중치 변경 알림
    function notifyOtherPages() {
        try {
            // localStorage를 통한 페이지 간 통신
            const event = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'percent_page'
            };
            
            localStorage.setItem('weight_change_event', JSON.stringify(event));
            
            // 즉시 제거 (이벤트 트리거용)
            setTimeout(() => {
                localStorage.removeItem('weight_change_event');
            }, 100);
            
            console.log('📢 다른 페이지들에게 가중치 변경 알림 전송');
            
        } catch (error) {
            console.warn('페이지 간 통신 실패:', error);
        }
    }

    // 서버에 설정 저장 (가중치 API 포함)
    async function saveToServer(showNotification = true) {
        if (!appState.isApiConnected) {
            if (showNotification && window.APIService?.showNotification) {
                window.APIService.showNotification('API 서버에 연결되지 않았습니다', 'warning');
            }
            return false;
        }

        try {
            appState.isSaving = true;
            updateSaveStatus('저장 및 가중치 업데이트 중...');

            const settings = getCurrentSettings();
            
            // 1. 로컬 저장
            if (window.PercentManager && typeof window.PercentManager.saveSettings === 'function') {
                await window.PercentManager.saveSettings(settings);
            } else {
                localStorage.setItem('percentSettings', JSON.stringify(settings));
            }

            // 2. 가중치 API 업데이트
            const weightUpdateSuccess = await updateWeightsToAPI(settings, false);
            
            if (weightUpdateSuccess) {
                appState.lastSaved = new Date();
                appState.hasUnsavedChanges = false;
                updateSaveStatus('저장 및 가중치 적용 완료');
                
                if (showNotification && window.APIService?.showNotification) {
                    window.APIService.showNotification('설정 저장 및 가중치 적용 완료', 'success');
                }
            } else {
                updateSaveStatus('저장됨 (가중치 적용 실패)');
                
                if (showNotification && window.APIService?.showNotification) {
                    window.APIService.showNotification('설정은 저장되었으나 가중치 적용에 실패했습니다', 'warning');
                }
            }

            return true;

        } catch (error) {
            console.error('서버 저장 실패:', error);
            updateSaveStatus('저장 실패');
            
            if (showNotification && window.APIService?.showNotification) {
                window.APIService.showNotification('서버 저장에 실패했습니다', 'error');
            }
            
            return false;
        } finally {
            appState.isSaving = false;
        }
    }

    // 서버에서 설정 불러오기
    async function loadFromServer(showNotification = true) {
        if (!appState.isApiConnected) {
            if (showNotification && window.APIService?.showNotification) {
                window.APIService.showNotification('API 서버에 연결되지 않았습니다', 'warning');
            }
            return false;
        }

        try {
            updateSaveStatus('불러오는 중...');

            let serverSettings = null;
            
            // APIService를 통해 불러오기
            if (window.PercentManager && typeof window.PercentManager.getSettings === 'function') {
                serverSettings = window.PercentManager.getSettings();
            } else {
                // 직접 불러오기
                const savedData = localStorage.getItem('percentSettings');
                if (savedData) {
                    serverSettings = JSON.parse(savedData);
                }
            }

            if (serverSettings) {
                applySettings(serverSettings);
                appState.hasUnsavedChanges = false;
                updateSaveStatus('서버에서 불러옴');
                
                if (showNotification && window.APIService?.showNotification) {
                    window.APIService.showNotification('서버에서 설정을 불러왔습니다', 'success');
                }
                
                return true;
            } else {
                throw new Error('서버에 저장된 설정이 없습니다');
            }

        } catch (error) {
            console.error('서버 불러오기 실패:', error);
            updateSaveStatus('불러오기 실패');
            
            if (showNotification && window.APIService?.showNotification) {
                window.APIService.showNotification('서버에서 설정을 불러오는데 실패했습니다', 'error');
            }
            
            return false;
        }
    }

    // === 설정 관리 함수들 ===
    
    // 현재 설정 가져오기
    function getCurrentSettings() {
        const settings = {};
        
        percentInputs.forEach(input => {
            const itemName = input.getAttribute('data-item');
            const value = parseFloat(input.value.replace('%', '')) || 0;
            const enabled = !input.disabled;
            
            if (itemName) {
                settings[itemName] = {
                    value: value,
                    enabled: enabled
                };
            }
        });
        
        return settings;
    }

    // 설정 적용하기
    function applySettings(settings) {
        // 체크박스 상태 복원
        Object.keys(settings).forEach(itemName => {
            const data = settings[itemName];
            
            // 체크박스 찾기
            const checkbox = document.querySelector(`input[data-item="${itemName}"]`);
            if (checkbox) {
                checkbox.checked = data.enabled;
            }
            
            // 입력 필드 찾기
            const input = document.querySelector(`input.percent-input[data-item="${itemName}"]`);
            if (input) {
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
        
        calculateAndDisplayTotal();
    }

    // 로컬 저장 (🆕 가중치 API 업데이트 포함)
    function saveLocally() {
        try {
            const settings = getCurrentSettings();
            localStorage.setItem('percentSettings', JSON.stringify(settings));
            
            appState.lastSaved = new Date();
            updateSaveStatus('로컬에 저장됨');
            
            // 자동 저장이 활성화되어 있고 API가 연결된 경우 가중치도 업데이트
            if (appState.autoSaveEnabled && appState.isApiConnected && !appState.isSaving && !appState.isUpdatingWeights) {
                setTimeout(() => updateWeightsToAPI(settings, false), 2000); // 2초 후 자동 가중치 업데이트
            }
            
            return true;
        } catch (error) {
            console.error('로컬 저장 실패:', error);
            return false;
        }
    }

    // 로컬에서 불러오기
    function loadLocally() {
        try {
            const savedData = localStorage.getItem('percentSettings');
            if (savedData) {
                const settings = JSON.parse(savedData);
                applySettings(settings);
                return true;
            }
            return false;
        } catch (error) {
            console.error('로컬 불러오기 실패:', error);
            return false;
        }
    }

    // 저장 상태 업데이트
    function updateSaveStatus(status) {
        if (autoSaveIndicator) {
            const saveStatus = autoSaveIndicator.querySelector('.save-status');
            if (saveStatus) saveStatus.textContent = status;
        }
        
        if (lastSavedElement && appState.lastSaved) {
            lastSavedElement.textContent = `마지막 저장: ${appState.lastSaved.toLocaleTimeString('ko-KR')}`;
        }
    }
    
    // 숫자 값 정리 (모든 필드를 동일하게 처리)
    function cleanNumericValue(value) {
        // % 기호와 공백 제거
        let cleanValue = value.replace('%', '').trim();
        
        // 숫자, 소수점, 음수 기호만 허용
        cleanValue = cleanValue.replace(/[^\d.-]/g, '');
        
        // 빈 값이면 0 반환
        if (cleanValue === '' || cleanValue === '-') {
            return '0';
        }
        
        // 앞의 0 제거 (단, '0'이나 '-0'은 유지)
        if (cleanValue.length > 1) {
            if (cleanValue.startsWith('0') && cleanValue[1] !== '.') {
                cleanValue = cleanValue.replace(/^0+/, '') || '0';
            } else if (cleanValue.startsWith('-0') && cleanValue.length > 2 && cleanValue[2] !== '.') {
                cleanValue = '-' + cleanValue.substring(2).replace(/^0+/, '') || '-0';
            }
        }
        
        return cleanValue;
    }

    // === UI 업데이트 함수들 ===
    
    // 체크박스 상태에 따른 퍼센트 필드 업데이트
    function updatePercentField(itemName, isChecked) {
        const input = document.querySelector(`input.percent-input[data-item="${itemName}"]`);
        
        if (input) {
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
        
        calculateAndDisplayTotal();
        markAsChanged();
        saveLocally();
    }

    // 변경 사항 표시
    function markAsChanged() {
        appState.hasUnsavedChanges = true;
        updateSaveStatus('변경 사항 있음 - 가중치 업데이트 예정');
    }

    // 초기화 함수
    function resetToDefaults() {
        // 모든 체크박스 체크
        checkboxItems.forEach(item => {
            const checkbox = item.querySelector('.checkbox-input');
            if (checkbox) checkbox.checked = true;
        });

        // 모든 입력 필드 활성화 및 초기값 설정
        percentInputs.forEach(input => {
            const itemName = input.getAttribute('data-item');
            const defaultValue = defaultValues[itemName];
            
            if (defaultValue !== undefined) {
                input.value = defaultValue + '%';
                input.disabled = false;
                input.style.opacity = '1';
                input.style.backgroundColor = '#f9f9f9';
                input.style.cursor = 'text';
            }
        });

        calculateAndDisplayTotal();
        saveLocally();
        
        if (window.APIService?.showNotification) {
            window.APIService.showNotification('초기값으로 설정되었습니다', 'success');
        }
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

        console.log('활성화된 항목 수:', activeCount, '전체 합계:', total.toFixed(1) + '%');

        // 합계 표시 UI
        let totalDisplay = document.querySelector('.total-display');
        if (!totalDisplay) {
            totalDisplay = document.createElement('div');
            totalDisplay.className = 'total-display';
            document.querySelector('.percent-grid').after(totalDisplay);
        }
        
        const statusText = appState.isApiConnected ? 
            ' | 🔗 가중치 API 연결됨' : 
            ' | ⚠️ 로컬 모드';
            
        totalDisplay.innerHTML = `
            <span>활성 항목: ${activeCount}개</span> | 
            <span>전체 합계: <span style="color: ${total === 100 ? 'var(--light-blue)' : 'var(--example)'}">${total.toFixed(1)}%</span></span>
            ${statusText}
        `;
    }

    // === 🆕 즉시 적용 버튼 추가 ===
    function createApplyButton() {
        const controlWrapper = document.querySelector('.control-wrapper');
        if (controlWrapper && appState.isApiConnected) {
            const applyBtn = document.createElement('button');
            applyBtn.className = 'reset-button';
            applyBtn.id = 'applyWeightsBtn';
            applyBtn.textContent = '가중치 즉시 적용';
            applyBtn.style.marginLeft = '10px';
            applyBtn.style.backgroundColor = 'var(--light-blue)';
            applyBtn.style.color = 'white';
            
            applyBtn.addEventListener('click', async function() {
                const settings = getCurrentSettings();
                const success = await updateWeightsToAPI(settings, true);
                
                if (success) {
                    this.textContent = '적용 완료!';
                    this.style.backgroundColor = '#4caf50';
                    
                    setTimeout(() => {
                        this.textContent = '가중치 즉시 적용';
                        this.style.backgroundColor = 'var(--light-blue)';
                    }, 2000);
                }
            });
            
            controlWrapper.appendChild(applyBtn);
        }
    }

    // === 이벤트 리스너 등록 ===
    
    // API 관련 버튼 이벤트 (현재는 숨겨져 있음)
    if (saveToServerBtn) {
        saveToServerBtn.addEventListener('click', () => saveToServer(true));
    }
    
    if (loadFromServerBtn) {
        loadFromServerBtn.addEventListener('click', () => loadFromServer(true));
    }

    // 백업/복원 버튼 이벤트 (현재는 숨겨져 있음)
    if (exportBtn) {
        exportBtn.addEventListener('click', exportSettings);
    }
    
    if (importBtn) {
        importBtn.addEventListener('click', () => importFile && importFile.click());
    }
    
    if (importFile) {
        importFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                importSettings(file);
                e.target.value = ''; // 파일 선택 초기화
            }
        });
    }

    // 체크박스 이벤트 리스너
    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('.checkbox-input');
        if (checkbox) {
            const itemName = checkbox.getAttribute('data-item');
            
            checkbox.addEventListener('change', function() {
                updatePercentField(itemName, this.checked);
            });
        }
    });

    // 초기화 버튼 이벤트
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (confirm('모든 값을 초기값으로 되돌리시겠습니까?')) {
                resetToDefaults();
            }
        });
    }

    // 퍼센트 입력 필드 이벤트 리스너 (음수 로직 제거)
    percentInputs.forEach(input => {
        const itemName = input.getAttribute('data-item');

        // 입력 이벤트
        input.addEventListener('input', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }

            const cursorPosition = this.selectionStart;
            const cleanedValue = cleanNumericValue(this.value); // 음수 처리 제거
            this.value = cleanedValue + '%';
            
            const newCursorPosition = Math.min(cursorPosition, this.value.length - 1);
            this.setSelectionRange(newCursorPosition, newCursorPosition);
            
            calculateAndDisplayTotal();
            markAsChanged();
            
            // 디바운스된 자동 저장
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => saveLocally(), 500);
        });

        // 키 다운 이벤트
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
                        markAsChanged();
                        clearTimeout(this.saveTimeout);
                        this.saveTimeout = setTimeout(() => saveLocally(), 500);
                    }
                }
            }
            
            if (e.key === 'ArrowRight' && cursorPosition >= valueLength - 1) {
                e.preventDefault();
            }
        });

        // 클릭 이벤트
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

        // 포커스 이벤트
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

        // 블러 이벤트
        input.addEventListener('blur', function() {
            if (this.disabled) return;
            
            let cleanedValue = cleanNumericValue(this.value); // 음수 처리 제거
            
            if (cleanedValue === '') {
                cleanedValue = '0';
            }
            
            this.value = cleanedValue + '%';
            
            calculateAndDisplayTotal();
            saveLocally();
        });

        // 붙여넣기 이벤트
        input.addEventListener('paste', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const cleanedValue = cleanNumericValue(pastedText); // 음수 처리 제거
            
            this.value = cleanedValue + '%';
            
            const newPosition = this.value.length - 1;
            this.setSelectionRange(newPosition, newPosition);
            
            calculateAndDisplayTotal();
            markAsChanged();
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => saveLocally(), 500);
        });
    });

    // === 챗봇 업데이트 ===
    
    // 챗봇 날짜 업데이트
    const chatbotDate = document.getElementById('chatbotDate');
    if (chatbotDate) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
        };
        chatbotDate.textContent = now.toLocaleDateString('ko-KR', options);
    }

    // === 페이지 로드 애니메이션 ===
    
    function initializeAnimations() {
        const elements = [
            { selector: '.checkbox-grid', delay: 100 },
            { selector: '.percent-grid', delay: 200 }
        ];

        elements.forEach(({ selector, delay }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    element.style.transition = 'all 0.5s ease';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, delay);
            }
        });
    }

    // === 초기화 실행 ===
    
    async function initialize() {
        console.log('🚀 퍼센트 설정 페이지 초기화 시작...');
        
        // 1. 애니메이션 시작
        initializeAnimations();
        
        // 2. API 연결 확인
        const apiConnected = await checkApiConnection();
        
        // 3. API 연결시 즉시 적용 버튼 추가
        if (apiConnected) {
            createApplyButton();
        }
        
        // 4. 설정 불러오기 (로컬 우선)
        if (!loadLocally()) {
            // 로컬에 저장된 설정이 없으면 초기값 사용
            resetToDefaults();
        }
        
        // 5. 초기 합계 계산
        calculateAndDisplayTotal();
        
        console.log('✅ 퍼센트 설정 페이지 초기화 완료');
        console.log('🔗 가중치 API 상태:', apiConnected ? '연결됨' : '연결 안됨');
        console.log('🎯 영향받는 엔드포인트: /performance/api/performance/, /attendance/attendance/, /performance/api/party_performance/');
    }

    // 페이지 로드 시 초기화 실행
    initialize();

    // === 전역 함수 노출 ===
    
    // 다른 페이지에서 사용할 수 있는 헬퍼 함수
    window.getPercentSettings = function() {
        return getCurrentSettings();
    };

    window.setPercentSettings = function(settings) {
        applySettings(settings);
        saveLocally();
    };

    // 🆕 가중치 업데이트 전역 함수
    window.updateWeightsAPI = function(settings) {
        return updateWeightsToAPI(settings || getCurrentSettings(), true);
    };

    // 개발자 도구용 디버그 함수
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugPercent = {
            getSettings: getCurrentSettings,
            setSettings: applySettings,
            reset: resetToDefaults,
            saveToServer: () => saveToServer(true),
            loadFromServer: () => loadFromServer(true),
            checkApi: checkApiConnection,
            // 🆕 가중치 API 디버그 함수들
            updateWeights: (settings) => updateWeightsToAPI(settings || getCurrentSettings(), true),
            convertApiFormat: convertToApiFormat,
            notifyPages: notifyOtherPages,
            state: appState,
            defaultValues: defaultValues,
            apiMapping: apiFieldMapping,
            testApiPayload: () => {
                const settings = getCurrentSettings();
                const apiFormat = convertToApiFormat(settings);
                console.log('현재 설정:', settings);
                console.log('API 페이로드:', apiFormat);
                return apiFormat;
            }
        };
        
        console.log('🔧 개발 모드: window.debugPercent 사용 가능');
        console.log('  - updateWeights(): 가중치 API 업데이트 테스트');
        console.log('  - convertApiFormat(settings): API 형식 변환 테스트');
        console.log('  - notifyPages(): 다른 페이지에 알림 전송');
        console.log('  - testApiPayload(): 현재 설정의 API 페이로드 확인');
        console.log('기본값:', defaultValues);
        console.log('API 필드 매핑:', apiFieldMapping);
    }
});