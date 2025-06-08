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

    // 🎯 API에서 정당 순위 데이터 가져오기 (수정된 버전)
    async function fetchPartyRankingData() {
        try {
            console.log('📊 정당 순위 데이터 로드 중...');

            // 🔄 새로운 API 구조에 맞춰서 데이터 가져오기
            const partyData = await window.APIService.getPartyPerformance();
            
            if (!Array.isArray(partyData) || partyData.length === 0) {
                console.warn('정당 데이터가 없습니다. 기본값 사용');
                return getDefaultPartyRanking();
            }

            console.log('🔍 정당 원본 데이터 샘플:', partyData.slice(0, 2));

            // 🎯 새로운 데이터 구조에 맞춰서 매핑
            const processedData = partyData
                .filter(party => {
                    return party.party && 
                           party.party !== '알 수 없음' && 
                           party.avg_total_score !== undefined && 
                           party.avg_total_score !== null;
                })
                .map(party => ({
                    name: normalizePartyName(party.party),
                    score: Math.round(party.avg_total_score) || 0,
                    originalData: party // 디버깅용
                }))
                .sort((a, b) => b.score - a.score) // 점수순 정렬
                .slice(0, 3); // 상위 3개만

            console.log('✅ 정당 순위 데이터 가공 완료:', processedData);
            
            return processedData.map((party, index) => ({
                rank: index + 1,
                name: party.name,
                score: party.score
            }));

        } catch (error) {
            console.error('❌ 정당 순위 데이터 로드 실패:', error);
            return getDefaultPartyRanking();
        }
    }

    // 🎯 API에서 국회의원 순위 데이터 가져오기 (수정된 버전)
    async function fetchMemberRankingData() {
        try {
            console.log('👥 국회의원 순위 데이터 로드 중...');

            // 🎯 올바른 API 사용: /performance/api/performance/
            const memberPerformanceData = await window.APIService.getMemberPerformance();
            
            if (!Array.isArray(memberPerformanceData) || memberPerformanceData.length === 0) {
                console.warn('의원 성과 데이터가 없습니다. 기본값 사용');
                return getDefaultMemberRanking();
            }

            // 🎯 total_score 기준으로 정렬하여 상위 3명 선택
            const top3 = memberPerformanceData
                .filter(member => {
                    return member.lawmaker_name && 
                           member.lawmaker_name !== '알 수 없음' && 
                           member.total_score !== undefined && 
                           member.total_score !== null &&
                           member.total_score > 0; // 0보다 큰 점수만
                })
                .sort((a, b) => (b.total_score || 0) - (a.total_score || 0)) // total_score 기준 내림차순
                .slice(0, 3) // 상위 3명만
                .map((member, index) => ({
                    rank: index + 1,
                    name: member.lawmaker_name,           // API 필드명: lawmaker_name
                    party: normalizePartyName(member.party) || '정보없음', // API 필드명: party  
                    score: Math.round(member.total_score) || 0            // API 필드명: total_score
                }));

            console.log('✅ 국회의원 순위 데이터 로드 완료:', top3.length, '명');
            console.log('🔍 상위 3명 데이터:', top3);
            return top3;

        } catch (error) {
            console.error('❌ 국회의원 순위 데이터 로드 실패:', error);
            return getDefaultMemberRanking();
        }
    }

    // 기본 정당 순위 (API 실패 시)
    function getDefaultPartyRanking() {
        return [
            { rank: 1, name: '더불어민주당', score: 87 },
            { rank: 2, name: '국민의힘', score: 82 },
            { rank: 3, name: '조국혁신당', score: 78 }
        ];
    }

    // 기본 국회의원 순위 (API 실패 시)
    function getDefaultMemberRanking() {
        return [
            { rank: 1, name: '김민석', party: '더불어민주당', score: 94 },
            { rank: 2, name: '김상훈', party: '국민의힘', score: 91 },
            { rank: 3, name: '이재명', party: '더불어민주당', score: 88 }
        ];
    }

    // 🔄 정당 순위 카드 업데이트 (HTML 순서와 정확히 매칭)
    function updatePartyRankingCard(partyData) {
        const partyCard = document.querySelector('.card:first-child');
        const rankingList = partyCard.querySelector('.ranking-list');
        
        if (!rankingList) {
            console.error('❌ 정당 순위 리스트를 찾을 수 없습니다');
            return;
        }
        
        // 기존 내용 비우기
        rankingList.innerHTML = '';
        
        // HTML 구조와 정확히 매칭되는 순서로 생성
        partyData.forEach((party, index) => {
            const rankingItem = document.createElement('li');
            rankingItem.className = 'ranking-item';
            
            // HTML 구조: rank-number > info > name > percentage
            rankingItem.innerHTML = `
                <div class="rank-number">${party.rank || (index + 1)}</div>
                <div class="info">
                    <div class="name">${party.name}</div>
                </div>
                <div class="percentage">${party.score}%</div>
            `;
            
            rankingList.appendChild(rankingItem);
        });
        
        console.log('✅ 정당 순위 카드 업데이트 완료');
    }

    // 🔄 국회의원 순위 카드 업데이트 (HTML 순서와 정확히 매칭)
    function updateMemberRankingCard(memberData) {
        const memberCard = document.querySelector('.card:last-child');
        const rankingList = memberCard.querySelector('.ranking-list');
        
        if (!rankingList) {
            console.error('❌ 국회의원 순위 리스트를 찾을 수 없습니다');
            return;
        }
        
        // 기존 내용 비우기
        rankingList.innerHTML = '';
        
        // HTML 구조와 정확히 매칭되는 순서로 생성
        memberData.forEach((member, index) => {
            const rankingItem = document.createElement('li');
            rankingItem.className = 'ranking-item';
            
            // HTML 구조: rank-number > info > name + party-name > percentage
            rankingItem.innerHTML = `
                <div class="rank-number">${member.rank || (index + 1)}</div>
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

    // === 🎯 수정된 메인 데이터 로드 함수 ===
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
        
        // 🎯 올바른 API 호출로 정당 순위와 국회의원 순위 동시 로드
        const [partyRanking, memberRanking] = await Promise.allSettled([
            fetchPartyRankingData(),
            fetchMemberRankingData() // 수정된 함수 사용
        ]);
        
        // 정당 순위 업데이트
        if (partyRanking.status === 'fulfilled') {
            updatePartyRankingCard(partyRanking.value);
        } else {
            console.warn('정당 순위 로드 실패, 기본값 사용');
            updatePartyRankingCard(getDefaultPartyRanking());
        }
        
        // 🎯 국회의원 순위 업데이트 (API 데이터 사용)
        if (memberRanking.status === 'fulfilled') {
            updateMemberRankingCard(memberRanking.value);
            console.log('✅ 실제 API 데이터로 명예의 의원 업데이트 완료');
        } else {
            console.warn('국회의원 순위 로드 실패, 기본값 사용');
            updateMemberRankingCard(getDefaultMemberRanking());
        }
        
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

    // === 🔄 가중치 변경 실시간 업데이트 시스템 ===
    
    // 가중치 변경 감지 및 자동 새로고침
    function setupWeightChangeListener() {
        try {
            console.log('[MainPage] 🔄 가중치 변경 감지 시스템 설정...');
            
            // 1. localStorage 이벤트 감지 (다른 페이지에서 가중치 변경 시)
            window.addEventListener('storage', function(event) {
                if (event.key === 'weight_change_event' && event.newValue) {
                    try {
                        const changeData = JSON.parse(event.newValue);
                        console.log('[MainPage] 📢 가중치 변경 감지:', changeData);
                        handleWeightUpdate(changeData, 'localStorage');
                    } catch (e) {
                        console.warn('[MainPage] 가중치 변경 데이터 파싱 실패:', e);
                    }
                }
            });
            
            // 2. BroadcastChannel 감지 (최신 브라우저)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const weightChannel = new BroadcastChannel('weight_updates');
                    weightChannel.addEventListener('message', function(event) {
                        console.log('[MainPage] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                        handleWeightUpdate(event.data, 'BroadcastChannel');
                    });
                    
                    // 페이지 언로드 시 채널 정리
                    window.addEventListener('beforeunload', () => {
                        weightChannel.close();
                    });
                    
                    console.log('[MainPage] ✅ BroadcastChannel 설정 완료');
                } catch (e) {
                    console.warn('[MainPage] BroadcastChannel 설정 실패:', e);
                }
            }
            
            // 3. 커스텀 이벤트 감지 (같은 페이지 내)
            document.addEventListener('weightSettingsChanged', function(event) {
                console.log('[MainPage] 🎯 커스텀 이벤트 가중치 변경 감지:', event.detail);
                handleWeightUpdate(event.detail, 'customEvent');
            });
            
            // 4. 주기적 체크 (폴백)
            let lastWeightCheckTime = localStorage.getItem('last_weight_update') || '0';
            setInterval(function() {
                const currentCheckTime = localStorage.getItem('last_weight_update') || '0';
                
                if (currentCheckTime !== lastWeightCheckTime && currentCheckTime !== '0') {
                    console.log('[MainPage] ⏰ 주기적 체크로 가중치 변경 감지');
                    lastWeightCheckTime = currentCheckTime;
                    
                    const changeData = {
                        type: 'weights_updated',
                        timestamp: new Date(parseInt(currentCheckTime)).toISOString(),
                        source: 'periodic_check'
                    };
                    
                    handleWeightUpdate(changeData, 'periodicCheck');
                }
            }, 5000);
            
            console.log('[MainPage] ✅ 가중치 변경 감지 시스템 설정 완료');
            
        } catch (error) {
            console.error('[MainPage] ❌ 가중치 변경 감지 시스템 설정 실패:', error);
        }
    }
    
    // === 🎯 가중치 업데이트 처리 함수 수정 ===
async function handleWeightUpdate(changeData, source) {
    try {
        if (isLoading) {
            console.log('[MainPage] 🔄 이미 로딩 중이므로 가중치 업데이트 스킵');
            return;
        }
        
        console.log(`[MainPage] 🔄 가중치 업데이트 처리 시작 (${source})`);
        
        // 사용자에게 업데이트 알림
        showNotification('가중치가 변경되었습니다. 총 점수를 다시 계산하여 메인페이지를 새로고침합니다...', 'info');
        
        // 🎯 서버에서 total_score 재계산 시간을 고려한 딜레이 (5초)
        setTimeout(async () => {
            try {
                // 🎯 새로운 total_score 데이터로 업데이트
                await loadMainPageData();
                
                console.log('[MainPage] ✅ 가중치 업데이트 완료 - total_score 기반');
                showNotification('새로운 가중치가 적용되어 총 점수가 업데이트되었습니다! 🎉', 'success');
                
                // 응답 전송 (percent 페이지 모니터링용)
                try {
                    const response = {
                        page: 'mainpage.html',
                        timestamp: new Date().toISOString(),
                        success: true,
                        source: source,
                        scoreFieldsUpdated: ['total_score'] // 업데이트된 점수 필드 명시
                    };
                    localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                    setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
                } catch (e) {
                    console.warn('[MainPage] 응답 전송 실패:', e);
                }
                
            } catch (error) {
                console.error('[MainPage] ❌ 가중치 업데이트 데이터 로드 실패:', error);
                showNotification('가중치 업데이트에 실패했습니다. 다시 시도해주세요.', 'error');
            }
        }, 5000); // 5초 대기 (서버에서 total_score 재계산 시간)
        
    } catch (error) {
        console.error('[MainPage] ❌ 가중치 업데이트 처리 실패:', error);
        showNotification('가중치 업데이트 처리에 실패했습니다.', 'error');
    }
}
    // 수동 새로고침 함수들 (외부에서 호출 가능)
    window.refreshMainPageData = function() {
        console.log('[MainPage] 🔄 수동 새로고침 요청');
        loadMainPageData();
    };

    // WeightSync 호환 함수들
    window.refreshMemberDetails = function() {
        console.log('[MainPage] 🔄 의원 데이터 새로고침 (WeightSync 호환)');
        return loadMainPageData();
    };

    window.refreshPartyRanking = function() {
        console.log('[MainPage] 🔄 정당 데이터 새로고침 (WeightSync 호환)');
        return loadMainPageData();
    };

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

    // 가중치 변경 감지 시스템 설정
    setupWeightChangeListener();

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

    // 🎯 API 데이터 디버깅 함수 (수정된 버전)
    window.mainPageDebug = {
        reloadData: () => loadMainPageData(),
        refreshData: () => loadMainPageData(), // WeightSync 호환
        
        // 🔍 API 응답 구조 확인
        checkAPIStructure: async () => {
            console.log('🔍 API 구조 확인 중...');
            try {
                const [partyData, memberData] = await Promise.all([
                    window.APIService.getPartyPerformance(),
                    window.APIService.getMemberPerformance()
                ]);
                
                console.log('📊 정당 API 응답 샘플:', partyData?.slice(0, 2));
                console.log('👤 의원 API 응답 샘플:', memberData?.slice(0, 2));
                
                // 필드 존재 여부 확인
                if (partyData && partyData.length > 0) {
                    const party = partyData[0];
                    console.log('정당 필드 확인:', {
                        party: party.party,
                        avg_total_score: party.avg_total_score
                    });
                }
                
                if (memberData && memberData.length > 0) {
                    const member = memberData[0];
                    console.log('의원 필드 확인:', {
                        lawmaker_name: member.lawmaker_name,
                        party: member.party,
                        total_score: member.total_score
                    });
                }
                
            } catch (error) {
                console.error('API 구조 확인 실패:', error);
            }
        },
        
        showPartyData: () => console.log('정당 데이터:', document.querySelector('.card:first-child')),
        showMemberData: () => console.log('의원 데이터:', document.querySelector('.card:last-child')),
        
        showInfo: () => {
            console.log('📊 메인페이지 정보:');
            console.log('- API 서비스:', !!window.APIService);
            console.log('- 로딩 상태:', isLoading);
            console.log('- API 준비 상태:', window.APIService?._isReady);
        },
        
        testHTMLMapping: () => {
            console.log('🔍 HTML 매핑 테스트...');
            const partyCard = document.querySelector('.card:first-child .ranking-list');
            const memberCard = document.querySelector('.card:last-child .ranking-list');
            console.log('정당 카드 구조:', partyCard?.innerHTML);
            console.log('의원 카드 구조:', memberCard?.innerHTML);
        },
        
        simulateWeightChange: () => {
            console.log('🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            handleWeightUpdate(changeData, 'debug');
        },
        
        // 🎯 새로운 API 테스트 함수
        testNewAPIMapping: async () => {
            console.log('🧪 새로운 API 매핑 테스트...');
            try {
                const partyRanking = await fetchPartyRankingData();
                const memberRanking = await fetchMemberRankingData();
                
                console.log('✅ 가공된 정당 순위:', partyRanking);
                console.log('✅ 가공된 의원 순위:', memberRanking);
                
                return { partyRanking, memberRanking };
            } catch (error) {
                console.error('❌ API 매핑 테스트 실패:', error);
            }
        }
    };
    
    console.log('🎯 수정된 API 데이터 매핑 시스템 활성화!');
    console.log('팝업 디버깅: window.debugPopup.checkStatus()');
    console.log('API 디버깅: window.mainPageDebug.showInfo()');
    console.log('🎯 새로운 API 구조 확인: window.mainPageDebug.checkAPIStructure()');
    console.log('🧪 새로운 매핑 테스트: window.mainPageDebug.testNewAPIMapping()');
    console.log('✅ 메인페이지 스크립트 로드 완료 (새로운 API 구조 반영)');
});
