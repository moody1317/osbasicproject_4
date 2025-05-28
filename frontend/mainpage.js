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

    // 더보기 버튼들 선택
    const showMoreButtons = document.querySelectorAll('.show-more');
    
    showMoreButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            // 첫 번째 카드는 명예의 정당, 두 번째 카드는 명예의 의원
            if (index === 0) {
                // 명예의 정당 더보기 클릭
                window.location.href = 'rank_party.html';
            } else if (index === 1) {
                // 명예의 의원 더보기 클릭
                window.location.href = 'rank_member.html';
            }
        });
    });

    // 상세 퍼센트 링크
    const percentLink = document.querySelector('.percentages-container .more-link');
    if (percentLink) {
        percentLink.addEventListener('click', function() {
            window.location.href = 'percent.html';
        });
        
        // 마우스 호버 시 커서 모양 변경
        percentLink.style.cursor = 'pointer';
    }

    // 공지사항 링크
    const noticeLink = document.querySelector('.notices-container .more-link');
    if (noticeLink) {
        noticeLink.addEventListener('click', function() {
            window.location.href = 'announcements.html';
        });
        
        // 마우스 호버 시 커서 모양 변경
        noticeLink.style.cursor = 'pointer';
    }

    // 공지사항 개별 항목 클릭 이벤트 추가
    setupNoticeClickEvents();
    
    // 공지사항 항목별 데이터 매핑
    const noticeDataMap = {
        '제21대 대통령선거 출마 의원 제외 안내': {
            date: '2025.05.25',
            title: '제21대 대통령선거 출마 의원 제외 안내'
        },
        '국회의원 사진 및 정당 로고 출처 안내': {
            date: '2025.05.25',
            title: '국회의원 사진 및 정당 로고 출처 안내'
        },
        '서버 점검 안내 (1월 20일 02:00 ~ 06:00)': {
            date: '2025.01.15',
            title: '서버 점검 안내 (1월 20일 02:00 ~ 06:00)'
        }
    };

    // 페이지 로드 시 각 팝업 개별 확인
    setTimeout(() => {
        if (shouldShowImagePopup()) {
            showImageSourcePopup(() => {
                // 이미지 팝업이 완전히 사라진 후 퍼센트 팝업 확인
                if (shouldShowPercentPopup()) {
                    showPercentGuidePopup();
                }
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
                    <p style="margin-bottom: 10px;"><strong>📋 청원</strong> - 청원 소개 및 결과</p>
                    <p style="margin-bottom: 10px;"><strong>🗳️ 투표</strong> - 투표 결과 일치 여부</p>
                    <p style="margin-bottom: 10px;"><strong>👑 위원회 경력</strong> - 위원회 활동 여부</p>
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

    // 팝업 모달 생성 함수
    function createPopupModal(content, callback, showDontShowToday = false, storageKey = 'popupHiddenDate') {
        console.log('팝업 생성:', storageKey);
        
        // 애니메이션 중복 실행 방지
        let isAnimating = false;
        
        // 배경 오버레이
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0);
            z-index: 9999;
            transition: background-color 0.3s ease;
        `;

        // 팝업 모달
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;

        popup.style.setProperty('-webkit-scrollbar', 'none', 'important');

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

        // DOM에 추가
        document.body.appendChild(backdrop);
        document.body.appendChild(popup);

        // 팝업 열기 애니메이션 (다음 프레임에서 실행)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                backdrop.style.backgroundColor = 'rgba(0,0,0,0.6)';
                popup.style.opacity = '1';
                popup.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        });

        // 확인 버튼 이벤트
        const confirmBtn = popup.querySelector('#confirmBtn');
        confirmBtn.onmouseover = () => confirmBtn.style.transform = 'translateY(-2px)';
        confirmBtn.onmouseout = () => confirmBtn.style.transform = 'translateY(0)';
        
        // 팝업 닫기 함수
        function closePopup() {
            if (isAnimating) return; // 애니메이션 중복 방지
            isAnimating = true;
            
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
            
            // 닫기 애니메이션
            backdrop.style.backgroundColor = 'rgba(0,0,0,0)';
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            // transitionend 이벤트로 애니메이션 완료 감지
            function onTransitionEnd(e) {
                if (e.target === popup && e.propertyName === 'opacity') {
                    popup.removeEventListener('transitionend', onTransitionEnd);
                    
                    // DOM에서 안전하게 제거
                    try {
                        if (popup.parentNode) popup.remove();
                        if (backdrop.parentNode) backdrop.remove();
                        console.log('팝업 완전히 제거됨');
                        
                        // 콜백 실행
                        if (callback) {
                            setTimeout(callback, 50); // 약간의 딜레이 후 콜백
                        }
                    } catch (error) {
                        console.error('팝업 제거 중 오류:', error);
                    }
                }
            }
            
            popup.addEventListener('transitionend', onTransitionEnd);
            
            // 안전장치: 1초 후에도 제거되지 않았다면 강제 제거
            setTimeout(() => {
                if (popup.parentNode || backdrop.parentNode) {
                    console.warn('애니메이션 타임아웃, 강제 제거');
                    popup.removeEventListener('transitionend', onTransitionEnd);
                    if (popup.parentNode) popup.remove();
                    if (backdrop.parentNode) backdrop.remove();
                    if (callback) callback();
                }
            }, 1000);
        }
        
        confirmBtn.onclick = closePopup;

        // 배경 클릭 시 닫기
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                console.log('배경 클릭으로 팝업 닫음');
                closePopup();
            }
        };

        return { backdrop, popup };
    }

    // 공지사항 클릭 이벤트 설정
    function setupNoticeClickEvents() {
        const noticeItems = document.querySelectorAll('.notices-list li');
        
        noticeItems.forEach(item => {
            // 클릭 가능함을 나타내는 스타일 추가
            item.style.cursor = 'pointer';
            item.style.transition = 'background-color 0.2s ease';
            
            // 호버 효과
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--main2)';
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            // 클릭 이벤트
            item.addEventListener('click', function() {
                const title = this.textContent.trim();
                const noticeData = noticeDataMap[title];
                
                if (noticeData) {
                    showAnnouncementDetail(noticeData.title, noticeData.date);
                }
            });
        });
    }

    // 공지사항 상세 모달 표시 함수
    function showAnnouncementDetail(title, date) {
        // 기존 모달 제거
        const existingModal = document.querySelector('.announcement-detail-modal');
        const existingBackdrop = document.getElementById('modalBackdrop');
        if (existingModal) existingModal.remove();
        if (existingBackdrop) existingBackdrop.remove();
        
        // 모달 생성
        const modal = document.createElement('div');
        modal.className = 'announcement-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        // 공지사항별 상세 내용
        let content = '';
        
        switch(title) {
            case '제21대 대통령선거 출마 의원 제외 안내':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">2025년 06월 03일에 실시하는 제21대 대통령선거 출마로 다음 의원의 정보가 제외됬었음을 알립니다.</p>
                    
                    <h4 style="color: var(--string); margin: 20px 0 10px;">더불어민주당</h4>
                    <p style="margin-bottom: 15px;">이재명</p>
                    <h4 style="color: var(--string); margin: 20px 0 10px;">개혁신당</h4>
                    <p style="margin-bottom: 15px;">이준석</p>
                `;
                break;

            case '국회의원 사진 및 정당 로고 출처 안내':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">저희가 사용하는 사진들은 각 주소에서 가져왔음을 명시합니다.</p>
                    <p style="margin-bottom: 15px;">저희는 어느 정당에 대한 악의가 없으며 비상업적 교육 목적으로 제작되었음을 알립니다.</p>
                    
                    <h4 style="color: var(--string); margin: 20px 0 10px;">정당 로고</h4>
                    <p style="margin-bottom: 15px;">각 정당의 홈페이지 및 PI 매뉴얼에 근거하여 준수하였습니다.</p>
                    <h4 style="color: var(--string); margin: 20px 0 10px;">국회의원 사진</h4>
                    <p style="margin-bottom: 15px;">열린국회정보 OpenAPI에서 제공하는 국회의원 사진을 사용하였습니다.</p>
                `; 
                break;

            case '서버 점검 안내 (1월 20일 02:00 ~ 06:00)':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">더 나은 서비스 제공을 위한 서버 점검이 예정되어 있어 안내드립니다.</p>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">점검 일시</h4>
                    <p style="margin-bottom: 15px;">2025년 1월 20일 (월) 02:00 ~ 06:00 (약 4시간)</p>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">점검 내용</h4>
                    <ul style="margin-left: 20px; margin-bottom: 15px; line-height: 1.8;">
                        <li>서버 안정성 개선</li>
                        <li>데이터베이스 최적화</li>
                        <li>보안 업데이트</li>
                    </ul>
                    
                    <h4 style="color: var(--light-blue); margin: 20px 0 10px;">참고사항</h4>
                    <p>점검 시간 동안은 서비스 이용이 불가능합니다. 불편을 드려 죄송합니다.</p>
                `;
                break;
                
            default:
                content = `<p>공지사항 내용이 준비 중입니다.</p>`;
        }
        
        modal.innerHTML = `
            <div style="border-bottom: 1px solid var(--side2); padding-bottom: 15px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 5px; color: var(--string);">${title}</h3>
                <p style="font-size: 14px; color: var(--example);">${date}</p>
            </div>
            <div style="line-height: 1.8; color: var(--string);">
                ${content}
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="this.closest('.announcement-detail-modal').remove(); document.getElementById('modalBackdrop').remove();" 
                        style="padding: 10px 30px; background: var(--light-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    확인
                </button>
            </div>
        `;
        
        // 배경 오버레이 생성
        const backdrop = document.createElement('div');
        backdrop.id = 'modalBackdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;
        
        backdrop.onclick = function() {
            modal.remove();
            backdrop.remove();
        };
        
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
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
