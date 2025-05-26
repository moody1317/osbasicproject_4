document.addEventListener('DOMContentLoaded', function() {
    // 각 팝업별로 개별 localStorage 키 사용
    function shouldShowImagePopup() {
        try {
            const today = new Date().toDateString();
            const hiddenDate = localStorage.getItem('imagePopupHiddenDate'); // 이미지 팝업 전용
            return hiddenDate !== today;
        } catch (error) {
            console.warn('localStorage 접근 불가:', error);
            return true;
        }
    }

    function shouldShowPercentPopup() {
        try {
            const today = new Date().toDateString();
            const hiddenDate = localStorage.getItem('percentPopupHiddenDate'); // 퍼센트 팝업 전용
            return hiddenDate !== today;
        } catch (error) {
            console.warn('localStorage 접근 불가:', error);
            return true;
        }
    }

    // 페이지 로드 시 각 팝업 개별 확인
    setTimeout(() => {
        if (shouldShowImagePopup()) {
            showImageSourcePopup(() => {
                // 이미지 팝업이 끝난 후 퍼센트 팝업 확인
                setTimeout(() => {
                    if (shouldShowPercentPopup()) {
                        showPercentGuidePopup();
                    }
                }, 500);
            });
        } else if (shouldShowPercentPopup()) {
            // 이미지 팝업은 숨겨져 있지만 퍼센트 팝업은 표시해야 하는 경우
            showPercentGuidePopup();
        }
    }, 1000);

    // 이미지 출처 팝업 (개별 제어)
    function showImageSourcePopup(callback) {
        const modal = createPopupModal(`
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">📸</div>
                <h3 style="color: #4facfe; margin-bottom: 20px;">이미지 출처 안내</h3>
            </div>
            
            <p style="margin-bottom: 15px; line-height: 1.6;">
                안녕하세요! <strong>백일하</strong> 서비스를 이용해 주셔서 감사합니다.
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin-bottom: 15px;">
                    저희가 사용하는 모든 이미지는 다음 출처에서 가져왔음을 명시합니다:
                </p>
                
                <div style="margin: 15px 0;">
                    <h4 style="color: #4facfe; margin-bottom: 8px;">🏛️ 정당 로고</h4>
                    <p style="font-size: 14px;">각 정당의 홈페이지 및 PI 매뉴얼에 근거하여 준수</p>
                </div>
                
                <div style="margin: 15px 0;">
                    <h4 style="color: #4facfe; margin-bottom: 8px;">👤 국회의원 사진</h4>
                    <p style="font-size: 14px;">열린국회정보 OpenAPI 제공 자료 활용</p>
                </div>
            </div>
            
            <p style="text-align: center; font-size: 14px; color: #888; margin-top: 20px;">
                저희는 비상업적 교육 목적으로 제작되었으며,<br>
                어떤 정당이나 의원에 대한 편견이 없음을 알려드립니다.
            </p>
        `, callback, true, 'imagePopupHiddenDate'); // 이미지 팝업 전용 키
        
        document.body.appendChild(modal.backdrop);
        document.body.appendChild(modal.popup);
    }

    // 상세 퍼센트 팝업 (개별 제어)
    function showPercentGuidePopup() {
        const modal = createPopupModal(`
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
                <h3 style="color: #4facfe; margin-bottom: 20px;">상세 퍼센트 기능</h3>
            </div>
            
            <p style="margin-bottom: 20px; line-height: 1.6; text-align: center;">
                <strong>백일하</strong>만의 특별한 기능을 소개합니다!
            </p>
            
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h4 style="color: #4facfe; margin-bottom: 15px; text-align: center;">🎯 상세 퍼센트란?</h4>
                
                <div style="margin: 15px 0;">
                    <p style="margin-bottom: 10px;"><strong>✅ 출석률</strong> - 국회 본회의 참석 현황</p>
                    <p style="margin-bottom: 10px;"><strong>📋 법안 발의율</strong> - 의원별 법안 제출 활동</p>
                    <p style="margin-bottom: 10px;"><strong>🗳️ 투표 참여율</strong> - 안건별 투표 참여도</p>
                    <p style="margin-bottom: 10px;"><strong>💬 질의 활동</strong> - 국정감사 및 질의 횟수</p>
                    <p style="margin-bottom: 10px;"><strong>👑 위원장 경력</strong> - 상임위원회 위원장 활동 비율</p>
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <p style="font-size: 16px; margin-bottom: 10px;">
                    <strong>다양한 기준으로 의원과 정당을 비교해보세요!</strong>
                </p>
                <p style="font-size: 14px; color: #888;">
                    하단의 "상세 퍼센트" 메뉴에서 확인할 수 있습니다.
                </p>
            </div>
        `, null, true, 'percentPopupHiddenDate'); // 퍼센트 팝업 전용 키
        
        document.body.appendChild(modal.backdrop);
        document.body.appendChild(modal.popup);
    }

    // 팝업 모달 생성 함수 (개별 키 지원)
    function createPopupModal(content, callback, showDontShowToday = false, storageKey = 'popupHiddenDate') {
        // 배경 오버레이
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        `;

        // 팝업 모달
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideIn 0.4s ease;
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;

        popup.style.setProperty('-webkit-scrollbar', 'display: none', 'important');

        // "오늘 하루 그만보기" 체크박스 HTML
        const dontShowTodayHtml = showDontShowToday ? `
            <div style="margin: 20px 0; text-align: center;">
                <label style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-size: 14px; color: #888;">
                    <input type="checkbox" id="dontShowToday" style="margin: 0;">
                    <span>오늘 하루 그만보기</span>
                </label>
            </div>
        ` : '';

        popup.innerHTML = `
            <div style="margin-bottom: 25px;">
                ${content}
            </div>
            ${dontShowTodayHtml}
            <div style="text-align: center; margin-top: 25px;">
                <button id="confirmBtn" style="
                    padding: 12px 30px; 
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                    color: white; 
                    border: none; 
                    border-radius: 25px; 
                    cursor: pointer; 
                    font-size: 16px; 
                    font-weight: 500;
                    transition: transform 0.2s ease;
                    box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
                ">
                    확인
                </button>
            </div>
        `;

        // 확인 버튼 이벤트
        const confirmBtn = popup.querySelector('#confirmBtn');
        confirmBtn.onmouseover = () => confirmBtn.style.transform = 'translateY(-2px)';
        confirmBtn.onmouseout = () => confirmBtn.style.transform = 'translateY(0)';
        
        confirmBtn.onclick = () => {
            // "오늘 하루 그만보기" 체크 확인 및 개별 localStorage 저장
            if (showDontShowToday) {
                const dontShowCheckbox = popup.querySelector('#dontShowToday');
                if (dontShowCheckbox && dontShowCheckbox.checked) {
                    try {
                        const today = new Date().toDateString();
                        localStorage.setItem(storageKey, today); // 개별 키로 저장
                        console.log(`${storageKey} 숨김 설정 저장:`, today);
                    } catch (error) {
                        console.warn('localStorage 저장 실패:', error);
                    }
                }
            }
            
            popup.style.animation = 'slideOut 0.3s ease';
            backdrop.style.animation = 'fadeOut 0.3s ease';
            
            setTimeout(() => {
                popup.remove();
                backdrop.remove();
                if (callback) callback();
            }, 300);
        };

        backdrop.onclick = confirmBtn.onclick;

        return { backdrop, popup };
    }

    // CSS 애니메이션
    if (!document.querySelector('#popupAnimations')) {
        const style = document.createElement('style');
        style.id = 'popupAnimations';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            @keyframes slideOut {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }

    // 개별 팝업 디버깅 함수
    window.debugPopup = {
        // 각 팝업 상태 확인
        checkStatus: () => {
            const today = new Date().toDateString();
            const imageHidden = localStorage.getItem('imagePopupHiddenDate');
            const percentHidden = localStorage.getItem('percentPopupHiddenDate');
            
            console.log('=== 팝업 상태 ===');
            console.log('오늘 날짜:', today);
            console.log('이미지 팝업 숨김 날짜:', imageHidden);
            console.log('퍼센트 팝업 숨김 날짜:', percentHidden);
            console.log('이미지 팝업 표시 여부:', imageHidden !== today);
            console.log('퍼센트 팝업 표시 여부:', percentHidden !== today);
        },
        
        // 이미지 팝업만 초기화
        resetImagePopup: () => {
            localStorage.removeItem('imagePopupHiddenDate');
            console.log('이미지 팝업 설정 초기화됨');
        },
        
        // 퍼센트 팝업만 초기화
        resetPercentPopup: () => {
            localStorage.removeItem('percentPopupHiddenDate');
            console.log('퍼센트 팝업 설정 초기화됨');
        },
        
        // 모든 팝업 초기화
        resetAllPopups: () => {
            localStorage.removeItem('imagePopupHiddenDate');
            localStorage.removeItem('percentPopupHiddenDate');
            console.log('모든 팝업 설정 초기화됨');
        }
    };
    
    console.log('🎯 개별 팝업 제어 시스템 활성화!');
    console.log('디버깅: window.debugPopup.checkStatus()');
});
