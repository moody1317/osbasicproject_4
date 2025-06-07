/**
 * percent.js - API 연동 가중치 설정 시스템
 * percent_mid.js 기반 + API 연동 기능 추가
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // === 📊 가중치 설정 구성 ===
    const WEIGHT_CONFIG = {
        // 기본 가중치 설정 (percent_mid.js와 동일)
        DEFAULT_WEIGHTS: {
            '간사': 3,
            '무효표 및 기권': 2,
            '본회의 가결': 40,
            '위원장': 5,
            '청원 소개': 8,
            '청원 결과': 23,
            '출석': 8,
            '투표 결과 일치': 7,
            '투표 결과 불일치': 4
        },

        // API 필드 매핑 (서버 API 형식에 맞춤)
        API_FIELD_MAPPING: {
            '간사': 'secretary_weight',
            '무효표 및 기권': 'invalid_vote_weight',
            '본회의 가결': 'plenary_pass_weight',
            '위원장': 'chairman_weight',
            '청원 소개': 'petition_intro_weight',
            '청원 결과': 'petition_result_weight',
            '출석': 'attendance_weight',
            '투표 결과 일치': 'vote_match_weight',
            '투표 결과 불일치': 'vote_mismatch_weight'
        },

        // 음수 필드 (감점 항목) - 이제 없음
        NEGATIVE_FIELDS: [],

        // 자동 저장 및 API 설정
        AUTO_SAVE_DELAY: 2000,
        API_APPLY_DELAY: 3000,
        MAX_RETRY_ATTEMPTS: 3,
        STORAGE_KEY: 'percent_settings',
        BACKUP_KEY: 'percent_backup_history'
    };

    // === 🔧 애플리케이션 상태 관리 ===
    let appState = {
        weights: {},
        apiConnected: false,
        isLoading: false,
        isSaving: false,
        isApplying: false,
        lastSaved: null,
        lastApplied: null,
        hasUnsavedChanges: false,
        autoSaveTimer: null,
        apiApplyTimer: null,
        retryCount: 0
    };

    // DOM 요소들
    const elements = {
        checkboxItems: document.querySelectorAll('.checkbox-item'),
        percentInputs: document.querySelectorAll('.percent-input'),
        checkboxInputs: document.querySelectorAll('.checkbox-input'),
        resetButton: document.getElementById('resetButton'),
        apiStatusBar: document.getElementById('apiStatusBar'),
        apiStatusIndicator: document.getElementById('apiStatusIndicator'),
        apiStatusText: document.getElementById('apiStatusText'),
        apiTestBtn: document.getElementById('apiTestBtn'),
        apiApplyBtn: document.getElementById('apiApplyBtn'),
        saveStatus: document.getElementById('saveStatus'),
        lastUpdated: document.getElementById('lastUpdated'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile')
    };

    // === 🚀 초기화 함수 ===
    async function initializeApp() {
        try {
            console.log('[Percent] 🚀 가중치 설정 시스템 초기화 시작...');
            
            showLoadingState(true);
            
            // API 서비스 연결 대기
            await waitForAPIService();
            
            // 저장된 설정 불러오기
            loadSavedSettings();
            
            // UI 초기화
            initializeUI();
            
            // 이벤트 리스너 설정
            setupEventListeners();
            
            // API 연결 상태 확인
            await checkAPIConnection();
            
            // 자동 저장 시스템 시작
            setupAutoSave();
            
            showLoadingState(false);
            
            console.log('[Percent] ✅ 초기화 완료');
            showNotification('가중치 설정 시스템이 준비되었습니다', 'success');
            
        } catch (error) {
            console.error('[Percent] ❌ 초기화 실패:', error);
            showLoadingState(false);
            showNotification('초기화에 실패했습니다: ' + error.message, 'error');
        }
    }

    // === 🔗 API 서비스 연결 대기 ===
    async function waitForAPIService() {
        return new Promise((resolve, reject) => {
            const maxWaitTime = 10000;
            let elapsed = 0;
            const checkInterval = 100;

            const checkAPI = () => {
                if (window.APIService && window.APIService._isReady) {
                    console.log('[Percent] ✅ API 서비스 연결됨');
                    resolve();
                } else if (elapsed >= maxWaitTime) {
                    console.warn('[Percent] ⚠️ API 서비스 연결 시간 초과 - 오프라인 모드로 진행');
                    resolve(); // API 없이도 로컬 기능은 동작
                } else {
                    elapsed += checkInterval;
                    setTimeout(checkAPI, checkInterval);
                }
            };

            checkAPI();
        });
    }

    // === 🔍 API 연결 상태 확인 ===
    async function checkAPIConnection() {
        try {
            console.log('[Percent] 🔍 API 연결 상태 확인...');
            
            updateAPIStatus('connecting', 'API 연결 확인 중...');
            
            if (window.APIService && window.APIService._isReady) {
                // API 테스트 (간단한 환경 정보 요청)
                const envInfo = window.APIService.getEnvironmentInfo();
                
                if (envInfo) {
                    appState.apiConnected = true;
                    updateAPIStatus('connected', `API 연결됨 (${envInfo.isVercel ? 'Vercel' : 'Local'})`);
                    console.log('[Percent] ✅ API 연결 성공');
                    return true;
                }
            }
            
            throw new Error('API 서비스를 사용할 수 없습니다');
            
        } catch (error) {
            console.warn('[Percent] ⚠️ API 연결 실패:', error.message);
            appState.apiConnected = false;
            updateAPIStatus('disconnected', 'API 연결 실패 - 오프라인 모드');
            return false;
        }
    }

    // === 📥 설정 저장/불러오기 ===
    function loadSavedSettings() {
        try {
            console.log('[Percent] 📥 저장된 설정 불러오기...');

            const savedData = localStorage.getItem(WEIGHT_CONFIG.STORAGE_KEY);
            
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log('[Percent] ✅ 저장된 설정 복원:', parsed);
                
                // 체크박스 상태 복원
                Object.keys(parsed).forEach(label => {
                    const data = parsed[label];
                    
                    // 체크박스 복원
                    elements.checkboxInputs.forEach(checkbox => {
                        const checkboxLabel = checkbox.closest('.checkbox-item')
                            .querySelector('.checkbox-label').textContent.trim();
                        if (checkboxLabel === label) {
                            checkbox.checked = data.enabled;
                        }
                    });
                    
                    // 입력값 복원
                    elements.percentInputs.forEach(input => {
                        if (input.dataset.item === label) {
                            input.value = data.value + '%';
                            input.disabled = !data.enabled;
                            updateInputStyle(input, data.enabled);
                        }
                    });
                });
                
                appState.lastSaved = new Date(parsed._timestamp || Date.now());
                
            } else {
                console.log('[Percent] 📋 저장된 설정 없음 - 기본값 사용');
                resetToDefaults();
            }
            
            calculateAndDisplayTotal();
            updateLastSavedDisplay();
            
        } catch (error) {
            console.error('[Percent] 설정 불러오기 실패:', error);
            resetToDefaults();
            showNotification('설정 불러오기에 실패하여 기본값을 사용합니다', 'warning');
        }
    }

    function saveSettings() {
        try {
            console.log('[Percent] 💾 설정 저장 중...');
            
            const settingsData = {};
            
            elements.percentInputs.forEach(input => {
                const label = input.dataset.item;
                const value = parseFloat(input.value.replace('%', '')) || 0;
                const isEnabled = !input.disabled;
                
                settingsData[label] = {
                    value: value,
                    enabled: isEnabled
                };
            });
            
            // 타임스탬프 추가
            settingsData._timestamp = Date.now();
            settingsData._version = '1.0';
            
            localStorage.setItem(WEIGHT_CONFIG.STORAGE_KEY, JSON.stringify(settingsData));
            
            appState.lastSaved = new Date();
            appState.hasUnsavedChanges = false;
            
            updateSaveStatus('saved', '💾 자동 저장됨');
            updateLastSavedDisplay();
            
            console.log('[Percent] ✅ 설정 저장 완료');
            
            // 백업 히스토리에 추가
            addToBackupHistory(settingsData);
            
            return true;
            
        } catch (error) {
            console.error('[Percent] 설정 저장 실패:', error);
            updateSaveStatus('error', '💥 저장 실패');
            throw error;
        }
    }

    // === 🚀 API 서버로 가중치 전송 (POST 방식) ===
    async function applyWeightsToAPI() {
        if (!appState.apiConnected) {
            showNotification('API가 연결되지 않았습니다', 'warning');
            return false;
        }

        try {
            console.log('[Percent] 🚀 서버로 가중치 POST 전송 시작...');
            
            appState.isApplying = true;
            updateAPIApplyButton(true);
            updateSaveStatus('saving', '🚀 서버 적용 중...');

            // 현재 활성화된 가중치 수집
            const activeWeights = {};
            let totalWeight = 0;
            
            elements.percentInputs.forEach(input => {
                const label = input.dataset.item;
                const apiField = WEIGHT_CONFIG.API_FIELD_MAPPING[label];
                
                if (!input.disabled && apiField) {
                    const value = parseFloat(input.value.replace('%', '')) || 0;
                    activeWeights[apiField] = value;
                    totalWeight += value; // 모두 양수이므로 그대로 합산
                }
            });

            console.log('[Percent] 📤 POST로 전송할 가중치:', activeWeights);
            console.log('[Percent] 📊 총 가중치:', totalWeight);

            // 🎯 명시적 POST 요청 구성
            const requestPayload = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(activeWeights)
            };

            console.log('[Percent] 📋 POST 요청 페이로드:', requestPayload);

            // API 서버로 POST 전송
            let result;
            if (window.APIService && typeof window.APIService.updateWeights === 'function') {
                // global_sync.js의 updateWeights 함수 사용 (이미 POST로 구현됨)
                result = await window.APIService.updateWeights(activeWeights);
                console.log('[Percent] ✅ APIService.updateWeights 사용 (POST)');
            } else {
                // 직접 POST 요청 (폴백)
                const apiUrl = 'https://osprojectapi.onrender.com/performance/api/update_weights/';
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(activeWeights)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                result = await response.json();
                console.log('[Percent] ✅ 직접 POST 요청 성공');
            }
            
            appState.lastApplied = new Date();
            appState.isApplying = false;
            
            updateAPIApplyButton(false);
            updateSaveStatus('saved', '✅ 서버 적용 완료 (POST)');
            
            console.log('[Percent] ✅ 서버 가중치 POST 업데이트 성공:', result);
            showNotification('가중치가 POST 방식으로 서버에 적용되었습니다! 🎉', 'success');
            
            // 🎯 다른 페이지들에게 변경 알림 (핵심!)
            notifyWeightChange(activeWeights, totalWeight);
            
            return true;

        } catch (error) {
            console.error('[Percent] ❌ 서버 가중치 POST 업데이트 실패:', error);
            
            appState.isApplying = false;
            updateAPIApplyButton(false);
            updateSaveStatus('error', '❌ POST 전송 실패');
            
            showNotification(`POST 전송 실패: ${error.message}`, 'error');
            
            // 실패해도 로컬 알림은 전송
            notifyWeightChange(activeWeights, 0, error.message);
            
            return false;
        }
    }

    // === 📢 가중치 변경 알림 시스템 ===
    function notifyWeightChange(weights, totalWeight, errorMessage = null) {
        try {
            console.log('[Percent] 📢 가중치 변경 알림 전송...');
            
            const eventData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'percent_page',
                weights: weights,
                totalWeight: totalWeight,
                affectedAPIs: Object.keys(WEIGHT_CONFIG.API_FIELD_MAPPING).length,
                activeCount: Object.keys(weights).length,
                success: !errorMessage,
                error: errorMessage
            };
            
            // 1. localStorage 이벤트
            localStorage.setItem('weight_change_event', JSON.stringify(eventData));
            setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
            
            // 2. 업데이트 타임스탬프
            localStorage.setItem('last_weight_update', Date.now().toString());
            
            // 3. BroadcastChannel
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const channel = new BroadcastChannel('weight_updates');
                    channel.postMessage(eventData);
                    channel.close();
                } catch (e) {
                    console.warn('[Percent] BroadcastChannel 실패:', e);
                }
            }
            
            // 4. 커스텀 이벤트
            document.dispatchEvent(new CustomEvent('weightSettingsChanged', {
                detail: eventData
            }));
            
            console.log('[Percent] ✅ 가중치 변경 알림 전송 완료');
            
        } catch (error) {
            console.error('[Percent] 가중치 변경 알림 실패:', error);
        }
    }

    // === 🎨 UI 관리 함수들 ===
    function initializeUI() {
        console.log('[Percent] 🎨 UI 초기화...');
        
        // 페이지 로드 애니메이션
        document.querySelector('.checkbox-grid')?.classList.add('fade-in');
        document.querySelector('.percent-grid')?.classList.add('fade-in');
        
        // 초기 상태 업데이트
        updateSaveStatus('saved', '💾 준비됨');
        calculateAndDisplayTotal();
        updateAPIApplyButton(false);
    }

    function updateAPIStatus(status, message) {
        if (!elements.apiStatusIndicator || !elements.apiStatusText) return;
        
        elements.apiStatusIndicator.className = `status-indicator ${status}`;
        elements.apiStatusText.textContent = message;
        
        // 연결 상태에 따라 적용 버튼 활성화
        if (elements.apiApplyBtn) {
            elements.apiApplyBtn.disabled = status !== 'connected' || appState.isApplying;
        }
    }

    function updateAPIApplyButton(isApplying) {
        if (!elements.apiApplyBtn) return;
        
        elements.apiApplyBtn.disabled = isApplying || !appState.apiConnected;
        elements.apiApplyBtn.textContent = isApplying ? '🔄 적용 중...' : '🚀 서버 적용';
    }

    function updateSaveStatus(status, message) {
        if (!elements.saveStatus) return;
        
        elements.saveStatus.className = `save-status ${status}`;
        elements.saveStatus.textContent = message;
    }

    function updateLastSavedDisplay() {
        if (!elements.lastUpdated || !appState.lastSaved) return;
        
        const timeString = appState.lastSaved.toLocaleTimeString('ko-KR');
        elements.lastUpdated.textContent = `마지막 저장: ${timeString}`;
    }

    function showLoadingState(isLoading) {
        document.body.style.opacity = isLoading ? '0.7' : '1';
        document.body.style.pointerEvents = isLoading ? 'none' : 'auto';
    }

    // === 📋 percent_mid.js 핵심 기능들 ===
    
    // 숫자 값 정리 함수 (percent_mid.js와 동일)
    function cleanNumericValue(value, isNegativeField = false) {
        let cleanValue = value.replace('%', '').trim();
        cleanValue = cleanValue.replace(/[^\d.-]/g, '');
        
        if (cleanValue === '' || cleanValue === '-') {
            return '0';
        }
        
        if (isNegativeField) {
            cleanValue = cleanValue.replace(/-/g, '');
            if (cleanValue !== '0' && cleanValue !== '') {
                cleanValue = '-' + cleanValue;
            }
        }
        
        if (cleanValue.length > 1) {
            if (cleanValue.startsWith('0') && cleanValue[1] !== '.') {
                cleanValue = cleanValue.replace(/^0+/, '') || '0';
            } else if (cleanValue.startsWith('-0') && cleanValue.length > 2 && cleanValue[2] !== '.') {
                cleanValue = '-' + cleanValue.substring(2).replace(/^0+/, '') || '-0';
            }
        }
        
        return cleanValue;
    }

    // 체크박스 상태에 따라 입력 필드 업데이트
    function updatePercentField(itemName, isChecked) {
        elements.percentInputs.forEach(input => {
            if (input.dataset.item === itemName) {
                input.disabled = !isChecked;
                updateInputStyle(input, isChecked);
                
                if (!isChecked) {
                    input.value = '0%';
                }
            }
        });
        
        calculateAndDisplayTotal();
        scheduleAutoSave();
    }

    function updateInputStyle(input, isEnabled) {
        if (isEnabled) {
            input.style.opacity = '1';
            input.style.backgroundColor = '#f9f9f9';
            input.style.cursor = 'text';
        } else {
            input.style.opacity = '0.3';
            input.style.backgroundColor = '#e0e0e0';
            input.style.cursor = 'not-allowed';
        }
    }

    // 전체 퍼센트 합계 계산 및 표시
    function calculateAndDisplayTotal() {
        let total = 0;
        let activeCount = 0;

        elements.percentInputs.forEach(input => {
            if (!input.disabled) {
                const value = parseFloat(input.value.replace('%', '')) || 0;
                total += value;
                activeCount++;
            }
        });

        console.log(`[Percent] 활성화된 항목: ${activeCount}개, 총합: ${total.toFixed(1)}%`);

        // 합계 표시 UI 업데이트
        let totalDisplay = document.querySelector('.total-display');
        if (!totalDisplay) {
            totalDisplay = document.createElement('div');
            totalDisplay.className = 'total-display';
            document.querySelector('.percent-grid').after(totalDisplay);
        }
        
        const isValid = Math.abs(total - 100) < 0.1; // 100%에 가까운지 확인
        totalDisplay.className = `total-display ${isValid ? 'valid' : 'invalid'}`;
        
        totalDisplay.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>활성 항목: ${activeCount}개</span>
                <span>총합: <strong style="color: ${isValid ? '#10b981' : '#ef4444'}">${total.toFixed(1)}%</strong></span>
                ${isValid ? '<span style="color: #10b981;">✓ 완료</span>' : '<span style="color: #ef4444;">⚠ 조정 필요</span>'}
            </div>
        `;
    }

    // 초기화 함수
    function resetToDefaults() {
        if (!confirm('모든 값을 초기값으로 되돌리시겠습니까?')) {
            return;
        }

        try {
            console.log('[Percent] 🔄 기본값으로 초기화...');

            // 모든 체크박스 체크
            elements.checkboxInputs.forEach(checkbox => {
                checkbox.checked = true;
            });

            // 모든 입력 필드 초기값 설정
            elements.percentInputs.forEach(input => {
                const label = input.dataset.item;
                const defaultValue = WEIGHT_CONFIG.DEFAULT_WEIGHTS[label];
                
                if (defaultValue !== undefined) {
                    input.value = defaultValue + '%';
                    input.disabled = false;
                    updateInputStyle(input, true);
                }
            });

            calculateAndDisplayTotal();
            scheduleAutoSave();
            
            showNotification('기본값으로 초기화되었습니다', 'info');
            console.log('[Percent] ✅ 기본값 초기화 완료');
            
        } catch (error) {
            console.error('[Percent] 기본값 초기화 실패:', error);
            showNotification('초기화에 실패했습니다', 'error');
        }
    }

    // === 🎮 이벤트 리스너 설정 ===
    function setupEventListeners() {
        console.log('[Percent] 🎮 이벤트 리스너 설정...');

        // 체크박스 이벤트
        elements.checkboxInputs.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const itemName = this.dataset.item;
                updatePercentField(itemName, this.checked);
            });
        });

        // 퍼센트 입력 필드 이벤트 (percent_mid.js 방식)
        elements.percentInputs.forEach(input => {
            setupPercentInputEvents(input);
        });

        // 초기화 버튼
        if (elements.resetButton) {
            elements.resetButton.addEventListener('click', resetToDefaults);
        }

        // API 테스트 버튼
        if (elements.apiTestBtn) {
            elements.apiTestBtn.addEventListener('click', checkAPIConnection);
        }

        // API 적용 버튼
        if (elements.apiApplyBtn) {
            elements.apiApplyBtn.addEventListener('click', applyWeightsToAPI);
        }

        // 백업/복원 버튼들
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', exportSettings);
        }
        
        if (elements.importBtn) {
            elements.importBtn.addEventListener('click', () => elements.importFile?.click());
        }
        
        if (elements.importFile) {
            elements.importFile.addEventListener('change', importSettings);
        }

        // 페이지 언로드 시 저장
        window.addEventListener('beforeunload', function(event) {
            if (appState.hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = '저장되지 않은 변경사항이 있습니다.';
            }
        });
    }

    // 퍼센트 입력 필드 상세 이벤트 설정 (percent_mid.js 기반)
    function setupPercentInputEvents(input) {
        const label = input.dataset.item;
        const isNegativeField = WEIGHT_CONFIG.NEGATIVE_FIELDS.includes(label);

        // 실시간 입력 처리
        input.addEventListener('input', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }

            const cursorPosition = this.selectionStart;
            const cleanedValue = cleanNumericValue(this.value, isNegativeField);
            
            this.value = cleanedValue + '%';
            
            const newCursorPosition = Math.min(cursorPosition, this.value.length - 1);
            this.setSelectionRange(newCursorPosition, newCursorPosition);
            
            calculateAndDisplayTotal();
            scheduleAutoSave();
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
                        scheduleAutoSave();
                    }
                }
            }
            
            if (e.key === 'ArrowRight' && cursorPosition >= valueLength - 1) {
                e.preventDefault();
            }
        });

        // 클릭 및 포커스 이벤트
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

        // 블러 이벤트
        input.addEventListener('blur', function() {
            if (this.disabled) return;
            
            let cleanedValue = cleanNumericValue(this.value, isNegativeField);
            
            if (cleanedValue === '') {
                cleanedValue = '0';
            }
            
            this.value = cleanedValue + '%';
            
            calculateAndDisplayTotal();
            scheduleAutoSave();
        });

        // 붙여넣기 이벤트
        input.addEventListener('paste', function(e) {
            if (this.disabled) {
                e.preventDefault();
                return;
            }
            
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const cleanedValue = cleanNumericValue(pastedText, isNegativeField);
            
            this.value = cleanedValue + '%';
            
            const newPosition = this.value.length - 1;
            this.setSelectionRange(newPosition, newPosition);
            
            calculateAndDisplayTotal();
            scheduleAutoSave();
        });
    }

    // === 🔄 자동 저장 시스템 ===
    function setupAutoSave() {
        console.log('[Percent] 🔄 자동 저장 시스템 시작...');
    }

    function scheduleAutoSave() {
        appState.hasUnsavedChanges = true;
        updateSaveStatus('saving', '💾 저장 중...');
        
        clearTimeout(appState.autoSaveTimer);
        appState.autoSaveTimer = setTimeout(() => {
            try {
                saveSettings();
                
                // API가 연결되어 있으면 자동으로 서버에도 적용
                if (appState.apiConnected && !appState.isApplying) {
                    clearTimeout(appState.apiApplyTimer);
                    appState.apiApplyTimer = setTimeout(() => {
                        applyWeightsToAPI();
                    }, WEIGHT_CONFIG.API_APPLY_DELAY);
                }
                
            } catch (error) {
                console.error('[Percent] 자동 저장 실패:', error);
                updateSaveStatus('error', '💥 저장 실패');
            }
        }, WEIGHT_CONFIG.AUTO_SAVE_DELAY);
    }

    // === 📦 백업 및 복원 기능 ===
    function exportSettings() {
        try {
            const settingsData = {
                weights: {},
                metadata: {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    source: 'percent_page'
                }
            };
            
            elements.percentInputs.forEach(input => {
                const label = input.dataset.item;
                settingsData.weights[label] = {
                    value: parseFloat(input.value.replace('%', '')) || 0,
                    enabled: !input.disabled
                };
            });
            
            const dataStr = JSON.stringify(settingsData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `percent_settings_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('설정이 내보내기되었습니다', 'success');
            
        } catch (error) {
            console.error('[Percent] 설정 내보내기 실패:', error);
            showNotification('내보내기에 실패했습니다', 'error');
        }
    }

    function importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!importedData.weights) {
                    throw new Error('유효하지 않은 설정 파일입니다');
                }
                
                // 설정 적용
                Object.entries(importedData.weights).forEach(([label, data]) => {
                    // 체크박스 업데이트
                    elements.checkboxInputs.forEach(checkbox => {
                        if (checkbox.dataset.item === label) {
                            checkbox.checked = data.enabled;
                        }
                    });
                    
                    // 입력값 업데이트
                    elements.percentInputs.forEach(input => {
                        if (input.dataset.item === label) {
                            input.value = data.value + '%';
                            input.disabled = !data.enabled;
                            updateInputStyle(input, data.enabled);
                        }
                    });
                });
                
                calculateAndDisplayTotal();
                scheduleAutoSave();
                
                showNotification('설정이 가져오기되었습니다', 'success');
                
            } catch (error) {
                console.error('[Percent] 설정 가져오기 실패:', error);
                showNotification('가져오기에 실패했습니다: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // 같은 파일 재선택 가능하도록
    }

    function addToBackupHistory(settingsData) {
        try {
            const history = JSON.parse(localStorage.getItem(WEIGHT_CONFIG.BACKUP_KEY) || '[]');
            
            history.unshift({
                ...settingsData,
                _backupDate: new Date().toISOString()
            });
            
            // 최대 10개까지만 보관
            if (history.length > 10) {
                history.splice(10);
            }
            
            localStorage.setItem(WEIGHT_CONFIG.BACKUP_KEY, JSON.stringify(history));
            
        } catch (error) {
            console.warn('[Percent] 백업 히스토리 저장 실패:', error);
        }
    }

    // === 🔔 알림 시스템 ===
    function showNotification(message, type = 'info', duration = 4000) {
        try {
            if (window.APIService?.showNotification) {
                window.APIService.showNotification(message, type, duration);
            } else {
                // 폴백 알림
                console.log(`[Percent 알림 - ${type.toUpperCase()}] ${message}`);
                
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
                    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
                    color: white; border-radius: 8px; z-index: 10000; font-size: 13px;
                    max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-family: 'Blinker', sans-serif; opacity: 0; transform: translateX(100%);
                    transition: all 0.3s ease;
                `;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.opacity = '1';
                    notification.style.transform = 'translateX(0)';
                }, 10);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateX(100%)';
                        setTimeout(() => notification.remove(), 300);
                    }
                }, duration);
            }
        } catch (error) {
            console.log(`[Percent 알림 오류] ${message} (${type})`);
        }
    }

    // === 🛠️ 개발자 도구 (디버그 모드) ===
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugPercent = {
            state: appState,
            config: WEIGHT_CONFIG,
            
            getWeights: () => {
                const weights = {};
                elements.percentInputs.forEach(input => {
                    weights[input.dataset.item] = {
                        value: parseFloat(input.value.replace('%', '')) || 0,
                        enabled: !input.disabled
                    };
                });
                return weights;
            },
            
            setWeight: (item, value, enabled = true) => {
                const input = Array.from(elements.percentInputs).find(i => i.dataset.item === item);
                const checkbox = Array.from(elements.checkboxInputs).find(c => c.dataset.item === item);
                
                if (input) {
                    input.value = value + '%';
                    input.disabled = !enabled;
                    updateInputStyle(input, enabled);
                }
                
                if (checkbox) {
                    checkbox.checked = enabled;
                }
                
                calculateAndDisplayTotal();
                scheduleAutoSave();
            },
            
            testAPI: checkAPIConnection,
            applyWeights: applyWeightsToAPI,
            saveSettings: saveSettings,
            reset: resetToDefaults,
            
            simulateNotification: (message, type) => showNotification(message, type),
            
            help: () => {
                console.log('[Percent] 🔧 개발자 도구:');
                console.log('  - getWeights(): 현재 가중치 반환');
                console.log('  - setWeight(item, value, enabled): 가중치 설정');
                console.log('  - testAPI(): API 연결 테스트');
                console.log('  - applyWeights(): 서버 적용');
                console.log('  - saveSettings(): 로컬 저장');
                console.log('  - reset(): 기본값 초기화');
                console.log('  - simulateNotification(message, type): 알림 테스트');
            }
        };
        
        console.log('[Percent] 🔧 개발자 도구: window.debugPercent.help()');
    }

    // === 🌐 전역 함수 등록 ===
    window.PercentSystem = {
        init: initializeApp,
        save: saveSettings,
        apply: applyWeightsToAPI,
        reset: resetToDefaults,
        checkAPI: checkAPIConnection,
        version: '2.0.0'
    };

    // === 🚀 앱 시작 ===
    initializeApp();

    console.log('[Percent] ✅ percent.js 로드 완료 (API 연동 버전)');
});
