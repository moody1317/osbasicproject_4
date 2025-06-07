/**
 * percent.js - 완전한 가중치 설정 시스템
 * 가중치 변경 감지 및 자동 적용 시스템과 통합
 */

(function() {
    'use strict';

    // === 📊 가중치 설정 구성 ===
    const WEIGHT_CONFIG = {
        // 기본 가중치 설정
        DEFAULT_WEIGHTS: {
            attendance: { value: 30, enabled: true, min: 0, max: 100, label: '출석률' },
            bills: { value: 25, enabled: true, min: 0, max: 100, label: '입법 활동' },
            questions: { value: 20, enabled: true, min: 0, max: 100, label: '국정감사 질의' },
            petitions: { value: 15, enabled: true, min: 0, max: 100, label: '청원 참여' },
            committees: { value: 10, enabled: true, min: 0, max: 100, label: '위원회 활동' }
        },

        // 가중치 영향 받는 API 엔드포인트
        AFFECTED_APIS: [
            '/performance/api/performance/',
            '/attendance/attendance/',
            '/performance/api/party_performance/',
            '/performance/api/performance/by-party/',
            '/ranking/members/',
            '/ranking/parties/score/',
            '/ranking/parties/stats/',
            '/api/chatbot/',
            '/compare_members/',
            '/compare_parties/'
        ],

        // 설정 제약사항
        CONSTRAINTS: {
            MIN_TOTAL: 1,
            MAX_TOTAL: 100,
            MIN_ENABLED: 1,
            AUTO_SAVE_DELAY: 1000,
            MAX_HISTORY: 10
        }
    };

    // === 🔧 애플리케이션 상태 관리 ===
    let appState = {
        weights: {},
        hasUnsavedChanges: false,
        lastSaved: null,
        isLoading: false,
        isSaving: false,
        autoSaveEnabled: true,
        history: [],
        currentHistoryIndex: -1,
        initialized: false
    };

    // === 🎯 초기화 함수 ===
    async function initializePercentSystem() {
        if (appState.initialized) {
            console.log('[Percent] 이미 초기화되었습니다.');
            return;
        }

        try {
            console.log('[Percent] 🚀 가중치 설정 시스템 초기화 시작...');
            
            appState.isLoading = true;
            updateLoadingState(true);

            // API 서비스 연결 대기
            await waitForAPIService();
            
            // 저장된 설정 불러오기
            await loadSavedSettings();
            
            // UI 초기화
            initializeUI();
            
            // 이벤트 리스너 설정
            setupEventListeners();
            
            // 실시간 모니터 생성
            createWeightApplicationMonitor();
            
            // 자동 저장 설정
            setupAutoSave();
            
            appState.initialized = true;
            appState.isLoading = false;
            updateLoadingState(false);
            
            console.log('[Percent] ✅ 가중치 설정 시스템 초기화 완료');
            
            // 초기화 완료 알림
            showNotification('가중치 설정 시스템이 준비되었습니다', 'success');
            
        } catch (error) {
            console.error('[Percent] ❌ 초기화 실패:', error);
            appState.isLoading = false;
            updateLoadingState(false);
            showNotification('초기화에 실패했습니다: ' + error.message, 'error');
        }
    }

    // === 🔗 API 서비스 연결 대기 ===
    async function waitForAPIService() {
        return new Promise((resolve, reject) => {
            const checkInterval = 100;
            const maxWaitTime = 10000; // 10초
            let elapsed = 0;

            const checkAPI = () => {
                if (window.APIService && window.APIService._isReady) {
                    console.log('[Percent] ✅ API 서비스 연결됨');
                    resolve();
                } else if (elapsed >= maxWaitTime) {
                    reject(new Error('API 서비스 연결 시간 초과'));
                } else {
                    elapsed += checkInterval;
                    setTimeout(checkAPI, checkInterval);
                }
            };

            checkAPI();
        });
    }

    // === 💾 설정 저장/불러오기 ===
    async function loadSavedSettings() {
        try {
            console.log('[Percent] 📥 저장된 설정 불러오기...');

            // localStorage에서 설정 불러오기
            const savedWeights = localStorage.getItem('weight_settings');
            const savedHistory = localStorage.getItem('weight_history');
            
            if (savedWeights) {
                const parsedWeights = JSON.parse(savedWeights);
                appState.weights = { ...WEIGHT_CONFIG.DEFAULT_WEIGHTS, ...parsedWeights };
                console.log('[Percent] ✅ 저장된 가중치 설정 복원');
            } else {
                appState.weights = { ...WEIGHT_CONFIG.DEFAULT_WEIGHTS };
                console.log('[Percent] 📋 기본 가중치 설정 사용');
            }

            // 히스토리 복원
            if (savedHistory) {
                appState.history = JSON.parse(savedHistory);
            }

            // 설정 유효성 검사
            validateWeights();
            
        } catch (error) {
            console.error('[Percent] 설정 불러오기 실패:', error);
            appState.weights = { ...WEIGHT_CONFIG.DEFAULT_WEIGHTS };
            showNotification('설정 불러오기에 실패하여 기본값을 사용합니다', 'warning');
        }
    }

    async function saveSettings() {
        try {
            console.log('[Percent] 💾 설정 저장 중...');
            appState.isSaving = true;
            updateSaveStatus('저장 중...');

            // localStorage에 저장
            localStorage.setItem('weight_settings', JSON.stringify(appState.weights));
            localStorage.setItem('weight_history', JSON.stringify(appState.history));
            
            // 히스토리에 추가
            addToHistory();
            
            appState.lastSaved = new Date();
            appState.hasUnsavedChanges = false;
            appState.isSaving = false;
            
            updateSaveStatus('저장 완료');
            console.log('[Percent] ✅ 설정 저장 완료');
            
            return true;
            
        } catch (error) {
            console.error('[Percent] 설정 저장 실패:', error);
            appState.isSaving = false;
            updateSaveStatus('저장 실패');
            throw error;
        }
    }

    // === 🎯 가중치 관리 함수들 ===
    function getCurrentSettings() {
        return { ...appState.weights };
    }

    function updateWeight(key, field, value) {
        try {
            if (!appState.weights[key]) {
                throw new Error(`존재하지 않는 가중치 키: ${key}`);
            }

            const oldValue = appState.weights[key][field];
            appState.weights[key][field] = value;
            
            // 유효성 검사
            if (!validateWeights()) {
                // 유효하지 않으면 되돌리기
                appState.weights[key][field] = oldValue;
                return false;
            }

            appState.hasUnsavedChanges = true;
            updateUI();
            
            console.log(`[Percent] 가중치 업데이트: ${key}.${field} = ${value}`);
            
            return true;
            
        } catch (error) {
            console.error('[Percent] 가중치 업데이트 실패:', error);
            showNotification('가중치 업데이트에 실패했습니다: ' + error.message, 'error');
            return false;
        }
    }

    function validateWeights() {
        try {
            const enabledWeights = Object.values(appState.weights).filter(w => w.enabled);
            
            // 최소 하나의 가중치는 활성화되어야 함
            if (enabledWeights.length < WEIGHT_CONFIG.CONSTRAINTS.MIN_ENABLED) {
                throw new Error('최소 하나의 가중치는 활성화되어야 합니다');
            }

            // 총합 검사
            const total = enabledWeights.reduce((sum, w) => sum + w.value, 0);
            if (total < WEIGHT_CONFIG.CONSTRAINTS.MIN_TOTAL || total > WEIGHT_CONFIG.CONSTRAINTS.MAX_TOTAL) {
                throw new Error(`가중치 총합이 유효하지 않습니다: ${total} (${WEIGHT_CONFIG.CONSTRAINTS.MIN_TOTAL}-${WEIGHT_CONFIG.CONSTRAINTS.MAX_TOTAL})`);
            }

            // 개별 값 검사
            for (const [key, weight] of Object.entries(appState.weights)) {
                if (weight.value < weight.min || weight.value > weight.max) {
                    throw new Error(`${weight.label} 값이 범위를 벗어났습니다: ${weight.value} (${weight.min}-${weight.max})`);
                }
            }

            return true;
            
        } catch (error) {
            console.error('[Percent] 가중치 유효성 검사 실패:', error);
            showNotification(error.message, 'error');
            return false;
        }
    }

    function resetToDefaults() {
        try {
            if (confirm('모든 가중치를 기본값으로 초기화하시겠습니까?')) {
                appState.weights = { ...WEIGHT_CONFIG.DEFAULT_WEIGHTS };
                appState.hasUnsavedChanges = true;
                updateUI();
                showNotification('가중치가 기본값으로 초기화되었습니다', 'info');
                console.log('[Percent] ✅ 가중치 기본값 복원');
            }
        } catch (error) {
            console.error('[Percent] 기본값 복원 실패:', error);
            showNotification('기본값 복원에 실패했습니다', 'error');
        }
    }

    // === 📤 서버로 가중치 전송 ===
    async function updateWeightsToAPI(weights, showUserNotification = true) {
        try {
            console.log('[Percent] 🚀 서버로 가중치 전송 시작...');
            appState.isSaving = true;
            updateSaveStatus('서버 업데이트 중...');

            // API 형식으로 변환 (실제 API 구조에 맞춤)
            const apiWeights = {};
            let totalWeight = 0;
            
            for (const [key, weight] of Object.entries(weights)) {
                if (weight.enabled) {
                    apiWeights[key] = weight.value;
                    totalWeight += weight.value;
                }
            }

            console.log('[Percent] 📤 API로 전송할 가중치:', apiWeights);
            console.log('[Percent] 📊 총 가중치:', totalWeight);

            // API 서버로 전송 (global_sync.js의 updateWeights 함수 사용)
            if (window.APIService && typeof window.APIService.updateWeights === 'function') {
                const result = await window.APIService.updateWeights(apiWeights);
                console.log('[Percent] ✅ 서버 가중치 업데이트 성공:', result);
            } else {
                // API 서비스가 없는 경우 시뮬레이션
                console.log('[Percent] ⚠️ API 서비스 없음 - 가중치 변경 시뮬레이션');
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 딜레이
            }

            // 상태 업데이트
            appState.lastSaved = new Date();
            appState.hasUnsavedChanges = false;
            appState.isSaving = false;
            updateSaveStatus('서버 업데이트 완료');

            // 사용자 알림
            if (showUserNotification) {
                showNotification('가중치가 서버에 적용되었습니다', 'success');
            }

            // 🎯 다른 페이지들에게 변경 알림 (핵심!)
            notifyOtherPages();

            return true;

        } catch (error) {
            console.error('[Percent] ❌ 서버 가중치 업데이트 실패:', error);
            appState.isSaving = false;
            updateSaveStatus('서버 업데이트 실패');
            
            if (showUserNotification) {
                showNotification(`서버 업데이트 실패: ${error.message}`, 'error');
            }
            
            // 실패해도 다른 페이지에는 알림 (클라이언트 사이드 업데이트)
            notifyOtherPages();
            
            return false;
        }
    }

    // === 📢 다른 페이지 알림 시스템 ===
    function notifyOtherPages() {
        try {
            console.log('[Percent] 📢 다른 페이지들에게 가중치 변경 알림 전송 시작...');
            
            // 현재 설정 정보 수집
            const currentSettings = getCurrentSettings();
            const currentTime = Date.now().toString();
            
            // 가중치 변경 이벤트 데이터 구성
            const weightChangeEvent = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'percent_page',
                settings: currentSettings,
                affectedAPIs: WEIGHT_CONFIG.AFFECTED_APIS,
                changeCount: Object.keys(currentSettings).length,
                activeCount: Object.values(currentSettings).filter(s => s.enabled).length
            };
            
            // 1. localStorage 이벤트 발생 (주요 통신 방법)
            localStorage.setItem('weight_change_event', JSON.stringify(weightChangeEvent));
            setTimeout(() => localStorage.removeItem('weight_change_event'), 100);
            
            // 2. 업데이트 타임스탬프 저장 (주기적 체크용)
            localStorage.setItem('last_weight_update', currentTime);
            
            // 3. BroadcastChannel (최신 브라우저 지원)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const channel = new BroadcastChannel('weight_updates');
                    channel.postMessage(weightChangeEvent);
                    channel.close();
                    console.log('[Percent] 📡 BroadcastChannel로 알림 전송 완료');
                } catch (e) {
                    console.warn('[Percent] BroadcastChannel 전송 실패:', e);
                }
            }
            
            // 4. 커스텀 이벤트 (같은 페이지 내)
            const customEvent = new CustomEvent('weightSettingsChanged', {
                detail: weightChangeEvent
            });
            document.dispatchEvent(customEvent);
            
            // 5. 세션 스토리지 백업
            try {
                sessionStorage.setItem('latest_weight_settings', JSON.stringify({
                    settings: currentSettings,
                    timestamp: currentTime,
                    source: 'percent_page'
                }));
            } catch (e) {
                console.warn('[Percent] 세션 스토리지 저장 실패:', e);
            }
            
            console.log('[Percent] ✅ 가중치 변경 알림 전송 완료');
            console.log(`[Percent] 📊 영향받는 API: ${weightChangeEvent.affectedAPIs.length}개`);
            console.log(`[Percent] ⚙️ 활성 설정: ${weightChangeEvent.activeCount}/${weightChangeEvent.changeCount}개`);
            
            // 6. 사용자 알림
            showNotification(
                `가중치 변경이 ${weightChangeEvent.affectedAPIs.length}개 API에 적용됩니다`, 
                'info', 
                3000
            );
            
            // 7. 새로고침 상태 모니터링 시작
            monitorPageRefreshStatus();
            
        } catch (error) {
            console.error('[Percent] ❌ 가중치 변경 알림 전송 실패:', error);
            
            // 폴백: 최소한의 알림
            try {
                localStorage.setItem('last_weight_update', Date.now().toString());
                console.log('[Percent] 📢 폴백 알림 전송 완료');
            } catch (fallbackError) {
                console.error('[Percent] 폴백 알림마저 실패:', fallbackError);
            }
        }
    }

    // === 👀 페이지 새로고침 모니터링 ===
    function monitorPageRefreshStatus() {
        const startTime = Date.now();
        let refreshedPages = 0;
        let monitoringActive = true;
        
        console.log('[Percent] 👀 다른 페이지들의 새로고침 상태 모니터링 시작...');
        
        // 새로고침 응답 대기
        const refreshResponseListener = function(event) {
            if (!monitoringActive) return;
            
            if (event.key === 'weight_refresh_response') {
                try {
                    const response = JSON.parse(event.newValue);
                    refreshedPages++;
                    
                    console.log(`[Percent] 📱 페이지 새로고침 응답: ${response.page} (${refreshedPages}번째)`);
                    
                    showNotification(
                        `${response.page} 페이지가 새로고침되었습니다`, 
                        'success', 
                        2000
                    );
                    
                    // 실시간 모니터 업데이트
                    updateApplicationMonitor(response.page, refreshedPages);
                    
                } catch (e) {
                    console.warn('[Percent] 새로고침 응답 파싱 실패:', e);
                }
            }
        };
        
        window.addEventListener('storage', refreshResponseListener);
        
        // 10초 후 모니터링 종료
        setTimeout(() => {
            monitoringActive = false;
            window.removeEventListener('storage', refreshResponseListener);
            
            if (refreshedPages > 0) {
                console.log(`[Percent] ✅ 총 ${refreshedPages}개 페이지가 새로고침되었습니다`);
                
                showNotification(
                    `가중치 적용 완료: ${refreshedPages}개 페이지 업데이트됨`, 
                    'success', 
                    4000
                );
                
                // 최종 모니터 업데이트
                finalizeApplicationMonitor(refreshedPages);
            } else {
                console.log('[Percent] ⚠️ 다른 페이지에서 새로고침 응답이 없습니다');
                
                showNotification(
                    '다른 페이지가 열려있지 않거나 응답이 없습니다', 
                    'warning', 
                    3000
                );
            }
        }, 10000);
    }

    // === 🎨 UI 관리 함수들 ===
    function initializeUI() {
        try {
            console.log('[Percent] 🎨 UI 초기화...');
            
            // 가중치 입력 필드들 생성
            createWeightControls();
            
            // 버튼들 이벤트 설정
            setupButtons();
            
            // 상태 표시 영역 생성
            createStatusArea();
            
            // 초기 UI 업데이트
            updateUI();
            
            console.log('[Percent] ✅ UI 초기화 완료');
            
        } catch (error) {
            console.error('[Percent] UI 초기화 실패:', error);
        }
    }

    function createWeightControls() {
        const container = document.getElementById('weightControls') || createWeightControlsContainer();
        
        container.innerHTML = '';
        
        Object.entries(appState.weights).forEach(([key, weight]) => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'weight-control-group';
            controlGroup.innerHTML = `
                <div class="weight-header">
                    <label class="weight-label">
                        <input type="checkbox" id="enable_${key}" ${weight.enabled ? 'checked' : ''}>
                        <span class="weight-title">${weight.label}</span>
                    </label>
                    <span class="weight-percentage">${weight.value}%</span>
                </div>
                <div class="weight-input-container">
                    <input type="range" id="slider_${key}" min="${weight.min}" max="${weight.max}" 
                           value="${weight.value}" class="weight-slider" ${!weight.enabled ? 'disabled' : ''}>
                    <input type="number" id="number_${key}" min="${weight.min}" max="${weight.max}" 
                           value="${weight.value}" class="weight-number" ${!weight.enabled ? 'disabled' : ''}>
                </div>
            `;
            
            container.appendChild(controlGroup);
        });
    }

    function createWeightControlsContainer() {
        const container = document.createElement('div');
        container.id = 'weightControls';
        container.className = 'weight-controls-container';
        
        // 적절한 위치에 추가 (또는 지정된 부모 요소에)
        const targetElement = document.getElementById('main-content') || document.body;
        targetElement.appendChild(container);
        
        return container;
    }

    function setupButtons() {
        // 저장 버튼
        const saveBtn = document.getElementById('saveBtn') || createButton('saveBtn', '💾 저장');
        saveBtn.addEventListener('click', handleSave);
        
        // 서버 적용 버튼
        const applyBtn = document.getElementById('applyBtn') || createButton('applyBtn', '🚀 서버 적용');
        applyBtn.addEventListener('click', handleApplyToServer);
        
        // 초기화 버튼
        const resetBtn = document.getElementById('resetBtn') || createButton('resetBtn', '🔄 초기화');
        resetBtn.addEventListener('click', resetToDefaults);
        
        // 히스토리 버튼들
        const undoBtn = document.getElementById('undoBtn') || createButton('undoBtn', '↶ 되돌리기');
        undoBtn.addEventListener('click', handleUndo);
        
        const redoBtn = document.getElementById('redoBtn') || createButton('redoBtn', '↷ 다시하기');
        redoBtn.addEventListener('click', handleRedo);
    }

    function createButton(id, text) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.className = 'control-button';
        
        const buttonContainer = document.getElementById('buttonContainer') || createButtonContainer();
        buttonContainer.appendChild(button);
        
        return button;
    }

    function createButtonContainer() {
        const container = document.createElement('div');
        container.id = 'buttonContainer';
        container.className = 'button-container';
        
        const targetElement = document.getElementById('main-content') || document.body;
        targetElement.appendChild(container);
        
        return container;
    }

    function createStatusArea() {
        const statusArea = document.createElement('div');
        statusArea.id = 'statusArea';
        statusArea.className = 'status-area';
        statusArea.innerHTML = `
            <div id="saveStatus" class="save-status">준비</div>
            <div id="lastSaved" class="last-saved"></div>
            <div id="totalWeight" class="total-weight"></div>
            <div id="enabledCount" class="enabled-count"></div>
        `;
        
        const targetElement = document.getElementById('main-content') || document.body;
        targetElement.appendChild(statusArea);
    }

    function updateUI() {
        try {
            // 입력 필드들 업데이트
            Object.entries(appState.weights).forEach(([key, weight]) => {
                const checkbox = document.getElementById(`enable_${key}`);
                const slider = document.getElementById(`slider_${key}`);
                const number = document.getElementById(`number_${key}`);
                const percentage = document.querySelector(`#weightControls .weight-control-group:nth-child(${Object.keys(appState.weights).indexOf(key) + 1}) .weight-percentage`);
                
                if (checkbox) checkbox.checked = weight.enabled;
                if (slider) {
                    slider.value = weight.value;
                    slider.disabled = !weight.enabled;
                }
                if (number) {
                    number.value = weight.value;
                    number.disabled = !weight.enabled;
                }
                if (percentage) percentage.textContent = `${weight.value}%`;
            });
            
            // 상태 정보 업데이트
            updateStatusDisplay();
            
            // 버튼 상태 업데이트
            updateButtonStates();
            
        } catch (error) {
            console.error('[Percent] UI 업데이트 실패:', error);
        }
    }

    function updateStatusDisplay() {
        try {
            const enabledWeights = Object.values(appState.weights).filter(w => w.enabled);
            const totalWeight = enabledWeights.reduce((sum, w) => sum + w.value, 0);
            
            // 총 가중치 표시
            const totalElement = document.getElementById('totalWeight');
            if (totalElement) {
                totalElement.textContent = `총 가중치: ${totalWeight}%`;
                totalElement.className = `total-weight ${totalWeight === 100 ? 'valid' : 'invalid'}`;
            }
            
            // 활성화된 항목 수 표시
            const enabledElement = document.getElementById('enabledCount');
            if (enabledElement) {
                enabledElement.textContent = `활성화: ${enabledWeights.length}/${Object.keys(appState.weights).length}개`;
            }
            
            // 마지막 저장 시간 표시
            const lastSavedElement = document.getElementById('lastSaved');
            if (lastSavedElement && appState.lastSaved) {
                lastSavedElement.textContent = `마지막 저장: ${appState.lastSaved.toLocaleTimeString('ko-KR')}`;
            }
            
        } catch (error) {
            console.error('[Percent] 상태 표시 업데이트 실패:', error);
        }
    }

    function updateButtonStates() {
        try {
            const saveBtn = document.getElementById('saveBtn');
            const applyBtn = document.getElementById('applyBtn');
            const undoBtn = document.getElementById('undoBtn');
            const redoBtn = document.getElementById('redoBtn');
            
            if (saveBtn) {
                saveBtn.disabled = appState.isSaving || !appState.hasUnsavedChanges;
            }
            
            if (applyBtn) {
                applyBtn.disabled = appState.isSaving || appState.isLoading;
            }
            
            if (undoBtn) {
                undoBtn.disabled = appState.currentHistoryIndex <= 0;
            }
            
            if (redoBtn) {
                redoBtn.disabled = appState.currentHistoryIndex >= appState.history.length - 1;
            }
            
        } catch (error) {
            console.error('[Percent] 버튼 상태 업데이트 실패:', error);
        }
    }

    function updateSaveStatus(message) {
        try {
            const statusElement = document.getElementById('saveStatus');
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `save-status ${appState.isSaving ? 'saving' : appState.hasUnsavedChanges ? 'unsaved' : 'saved'}`;
            }
        } catch (error) {
            console.error('[Percent] 저장 상태 업데이트 실패:', error);
        }
    }

    function updateLoadingState(isLoading) {
        try {
            const container = document.getElementById('weightControls');
            const loadingOverlay = document.getElementById('loadingOverlay');
            
            if (isLoading) {
                if (!loadingOverlay) {
                    const overlay = document.createElement('div');
                    overlay.id = 'loadingOverlay';
                    overlay.className = 'loading-overlay';
                    overlay.innerHTML = `
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <div class="loading-text">로딩 중...</div>
                        </div>
                    `;
                    
                    if (container) {
                        container.appendChild(overlay);
                    }
                }
            } else {
                if (loadingOverlay) {
                    loadingOverlay.remove();
                }
            }
        } catch (error) {
            console.error('[Percent] 로딩 상태 업데이트 실패:', error);
        }
    }

    // === 🎮 이벤트 핸들러들 ===
    function setupEventListeners() {
        try {
            // 가중치 변경 이벤트들
            document.addEventListener('change', handleWeightChange);
            document.addEventListener('input', handleWeightInput);
            
            // 커스텀 이벤트 리스너
            document.addEventListener('weightSettingsChanged', handleCustomWeightEvent);
            
            // 페이지 언로드 시 저장
            window.addEventListener('beforeunload', handleBeforeUnload);
            
            console.log('[Percent] ✅ 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('[Percent] 이벤트 리스너 설정 실패:', error);
        }
    }

    function handleWeightChange(event) {
        const target = event.target;
        
        if (target.id.startsWith('enable_')) {
            const key = target.id.replace('enable_', '');
            updateWeight(key, 'enabled', target.checked);
        }
    }

    function handleWeightInput(event) {
        const target = event.target;
        
        if (target.id.startsWith('slider_') || target.id.startsWith('number_')) {
            const key = target.id.replace(/^(slider_|number_)/, '');
            const value = parseInt(target.value);
            
            if (!isNaN(value)) {
                updateWeight(key, 'value', value);
                
                // 슬라이더와 숫자 입력 동기화
                const slider = document.getElementById(`slider_${key}`);
                const number = document.getElementById(`number_${key}`);
                
                if (slider && target !== slider) slider.value = value;
                if (number && target !== number) number.value = value;
            }
        }
    }

    function handleCustomWeightEvent(event) {
        console.log('[Percent] 커스텀 가중치 이벤트 수신:', event.detail);
    }

    function handleBeforeUnload(event) {
        if (appState.hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';
        }
    }

    async function handleSave() {
        try {
            await saveSettings();
            showNotification('설정이 저장되었습니다', 'success');
        } catch (error) {
            showNotification('저장에 실패했습니다', 'error');
        }
    }

    async function handleApplyToServer() {
        try {
            if (!validateWeights()) {
                showNotification('가중치 설정이 유효하지 않습니다', 'error');
                return;
            }
            
            await updateWeightsToAPI(appState.weights, true);
        } catch (error) {
            console.error('[Percent] 서버 적용 실패:', error);
        }
    }

    function handleUndo() {
        try {
            if (appState.currentHistoryIndex > 0) {
                appState.currentHistoryIndex--;
                appState.weights = { ...appState.history[appState.currentHistoryIndex] };
                appState.hasUnsavedChanges = true;
                updateUI();
                showNotification('이전 상태로 되돌렸습니다', 'info');
            }
        } catch (error) {
            console.error('[Percent] 되돌리기 실패:', error);
        }
    }

    function handleRedo() {
        try {
            if (appState.currentHistoryIndex < appState.history.length - 1) {
                appState.currentHistoryIndex++;
                appState.weights = { ...appState.history[appState.currentHistoryIndex] };
                appState.hasUnsavedChanges = true;
                updateUI();
                showNotification('다음 상태로 이동했습니다', 'info');
            }
        } catch (error) {
            console.error('[Percent] 다시하기 실패:', error);
        }
    }

    // === 📚 히스토리 관리 ===
    function addToHistory() {
        try {
            // 현재 인덱스 이후의 히스토리 제거 (새로운 분기 생성)
            appState.history = appState.history.slice(0, appState.currentHistoryIndex + 1);
            
            // 새로운 상태 추가
            appState.history.push({ ...appState.weights });
            appState.currentHistoryIndex = appState.history.length - 1;
            
            // 히스토리 크기 제한
            if (appState.history.length > WEIGHT_CONFIG.CONSTRAINTS.MAX_HISTORY) {
                appState.history.shift();
                appState.currentHistoryIndex--;
            }
            
        } catch (error) {
            console.error('[Percent] 히스토리 추가 실패:', error);
        }
    }

    // === 🔄 자동 저장 시스템 ===
    function setupAutoSave() {
        let autoSaveTimer;
        
        const scheduleAutoSave = () => {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            
            if (appState.autoSaveEnabled && appState.hasUnsavedChanges) {
                autoSaveTimer = setTimeout(async () => {
                    try {
                        await saveSettings();
                        console.log('[Percent] ✅ 자동 저장 완료');
                    } catch (error) {
                        console.error('[Percent] 자동 저장 실패:', error);
                    }
                }, WEIGHT_CONFIG.CONSTRAINTS.AUTO_SAVE_DELAY);
            }
        };
        
        // 가중치 변경 시 자동 저장 예약
        document.addEventListener('input', scheduleAutoSave);
        document.addEventListener('change', scheduleAutoSave);
    }

    // === 📊 실시간 모니터링 시스템 ===
    function createWeightApplicationMonitor() {
        try {
            // 기존 모니터 제거
            const existingMonitor = document.getElementById('weightApplicationMonitor');
            if (existingMonitor) existingMonitor.remove();
            
            // 모니터 UI 생성
            const monitor = document.createElement('div');
            monitor.id = 'weightApplicationMonitor';
            monitor.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                z-index: 9999;
                max-width: 350px;
                min-width: 300px;
                font-size: 13px;
                font-family: 'Blinker', sans-serif;
                backdrop-filter: blur(12px);
                transform: translateY(100%);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 4px solid #3b82f6;
            `;
            
            monitor.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="font-weight: 600; color: #1e293b; font-size: 14px;">
                        🔄 가중치 적용 상태
                    </div>
                    <button onclick="this.parentElement.parentElement.style.transform='translateY(100%)'" 
                            style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">
                        ×
                    </button>
                </div>
                <div id="monitorContent" style="color: #475569; line-height: 1.5;">
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></div>
                        <span>대기 중...</span>
                    </div>
                </div>
                <div id="monitorProgress" style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 12px; overflow: hidden;">
                    <div id="progressBar" style="height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); width: 0%; transition: width 0.3s ease; border-radius: 2px;"></div>
                </div>
            `;
            
            document.body.appendChild(monitor);
            
            // 모니터 자동 표시 이벤트 설정
            document.addEventListener('weightSettingsChanged', function(event) {
                showApplicationMonitor(event.detail);
            });
            
            console.log('[Percent] 📊 가중치 적용 모니터 생성 완료');
            
        } catch (error) {
            console.warn('[Percent] 가중치 적용 모니터 생성 실패:', error);
        }
    }

    function showApplicationMonitor(eventData) {
        try {
            const monitor = document.getElementById('weightApplicationMonitor');
            if (!monitor) return;
            
            const content = monitor.querySelector('#monitorContent');
            const progressBar = monitor.querySelector('#progressBar');
            
            content.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
                    <span><strong>알림 전송:</strong> 완료</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></div>
                    <span><strong>대상 API:</strong> ${eventData.affectedAPIs.length}개</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6;"></div>
                    <span><strong>활성 설정:</strong> ${eventData.activeCount}개</span>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                    ${new Date().toLocaleTimeString('ko-KR')} • 응답 대기 중...
                </div>
            `;
            
            progressBar.style.width = '30%';
            monitor.style.transform = 'translateY(0)';
            
        } catch (error) {
            console.warn('[Percent] 모니터 표시 실패:', error);
        }
    }

    function updateApplicationMonitor(pageName, responseCount) {
        try {
            const monitor = document.getElementById('weightApplicationMonitor');
            if (!monitor) return;
            
            const content = monitor.querySelector('#monitorContent');
            const progressBar = monitor.querySelector('#progressBar');
            
            const responseDiv = document.createElement('div');
            responseDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0;';
            responseDiv.innerHTML = `
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
                <span><strong>${pageName}:</strong> 새로고침 완료</span>
            `;
            
            const timeDiv = content.querySelector('div:last-child');
            if (timeDiv) {
                content.insertBefore(responseDiv, timeDiv);
            } else {
                content.appendChild(responseDiv);
            }
            
            const progressPercent = Math.min(30 + (responseCount * 15), 90);
            progressBar.style.width = `${progressPercent}%`;
            
        } catch (error) {
            console.warn('[Percent] 모니터 업데이트 실패:', error);
        }
    }

    function finalizeApplicationMonitor(totalResponses) {
        try {
            const monitor = document.getElementById('weightApplicationMonitor');
            if (!monitor) return;
            
            const progressBar = monitor.querySelector('#progressBar');
            const content = monitor.querySelector('#monitorContent');
            
            progressBar.style.width = '100%';
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
            
            const completionDiv = document.createElement('div');
            completionDiv.style.cssText = 'margin-top: 8px; padding: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46; font-size: 12px; font-weight: 500;';
            completionDiv.innerHTML = `✅ 가중치 적용 완료 (${totalResponses}개 페이지)`;
            
            content.appendChild(completionDiv);
            
            setTimeout(() => {
                monitor.style.transform = 'translateY(100%)';
            }, 5000);
            
        } catch (error) {
            console.warn('[Percent] 모니터 완료 처리 실패:', error);
        }
    }

    // === 🔔 알림 시스템 ===
    function showNotification(message, type = 'info', duration = 4000) {
        try {
            if (window.APIService?.showNotification) {
                window.APIService.showNotification(message, type, duration);
            } else {
                console.log(`[Percent 알림 - ${type.toUpperCase()}] ${message}`);
                
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
                    color: white;
                    border-radius: 8px;
                    z-index: 10000;
                    font-size: 13px;
                    max-width: 300px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-family: 'Blinker', sans-serif;
                `;
                notification.textContent = message;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, duration);
            }
        } catch (error) {
            console.log(`[Percent 알림 오류] ${message} (${type})`);
        }
    }

    // === 🛠️ 개발자 도구 ===
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugPercent = {
            state: appState,
            config: WEIGHT_CONFIG,
            
            getWeights: () => appState.weights,
            setWeight: (key, field, value) => updateWeight(key, field, value),
            saveWeights: saveSettings,
            applyWeights: () => updateWeightsToAPI(appState.weights),
            resetWeights: resetToDefaults,
            
            simulateNotification: (message, type) => showNotification(message, type),
            triggerMonitor: () => {
                const event = { affectedAPIs: WEIGHT_CONFIG.AFFECTED_APIS, activeCount: 3 };
                showApplicationMonitor(event);
            },
            
            help: () => {
                console.log('[Percent] 🔧 개발자 도구:');
                console.log('  - getWeights(): 현재 가중치 반환');
                console.log('  - setWeight(key, field, value): 가중치 설정');
                console.log('  - saveWeights(): 설정 저장');
                console.log('  - applyWeights(): 서버 적용');
                console.log('  - resetWeights(): 기본값으로 초기화');
                console.log('  - simulateNotification(message, type): 알림 테스트');
                console.log('  - triggerMonitor(): 모니터 테스트');
            }
        };
        
        console.log('[Percent] 🔧 개발자 도구: window.debugPercent.help()');
    }

    // === 🌐 전역 함수 등록 ===
    window.PercentSystem = {
        init: initializePercentSystem,
        getSettings: getCurrentSettings,
        updateWeight: updateWeight,
        saveSettings: saveSettings,
        applyToServer: () => updateWeightsToAPI(appState.weights),
        reset: resetToDefaults,
        version: '1.0.0'
    };

    // === 🚀 자동 초기화 ===
    document.addEventListener('DOMContentLoaded', initializePercentSystem);

    // 이미 DOM이 로드된 경우
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePercentSystem);
    } else {
        setTimeout(initializePercentSystem, 100);
    }

    console.log('[Percent] ✅ percent.js 로드 완료');

})();
