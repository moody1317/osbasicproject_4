document.addEventListener('DOMContentLoaded', function() {
    // ===== 환경 감지 및 설정 =====
    
    // 배포 환경 감지 
    function isVercelEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('vercel.app')) return true;
        if (hostname.includes('.vercel.app')) return true;
        
        if (hostname !== 'localhost' && 
            hostname !== '127.0.0.1' && 
            !hostname.includes('github.io') && 
            !hostname.includes('netlify.app')) {
            return true;
        }
        
        return false;
    }

    // 환경별 알림 시스템
    function showEnvironmentNotification(message, type = 'info') {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const envBadge = `[${envType}]`;
        
        const colors = {
            info: '#2196f3',
            warning: '#ff9800', 
            error: '#f44336',
            success: '#4caf50'
        };

        // 기존 알림 제거
        clearExistingNotifications();
        
        const notification = document.createElement('div');
        notification.className = 'notification env-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 400px;
            line-height: 1.4;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: 'Courier New', monospace;
        `;
        notification.textContent = `${envBadge} ${message}`;
        document.body.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 환경별 자동 제거 시간 조정
        const autoRemoveTime = isVercelEnvironment() ? 4000 : 5000;
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, autoRemoveTime);
    }

    // 기존 알림 제거
    function clearExistingNotifications() {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 200);
            }
        });
    }

    // ===== 퍼센트 설정 데이터 관리 =====
    
    // 🔧 환경별 최적화된 기본값 설정
    const defaultValues = {
        '간사': isVercelEnvironment() ? 3 : 3,
        '무효표 및 기권': isVercelEnvironment() ? 2 : 2,
        '본회의 가결': isVercelEnvironment() ? 40 : 40,
        '위원장': isVercelEnvironment() ? 5 : 5,
        '청원 소개': isVercelEnvironment() ? 8 : 8,
        '청원 결과': isVercelEnvironment() ? 23 : 23,
        '출석': isVercelEnvironment() ? 8 : 8,
        '투표 결과 일치': isVercelEnvironment() ? 7 : 7,
        '투표 결과 불일치': isVercelEnvironment() ? 4 : 4
    };

    // DOM 요소 참조
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

    // 환경별 저장 지연 시간 설정
    const saveDelay = isVercelEnvironment() ? 1500 : 1000; // Vercel에서는 더 긴 지연

    // ===== 퍼센트 값 처리 함수들 =====

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

    // ===== API 연동 함수들 (환경별 최적화) =====

    // 🔧 퍼센트 값을 저장하는 함수 (환경별 로깅)
    async function savePercentValues() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        
        try {
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

            console.log(`[${envType}] 퍼센트 설정 저장 중:`, percentData);

            // PercentManager를 통한 저장 시도
            if (window.PercentManager) {
                const success = await window.PercentManager.saveSettings(percentData);
                
                if (success) {
                    console.log(`[${envType}] PercentManager를 통한 저장 성공`);
                    showEnvironmentNotification('설정이 저장되었습니다', 'success');
                } else {
                    throw new Error('PercentManager 저장 실패');
                }
            } else {
                // PercentManager가 없으면 로컬 저장소에만 저장
                localStorage.setItem('percentSettings', JSON.stringify(percentData));
                console.log(`[${envType}] 로컬 저장소에 저장 완료`);
                showEnvironmentNotification('로컬에 설정이 저장되었습니다', 'info');
            }
            
        } catch (error) {
            console.error(`[${envType}] 퍼센트 설정 저장 실패:`, error);
            
            // 저장 실패 시 로컬 저장소에 백업 저장
            try {
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
                
                localStorage.setItem('percentSettings', JSON.stringify(percentData));
                console.log(`[${envType}] 로컬 저장소에 백업 저장 완료`);
                showEnvironmentNotification('로컬에 백업 저장되었습니다', 'warning');
                
            } catch (backupError) {
                console.error(`[${envType}] 백업 저장도 실패:`, backupError);
                showEnvironmentNotification('설정 저장에 실패했습니다', 'error');
            }
        }
    }

    // 🔧 설정값을 불러오는 함수 (환경별 로깅)
    async function loadPercentValues() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 퍼센트 설정 불러오는 중...`);
        
        try {
            let percentData = null;
            
            // PercentManager를 통해 설정 로드 시도
            if (window.PercentManager) {
                console.log(`[${envType}] PercentManager를 통한 설정 로드 시도`);
                percentData = await window.PercentManager.getSettings();
                
                if (percentData && Object.keys(percentData).length > 0) {
                    console.log(`[${envType}] PercentManager에서 설정 로드 성공:`, Object.keys(percentData).length, '개 항목');
                    showEnvironmentNotification('저장된 설정을 불러왔습니다', 'success');
                }
            }
            
            // PercentManager가 없거나 데이터가 없으면 로컬 저장소에서 시도
            if (!percentData || Object.keys(percentData).length === 0) {
                console.log(`[${envType}] 로컬 저장소에서 설정 로드 시도`);
                const savedData = localStorage.getItem('percentSettings');
                if (savedData) {
                    percentData = JSON.parse(savedData);
                    console.log(`[${envType}] 로컬 저장소에서 설정 로드 성공:`, Object.keys(percentData).length, '개 항목');
                    showEnvironmentNotification('로컬 설정을 불러왔습니다', 'info');
                }
            }
            
            if (percentData && Object.keys(percentData).length > 0) {
                applySettings(percentData);
                return true;
            } else {
                console.log(`[${envType}] 저장된 설정이 없음, 기본값 사용`);
                return false;
            }
            
        } catch (error) {
            console.error(`[${envType}] 설정 로드 중 오류:`, error);
            
            // 오류 발생 시 로컬 저장소에서 시도
            try {
                const savedData = localStorage.getItem('percentSettings');
                if (savedData) {
                    const percentData = JSON.parse(savedData);
                    applySettings(percentData);
                    console.log(`[${envType}] 로컬 저장소 백업에서 복구 성공`);
                    showEnvironmentNotification('백업 설정을 복구했습니다', 'warning');
                    return true;
                }
            } catch (parseError) {
                console.error(`[${envType}] 로컬 저장소 파싱도 실패:`, parseError);
                showEnvironmentNotification('설정 로드에 실패했습니다', 'error');
            }
        }
        
        return false;
    }

    // ===== UI 업데이트 함수들 =====

    // 🔧 설정값을 UI에 적용하는 함수 (환경별 로깅)
    function applySettings(percentData) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] UI에 설정 적용 중...`, Object.keys(percentData).length, '개 항목');
        
        let appliedCount = 0;
        
        Object.keys(percentData).forEach(label => {
            const data = percentData[label];
            
            // 체크박스 상태 복원
            checkboxItems.forEach(item => {
                const checkboxLabel = item.querySelector('.checkbox-label').textContent.trim();
                if (fieldMapping[checkboxLabel] === label) {
                    const checkbox = item.querySelector('.checkbox-input');
                    checkbox.checked = data.enabled;
                    appliedCount++;
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
        console.log(`[${envType}] UI 설정 적용 완료:`, appliedCount, '개 항목 처리됨');
    }

    // 체크박스 상태에 따라 퍼센트 입력 필드 활성화/비활성화
    function updatePercentField(checkboxLabel, isChecked) {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 필드 업데이트:`, checkboxLabel, '→', isChecked ? '활성화' : '비활성화');
        
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
        
        // 환경별 저장 지연 적용
        setTimeout(() => {
            savePercentValues();
        }, saveDelay / 2); // 필드 변경 시는 절반 지연
    }

    // 🔧 초기화 함수 (환경별 로깅)
    async function resetToDefaults() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 기본값으로 초기화 중...`);
        
        try {
            checkboxItems.forEach(item => {
                const checkbox = item.querySelector('.checkbox-input');
                checkbox.checked = true;
            });

            let resetCount = 0;
            percentInputs.forEach(input => {
                const label = input.closest('.percent-item').querySelector('.percent-label').textContent.trim();
                const defaultValue = defaultValues[label];
                
                if (defaultValue !== undefined) {
                    input.value = defaultValue + '%';
                    input.disabled = false;
                    input.style.opacity = '1';
                    input.style.backgroundColor = '#f9f9f9';
                    input.style.cursor = 'text';
                    resetCount++;
                }
            });

            calculateAndDisplayTotal();
            
            await savePercentValues(); // 초기값 저장
            
            console.log(`[${envType}] 기본값 초기화 완료:`, resetCount, '개 항목 초기화됨');
            showEnvironmentNotification(`${resetCount}개 항목이 기본값으로 초기화되었습니다`, 'success');
            
        } catch (error) {
            console.error(`[${envType}] 초기화 중 오류:`, error);
            showEnvironmentNotification('초기화 중 오류가 발생했습니다', 'error');
        }
    }

    // 🔧 전체 퍼센트 합계 계산 및 표시 (환경별 최적화)
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
                transition: all 0.3s ease;
            `;
            document.querySelector('.percent-grid').after(totalDisplay);
        }
        
        // 환경 표시 추가
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const perfectMatch = total === 100;
        
        totalDisplay.innerHTML = `
            <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">[${envType}] 실시간 계산</div>
            <span>활성 항목: ${activeCount}개</span> | 
            <span>전체 합계: <span style="color: ${perfectMatch ? 'var(--light-blue)' : 'var(--example)'}">${total.toFixed(1)}%</span></span>
            ${perfectMatch ? '<div style="font-size: 12px; color: var(--light-blue); margin-top: 5px;">✅ 완벽한 100% 달성!</div>' : ''}
        `;
        
        // 100% 달성 시 특별 효과
        if (perfectMatch) {
            totalDisplay.style.boxShadow = '0 0 15px rgba(33, 150, 243, 0.3)';
        } else {
            totalDisplay.style.boxShadow = 'none';
        }
    }

    // ===== 이벤트 리스너 설정 =====

    // 🔧 체크박스 이벤트 리스너 (환경별 로깅)
    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('.checkbox-input');
        const label = item.querySelector('.checkbox-label').textContent.trim();
        
        checkbox.addEventListener('change', function() {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 체크박스 변경:`, label, '→', this.checked);
            updatePercentField(label, this.checked);
        });
    });

    // 🔧 리셋 버튼 이벤트 리스너 (환경별 확인)
    resetButton.addEventListener('click', async function() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        
        const confirmMessage = isVercelEnvironment() ? 
            '모든 값을 초기값으로 되돌리시겠습니까?\n(Vercel 환경에서 진행됩니다)' :
            '모든 값을 초기값으로 되돌리시겠습니까?\n(로컬 환경에서 진행됩니다)';
            
        if (confirm(confirmMessage)) {
            console.log(`[${envType}] 사용자가 초기화 확인함`);
            await resetToDefaults();
        } else {
            console.log(`[${envType}] 사용자가 초기화 취소함`);
        }
    });

    // 🔧 퍼센트 입력 필드 이벤트 리스너 (환경별 최적화)
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
            
            // 환경별 자동 저장 지연 시간 적용
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                savePercentValues();
            }, saveDelay);
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
                        }, saveDelay);
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

    // ===== 페이지 애니메이션 (환경별 최적화) =====

    // 🔧 페이지 로드 시 애니메이션 (환경별 속도 조정)
    function initializePageAnimations() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        const animationDelay = isVercelEnvironment() ? 150 : 100;
        
        console.log(`[${envType}] 페이지 애니메이션 초기화 중...`);
        
        const checkboxGrid = document.querySelector('.checkbox-grid');
        const percentGrid = document.querySelector('.percent-grid');

        if (checkboxGrid) {
            checkboxGrid.style.opacity = '0';
            checkboxGrid.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                checkboxGrid.style.transition = 'all 0.5s ease';
                checkboxGrid.style.opacity = '1';
                checkboxGrid.style.transform = 'translateY(0)';
            }, animationDelay);
        }

        if (percentGrid) {
            percentGrid.style.opacity = '0';
            percentGrid.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                percentGrid.style.transition = 'all 0.5s ease';
                percentGrid.style.opacity = '1';
                percentGrid.style.transform = 'translateY(0)';
            }, animationDelay * 3);
        }
        
        console.log(`[${envType}] 페이지 애니메이션 설정 완료`);
    }

    // ===== PercentManager 연동 =====

    // 🔧 PercentManager 설정 변경 감지 (환경별 로깅)
    function setupPercentManagerIntegration() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        
        if (window.PercentManager) {
            console.log(`[${envType}] PercentManager 연동 설정 중...`);
            
            // PercentManager의 설정 변경 감지
            window.PercentManager.onChange(function(newSettings) {
                if (newSettings && typeof newSettings === 'object') {
                    console.log(`[${envType}] PercentManager 설정 변경 감지:`, Object.keys(newSettings).length, '개 항목');
                    applySettings(newSettings);
                    showEnvironmentNotification('설정이 동기화되었습니다', 'info');
                }
            });
            
            console.log(`[${envType}] PercentManager 연동 완료`);
        } else {
            console.warn(`[${envType}] PercentManager가 없음, 로컬 저장소만 사용`);
            showEnvironmentNotification('로컬 저장소 모드로 실행', 'warning');
        }
    }

    // ===== 페이지 초기화 (환경별 최적화) =====

    // 🔧 페이지 초기화 (환경별 로깅)
    async function initializePage() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`[${envType}] 퍼센트 설정 페이지 초기화 중...`);
        
        try {
            // DOM 요소 확인
            console.log(`[${envType}] DOM 요소 확인:`);
            console.log(`- 체크박스: ${checkboxItems.length}개`);
            console.log(`- 퍼센트 입력: ${percentInputs.length}개`);
            console.log(`- 리셋 버튼: ${!!resetButton}`);
            
            // PercentManager 연동 설정
            setupPercentManagerIntegration();
            
            // 애니메이션 초기화
            initializePageAnimations();
            
            // 설정 로드 시도
            const hasData = await loadPercentValues();
            
            if (!hasData) {
                console.log(`[${envType}] 저장된 설정이 없어 기본값으로 초기화`);
                await resetToDefaults();
            }
            
            console.log(`[${envType}] 퍼센트 설정 페이지 초기화 완료!`);
            showEnvironmentNotification('퍼센트 설정 페이지 로드 완료', 'success');
            
        } catch (error) {
            console.error(`[${envType}] 페이지 초기화 중 오류:`, error);
            showEnvironmentNotification('페이지 초기화 중 오류 발생', 'error');
            
            // 오류 시 기본값으로 초기화
            try {
                await resetToDefaults();
            } catch (resetError) {
                console.error(`[${envType}] 기본값 초기화도 실패:`, resetError);
            }
        }
    }

    // 환경별 초기화 지연
    const initDelay = isVercelEnvironment() ? 300 : 200;
    setTimeout(initializePage, initDelay);

    // 🆕 디버그 유틸리티 (환경별)
    window.percentDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        getSettings: () => window.getPercentSettings(),
        getDefaultValues: () => defaultValues,
        testSave: () => savePercentValues(),
        testLoad: () => loadPercentValues(),
        testReset: () => resetToDefaults(),
        calculateTotal: () => {
            calculateAndDisplayTotal();
            const total = Array.from(percentInputs)
                .filter(input => !input.disabled)
                .reduce((sum, input) => sum + (parseFloat(input.value.replace('%', '')) || 0), 0);
            return total;
        },
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`PercentManager: ${!!window.PercentManager}`);
            console.log(`체크박스 수: ${checkboxItems.length}`);
            console.log(`입력 필드 수: ${percentInputs.length}`);
            console.log(`저장 지연 시간: ${saveDelay}ms`);
            console.log(`현재 총합: ${window.percentDebug.calculateTotal()}%`);
        }
    };
    
    console.log(`🚀 [${isVercelEnvironment() ? 'VERCEL' : 'LOCAL'}] 퍼센트 설정 페이지 스크립트 로드 완료`);
    console.log('🔧 디버그: window.percentDebug.showEnvInfo()');
});

// ===== 전역 함수 (호환성 유지) =====

// 🔧 전역 함수 (환경별 로깅)
window.getPercentSettings = async function() {
    const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
    
    try {
        console.log(`[${envType}] 전역 함수로 퍼센트 설정 요청`);
        
        if (window.PercentManager) {
            const settings = await window.PercentManager.getSettings();
            console.log(`[${envType}] PercentManager에서 설정 반환:`, !!settings);
            return settings;
        } else {
            const savedData = localStorage.getItem('percentSettings');
            const settings = savedData ? JSON.parse(savedData) : null;
            console.log(`[${envType}] 로컬 저장소에서 설정 반환:`, !!settings);
            return settings;
        }
    } catch (error) {
        console.error(`[${envType}] 전역 함수 설정 로드 실패:`, error);
        
        // 오류 시 로컬 저장소에서 시도
        try {
            const savedData = localStorage.getItem('percentSettings');
            return savedData ? JSON.parse(savedData) : null;
        } catch (parseError) {
            console.error(`[${envType}] 로컬 저장소 파싱도 실패:`, parseError);
            return null;
        }
    }
};

// 환경 감지 함수 전역 노출
function isVercelEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('vercel.app')) return true;
    if (hostname.includes('.vercel.app')) return true;
    
    if (hostname !== 'localhost' && 
        hostname !== '127.0.0.1' && 
        !hostname.includes('github.io') && 
        !hostname.includes('netlify.app')) {
        return true;
    }
    
    return false;
}
