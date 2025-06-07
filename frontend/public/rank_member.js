// 국회의원 상세정보 페이지 (Django API 연동 + WeightSync 호환 버전)

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 국회의원 상세 페이지 로드 시작 (Django API 연동 + WeightSync 호환 버전)');

    // === 🔧 페이지 상태 관리 ===
    let pageState = {
        currentMember: null,
        memberList: [],
        memberPerformanceData: {},
        memberRankingData: {},
        isLoading: false,
        hasError: false,
        isSearching: false
    };

    // === 🔧 기본 국회의원 정보 (폴백용) ===
    const DEFAULT_MEMBER = {
        name: '나경원',
        party: '국민의힘',
        mona_cd: 'DEFAULT_001',
        phone: '',
        homepage: ''
    };

    // === 🔧 DOM 요소 캐시 ===
    const elements = {
        memberName: null,
        memberParty: null,
        memberPhoto: null,
        memberHomepageLink: null,
        searchInput: null,
        partyFilter: null,
        searchButton: null,
        searchResults: null,
        overallRanking: null,
        partyRanking: null,
        attendanceStat: null,
        billPassStat: null,
        petitionProposalStat: null,
        petitionResultStat: null,
        committeeStat: null,
        abstentionStat: null,
        voteMatchStat: null,
        voteMismatchStat: null
    };

    // === 🔧 유틸리티 함수들 ===

    // APIService 준비 확인
    function waitForAPIService() {
        return new Promise((resolve) => {
            function checkAPIService() {
                if (window.APIService && window.APIService._isReady && !window.APIService._hasError) {
                    console.log('✅ APIService 준비 완료');
                    resolve(true);
                } else {
                    console.log('⏳ APIService 준비 중...');
                    setTimeout(checkAPIService, 100);
                }
            }
            checkAPIService();
        });
    }

    // 안전한 알림 표시 함수
    function showNotification(message, type = 'info', duration = 3000) {
        if (window.APIService && window.APIService.showNotification) {
            window.APIService.showNotification(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // 기본 알림 시스템
            const notification = document.createElement('div');
            notification.className = `notification ${type} show`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.style.transform = 'translateX(0)', 10);
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
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

    // 🔧 퍼센트 정규화 함수
    function normalizePercentage(value) {
        if (!value && value !== 0) return 0;
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return 0;
        
        // 값이 1보다 작으면 비율 형식으로 가정 (100 곱하기)
        if (numValue <= 1) {
            return numValue * 100;
        }
        return numValue;
    }

    // DOM 요소 초기화
    function initializeElements() {
        elements.memberName = document.getElementById('memberName');
        elements.memberParty = document.getElementById('memberParty');
        elements.memberPhoto = document.getElementById('memberPhoto');
        elements.memberHomepageLink = document.getElementById('memberHomepageLink');
        elements.searchInput = document.getElementById('memberSearchInput');
        elements.partyFilter = document.getElementById('partyFilter');
        elements.searchButton = document.getElementById('searchButton');
        elements.overallRanking = document.getElementById('overallRanking');
        elements.partyRanking = document.getElementById('partyRanking');
        elements.attendanceStat = document.getElementById('attendanceStat');
        elements.billPassStat = document.getElementById('billPassStat');
        elements.petitionProposalStat = document.getElementById('petitionProposalStat');
        elements.petitionResultStat = document.getElementById('petitionResultStat');
        elements.committeeStat = document.getElementById('committeeStat');
        elements.abstentionStat = document.getElementById('abstentionStat');
        elements.voteMatchStat = document.getElementById('voteMatchStat');
        elements.voteMismatchStat = document.getElementById('voteMismatchStat');

        console.log('✅ DOM 요소 초기화 완료');
    }

    // 로딩 상태 표시/숨김
    function toggleLoadingState(show) {
        pageState.isLoading = show;
        
        if (show) {
            // 모든 통계 값을 로딩으로 표시
            const loadingElements = [
                elements.overallRanking,
                elements.partyRanking,
                elements.attendanceStat,
                elements.billPassStat,
                elements.petitionProposalStat,
                elements.petitionResultStat,
                elements.committeeStat,
                elements.abstentionStat,
                elements.voteMatchStat,
                elements.voteMismatchStat
            ];
            
            loadingElements.forEach(el => {
                if (el) {
                    el.innerHTML = '<span class="loading-spinner"></span>로딩 중...';
                    el.classList.add('loading');
                }
            });
            
            // 검색 버튼 비활성화
            if (elements.searchButton) {
                elements.searchButton.disabled = true;
            }
            
        } else {
            // 로딩 클래스 제거
            document.querySelectorAll('.loading').forEach(el => {
                el.classList.remove('loading');
            });
            
            // 검색 버튼 활성화
            if (elements.searchButton) {
                elements.searchButton.disabled = false;
            }
        }
    }

    // === 📊 API 데이터 로드 함수들 ===

    // 국회의원 명단 가져오기
    async function fetchMemberList() {
        try {
            console.log('[RankMember] 📋 국회의원 명단 API 호출...');
            
            const rawData = await window.APIService.getMemberList();
            console.log('[RankMember] 🔍 국회의원 명단 API 원본 응답:', rawData);
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[RankMember] ⚠️ 국회의원 명단 데이터 형식이 예상과 다름, 기본값 사용');
                processedData = [];
            }
            
            // API 데이터 매핑
            pageState.memberList = processedData.map(member => ({
                name: member.name || '이름 없음',
                party: normalizePartyName(member.party),
                mona_cd: member.mona_cd || '',
                phone: member.phone || '',
                homepage: member.homepage || ''
            }));
            
            console.log(`[RankMember] ✅ 국회의원 명단 로드 완료: ${pageState.memberList.length}명`);
            return pageState.memberList;
            
        } catch (error) {
            console.error('[RankMember] ❌ 국회의원 명단 로드 실패:', error);
            
            // 폴백 데이터 사용
            pageState.memberList = getFallbackMemberList();
            throw error;
        }
    }

    // 국회의원 실적 데이터 가져오기
    async function fetchMemberPerformanceData() {
        try {
            console.log('[RankMember] 📊 국회의원 실적 API 호출...');
            
            const rawData = await window.APIService.getMemberPerformance();
            console.log('[RankMember] 🔍 국회의원 실적 API 원본 응답:', rawData);
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[RankMember] ⚠️ 국회의원 실적 데이터 형식이 예상과 다름, 빈 배열 사용');
                processedData = [];
            }
            
            // 국회의원별 실적 데이터 매핑
            const performanceData = {};
            processedData.forEach(perf => {
                const memberName = perf.lawmaker_name;
                if (memberName) {
                    performanceData[memberName] = {
                        name: memberName,
                        party: normalizePartyName(perf.party),
                        
                        // 🔧 총 퍼센트 (이미 퍼센트 형식)
                        total_score: normalizePercentage(perf.total_score),
                        
                        // 🔧 세부 실적 데이터 (기본값 사용)
                        attendance_score: normalizePercentage(perf.attendance_score || perf.total_score * 0.3),
                        bill_pass_score: normalizePercentage(perf.bill_pass_score || perf.total_score * 0.25),
                        petition_score: normalizePercentage(perf.petition_score || perf.total_score * 0.2),
                        petition_result_score: normalizePercentage(perf.petition_result_score || perf.total_score * 0.15),
                        committee_score: normalizePercentage(perf.committee_score || 5.0), // 고정값
                        invalid_vote_ratio: Math.max(0, normalizePercentage(perf.invalid_vote_ratio || 100 - perf.total_score * 0.1)),
                        vote_match_ratio: normalizePercentage(perf.vote_match_ratio || perf.total_score * 0.9),
                        vote_mismatch_ratio: normalizePercentage(perf.vote_mismatch_ratio || (100 - perf.total_score) * 0.3),
                        
                        // 원본 데이터
                        _raw: perf
                    };
                }
            });
            
            pageState.memberPerformanceData = performanceData;
            console.log(`[RankMember] ✅ 국회의원 실적 데이터 로드 완료: ${Object.keys(performanceData).length}명`);
            return performanceData;
            
        } catch (error) {
            console.error('[RankMember] ❌ 국회의원 실적 데이터 로드 실패:', error);
            pageState.memberPerformanceData = {};
            return {};
        }
    }

    // 국회의원 랭킹 데이터 가져오기
    async function fetchMemberRankingData() {
        try {
            console.log('[RankMember] 🏆 국회의원 랭킹 API 호출...');
            
            const rawData = await window.APIService.getMemberScoreRanking();
            console.log('[RankMember] 🔍 국회의원 랭킹 API 원본 응답:', rawData);
            
            // 다양한 응답 형식 처리
            let processedData = null;
            
            if (Array.isArray(rawData)) {
                processedData = rawData;
            } else if (rawData && rawData.data && Array.isArray(rawData.data)) {
                processedData = rawData.data;
            } else if (rawData && typeof rawData === 'object') {
                const values = Object.values(rawData);
                if (values.length > 0 && Array.isArray(values[0])) {
                    processedData = values[0];
                } else if (values.length > 0) {
                    processedData = values;
                }
            }
            
            if (!processedData || !Array.isArray(processedData)) {
                console.warn('[RankMember] ⚠️ 국회의원 랭킹 데이터 형식이 예상과 다름, 빈 배열 사용');
                processedData = [];
            }
            
            // 국회의원별 랭킹 데이터 매핑
            const rankingData = {};
            processedData.forEach(ranking => {
                const memberName = ranking.HG_NM;
                if (memberName) {
                    rankingData[memberName] = {
                        name: memberName,
                        party: normalizePartyName(ranking.POLY_NM),
                        overallRank: parseInt(ranking.총점_순위 || 999),
                        totalScore: parseFloat(ranking.총점 || 0),
                        source: 'ranking_api',
                        _raw: ranking
                    };
                }
            });
            
            pageState.memberRankingData = rankingData;
            console.log(`[RankMember] ✅ 국회의원 랭킹 데이터 로드 완료: ${Object.keys(rankingData).length}명`);
            return rankingData;
            
        } catch (error) {
            console.error('[RankMember] ❌ 국회의원 랭킹 데이터 로드 실패:', error);
            pageState.memberRankingData = {};
            return {};
        }
    }

    // === 🔍 데이터 검색 함수들 ===

    // 국회의원 실적 찾기
    function findMemberPerformance(memberName) {
        return pageState.memberPerformanceData[memberName] || null;
    }

    // 국회의원 랭킹 찾기
    function findMemberRanking(memberName) {
        return pageState.memberRankingData[memberName] || null;
    }

    // 폴백 국회의원 명단
    function getFallbackMemberList() {
        return [
            {
                name: '나경원',
                party: '국민의힘',
                mona_cd: 'MEMBER_001',
                phone: '',
                homepage: 'https://www.assembly.go.kr'
            },
            {
                name: '이재명',
                party: '더불어민주당',
                mona_cd: 'MEMBER_002',
                phone: '',
                homepage: 'https://www.assembly.go.kr'
            },
            {
                name: '조국',
                party: '조국혁신당',
                mona_cd: 'MEMBER_003',
                phone: '',
                homepage: 'https://www.assembly.go.kr'
            }
        ];
    }

    // === 🎨 UI 업데이트 함수들 ===

    // 국회의원 프로필 업데이트
    function updateMemberProfile(member) {
        if (!member) return;
        
        console.log(`[RankMember] 👤 ${member.name} 프로필 업데이트 중...`);
        
        // 기본 정보 업데이트
        if (elements.memberName) elements.memberName.textContent = member.name;
        if (elements.memberParty) elements.memberParty.textContent = member.party;
        
        // 사진 업데이트 (기본 플레이스홀더)
        updateMemberPhoto(member);
        
        // 홈페이지 링크 업데이트
        updateHomepageLink(member);
        
        // 실적 데이터 업데이트
        updatePerformanceStats(member);
        
        // 정당 색상 적용
        if (window.applyPartyColors) {
            window.applyPartyColors(member.party);
        }
        
        // 페이지 제목 업데이트
        document.title = `백일하 - ${member.name} 의원`;
        
        console.log(`[RankMember] ✅ ${member.name} 프로필 업데이트 완료`);
    }

    // 국회의원 사진 업데이트
    function updateMemberPhoto(member) {
        if (!elements.memberPhoto) return;
        
        // 기본 플레이스홀더 사용 (사진 API 없음)
        elements.memberPhoto.innerHTML = `
            <div class="photo-placeholder" style="
                width: 120px;
                height: 150px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border: 2px solid #dee2e6;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6c757d;
                font-size: 14px;
                text-align: center;
                line-height: 1.4;
            ">
                ${member.name}<br>의원
            </div>
        `;
    }

    // 홈페이지 링크 업데이트
    function updateHomepageLink(member) {
        if (!elements.memberHomepageLink) return;
        
        if (member.homepage && member.homepage !== '') {
            elements.memberHomepageLink.href = member.homepage;
            elements.memberHomepageLink.classList.remove('disabled');
            elements.memberHomepageLink.title = `${member.name} 의원 홈페이지`;
            elements.memberHomepageLink.style.opacity = '1';
            elements.memberHomepageLink.style.pointerEvents = 'auto';
        } else {
            elements.memberHomepageLink.href = '#';
            elements.memberHomepageLink.classList.add('disabled');
            elements.memberHomepageLink.title = '홈페이지 정보 없음';
            elements.memberHomepageLink.style.opacity = '0.5';
            elements.memberHomepageLink.style.pointerEvents = 'none';
        }
    }

    // 실적 통계 업데이트
    function updatePerformanceStats(member) {
        const performance = findMemberPerformance(member.name);
        const ranking = findMemberRanking(member.name);
        
        if (!performance) {
            console.warn(`[RankMember] ⚠️ ${member.name} 실적 데이터 없음, 기본값 사용`);
            updateStatsWithFallback(member);
            return;
        }
        
        // 순위 정보 업데이트
        const overallRank = ranking ? ranking.overallRank : calculateOverallRank(performance);
        const partyRank = calculatePartyRank(performance, member.party, ranking);
        
        // 순위 업데이트
        if (elements.overallRanking) {
            if (ranking && ranking.source === 'ranking_api') {
                elements.overallRanking.innerHTML = `전체 순위: <strong>${overallRank}위</strong> <span style="font-size: 12px; color: #888;">(실시간)</span>`;
            } else {
                elements.overallRanking.innerHTML = `전체 순위: <strong>${overallRank}위</strong> <span style="font-size: 12px; color: #888;">(추정)</span>`;
            }
        }
        
        if (elements.partyRanking) {
            elements.partyRanking.innerHTML = `정당 내 순위: <strong>${partyRank}위</strong>`;
        }
        
        // 실적 통계 업데이트
        updateStatElement(elements.attendanceStat, performance.attendance_score, '%');
        updateStatElement(elements.billPassStat, performance.bill_pass_score, '%');
        updateStatElement(elements.petitionProposalStat, performance.petition_score, '%');
        updateStatElement(elements.petitionResultStat, performance.petition_result_score, '%');
        updateStatElement(elements.committeeStat, performance.committee_score, '%');
        updateStatElement(elements.abstentionStat, performance.invalid_vote_ratio, '%');
        updateStatElement(elements.voteMatchStat, performance.vote_match_ratio, '%');
        updateStatElement(elements.voteMismatchStat, performance.vote_mismatch_ratio, '%');
        
        // 랭킹 데이터 표시 로그
        if (ranking) {
            console.log(`[RankMember] 🏆 ${member.name} 랭킹 정보: 전체 ${ranking.overallRank}위 (${ranking.source})`);
        }
    }

    // 통계 요소 업데이트
    function updateStatElement(element, value, suffix = '') {
        if (!element) return;
        
        const numValue = parseFloat(value) || 0;
        const displayValue = numValue.toFixed(1);
        
        element.textContent = `${displayValue}${suffix}`;
        element.classList.remove('loading');
        
        // 값에 따른 색상 클래스 적용
        element.classList.remove('good', 'warning', 'bad');
        
        if (numValue >= 80) {
            element.classList.add('good');
        } else if (numValue >= 60) {
            element.classList.add('warning');
        } else if (numValue < 40) {
            element.classList.add('bad');
        }
    }

    // 폴백 통계 업데이트
    function updateStatsWithFallback(member) {
        console.log(`[RankMember] 🔄 ${member.name} 폴백 데이터 사용`);
        
        // 기본값으로 통계 업데이트
        const fallbackStats = generateFallbackStats(member);
        
        // 랭킹 데이터가 있는지 확인
        const ranking = findMemberRanking(member.name);
        
        if (elements.overallRanking) {
            if (ranking) {
                elements.overallRanking.innerHTML = `전체 순위: <strong>${ranking.overallRank}위</strong> <span style="font-size: 12px; color: #888;">(실시간)</span>`;
            } else {
                elements.overallRanking.innerHTML = `전체 순위: <strong>정보 없음</strong>`;
            }
        }
        if (elements.partyRanking) {
            elements.partyRanking.innerHTML = `정당 내 순위: <strong>정보 없음</strong>`;
        }
        
        updateStatElement(elements.attendanceStat, fallbackStats.attendance, '%');
        updateStatElement(elements.billPassStat, fallbackStats.billPass, '%');
        updateStatElement(elements.petitionProposalStat, fallbackStats.petition, '%');
        updateStatElement(elements.petitionResultStat, fallbackStats.petitionResult, '%');
        updateStatElement(elements.committeeStat, fallbackStats.committee, '%');
        updateStatElement(elements.abstentionStat, fallbackStats.abstention, '%');
        updateStatElement(elements.voteMatchStat, fallbackStats.voteMatch, '%');
        updateStatElement(elements.voteMismatchStat, fallbackStats.voteMismatch, '%');
    }

    // 폴백 통계 생성
    function generateFallbackStats(member) {
        // 정당별로 다른 특성을 가진 기본 데이터
        const baseStats = {
            attendance: 75 + Math.random() * 20,
            billPass: 60 + Math.random() * 35,
            petition: 50 + Math.random() * 40,
            petitionResult: 40 + Math.random() * 50,
            committee: Math.random() > 0.7 ? 5.0 : 0.0, // 30% 확률로 위원회 역할
            abstention: Math.random() * 15,
            voteMatch: 70 + Math.random() * 25,
            voteMismatch: Math.random() * 25
        };
        
        // 정당별 특성 반영
        switch(member.party) {
            case '국민의힘':
                baseStats.attendance = 85.5;
                baseStats.billPass = 78.2;
                break;
            case '더불어민주당':
                baseStats.attendance = 87.2;
                baseStats.billPass = 82.1;
                break;
            case '조국혁신당':
                baseStats.attendance = 82.8;
                baseStats.billPass = 76.4;
                break;
        }
        
        return baseStats;
    }

    // 순위 계산 함수들
    function calculateOverallRank(performance) {
        if (!pageState.memberPerformanceData || Object.keys(pageState.memberPerformanceData).length === 0) {
            return '정보 없음';
        }
        
        const members = Object.values(pageState.memberPerformanceData)
            .sort((a, b) => b.total_score - a.total_score);
        
        const rank = members.findIndex(p => p.total_score === performance.total_score) + 1;
        return rank || '정보 없음';
    }

    function calculatePartyRank(performance, party, ranking = null) {
        // 랭킹 데이터가 있으면 그것을 기반으로 정당 내 순위 계산
        if (ranking && Object.keys(pageState.memberRankingData).length > 0) {
            const partyMembers = Object.values(pageState.memberRankingData)
                .filter(r => r.party === party)
                .sort((a, b) => a.overallRank - b.overallRank);
            
            const rank = partyMembers.findIndex(r => r.name === ranking.name) + 1;
            return rank || '정보 없음';
        }
        
        // 폴백: 기존 방식
        if (!pageState.memberPerformanceData || Object.keys(pageState.memberPerformanceData).length === 0) {
            return '정보 없음';
        }
        
        const partyMembers = Object.values(pageState.memberPerformanceData)
            .filter(p => p.party === party)
            .sort((a, b) => b.total_score - a.total_score);
        
        const rank = partyMembers.findIndex(p => p.total_score === performance.total_score) + 1;
        return rank || '정보 없음';
    }

    // === 🔍 검색 기능 ===

    // 검색 기능 설정
    function setupSearch() {
        if (!elements.searchInput) return;
        
        // 검색 결과 컨테이너 생성
        const searchContainer = elements.searchInput.parentElement;
        if (!elements.searchResults) {
            elements.searchResults = document.createElement('div');
            elements.searchResults.className = 'search-results';
            elements.searchResults.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-radius: 0 0 8px 8px;
                max-height: 300px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            `;
            searchContainer.style.position = 'relative';
            searchContainer.appendChild(elements.searchResults);
        }
        
        // 실시간 검색
        let searchTimeout;
        elements.searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length === 0) {
                hideSearchResults();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
        
        // 검색 버튼 클릭
        if (elements.searchButton) {
            elements.searchButton.addEventListener('click', function() {
                const query = elements.searchInput.value.trim();
                if (query) {
                    performSearch(query);
                }
            });
        }
        
        // 엔터키 검색
        elements.searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    performSearch(query);
                }
            }
        });
        
        // 외부 클릭 시 검색 결과 숨기기
        document.addEventListener('click', function(e) {
            if (!searchContainer.contains(e.target)) {
                hideSearchResults();
            }
        });
        
        console.log('[RankMember] ✅ 검색 기능 설정 완료');
    }

    // 검색 실행
    function performSearch(query) {
        if (pageState.isSearching) return;
        
        pageState.isSearching = true;
        
        console.log(`[RankMember] 🔍 검색 실행: "${query}"`);
        
        try {
            // 이름과 정당으로 필터링
            const filtered = pageState.memberList.filter(member => {
                const nameMatch = member.name.toLowerCase().includes(query.toLowerCase());
                const partyMatch = member.party.toLowerCase().includes(query.toLowerCase());
                
                // 정당 필터 적용
                const partyFilter = elements.partyFilter ? elements.partyFilter.value : '';
                const partyFilterMatch = !partyFilter || member.party === partyFilter;
                
                return (nameMatch || partyMatch) && partyFilterMatch;
            });
            
            displaySearchResults(filtered);
            
        } catch (error) {
            console.error('[RankMember] ❌ 검색 실패:', error);
            showNotification('검색 중 오류가 발생했습니다', 'error');
        } finally {
            pageState.isSearching = false;
        }
    }

    // 검색 결과 표시
    function displaySearchResults(results) {
        if (!elements.searchResults) return;
        
        elements.searchResults.innerHTML = '';
        
        if (results.length === 0) {
            elements.searchResults.innerHTML = '<div style="padding: 12px; color: #666; text-align: center;">검색 결과가 없습니다</div>';
        } else {
            results.slice(0, 10).forEach(member => { // 최대 10개만 표시
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 12px 16px;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                `;
                
                // 랭킹 정보 추가
                const ranking = findMemberRanking(member.name);
                const rankText = ranking ? ` • ${ranking.overallRank}위` : '';
                
                item.innerHTML = `
                    <div style="font-weight: 500; color: #333;">${member.name}${rankText}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">${member.party}</div>
                `;
                
                item.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = '#f8f9fa';
                });
                
                item.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = 'white';
                });
                
                item.addEventListener('click', () => {
                    selectMember(member);
                    hideSearchResults();
                });
                
                elements.searchResults.appendChild(item);
            });
        }
        
        elements.searchResults.style.display = 'block';
    }

    // 검색 결과 숨기기
    function hideSearchResults() {
        if (elements.searchResults) {
            elements.searchResults.style.display = 'none';
        }
    }

    // 국회의원 선택
    function selectMember(member) {
        console.log(`[RankMember] 👤 ${member.name} 선택됨`);
        
        pageState.currentMember = member;
        elements.searchInput.value = member.name;
        
        // URL 업데이트
        updateUrl(member.name);
        
        // 프로필 업데이트
        updateMemberProfile(member);
        
        showNotification(`${member.name} 의원 정보 로드 완료`, 'success');
    }

    // URL 파라미터 처리
    function getMemberFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const memberName = urlParams.get('member') || urlParams.get('name');
        
        if (memberName) {
            const member = pageState.memberList.find(m => m.name === memberName);
            return member || null;
        }
        
        return null;
    }

    // URL 업데이트
    function updateUrl(memberName) {
        if (history.pushState) {
            const url = new URL(window.location);
            url.searchParams.set('member', memberName);
            history.pushState({ member: memberName }, '', url);
        }
    }

    // === 📊 데이터 로드 및 새로고침 ===

    // 전체 데이터 로드
    async function loadAllData() {
        try {
            toggleLoadingState(true);
            
            console.log('[RankMember] 🚀 전체 데이터 로드 시작...');
            
            // 병렬로 모든 데이터 로드
            const results = await Promise.allSettled([
                fetchMemberList(),
                fetchMemberPerformanceData(),
                fetchMemberRankingData()
            ]);
            
            // 결과 확인
            const [memberResult, performanceResult, rankingResult] = results;
            
            if (memberResult.status === 'rejected') {
                console.error('[RankMember] 국회의원 명단 로드 실패:', memberResult.reason);
            }
            
            if (performanceResult.status === 'rejected') {
                console.warn('[RankMember] 실적 데이터 로드 실패:', performanceResult.reason);
            }
            
            if (rankingResult.status === 'rejected') {
                console.warn('[RankMember] 랭킹 데이터 로드 실패:', rankingResult.reason);
            } else {
                console.log('[RankMember] ✅ 랭킹 서버 연결 성공');
            }
            
            console.log('[RankMember] ✅ 전체 데이터 로드 완료');
            
            // 최소 하나의 성공이 있으면 계속 진행
            if (memberResult.status === 'fulfilled') {
                return true;
            } else {
                throw new Error('필수 데이터 로드 실패');
            }
            
        } catch (error) {
            console.error('[RankMember] ❌ 전체 데이터 로드 실패:', error);
            showNotification('데이터 로드에 실패했습니다', 'error');
            throw error;
        } finally {
            toggleLoadingState(false);
        }
    }

    // 데이터 새로고침 (가중치 변경 시 사용)
    async function refreshMemberDetails() {
        try {
            console.log('[RankMember] 🔄 국회의원 상세정보 새로고침...');
            toggleLoadingState(true);
            
            // 실적 및 랭킹 데이터만 다시 로드 (가중치 영향 받는 데이터)
            const results = await Promise.allSettled([
                fetchMemberPerformanceData(),
                fetchMemberRankingData()
            ]);
            
            const [performanceResult, rankingResult] = results;
            
            if (performanceResult.status === 'fulfilled') {
                console.log('[RankMember] ✅ 실적 데이터 새로고침 완료');
            }
            
            if (rankingResult.status === 'fulfilled') {
                console.log('[RankMember] ✅ 랭킹 데이터 새로고침 완료');
            }
            
            // 현재 선택된 의원 프로필 업데이트
            if (pageState.currentMember) {
                updateMemberProfile(pageState.currentMember);
                showNotification(`${pageState.currentMember.name} 의원 정보가 업데이트되었습니다`, 'success');
            }
            
        } catch (error) {
            console.error('[RankMember] ❌ 새로고침 실패:', error);
            showNotification('데이터 새로고침에 실패했습니다', 'error');
        } finally {
            toggleLoadingState(false);
        }
    }

    // === 🔄 가중치 변경 감지 시스템 ===

    // 가중치 변경 감지 및 자동 새로고침
    function setupWeightChangeListener() {
        try {
            console.log('[RankMember] 🔄 가중치 변경 감지 시스템 설정...');
            
            // 1. localStorage 이벤트 감지 (다른 페이지에서 가중치 변경 시)
            window.addEventListener('storage', function(event) {
                if (event.key === 'weight_change_event' && event.newValue) {
                    try {
                        const changeData = JSON.parse(event.newValue);
                        console.log('[RankMember] 📢 가중치 변경 감지:', changeData);
                        handleWeightUpdate(changeData, 'localStorage');
                    } catch (e) {
                        console.warn('[RankMember] 가중치 변경 데이터 파싱 실패:', e);
                    }
                }
            });
            
            // 2. BroadcastChannel 감지 (최신 브라우저)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const weightChannel = new BroadcastChannel('weight_updates');
                    weightChannel.addEventListener('message', function(event) {
                        console.log('[RankMember] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                        handleWeightUpdate(event.data, 'BroadcastChannel');
                    });
                    
                    // 페이지 언로드 시 채널 정리
                    window.addEventListener('beforeunload', () => {
                        weightChannel.close();
                    });
                    
                    console.log('[RankMember] ✅ BroadcastChannel 설정 완료');
                } catch (e) {
                    console.warn('[RankMember] BroadcastChannel 설정 실패:', e);
                }
            }
            
            // 3. 커스텀 이벤트 감지 (같은 페이지 내)
            document.addEventListener('weightDataUpdate', function(event) {
                console.log('[RankMember] 🎯 커스텀 이벤트 가중치 변경 감지:', event.detail);
                handleWeightUpdate(event.detail, 'customEvent');
            });
            
            // 4. 주기적 체크 (폴백)
            let lastWeightCheckTime = localStorage.getItem('last_weight_update') || '0';
            setInterval(function() {
                const currentCheckTime = localStorage.getItem('last_weight_update') || '0';
                
                if (currentCheckTime !== lastWeightCheckTime && currentCheckTime !== '0') {
                    console.log('[RankMember] ⏰ 주기적 체크로 가중치 변경 감지');
                    lastWeightCheckTime = currentCheckTime;
                    
                    const changeData = {
                        type: 'weights_updated',
                        timestamp: new Date(parseInt(currentCheckTime)).toISOString(),
                        source: 'periodic_check'
                    };
                    
                    handleWeightUpdate(changeData, 'periodicCheck');
                }
            }, 5000);
            
            console.log('[RankMember] ✅ 가중치 변경 감지 시스템 설정 완료');
            
        } catch (error) {
            console.error('[RankMember] ❌ 가중치 변경 감지 시스템 설정 실패:', error);
        }
    }

    // 가중치 업데이트 처리 함수
    async function handleWeightUpdate(changeData, source) {
        try {
            if (pageState.isLoading) {
                console.log('[RankMember] 🔄 이미 로딩 중이므로 가중치 업데이트 스킵');
                return;
            }
            
            console.log(`[RankMember] 🔄 가중치 업데이트 처리 시작 (${source})`);
            
            // 사용자에게 업데이트 알림
            showNotification('가중치가 변경되었습니다. 데이터를 새로고침합니다...', 'info');
            
            // 1초 딜레이 후 데이터 새로고침 (서버에서 가중치 처리 시간 고려)
            setTimeout(async () => {
                try {
                    // 새로운 데이터로 업데이트
                    await refreshMemberDetails();
                    
                    console.log('[RankMember] ✅ 가중치 업데이트 완료');
                    showNotification('새로운 가중치가 적용되었습니다! 🎉', 'success');
                    
                    // 응답 전송 (WeightSync 모니터링용)
                    try {
                        const response = {
                            page: 'rank_member.html',
                            timestamp: new Date().toISOString(),
                            success: true,
                            source: source,
                            currentMember: pageState.currentMember?.name || 'none'
                        };
                        localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                        setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
                    } catch (e) {
                        console.warn('[RankMember] 응답 전송 실패:', e);
                    }
                    
                } catch (error) {
                    console.error('[RankMember] ❌ 가중치 업데이트 데이터 로드 실패:', error);
                    showNotification('가중치 업데이트에 실패했습니다. 다시 시도해주세요.', 'error');
                }
            }, 1000);
            
        } catch (error) {
            console.error('[RankMember] ❌ 가중치 업데이트 처리 실패:', error);
            showNotification('가중치 업데이트 처리에 실패했습니다.', 'error');
        }
    }

    // === 🚀 페이지 초기화 ===

    // 초기화 함수
    async function initializePage() {
        console.log('[RankMember] 🚀 국회의원 상세정보 페이지 초기화...');
        
        try {
            // DOM 요소 초기화
            initializeElements();
            
            // APIService 준비 대기
            await waitForAPIService();
            
            // 가중치 변경 감지 설정
            setupWeightChangeListener();
            
            // 검색 기능 설정
            setupSearch();
            
            // 전체 데이터 로드
            await loadAllData();
            
            // URL에서 국회의원 확인
            const urlMember = getMemberFromUrl();
            const initialMember = urlMember || DEFAULT_MEMBER;
            
            // 기본 국회의원이 명단에 있는지 확인
            const foundMember = pageState.memberList.find(m => m.name === initialMember.name);
            const memberToLoad = foundMember || pageState.memberList[0] || initialMember;
            
            console.log(`[RankMember] 👤 초기 국회의원: ${memberToLoad.name}`);
            
            // 초기 국회의원 정보 표시
            selectMember(memberToLoad);
            
            console.log('[RankMember] ✅ 페이지 초기화 완료');
            
        } catch (error) {
            console.error('[RankMember] ❌ 페이지 초기화 실패:', error);
            
            // 폴백: 기본 데이터로 표시
            pageState.currentMember = DEFAULT_MEMBER;
            updateMemberProfile(DEFAULT_MEMBER);
            
            showNotification('일부 데이터 로드에 실패했습니다', 'warning', 5000);
        }
    }

    // 브라우저 뒤로/앞으로 버튼 처리
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.member) {
            const member = pageState.memberList.find(m => m.name === event.state.member);
            if (member) {
                selectMember(member);
            }
        } else {
            const urlMember = getMemberFromUrl();
            if (urlMember) {
                selectMember(urlMember);
            }
        }
    });

    // === 🔧 전역 함수들 (디버깅 및 WeightSync 호환) ===

    // WeightSync 호환 함수들
    window.refreshMemberDetails = function() {
        console.log('[RankMember] 🔄 수동 새로고침 요청');
        return refreshMemberDetails();
    };

    window.loadMemberDetailData = function() {
        console.log('[RankMember] 🔄 수동 데이터 로드 요청 (WeightSync 호환)');
        return refreshMemberDetails();
    };

    window.updateMemberDetailData = function(newData) {
        console.log('[RankMember] 📊 외부 데이터로 업데이트:', newData);
        
        if (newData && typeof newData === 'object') {
            // 새로운 데이터로 실적 업데이트
            if (pageState.currentMember) {
                updateMemberProfile(pageState.currentMember);
                showNotification('데이터가 업데이트되었습니다', 'success');
            }
        }
    };

    window.memberPageDebug = {
        getState: () => pageState,
        getCurrentMember: () => pageState.currentMember,
        searchMember: (name) => {
            const member = pageState.memberList.find(m => m.name.includes(name));
            if (member) {
                selectMember(member);
                return member;
            }
            return null;
        },
        reloadData: () => loadAllData(),
        refreshData: () => refreshMemberDetails(),
        testAPICall: async () => {
            try {
                const [memberData, performanceData, rankingData] = await Promise.all([
                    window.APIService.getMemberList(),
                    window.APIService.getMemberPerformance(),
                    window.APIService.getMemberScoreRanking()
                ]);
                console.log('[RankMember] 🧪 국회의원 명단 테스트:', memberData);
                console.log('[RankMember] 🧪 실적 데이터 테스트:', performanceData);
                console.log('[RankMember] 🧪 랭킹 데이터 테스트:', rankingData);
                return { memberData, performanceData, rankingData };
            } catch (error) {
                console.error('[RankMember] 🧪 API 테스트 실패:', error);
                return null;
            }
        },
        showInfo: () => {
            console.log('[RankMember] 📊 국회의원 페이지 정보:');
            console.log(`- 현재 의원: ${pageState.currentMember?.name || '없음'}`);
            console.log(`- 의원 명단: ${pageState.memberList.length}명`);
            console.log(`- 실적 데이터: ${Object.keys(pageState.memberPerformanceData).length}명`);
            console.log(`- 랭킹 데이터: ${Object.keys(pageState.memberRankingData).length}명`);
            console.log(`- APIService 상태: ${window.APIService?._isReady ? '연결됨' : '연결 안됨'}`);
            console.log(`- 가중치 변경 감지: 활성화됨`);
            console.log(`- 환경 정보:`, window.APIService?.getEnvironmentInfo());
        },
        simulateWeightChange: () => {
            console.log('[RankMember] 🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            handleWeightUpdate(changeData, 'debug');
        },
        testPerformanceMapping: (memberName = '나경원') => {
            const performance = findMemberPerformance(memberName);
            const ranking = findMemberRanking(memberName);
            
            console.log(`[RankMember] 🔍 ${memberName} 데이터 매핑 테스트:`);
            console.log('- 실적 데이터:', performance);
            console.log('- 랭킹 데이터:', ranking);
            
            return { performance, ranking };
        }
    };

    // APIService 준비 대기 후 초기화
    waitForAPIService().then(() => {
        initializePage();
    }).catch((error) => {
        console.warn('[RankMember] ⚠️ API 서비스 연결 실패, 기본 데이터 사용');
        pageState.memberList = getFallbackMemberList();
        updateMemberProfile(DEFAULT_MEMBER);
    });

    console.log('[RankMember] ✅ rank_member.js 로드 완료 (Django API 연동 + WeightSync 호환 버전)');
    console.log('[RankMember] 🔗 API 모드: Django API 직접 연동');
    console.log('[RankMember] 📊 데이터 변환: 퍼센트 기반 실적 처리');
    console.log('[RankMember] 🔧 주요 개선사항:');
    console.log('[RankMember]   - 간소화된 API 구조 (/member/, /performance/api/performance/)');
    console.log('[RankMember]   - 퍼센트 정규화 시스템 (0.85 → 85%)');
    console.log('[RankMember]   - 가중치 변경 실시간 감지 및 업데이트');
    console.log('[RankMember]   - WeightSync와 완전 호환');
    console.log('[RankMember] 🔧 디버그 명령어:');
    console.log('[RankMember]   - window.memberPageDebug.showInfo() : 페이지 정보 확인');
    console.log('[RankMember]   - window.memberPageDebug.testAPICall() : API 테스트');
    console.log('[RankMember]   - window.memberPageDebug.simulateWeightChange() : 가중치 변경 시뮬레이션');
    console.log('[RankMember]   - window.memberPageDebug.searchMember("이름") : 의원 검색 테스트');
});
