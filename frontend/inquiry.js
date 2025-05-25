document.addEventListener('DOMContentLoaded', function() {
    // 도움말 링크 클릭 이벤트
    const helpLinks = document.querySelectorAll('.help-section ul li a');
    const inquiryLinks = document.querySelectorAll('.inquiry-section ul li a');
    
    // 도움말 링크 처리
    helpLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const linkText = this.textContent.trim();
            
            switch(linkText) {
                case '백일하 서비스 사용법':
                    showUsageGuide();
                    break;
                case '퍼센트 변경':
                    window.location.href = 'percent.html';
                    break;
                default:
                    alert('페이지 준비 중입니다.');
            }
        });
    });
    
    // 문의 링크 처리
    inquiryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const linkText = this.textContent.trim();
            
            if (linkText === '문의하기') {
                showInquiryForm();
            }
        });
    });
    
    // 백일하 서비스 사용법 표시
    function showUsageGuide() {
        const existingModal = document.querySelector('.help-modal');
        const existingBackdrop = document.getElementById('modalBackdrop');
        if (existingModal) existingModal.remove();
        if (existingBackdrop) existingBackdrop.remove();
        
        const modal = document.createElement('div');
        modal.className = 'help-modal';
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
        
        modal.innerHTML = `
            <h3 style="margin-bottom: 20px; color: var(--string);">백일하 서비스 사용법</h3>
            <div style="line-height: 1.8;">
                <h4 style="color: var(--light-blue); margin: 15px 0;">1. 정당 정보 확인</h4>
                <p>• <strong>명예의 정당</strong>: 의정활동 성과가 높은 정당 순위를 확인할 수 있습니다.</p>
                <p>• <strong>정당 상세 퍼센트</strong>: 각 정당의 세부 활동 지표를 파이차트로 확인할 수 있습니다.</p>
                <p>• <strong>정당 비교하기</strong>: 두 정당의 의정활동을 직접 비교할 수 있습니다.</p>
                
                <h4 style="color: var(--light-blue); margin: 15px 0;">2. 국회의원 정보 확인</h4>
                <p>• <strong>국회의원 비교하기</strong>: 두 의원의 활동을 상세히 비교할 수 있습니다.</p>
                <p>• <strong>국회의원 상세정보</strong>: 특정 의원의 모든 의정활동 정보를 확인할 수 있습니다.</p>
                <p>• <strong>명예의 의원</strong>: 의정활동이 우수한 의원들의 순위를 확인할 수 있습니다.</p>
                
                <h4 style="color: var(--light-blue); margin: 15px 0;">3. 의정 활동 확인</h4>
                <p>• <strong>청원 현황</strong>: 국회에 제출된 청원들의 현황과 처리 상태를 확인할 수 있습니다.</p>
                <p>• <strong>본회의 현황</strong>: 본회의에서 처리된 법안들의 정보를 확인할 수 있습니다.</p>
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="document.querySelector('.help-modal').remove(); document.getElementById('modalBackdrop').remove();" 
                        style="padding: 10px 20px; background: var(--light-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    닫기
                </button>
            </div>
        `;
        
        const backdrop = createBackdrop();
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
    }
    
    // 퍼센트 계산 기준 표시
    function showPercentageGuide() {
        const existingModal = document.querySelector('.help-modal');
        const existingBackdrop = document.getElementById('modalBackdrop');
        if (existingModal) existingModal.remove();
        if (existingBackdrop) existingBackdrop.remove();
        
        const modal = document.createElement('div');
        modal.className = 'help-modal';
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
        
        modal.innerHTML = `
            <h3 style="margin-bottom: 20px; color: var(--string);">퍼센트 계산 기준</h3>
            <div style="line-height: 1.8;">
                <h4 style="color: var(--light-blue); margin: 15px 0;">평가 지표 설명</h4>
                
                <p><strong>1. 출석률 (25%)</strong><br>
                본회의 및 상임위원회 출석 횟수 / 전체 회의 수 × 100</p>
                
                <p><strong>2. 본회의 가결 (20%)</strong><br>
                발의한 법안 중 가결된 법안 수 / 전체 발의 법안 수 × 100</p>
                
                <p><strong>3. 청원 제안 (15%)</strong><br>
                소개한 청원 수 / 전체 의원 평균 청원 소개 수 × 100</p>
                
                <p><strong>4. 청원 결과 (10%)</strong><br>
                소개한 청원 중 채택된 청원 수 / 전체 소개 청원 수 × 100</p>
                
                <p><strong>5. 무효표 및 기권 (역지표, -10%)</strong><br>
                (무효표 + 기권 수) / 전체 표결 참여 수 × 100</p>
                
                <p><strong>6. 위원장 경험 (10%)</strong><br>
                위원장 역임 여부 및 기간에 따른 가산점</p>
                
                <p><strong>7. 투표 일치/불일치 (10%)</strong><br>
                소속 정당의 당론과 투표 일치도</p>
                
                <div style="margin-top: 20px; padding: 15px; background-color: var(--main2); border-radius: 5px;">
                    <p style="margin: 0;"><strong>종합 점수 계산</strong><br>
                    각 지표별 점수를 가중치를 적용하여 합산한 후 100점 만점으로 환산합니다.</p>
                </div>
            </div>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="document.querySelector('.help-modal').remove(); document.getElementById('modalBackdrop').remove();" 
                        style="padding: 10px 20px; background: var(--light-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    닫기
                </button>
            </div>
        `;
        
        const backdrop = createBackdrop();
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
    }
    
    // 문의하기 폼 표시 함수
    function showInquiryForm() {
        // 기존 모달 제거
        const existingModal = document.querySelector('.inquiry-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.className = 'inquiry-modal';
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
            max-width: 500px;
            width: 90%;
        `;
        
        modal.innerHTML = `
            <h3 style="margin-bottom: 20px; color: var(--string);">문의하기</h3>
            <form id="inquiryForm">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">이메일 <span style="color: red;">*</span></label>
                    <input type="email" name="user_email" id="user_email" 
                           style="width: 100%; padding: 10px; border: 1px solid var(--side2); border-radius: 5px;" 
                           required placeholder="example@email.com">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">문의 유형 <span style="color: red;">*</span></label>
                    <select name="inquiry_type" id="inquiry_type" 
                            style="width: 100%; padding: 10px; border: 1px solid var(--side2); border-radius: 5px;" 
                            required>
                        <option value="">선택해주세요</option>
                        <option value="usage">사용법 문의</option>
                        <option value="error">오류 신고</option>
                        <option value="suggestion">개선 제안</option>
                        <option value="other">기타</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">제목 <span style="color: red;">*</span></label>
                    <input type="text" name="subject" id="subject" 
                           style="width: 100%; padding: 10px; border: 1px solid var(--side2); border-radius: 5px;" 
                           required placeholder="문의 제목을 입력해주세요">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">문의 내용 <span style="color: red;">*</span></label>
                    <textarea name="message" id="message" 
                              style="width: 100%; padding: 10px; border: 1px solid var(--side2); border-radius: 5px; min-height: 150px; resize: vertical;" 
                              required placeholder="문의하실 내용을 자세히 입력해주세요"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="this.closest('.inquiry-modal').remove();"
                            style="padding: 10px 20px; border: 1px solid var(--side2); background: white; border-radius: 5px; cursor: pointer;">
                        취소
                    </button>
                    <button type="submit" id="submitBtn"
                            style="padding: 10px 20px; background: var(--light-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                        전송
                    </button>
                </div>
            </form>
        `;
        
        document.body.appendChild(modal);
        
        // 폼 제출 이벤트
        document.getElementById('inquiryForm').onsubmit = function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = '전송 중...';
            
            // 폼 데이터 수집
            const formData = {
                user_name: document.getElementById('user_name').value,
                user_email: document.getElementById('user_email').value,
                inquiry_type: document.getElementById('inquiry_type').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value,
                date: new Date().toLocaleString('ko-KR')
            };
            
            // localStorage에 저장
            saveInquiryToLocal(formData);
            
            // 성공 메시지 표시
            setTimeout(() => {
                modal.remove();
                showSuccessMessage();
            }, 1000);
        };
    }
    
    // 배경 오버레이 생성
    function createBackdrop() {
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
            const modal = document.querySelector('.help-modal, .inquiry-modal');
            if (modal) modal.remove();
            backdrop.remove();
        };
        
        return backdrop;
    }
    
    // 문의 내역을 localStorage에 저장
    function saveInquiryToLocal(data) {
        const inquiries = JSON.parse(localStorage.getItem('inquiries') || '[]');
        inquiries.push({
            id: Date.now(),
            ...data,
            status: 'pending'
        });
        localStorage.setItem('inquiries', JSON.stringify(inquiries));
    }
    
    // 성공 메시지 표시
    function showSuccessMessage() {
        const successModal = document.createElement('div');
        successModal.className = 'success-modal';
        successModal.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            z-index: 1001;
            text-align: center;
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        successModal.innerHTML = `
            <div style="color: #4CAF50; font-size: 30px;">✓</div>
            <div style="text-align: left;">
                <h4 style="margin: 0 0 5px 0; color: var(--string); font-size: 16px;">문의가 접수되었습니다!</h4>
                <p style="margin: 0; color: var(--example); font-size: 14px;">입력하신 이메일로 답변드리겠습니다.</p>
            </div>
            <button onclick="this.parentElement.remove()" 
                    style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--example); margin-left: 10px;">
                ×
            </button>
        `;
        
        document.body.appendChild(successModal);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (successModal.parentElement) {
                successModal.remove();
            }
        }, 5000);
    }
    
    // 페이지 로드 시 애니메이션 효과
    const sections = document.querySelectorAll('.help-section, .inquiry-section');
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.5s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, index * 200);
    });
});
