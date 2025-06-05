// ===== 정당 순위 페이지 전용 스크립트 =====

document.addEventListener('DOMContentLoaded', function() {
    let sortOrder = 'asc'; // 기본값은 오름차순 (1위부터)
    let partyData = []; // 실제 API에서 가져올 데이터

    // ===== 환경 감지 =====
    
    function isVercelEnvironment() {
        return window.percentSync ? window.percentSync.isVercelDeployment : false;
    }

    // ===== API 데이터 처리 함수들 =====

    // 실제 API에서 정당 순위 데이터 가져오기
    async function fetchPartyRanking() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            showLoading();
            console.log(`[${envType}] 정당 순위 데이터를 가져오는 중...`);
            
            // global_sync.js API 서비스 확인
            if (!window.APIService) {
                throw new Error('APIService가 로드되지 않음 - global_sync.js 먼저 로드 필요');
            }
            
            // 실제 API 호출 - APIService.getPartyRanking() 사용
            const data = await window.APIService.getPartyRanking();
            
            if (data && Array.isArray(data)) {
                partyData = data.map((party, index) => ({
                    rank: index + 1,
                    name: party.party_name || party.name || '정당명 없음',
                    leader: party.leader || getDefaultLeader(party.party_name || party.name),
                    homepage: party.homepage || getDefaultHomepage(party.party_name || party.name),
                    totalScore: party.weighted_performance || party.total_score || party.score || 0,
                    memberCount: party.member_count || 0,
                    logo: party.logo || null,
                    // 추가 데이터
                    performance: party.performance || 0,
                    weightedPerformance: party.weighted_performance || 0,
                    // API 원본 데이터 보존
                    rawData: party
                }));
                
                console.log(`[${envType}] 정당 순위 데이터 로드 완료:`, partyData.length, '개 정당');
                console.log(`[${envType}] API 응답 샘플:`, data[0]); // 디버깅용
                
                // 성공 메시지 표시
                showSuccessMessage(`${partyData.length}개 정당 데이터를 성공적으로 불러왔습니다.`);
                
            } else {
                throw new Error('잘못된 데이터 형식 또는 빈 배열');
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 정당 순위 데이터 로드 실패:`, error);
            
            // API 실패 시 정당별 실적 통계 API 시도
            try {
                console.log(`[${envType}] 대체 API로 정당별 실적 통계 데이터 시도...`);
                const statsData = await window.APIService.getPartyPerformanceStats();
                
                if (statsData && Array.isArray(statsData)) {
                    partyData = statsData.map((party, index) => ({
                        rank: index + 1,
                        name: party.party_name || party.name || '정당명 없음',
                        leader: party.leader || getDefaultLeader(party.party_name || party.name),
                        homepage: party.homepage || getDefaultHomepage(party.party_name || party.name),
                        totalScore: party.total_performance || party.performance || party.score || 0,
                        memberCount: party.member_count || 0,
                        logo: party.logo || null,
                        rawData: party
                    }));
                    
                    console.log(`[${envType}] 대체 API로 정당 데이터 로드 완료:`, partyData.length, '개 정당');
                    showWarningMessage('주 API 실패로 대체 데이터를 사용합니다.');
                } else {
                    throw new Error('대체 API도 실패');
                }
                
            } catch (secondError) {
                console.error(`[${envType}] 대체 API도 실패:`, secondError);
                
                // 모든 API 실패 시 기본 데이터 사용
                partyData = getDefaultPartyData();
                showError(`${envType} 환경에서 API 연결 실패로 기본 데이터를 사용합니다.`);
            }
            
        } finally {
            hideLoading();
            renderTable();
        }
    }

    // 퍼센트 설정을 적용한 정당 순위 재계산
    async function fetchPartyRankingWithSettings() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            // global_sync.js의 PercentSettings 사용
            if (!window.PercentSettings) {
                console.warn(`[${envType}] PercentSettings가 로드되지 않음`);
                return;
            }
            
            // 퍼센트 설정 가져오기
            const percentSettings = await window.PercentSettings.get();
            console.log(`[${envType}] 퍼센트 설정 적용:`, percentSettings);
            
            // 설정이 있다면 백엔드에 가중치 적용 요청
            if (percentSettings && partyData.length > 0) {
                try {
                    // 백엔드 형식으로 변환
                    const backendSettings = convertToBackendFormat(percentSettings);
                    
                    // APIService를 통해 가중치 적용된 데이터 요청
                    if (window.APIService.updateWeights) {
                        await window.APIService.updateWeights(backendSettings);
                        console.log(`[${envType}] 백엔드에 가중치 설정 전송 완료`);
                        
                        // 가중치 적용된 새 데이터 요청
                        await fetchPartyRanking();
                        return;
                    }
                } catch (backendError) {
                    console.warn(`[${envType}] 백엔드 가중치 적용 실패, 클라이언트 사이드로 처리:`, backendError);
                }
                
                // 백엔드 실패 시 클라이언트 사이드에서 간단 계산
                partyData.forEach(party => {
                    if (percentSettings.bills && party.totalScore) {
                        party.adjustedScore = party.totalScore * (percentSettings.bills / 100);
                    } else {
                        party.adjustedScore = party.totalScore;
                    }
                });
                
                // 조정된 점수로 재정렬
                partyData.sort((a, b) => (b.adjustedScore || b.totalScore) - (a.adjustedScore || a.totalScore));
                
                // 순위 재설정
                partyData.forEach((party, index) => {
                    party.rank = index + 1;
                });
                
                renderTable();
                console.log(`[${envType}] 클라이언트 사이드 퍼센트 설정 적용 완료`);
            }
            
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 퍼센트 설정 적용 실패:`, error);
        }
    }

    // 백엔드 설정 형식으로 변환
    function convertToBackendFormat(settings) {
        return {
            attendance_weight: settings.attendance || 25,
            bills_weight: settings.bills || 25,
            questions_weight: settings.questions || 20,
            petitions_weight: settings.petitions || 15,
            committees_weight: settings.committees || 10,
            parties_weight: settings.parties || 5
        };
    }

    // ===== 기본 데이터 및 매핑 함수들 =====

    // 기본 원내대표 정보
    function getDefaultLeader(partyName) {
        const leaders = {
            "국민의힘": "권성동",
            "더불어민주당": "박찬대", 
            "조국혁신당": "김선민",
            "개혁신당": "신지혜",
            "진보당": "김재연",
            "기본소득당": "용혜인",
            "사회민주당": "한창민",
            "무소속": "무소속"
        };
        
        return leaders[partyName] || "정보 없음";
    }

    // 기본 홈페이지 정보
    function getDefaultHomepage(partyName) {
        if (window.partyData && window.partyData[partyName]) {
            return window.partyData[partyName].url;
        }
        
        const homepages = {
            "국민의힘": "https://www.peoplepowerparty.kr/",
            "더불어민주당": "https://theminjoo.kr/",
            "조국혁신당": "https://rebuildingkoreaparty.kr",
            "개혁신당": "https://www.reformparty.kr/",
            "진보당": "https://jinboparty.com/",
            "기본소득당": "https://basicincomeparty.kr/",
            "사회민주당": "https://www.samindang.kr/",
            "무소속": "#"
        };
        
        return homepages[partyName] || "#";
    }

    // 기본 정당 데이터 (API 실패 시 사용)
    function getDefaultPartyData() {
        return [
            {
                rank: 1,
                name: "국민의힘",
                leader: "권성동",
                homepage: "https://www.peoplepowerparty.kr/",
                totalScore: 85.2,
                memberCount: 108
            },
            {
                rank: 2,
                name: "더불어민주당",
                leader: "박찬대",
                homepage: "https://theminjoo.kr/",
                totalScore: 82.7,
                memberCount: 170
            },
            {
                rank: 3,
                name: "조국혁신당",
                leader: "김선민",
                homepage: "https://rebuildingkoreaparty.kr",
                totalScore: 78.1,
                memberCount: 12
            },
            {
                rank: 4,
                name: "개혁신당",
                leader: "신지혜",
                homepage: "https://www.reformparty.kr/",
                totalScore: 74.8,
                memberCount: 3
            },
            {
                rank: 5,
                name: "사회민주당",
                leader: "한창민",
                homepage: "https://www.samindang.kr/",
                totalScore: 71.3,
                memberCount: 1
            },
            {
                rank: 6,
                name: "기본소득당",
                leader: "용혜인",
                homepage: "https://basicincomeparty.kr/",
                totalScore: 68.9,
                memberCount: 1
            },
            {
                rank: 7,
                name: "진보당",
                leader: "김재연",
                homepage: "https://jinboparty.com/",
                totalScore: 65.4,
                memberCount: 1
            },
            {
                rank: 8,
                name: "무소속",
                leader: "무소속",
                homepage: "#",
                totalScore: 62.1,
                memberCount: 4
            }
        ];
    }

    // ===== UI 피드백 함수들 =====

    //  로딩 표시 (환경별 메시지)
    function showLoading() {
        const tableBody = document.getElementById('partyTableBody');
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <span>${envBadge} 데이터를 불러오는 중...</span>
                        </div>
                    </td>
                </tr>
            `;
            
            // 로딩 애니메이션 CSS 추가
            if (!document.getElementById('loading-style')) {
                const style = document.createElement('style');
                style.id = 'loading-style';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // 로딩 숨기기
    function hideLoading() {
        // renderTable이 호출되면서 자동으로 로딩이 사라짐
    }

    //  성공 메시지 표시
    function showSuccessMessage(message) {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
            font-size: 14px; max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">✅ ${envBadge} 데이터 로드 성공</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // 슬라이드 인 애니메이션
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    //  경고 메시지 표시
    function showWarningMessage(message) {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
            font-size: 14px; max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">⚠️ ${envBadge} 부분 실패</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 6000);
    }

    // 에러 메시지 표시 (환경별)
    function showError(message) {
        const envBadge = isVercelEnvironment() ? '[VERCEL]' : '[LOCAL]';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
            font-size: 14px; max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">❌ ${envBadge} 오류</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 7000);
    }

    // ===== 페이지 내비게이션 함수 =====

    // 정당 상세 페이지로 이동하는 함수
    function navigateToPartyDetail(partyName) {
        console.log(`정당 [${partyName}] 상세 페이지로 이동`);
        
        const params = new URLSearchParams({
            party: partyName
        });
        
        window.location.href = `percent_party.html?${params.toString()}`;
    }

    // ===== 테이블 렌더링 및 정렬 함수들 =====

    // 테이블 렌더링
    function renderTable() {
        const tableBody = document.getElementById('partyTableBody');
        
        if (!tableBody) {
            console.error('partyTableBody element not found!');
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (partyData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">표시할 정당이 없습니다.</td></tr>';
            return;
        }
        
        partyData.forEach(party => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-cell">${party.rank}</td>
                <td>
                    ${party.logo ? `<img src="${party.logo}" alt="${party.name} 로고" 
                                        style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;" 
                                        onerror="this.style.display='none'">` : ''}
                </td>
                <td class="party-name">${party.name}</td>
                <td>${party.leader}</td>
                <td class="home-icon">
                    <a href="${party.homepage}" title="정당 홈페이지 바로가기" onclick="event.stopPropagation();">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                        </svg>
                    </a>
                </td>
            `;
            
            // 행 클릭 이벤트 (홈페이지 아이콘 제외)
            row.addEventListener('click', function(e) {
                if (!e.target.closest('.home-icon')) {
                    navigateToPartyDetail(party.name);
                }
            });
            
            // 호버 효과
            row.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--main2)';
                this.style.cursor = 'pointer';
            });

            row.addEventListener('mouseleave', function(){
                this.style.backgroundColor = '';
            });
            
            tableBody.appendChild(row);
        });

        // 테이블 렌더링 후 애니메이션 실행
        setTimeout(addTableAnimation, 100);
    }

    // 정렬 함수
    function sortParties(order) {
        if (order === 'desc') {
            partyData.sort((a, b) => b.rank - a.rank);
        } else {
            partyData.sort((a, b) => a.rank - b.rank);
        }
        
        partyData.forEach((party, index) => {
            if (order === 'desc') {
                party.rank = partyData.length - index;
            } else {
                party.rank = index + 1;
            }
        });

        renderTable();
    }

    // 테이블 행 애니메이션
    function addTableAnimation() {
        const tableRows = document.querySelectorAll('#partyTableBody tr');
        
        tableRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.5s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // ===== 이벤트 핸들러들 =====

    // 정렬 드롭다운 이벤트 핸들러
    const settingsBtn = document.getElementById('settingsBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    
    if (settingsBtn && sortDropdown) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sortDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', function() {
            sortDropdown.classList.remove('active');
        });
        
        sortDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    if (dropdownItems) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', function() {
                dropdownItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                sortOrder = this.getAttribute('data-sort');
                sortParties(sortOrder);

                sortDropdown.classList.remove('active');
            });
        });
    }

    // 홈페이지 링크 클릭 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.closest('.home-icon a')) {
            e.preventDefault();
            e.stopPropagation();
            
            const link = e.target.closest('.home-icon a');
            const href = link.getAttribute('href');
            
            if (href && href !== '#') {
                window.open(href, '_blank');
            } else {
                alert('정당 홈페이지 정보가 없습니다.');
            }
        }
    });

    // ===== 퍼센트 설정 변경 감지 =====

    // 퍼센트 설정 변경 감지
    if (window.PercentSettings) {
        window.PercentSettings.onChange(async function(newSettings) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`[${envType}] 퍼센트 설정이 변경되었습니다. 순위를 다시 계산합니다.`);
            await fetchPartyRankingWithSettings();
        });
    }

    // ===== 퍼센트 설정 확인 함수 =====

    // 퍼센트 설정 확인 
    async function checkPercentSettings() {
        try {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            
            if (!window.PercentSettings) {
                console.warn(`[${envType}] PercentSettings가 로드되지 않음`);
                return;
            }
            
            const settings = await window.PercentSettings.get();
            
            if (settings) {
                console.log(`[${envType}] 사용자 퍼센트 설정을 적용합니다.`);
                console.log(`[${envType}] 현재 퍼센트 설정:`, settings);
                
                // 설정이 있으면 가중치 적용하여 재계산
                await fetchPartyRankingWithSettings();
            } else {
                console.log(`[${envType}] 기본 퍼센트 설정을 사용합니다.`);
            }
        } catch (error) {
            const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.error(`[${envType}] 퍼센트 설정 확인 오류:`, error);
        }
    }

    // ===== 페이지 초기화 함수 =====

    // 페이지 초기화
    async function initializePage() {
        const envType = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
        console.log(`🚀 [${envType}] 정당 순위 페이지 초기화 중...`);
        
        // global_sync.js 로딩 확인
        if (!window.percentSync || !window.APIService) {
            console.warn(`[${envType}] global_sync.js가 완전히 로드되지 않았습니다. 재시도 중...`);
            setTimeout(initializePage, 500);
            return;
        }
        
        console.log(`[${envType}] global_sync.js 확인 완료`);
        
        // scripts.js 로딩 확인
        if (!window.PercentManager) {
            console.warn(`[${envType}] scripts.js가 완전히 로드되지 않았습니다. 재시도 중...`);
            setTimeout(initializePage, 500);
            return;
        }
        
        console.log(`[${envType}] scripts.js 확인 완료`);
        console.log(`[${envType}] APIService 확인 완료, API 데이터 로드 시작`);
        
        // 실제 API에서 데이터 로드
        await fetchPartyRanking();
        
        // 퍼센트 설정 확인 및 적용
        await checkPercentSettings();
        
        console.log(`✅ [${envType}] 정당 순위 페이지 초기화 완료`);
    }

    // ===== 디버그 유틸리티 =====

    // 🆕 디버그 유틸리티
    window.partyRankDebug = {
        env: () => isVercelEnvironment() ? 'VERCEL' : 'LOCAL',
        partyCount: () => partyData.length,
        currentSort: () => sortOrder,
        reloadData: () => fetchPartyRanking(),
        testAPI: () => {
            if (window.vercelDebug) {
                window.vercelDebug.testPerformance();
            } else {
                console.error('vercelDebug not available');
            }
        },
        showEnvInfo: () => {
            const env = isVercelEnvironment() ? 'VERCEL' : 'LOCAL';
            console.log(`현재 환경: ${env}`);
            console.log(`호스트명: ${window.location.hostname}`);
            console.log(`정당 데이터: ${partyData.length}개`);
            console.log(`정렬 순서: ${sortOrder}`);
            console.log(`global_sync 연동: ${!!(window.percentSync && window.APIService)}`);
            console.log(`scripts.js 연동: ${!!window.PercentManager}`);
        }
    };

    // 페이지 초기화 실행
    initializePage();
});
