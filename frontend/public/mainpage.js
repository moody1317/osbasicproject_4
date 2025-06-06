document.addEventListener('DOMContentLoaded', function() {
    // === API 연결 및 데이터 로드 기능 ===
    
    // API 연결 상태 확인
    if (typeof window.APIService === 'undefined') {
        console.error('❌ APIService를 찾을 수 없습니다. global_sync.js가 로드되었는지 확인하세요.');
        showError('API 서비스 연결 실패');
    } else {
        console.log('✅ APIService 연결됨');
        // API 데이터 로드 (팝업보다 늦게 실행)
        setTimeout(loadMainPageData, 1500);
    }

    // 전역 변수
    let isLoading = false;

    // 알림 표시 함수
    function showNotification(message, type = 'info') {
        if (window.APIService && window.APIService.showNotification) {
            window.APIService.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 에러 메시지 표시
    function showError(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
        
        showNotification(message, 'error');
    }

    // 로딩 상태 표시
    function showLoading(show = true) {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            if (show) {
                card.style.opacity = '0.6';
                card.style.pointerEvents = 'none';
            } else {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
        });
    }

    // 정당명 정규화
    function normalizePartyName(partyName) {
        if (!partyName) return '정보없음';
        
        const nameMapping = {
            '더불어민주당': '더불어민주당',
            '민주당': '더불어민주당',
            '국민의힘': '국민의힘',
            '국민의 힘': '국민의힘',
            '조국혁신당': '조국혁신당',
            '개혁신당': '개혁신당',
            '진보당': '진보당',
            '기본소득당': '기본소득당',
            '사회민주당': '사회민주당',
            '무소속': '무소속',
            '없음': '무소속'
        };

        return nameMapping[partyName] || partyName;
    }

    // API에서 정당 순위 데이터 가져오기
    async function fetchPartyRankingData() {
        try {
            console.log('📊 정당 순위 데이터 로드 중...');

            const [partyPerformance, partyStats] = await Promise.all([
                window.APIService.getPartyWeightedPerformanceData(),
                window.APIService.getPartyPerformanceStatsData()
            ]);

            // 데이터 가공 및 정렬
            let processedData = [];

            if (Array.isArray(partyPerformance) && partyPerformance.length > 0) {
                processedData = partyPerformance.map(party => ({
                    name: normalizePartyName(party.party || party.party_name || party.political_party),
                    score: calculatePartyScore(party),
                    rawData: party
                }));
            } else if (Array.isArray(partyStats) && partyStats.length > 0) {
                processedData = partyStats.map(party => ({
                    name: normalizePartyName(party.party || party.party_name || party.political_party),
                    score: calculatePartyScoreFromStats(party),
                    rawData: party
                }));
            }

            // 중복 제거 및 정렬
            const uniqueParties = processedData.reduce((acc, current) => {
                const existingParty = acc.find(party => party.name === current.name);
                if (!existingParty) {
                    acc.push(current);
                } else if (current.score > existingParty.score) {
                    // 더 높은 점수의 데이터로 교체
                    const index = acc.indexOf(existingParty);
                    acc[index] = current;
                }
                return acc;
            }, []);

            // 점수순으로 정렬
            uniqueParties.sort((a, b) => b.score - a.score);

            console.log('✅ 정당 순위 데이터 로드 완료:', uniqueParties.length, '개 정당');
            return uniqueParties.slice(0, 3); // 상위 3개만 반환

        } catch (error) {
            console.error('❌ 정당 순위 데이터 로드 실패:', error);
            return getDefaultPartyRanking();
        }
    }

    // API에서 국회의원 순위 데이터 가져오기
    async function fetchMemberRankingData() {
        try {
            console.log('👥 국회의원 순위 데이터 로드 중...');

            const [memberPerformance, memberData] = await Promise.all([
                window.APIService.getPerformanceData(),
                window.APIService.getAllMembers()
            ]);

            // 데이터 가공 및 정렬
            let processedData = [];

            if (Array.isArray(memberPerformance) && memberPerformance.length > 0) {
                processedData = memberPerformance.map(member => {
                    // 해당 의원의 추가 정보 찾기
                    const memberInfo = Array.isArray(memberData) ? 
                        memberData.find(m => 
                            (m.id && m.id === member.member_id) ||
                            (m.name && m.name === member.member_name) ||
                            (m.member_name && m.member_name === member.member_name)
                        ) : null;

                    return {
                        name: member.member_name || member.name || '정보없음',
                        party: normalizePartyName(
                            memberInfo?.party || 
                            memberInfo?.party_name || 
                            member.party || 
                            member.party_name || 
                            '정보없음'
                        ),
                        score: calculateMemberScore(member),
                        rawData: member
                    };
                });
            } else if (Array.isArray(memberData) && memberData.length > 0) {
                // Performance 데이터가 없으면 memberData로 대체
                processedData = memberData.map(member => ({
                    name: member.name || member.member_name || '정보없음',
                    party: normalizePartyName(member.party || member.party_name || member.political_party),
                    score: Math.random() * 100, // 임시 점수
                    rawData: member
                }));
            }

            // 점수순으로 정렬
            processedData.sort((a, b) => b.score - a.score);

            console.log('✅ 국회의원 순위 데이터 로드 완료:', processedData.length, '명');
            return processedData.slice(0, 3); // 상위 3명만 반환

        } catch (error) {
            console.error('❌ 국회의원 순위 데이터 로드 실패:', error);
            return getDefaultMemberRanking();
        }
    }

    // 정당 점수 계산 (성과 기반)
    function calculatePartyScore(party) {
        try {
            let score = 0;
            
            // 다양한 필드명에 대응
            const attendance = party.attendance_rate || party.attendance || party.avg_attendance || 0;
            const billPass = party.bill_pass_rate || party.pass_rate || party.avg_pass_rate || 0;
            const activity = party.activity_score || party.total_activity || party.performance_score || 0;
            
            score += attendance * 0.3; // 출석률 30%
            score += billPass * 0.4;   // 가결률 40%
            score += activity * 0.3;   // 활동점수 30%
            
            return Math.round(score);
        } catch (error) {
            return Math.random() * 100;
        }
    }

    // 정당 통계 기반 점수 계산
    function calculatePartyScoreFromStats(party) {
        try {
            let score = 0;
            
            const members = party.member_count || party.total_members || 1;
            const totalBills = party.total_bills || party.bill_count || 0;
            const passedBills = party.passed_bills || party.passed_count || 0;
            const attendance = party.avg_attendance || party.attendance_avg || 0;
            
            const passRate = totalBills > 0 ? (passedBills / totalBills) * 100 : 0;
            
            score += attendance * 0.4;     // 출석률 40%
            score += passRate * 0.4;       // 가결률 40%
            score += Math.min(members * 2, 20); // 의원수 보너스 (최대 20점)
            
            return Math.round(score);
        } catch (error) {
            return Math.random() * 100;
        }
    }

    // 국회의원 점수 계산 (성과 기반)
    function calculateMemberScore(member) {
        try {
            let score = 0;
            
            const attendance = member.attendance_rate || member.attendance || 0;
            const billCount = member.bill_count || member.bills_proposed || member.total_bills || 0;
            const passRate = member.pass_rate || member.bill_pass_rate || 0;
            const activity = member.activity_score || member.total_activity || 0;
            const committee = member.committee_activity || member.committee_score || 0;
            
            score += attendance * 0.25;    // 출석률 25%
            score += Math.min(billCount * 2, 30); // 법안수 (최대 30점)
            score += passRate * 0.25;      // 가결률 25%
            score += activity * 0.15;      // 활동점수 15%
            score += committee * 0.1;      // 위원회 활동 10%
            
            return Math.round(score);
        } catch (error) {
            return Math.random() * 100;
        }
    }

    // 기본 정당 순위 (API 실패 시)
    function getDefaultPartyRanking() {
        return [
            { name: '더불어민주당', score: 87 },
            { name: '국민의힘', score: 82 },
            { name: '조국혁신당', score: 78 }
        ];
    }

    // 기본 국회의원 순위 (API 실패 시)
    function getDefaultMemberRanking() {
        return [
            { name: '김민석', party: '더불어민주당', score: 94 },
            { name: '김상훈', party: '국민의힘', score: 91 },
            { name: '이재명', party: '더불어민주당', score: 88 }
        ];
    }

    // 정당 순위 카드 업데이트
    function updatePartyRankingCard(partyData) {
        const partyCard = document.querySelector('.card:first-child');
        const rankingList = partyCard.querySelector('.ranking-list');
        
        rankingList.innerHTML = '';
        
        partyData.forEach((party, index) => {
            const rankingItem = document.createElement('li');
            rankingItem.className = 'ranking-item';
            rankingItem.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <div class="info">
                    <div class="name">${party.name}</div>
                </div>
                <div class="percentage">${party.score}%</div>
            `;
            rankingList.appendChild(rankingItem);
        });
        
        console.log('✅ 정당 순위 카드 업데이트 완료');
    }

    // 국회의원 순위 카드 업데이트
    function updateMemberRankingCard(memberData) {
        const memberCard = document.querySelector('.card:last-child');
        const rankingList = memberCard.querySelector('.ranking-list');
        
        rankingList.innerHTML = '';
        
        memberData.forEach((member, index) => {
            const rankingItem = document.createElement('li');
            rankingItem.className = 'ranking-item';
            rankingItem.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <div class="info">
                    <div class="name">${member.name}</div>
                    <div class="party-name">${member.party}</div>
                </div>
                <div class="percentage">${member.score}%</div>
            `;
            rankingList.appendChild(rankingItem);
        });
        
        console.log('✅ 국회의원 순위 카드 업데이트 완료');
    }

    // 메인 데이터 로드 함수
    async function loadMainPageData() {
        if (!window.APIService) {
            console.warn('⚠️ APIService 없음 - 기본 데이터 사용');
            updatePartyRankingCard(getDefaultPartyRanking());
            updateMemberRankingCard(getDefaultMemberRanking());
            return;
        }

        console.log('🚀 메인페이지 데이터 로드 시작...');
        
        try {
            showLoading(true);
            
            // 정당 순위와 국회의원 순위 동시 로드
            const [partyRanking, memberRanking] = await Promise.all([
                fetchPartyRankingData(),
                fetchMemberRankingData()
            ]);
            
            // 카드 업데이트
            updatePartyRankingCard(partyRanking);
            updateMemberRankingCard(memberRanking);
            
            showNotification('메인페이지 데이터 로드 완료', 'success');
            console.log('✅ 메인페이지 데이터 로드 완료');
            
        } catch (error) {
            console.error('❌ 메인페이지 데이터 로드 실패:', error);
            
            // 기본 데이터로 폴백
            updatePartyRankingCard(getDefaultPartyRanking());
            updateMemberRankingCard(getDefaultMemberRanking());
            
            showError('데이터 로드에 실패했습니다. 기본 데이터를 표시합니다.');
        } finally {
            showLoading(false);
        }
    }

    // === 기존 네비게이션 및 팝업 기능 유지 ===

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
        '제21대 대통령선거 당선으로 인한 의원 안내': {
            date: '2025.06.04',
            title: '제21대 대통령선거 당선으로 인한 의원 안내'
        },
        '제21대 대통령선거 출마 의원 제외 안내': {
            date: '2025.05.26',
            title: '제21대 대통령선거 출마 의원 제외 안내'
        },
        '국회의원 사진 출처 안내': {
            date: '2025.05.25',
            title: '국회의원 사진 출처 안내'
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

        // 팝업 열기 애니메이션
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
            case '제21대 대통령선거 당선으로 인한 의원 안내':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">2025년 06월 03일에 실시하는 제21대 대통령선거 당선을 진심으로 축하드립니다.</p>

                    <h4 style="color: var(--string); margin: 20px 0 10px;">더불어민주당</h4>
                    <p style="margin-bottom: 15px;">이재명</p>

                    <p style="margin-bottom: 15px;">다음 의원의 데이터가 추가되었습니다.</p>
                    <h4 style="color: var(--string); margin: 20px 0 10px;">개혁신당</h4>
                    <p style="margin-bottom: 15px;">이준석</p>

                    <p style="margin-bottom: 15px;">이재명 대통령 당선으로 현재 총 국회의원석은 299명입니다.</p>
                `;
                break;

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

            case '국회의원 사진 출처 안내':
                content = `
                    <p style="margin-bottom: 15px;">안녕하세요, 백일하 서비스를 이용해 주시는 여러분께 감사드립니다.</p>
                    <p style="margin-bottom: 15px;">저희가 사용하는 사진들은 각 주소에서 가져왔음을 명시합니다.</p>
                    <p style="margin-bottom: 15px;">저희는 어느 정당에 대한 악의가 없으며 비상업적 교육 목적으로 제작되었음을 알립니다.</p>
                    
                    <h4 style="color: var(--string); margin: 20px 0 10px;">국회의원 사진</h4>
                    <p style="margin-bottom: 15px;">열린국회정보 OpenAPI에서 제공하는 국회의원 사진을 사용하였습니다.</p>
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

    // 디버깅용 전역 함수
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

    // API 데이터 디버깅 함수
    window.mainPageDebug = {
        reloadData: () => loadMainPageData(),
        showPartyData: () => console.log('정당 데이터:', document.querySelector('.card:first-child')),
        showMemberData: () => console.log('의원 데이터:', document.querySelector('.card:last-child')),
        showInfo: () => {
            console.log('📊 메인페이지 정보:');
            console.log('- API 서비스:', !!window.APIService);
            console.log('- 로딩 상태:', isLoading);
        }
    };
    
    console.log('🎯 개별 팝업 제어 시스템 + API 연동 활성화!');
    console.log('팝업 디버깅: window.debugPopup.checkStatus()');
    console.log('API 디버깅: window.mainPageDebug.showInfo()');
    console.log('✅ 메인페이지 스크립트 로드 완료');
});
