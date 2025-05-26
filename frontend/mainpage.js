document.addEventListener('DOMContentLoaded', function() {
    // localStorage 기반 팝업 표시 제어
    function shouldShowPopup() {
        try {
            const today = new Date().toDateString(); // "Mon May 26 2025"
            const hiddenDate = localStorage.getItem('popupHiddenDate');
            
            console.log('오늘 날짜:', today);
            console.log('저장된 숨김 날짜:', hiddenDate);
            
            // 저장된 날짜가 없거나 오늘과 다르면 팝업 표시
            return hiddenDate !== today;
        } catch (error) {
            // localStorage를 사용할 수 없는 환경 (시크릿 모드 등)
            console.warn('localStorage 접근 불가:', error);
            return true; // 기본적으로 팝업 표시
        }
    }

    // 페이지 로드 시 팝업 표시 여부 확인
    setTimeout(() => {
        if (shouldShowPopup()) {
            console.log('팝업 표시 조건 충족 - 팝업 실행');
            showWelcomePopups();
        } else {
            console.log('오늘 하루 그만보기 설정됨 - 팝업 스킵');
        }
    }, 1000);

    // 환영 팝업들 표시 함수
    function showWelcomePopups() {
        showImageSourcePopup(() => {
            setTimeout(() => {
                showPercentGuidePopup();
            }, 500);
        });
    }

    // 정당로고/국회의원 사진 출처 안내 팝업
    function showImageSourcePopup(callback) {
        const modal = createPopupModal('정당로고 및 국회의원 사진 출처 안내', `
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
        `, callback, false);
        
        document.body.appendChild(modal.backdrop);
        document.body.appendChild(modal.popup);
    }

    // 상세 퍼센트 가이드 팝업 (오늘 하루 그만보기 포함)
    function showPercentGuidePopup() {
        const modal = createPopupModal('상세 퍼센트 기능 안내', `
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
        `, null, true);
        
        document.body.appendChild(modal.backdrop);
        document.body.appendChild(modal.popup);
    }

    // 팝업 모달 생성 함수
    function createPopupModal(title, content, callback, showDontShowToday = false) {
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
            
            /* 스크롤바 숨기기 */
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;

        // 웹킷 브라우저 스크롤바 숨기기
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
            // "오늘 하루 그만보기" 체크 확인 및 localStorage 저장
            if (showDontShowToday) {
                const dontShowCheckbox = popup.querySelector('#dontShowToday');
                if (dontShowCheckbox && dontShowCheckbox.checked) {
                    try {
                        const today = new Date().toDateString();
                        localStorage.setItem('popupHiddenDate', today);
                        console.log('팝업 숨김 설정 저장:', today);
                        
                        // 사용자에게 피드백 (선택적)
                        console.log('내일부터 팝업이 다시 표시됩니다.');
                    } catch (error) {
                        console.warn('localStorage 저장 실패:', error);
                    }
                }
            }
            
            // 팝업 닫기 애니메이션
            popup.style.animation = 'slideOut 0.3s ease';
            backdrop.style.animation = 'fadeOut 0.3s ease';
            
            setTimeout(() => {
                popup.remove();
                backdrop.remove();
                if (callback) callback();
            }, 300);
        };

        // 배경 클릭 시 닫기
        backdrop.onclick = confirmBtn.onclick;

        return { backdrop, popup };
    }

    // CSS 애니메이션 정의
    if (!document.querySelector('#popupAnimations')) {
        const style = document.createElement('style');
        style.id = 'popupAnimations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            @keyframes slideOut {
                from { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 개발자 도구용 디버깅 함수들
    window.debugPopup = {
        // 저장된 데이터 확인
        checkSavedDate: () => {
            const saved = localStorage.getItem('popupHiddenDate');
            const today = new Date().toDateString();
            console.log('저장된 날짜:', saved);
            console.log('오늘 날짜:', today);
            console.log('팝업 표시 여부:', saved !== today);
        },
        
        // 설정 초기화 (팝업 다시 보기)
        resetPopup: () => {
            localStorage.removeItem('popupHiddenDate');
            console.log('팝업 설정이 초기화되었습니다. 페이지를 새로고침하면 팝업이 다시 표시됩니다.');
        },
        
        // 강제로 오늘 숨김 설정
        hideToday: () => {
            const today = new Date().toDateString();
            localStorage.setItem('popupHiddenDate', today);
            console.log('오늘 팝업이 숨김 처리되었습니다:', today);
        }
    };
    
    console.log('팝업 디버깅 함수 사용법:');
    console.log('- window.debugPopup.checkSavedDate() : 현재 설정 확인');
    console.log('- window.debugPopup.resetPopup() : 설정 초기화');
    console.log('- window.debugPopup.hideToday() : 오늘 숨김 설정');
});
