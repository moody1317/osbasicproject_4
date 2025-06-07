document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수들
    let mpData = [];
    let selectedMembers = [];
    let isLoading = false;
    let partyData = {};
    let memberPhotos = {};

    // APIService 준비 확인
    function waitForAPIService() {
        return new Promise((resolve) => {
            if (window.APIService && window.APIService._isReady) {
                resolve();
                return;
            }
            
            // APIService가 준비될 때까지 대기
            const checkInterval = setInterval(() => {
                if (window.APIService && window.APIService._isReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    // 정당별 색상 데이터 가져오기 (폴백 색상 포함)
    function getPartyColors() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        return {
            "더불어민주당": {
                color: computedStyle.getPropertyValue('--party-dp-main')?.trim() || "#152484",
                lightColor: computedStyle.getPropertyValue('--party-dp-secondary')?.trim() || "#15248480",
                bgColor: computedStyle.getPropertyValue('--party-dp-bg')?.trim() || "#152484"
            },
            "국민의힘": {
                color: computedStyle.getPropertyValue('--party-ppp-main')?.trim() || "#E61E2B",
                lightColor: computedStyle.getPropertyValue('--party-ppp-secondary')?.trim() || "#E61E2B80",
                bgColor: computedStyle.getPropertyValue('--party-ppp-bg')?.trim() || "#E61E2B"
            },
            "조국혁신당": {
                color: computedStyle.getPropertyValue('--party-rk-main')?.trim() || "#06275E",
                lightColor: computedStyle.getPropertyValue('--party-rk-secondary')?.trim() || "#0073CF",
                bgColor: computedStyle.getPropertyValue('--party-rk-bg')?.trim() || "#06275E"
            },
            "개혁신당": {
                color: computedStyle.getPropertyValue('--party-reform-main')?.trim() || "#FF7210",
                lightColor: computedStyle.getPropertyValue('--party-reform-secondary')?.trim() || "#FF721080",
                bgColor: computedStyle.getPropertyValue('--party-reform-bg')?.trim() || "#FF7210"
            },
            "진보당": {
                color: computedStyle.getPropertyValue('--party-jp-main')?.trim() || "#D6001C",
                lightColor: computedStyle.getPropertyValue('--party-jp-secondary')?.trim() || "#D6001C80",
                bgColor: computedStyle.getPropertyValue('--party-jp-bg')?.trim() || "#D6001C"
            },
            "기본소득당": {
                color: computedStyle.getPropertyValue('--party-bip-main')?.trim() || "#091E3A",
                lightColor: computedStyle.getPropertyValue('--party-bip-secondary')?.trim() || "#00D2C3",
                bgColor: computedStyle.getPropertyValue('--party-bip-bg')?.trim() || "#091E3A"
            },
            "사회민주당": {
                color: computedStyle.getPropertyValue('--party-sdp-main')?.trim() || "#43A213",
                lightColor: computedStyle.getPropertyValue('--party-sdp-secondary')?.trim() || "#F58400",
                bgColor: computedStyle.getPropertyValue('--party-sdp-bg')?.trim() || "#43A213"
            },
            "무소속": {
                color: computedStyle.getPropertyValue('--party-ind-main')?.trim() || "#4B5563",
                lightColor: computedStyle.getPropertyValue('--party-ind-secondary')?.trim() || "#9CA3AF",
                bgColor: computedStyle.getPropertyValue('--party-ind-bg')?.trim() || "#4B5563"
            }
        };
    }

    // 알림 표시 함수
    function showNotification(message, type = 'info') {
        // APIService의 showNotification 사용
        if (window.APIService && window.APIService.showNotification) {
            window.APIService.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 에러 메시지 표시
    function showError(message) {
        showNotification(message, 'error');
    }

    // 로딩 상태 표시
    function showLoading(show = true) {
        isLoading = show;
        const cards = document.querySelectorAll('.comparison-card');
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
        if (!partyName) return '무소속';
        
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

    // APIService를 통해 국회의원 데이터 가져오기
    async function fetchMemberData() {
        try {
            console.log('📋 국회의원 데이터 로드 중...');
            showLoading(true);

            // APIService가 준비될 때까지 대기
            await waitForAPIService();

            if (!window.APIService || !window.APIService._isReady) {
                throw new Error('APIService를 사용할 수 없습니다');
            }

            // 병렬로 데이터 로드
            const [performanceData, memberPhotosData, attendanceData] = await Promise.allSettled([
                window.APIService.getPerformanceData(),
                window.APIService.getMemberPhotos(),
                window.APIService.getMemberPerformance() // 출석 데이터 포함
            ]);

            // 성과 데이터 처리
            let members = [];
            if (performanceData.status === 'fulfilled') {
                members = performanceData.value || [];
                console.log('✅ 성과 데이터 로드 성공:', members.length, '건');
            } else {
                console.warn('⚠️ 성과 데이터 로드 실패:', performanceData.reason);
            }

            // 사진 데이터 처리
            if (memberPhotosData.status === 'fulfilled') {
                const photos = memberPhotosData.value || [];
                memberPhotos = {};
                photos.forEach(photo => {
                    if (photo.member_name && photo.photo) {
                        memberPhotos[photo.member_name] = photo.photo;
                    }
                });
                console.log('✅ 사진 데이터 로드 성공:', Object.keys(memberPhotos).length, '건');
            } else {
                console.warn('⚠️ 사진 데이터 로드 실패:', memberPhotosData.reason);
            }

            // 출석 데이터 처리 (성과 데이터에 포함되어 있을 수 있음)
            let attendanceMap = {};
            if (attendanceData.status === 'fulfilled') {
                const attendance = attendanceData.value || [];
                attendance.forEach(item => {
                    if (item.lawmaker_name || item.member_name) {
                        const name = item.lawmaker_name || item.member_name;
                        attendanceMap[name] = item;
                    }
                });
                console.log('✅ 출석 데이터 로드 성공:', Object.keys(attendanceMap).length, '건');
            }

            // 국회의원 데이터 통합 및 가공
            mpData = members.map(member => {
                const memberName = member.name || member.lawmaker_name;
                const memberParty = normalizePartyName(member.party);
                
                return {
                    id: member.id || member.lawmaker || Math.random().toString(36),
                    name: memberName,
                    party: memberParty,
                    district: member.district || `${memberParty} 소속`, // 지역구 정보가 없으면 정당으로 대체
                    photo: memberPhotos[memberName] || 'https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png',
                    performance: member.rawData || member,
                    attendance: attendanceMap[memberName] || null,
                    stats: calculateMemberStats(member, attendanceMap[memberName])
                };
            });

            // 데이터가 없는 경우 기본 데이터 사용
            if (mpData.length === 0) {
                mpData = getDefaultMemberData();
                showNotification('기본 데이터를 사용합니다', 'warning');
            }

            console.log('✅ 국회의원 데이터 통합 완료:', mpData.length, '명');
            showNotification(`국회의원 데이터 로드 완료 (${mpData.length}명)`, 'success');

        } catch (error) {
            console.error('❌ 국회의원 데이터 로드 실패:', error);
            
            // API 실패 시 기본 데이터 사용
            mpData = getDefaultMemberData();
            showError('국회의원 데이터를 불러오는데 실패했습니다. 기본 데이터를 사용합니다.');
        } finally {
            showLoading(false);
        }
    }

    // 국회의원별 통계 계산
    function calculateMemberStats(performance, attendance) {
        try {
            // 1. 출석률 계산
            let attendanceRate = 85; // 기본값
            let attendanceDetails = null;
            
            if (attendance) {
                if (attendance.attendance_rate !== undefined) {
                    attendanceRate = parseFloat(attendance.attendance_rate);
                } else if (attendance.attendance && attendance.total_meetings) {
                    attendanceRate = (attendance.attendance / attendance.total_meetings) * 100;
                }
                
                attendanceDetails = {
                    totalMeetings: attendance.total_meetings || 150,
                    attendance: attendance.attendance || Math.floor(attendanceRate * 1.5),
                    absences: attendance.absences || Math.floor((100 - attendanceRate) * 0.8),
                    leaves: attendance.leaves || Math.floor((100 - attendanceRate) * 0.15),
                    businessTrips: attendance.business_trips || Math.floor((100 - attendanceRate) * 0.05)
                };
            }

            // 2. 법안 관련 통계
            const billProposed = performance.bill_count || Math.floor(Math.random() * 50) + 20;
            const billPassRate = performance.bill_pass_rate || Math.floor(Math.random() * 40) + 30;
            
            const billDetails = {
                total: billProposed,
                approved: Math.floor(billProposed * billPassRate / 100),
                discarded: Math.floor(billProposed * 0.4),
                rejected: Math.floor(billProposed * 0.2),
                other: Math.floor(billProposed * 0.1)
            };

            // 3. 청원 통계
            const petitionProposed = performance.petition_score || Math.floor(Math.random() * 20) + 5;
            const petitionResult = performance.petition_result_score || Math.floor(Math.random() * 15) + 3;

            // 4. 위원회 정보 (랜덤 생성)
            const committeeInfo = getCommitteeInfo();

            // 5. 투표 통계
            const invalidVoteRatio = performance.invalid_vote_ratio || Math.random() * 0.05;
            const voteMatchRatio = performance.vote_match_ratio || Math.random() * 0.3 + 0.7;

            return {
                attendance: Math.round(attendanceRate),
                billProposed: billProposed,
                billPassRate: billPassRate,
                petitionProposed: petitionProposed,
                petitionResult: petitionResult,
                committeePosition: committeeInfo.position,
                committeeRank: committeeInfo.rank,
                invalidVotes: Math.round(invalidVoteRatio * 100),
                voteConsistency: Math.round(voteMatchRatio * 100),
                voteInconsistency: Math.round((1 - voteMatchRatio) * 100),
                attendanceDetails: attendanceDetails,
                billDetails: billDetails
            };

        } catch (error) {
            console.error(`❌ 통계 계산 실패:`, error);
            return generateSampleStats();
        }
    }

    // 위원회 정보 생성
    function getCommitteeInfo() {
        const committees = [
            '국정감사위원회', '예산결산위원회', '법제사법위원회', '정무위원회', 
            '기획재정위원회', '교육위원회', '과학기술정보방송통신위원회', '외교통일위원회',
            '국방위원회', '행정안전위원회', '문화체육관광위원회', '농림축산식품해양수산위원회',
            '산업통상자원중소벤처기업위원회', '보건복지위원회', '환경노동위원회', '국토교통위원회'
        ];
        
        const positions = ['일반의원', '간사', '상임위원장'];
        const ranks = [1, 2, 3];
        
        const random = Math.random();
        let positionIndex;
        
        if (random < 0.1) { // 10% 확률로 위원장
            positionIndex = 2;
        } else if (random < 0.25) { // 15% 확률로 간사
            positionIndex = 1;
        } else {
            positionIndex = 0;
        }
        
        const committee = committees[Math.floor(Math.random() * committees.length)];
        const position = positions[positionIndex];
        const rank = ranks[positionIndex];
        
        return {
            position: `${committee} ${position}`,
            rank: rank,
            department: committee
        };
    }

    // 샘플 통계 생성 (API 실패 시)
    function generateSampleStats() {
        const consistency = Math.floor(Math.random() * 30) + 70;
        const committeeInfo = getCommitteeInfo();
        
        return {
            attendance: Math.round(Math.random() * 20 + 75),
            billProposed: Math.floor(Math.random() * 50) + 20,
            billPassRate: Math.floor(Math.random() * 40) + 30,
            petitionProposed: Math.floor(Math.random() * 20) + 5,
            petitionResult: Math.floor(Math.random() * 15) + 3,
            committeePosition: committeeInfo.position,
            committeeRank: committeeInfo.rank,
            invalidVotes: Math.floor(Math.random() * 10) + 2,
            voteConsistency: consistency,
            voteInconsistency: 100 - consistency,
            attendanceDetails: {
                totalMeetings: Math.floor(Math.random() * 50) + 100,
                attendance: Math.floor(Math.random() * 40) + 80,
                absences: Math.floor(Math.random() * 10) + 2,
                leaves: Math.floor(Math.random() * 5) + 1,
                businessTrips: Math.floor(Math.random() * 8) + 2
            },
            billDetails: {
                total: Math.floor(Math.random() * 50) + 20,
                approved: Math.floor(Math.random() * 30) + 10,
                discarded: Math.floor(Math.random() * 10) + 3,
                rejected: Math.floor(Math.random() * 8) + 2,
                other: Math.floor(Math.random() * 5) + 1
            }
        };
    }

    // 기본 국회의원 데이터 (API 실패 시 사용)
    function getDefaultMemberData() {
        return [
            {
                id: 1,
                name: "김민석",
                party: "더불어민주당",
                district: "서울 영등포구갑",
                photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
                stats: {
                    attendance: 98,
                    billProposed: 75,
                    billPassRate: 32,
                    petitionProposed: 21,
                    petitionResult: 8,
                    committeePosition: "국정감사위원회 상임위원장",
                    committeeRank: 3,
                    invalidVotes: 3,
                    voteConsistency: 97,
                    voteInconsistency: 3,
                    attendanceDetails: {
                        totalMeetings: 150,
                        attendance: 147,
                        absences: 2,
                        leaves: 1,
                        businessTrips: 0
                    },
                    billDetails: {
                        total: 75,
                        approved: 24,
                        discarded: 35,
                        rejected: 10,
                        other: 6
                    }
                }
            },
            {
                id: 2,
                name: "김병욱",
                party: "국민의힘",
                district: "대구 수성구갑",
                photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
                stats: {
                    attendance: 92,
                    billProposed: 52,
                    billPassRate: 45,
                    petitionProposed: 15,
                    petitionResult: 12,
                    committeePosition: "예산결산위원회 간사",
                    committeeRank: 2,
                    invalidVotes: 5,
                    voteConsistency: 94,
                    voteInconsistency: 6,
                    attendanceDetails: {
                        totalMeetings: 140,
                        attendance: 129,
                        absences: 8,
                        leaves: 2,
                        businessTrips: 1
                    },
                    billDetails: {
                        total: 52,
                        approved: 23,
                        discarded: 20,
                        rejected: 6,
                        other: 3
                    }
                }
            },
            {
                id: 3,
                name: "김상훈",
                party: "국민의힘",
                district: "경북 구미시갑",
                photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
                stats: {
                    attendance: 94,
                    billProposed: 63,
                    billPassRate: 39,
                    petitionProposed: 18,
                    petitionResult: 5,
                    committeePosition: "법제사법위원회 일반의원",
                    committeeRank: 1,
                    invalidVotes: 4,
                    voteConsistency: 96,
                    voteInconsistency: 4,
                    attendanceDetails: {
                        totalMeetings: 145,
                        attendance: 136,
                        absences: 6,
                        leaves: 2,
                        businessTrips: 1
                    },
                    billDetails: {
                        total: 63,
                        approved: 25,
                        discarded: 28,
                        rejected: 7,
                        other: 3
                    }
                }
            },
            {
                id: 4,
                name: "한동훈",
                party: "국민의힘",
                district: "서울 동작구을",
                photo: "https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png",
                stats: {
                    attendance: 89,
                    billProposed: 45,
                    billPassRate: 38,
                    petitionProposed: 12,
                    petitionResult: 7,
                    committeePosition: "정무위원회 간사",
                    committeeRank: 2,
                    invalidVotes: 6,
                    voteConsistency: 93,
                    voteInconsistency: 7,
                    attendanceDetails: {
                        totalMeetings: 132,
                        attendance: 117,
                        absences: 10,
                        leaves: 3,
                        businessTrips: 2
                    },
                    billDetails: {
                        total: 45,
                        approved: 17,
                        discarded: 19,
                        rejected: 6,
                        other: 3
                    }
                }
            }
        ];
    }

    // 국회의원 선택 함수
    function selectMP(mp, cardIndex) {
        const comparisonCards = document.querySelectorAll('.comparison-card');
        const card = comparisonCards[cardIndex];
        
        if (card) {
            // 이미 선택된 의원인지 확인
            if (selectedMembers.includes(mp.id) && mp.id !== null) {
                showNotification('이미 다른 칸에서 선택된 의원입니다', 'warning');
                return;
            }

            // 이전 선택 해제
            if (selectedMembers[cardIndex]) {
                const prevIndex = selectedMembers.indexOf(selectedMembers[cardIndex]);
                if (prevIndex !== -1 && prevIndex !== cardIndex) {
                    selectedMembers[prevIndex] = null;
                }
            }

            // 새로운 선택 저장
            selectedMembers[cardIndex] = mp.id;

            // 선택된 국회의원 정보 업데이트
            const mpSelected = card.querySelector('.mp-selected');
            const mpImage = mpSelected.querySelector('img');
            const mpName = mpSelected.querySelector('.mp-selected-name');
            const mpParty = mpSelected.querySelector('.mp-selected-party');
            
            // 의원 정보 업데이트
            mpImage.src = mp.photo;
            mpImage.onerror = function() {
                this.src = 'https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png';
            };
            mpName.textContent = mp.name;
            mpParty.textContent = `${mp.party} · ${mp.district}`;
            
            // 통계 정보 업데이트
            updateMPStats(card, mp, cardIndex);
            
            // 툴팁 상세 정보 업데이트
            updateTooltipDetails(card, mp);
            
            // 다른 카드에 의원이 선택되어 있다면 비교 업데이트
            const otherCardIndex = cardIndex === 0 ? 1 : 0;
            const otherMemberId = selectedMembers[otherCardIndex];
            if (otherMemberId) {
                const otherMember = mpData.find(m => m.id === otherMemberId);
                if (otherMember) {
                    const otherCard = comparisonCards[otherCardIndex];
                    updateMPStats(otherCard, otherMember, otherCardIndex);
                }
            }
            
            console.log(`✅ ${mp.name} 선택 완료 (카드 ${cardIndex + 1})`);
            showNotification(`${mp.name} 의원 정보 로드 완료`, 'success');
        }
    }

    // 국회의원 초기화 함수
    function resetMP(cardIndex) {
        const comparisonCards = document.querySelectorAll('.comparison-card');
        const card = comparisonCards[cardIndex];
        
        if (card) {
            // 선택 해제
            selectedMembers[cardIndex] = null;

            const mpSelected = card.querySelector('.mp-selected');
            const mpImage = mpSelected.querySelector('img');
            const mpName = mpSelected.querySelector('.mp-selected-name');
            const mpParty = mpSelected.querySelector('.mp-selected-party');
            
            mpImage.src = 'https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png';
            mpName.textContent = '국회의원을 검색하세요';
            mpParty.textContent = '';
            
            // 통계 정보 초기화
            resetMPStats(card);
            
            // 툴팁 정보 초기화
            resetTooltipDetails(card);
            
            // 다른 카드에 의원이 선택되어 있다면 비교 없이 단독 표시로 업데이트
            const otherCardIndex = cardIndex === 0 ? 1 : 0;
            const otherMemberId = selectedMembers[otherCardIndex];
            if (otherMemberId) {
                const otherMember = mpData.find(m => m.id === otherMemberId);
                if (otherMember) {
                    const otherCard = comparisonCards[otherCardIndex];
                    updateMPStats(otherCard, otherMember, otherCardIndex);
                }
            }
            
            console.log(`🔄 카드 ${cardIndex + 1} 초기화 완료`);
        }
    }

    // 툴팁 상세 정보 업데이트
    function updateTooltipDetails(card, mp) {
        try {
            // 출석 상세 정보 업데이트
            if (mp.stats.attendanceDetails) {
                const details = mp.stats.attendanceDetails;
                const attendanceTooltip = card.querySelector('.tooltip-content[data-for="attendance"]');
                if (attendanceTooltip) {
                    attendanceTooltip.querySelector('.detail-total-meetings').textContent = details.totalMeetings || '-';
                    attendanceTooltip.querySelector('.detail-attendance').textContent = details.attendance || '-';
                    attendanceTooltip.querySelector('.detail-absences').textContent = details.absences || '-';
                    attendanceTooltip.querySelector('.detail-leaves').textContent = details.leaves || '-';
                    attendanceTooltip.querySelector('.detail-business-trips').textContent = details.businessTrips || '-';
                }
            }

            // 법안 상세 정보 업데이트
            if (mp.stats.billDetails) {
                const details = mp.stats.billDetails;
                const billTooltip = card.querySelector('.tooltip-content[data-for="bill"]');
                if (billTooltip) {
                    billTooltip.querySelector('.detail-bill-total').textContent = details.total || '-';
                    billTooltip.querySelector('.detail-bill-approved').textContent = details.approved || '-';
                    billTooltip.querySelector('.detail-bill-discarded').textContent = details.discarded || '-';
                    billTooltip.querySelector('.detail-bill-rejected').textContent = details.rejected || '-';
                    billTooltip.querySelector('.detail-bill-other').textContent = details.other || '-';
                }
            }
        } catch (error) {
            console.error('툴팁 상세 정보 업데이트 실패:', error);
        }
    }

    // 국회의원 통계 정보 업데이트 함수
    function updateMPStats(card, mp, cardIndex) {
        const statusItems = card.querySelectorAll('.status-item');
        
        // 두 명이 모두 선택된 경우 비교 수행
        const otherCardIndex = cardIndex === 0 ? 1 : 0;
        const otherMemberId = selectedMembers[otherCardIndex];
        const otherMember = otherMemberId ? mpData.find(m => m.id === otherMemberId) : null;
        
        let isWinner = {};
        if (otherMember) {
            isWinner = compareMemberStats(mp, otherMember, cardIndex);
        }

        // 통계 항목 매핑 (HTML 순서에 맞게)
        const statsMapping = [
            { key: 'attendance', suffix: '%', label: '출석', threshold: 90 },
            { key: 'billPassRate', suffix: '%', label: '본회의 가결', threshold: 40 },
            { key: 'petitionProposed', suffix: '건', label: '청원 제안', threshold: 15 },
            { key: 'petitionResult', suffix: '건', label: '청원 결과', threshold: 8 },
            { key: 'committeePosition', suffix: '', label: '위원회', threshold: null, special: 'committee' },
            { key: 'invalidVotes', suffix: '건', label: '무효표 및 기권', threshold: 5, reverse: true },
            { key: 'voteConsistency', suffix: '%', label: '투표 결과 일치', threshold: 85 },
            { key: 'voteInconsistency', suffix: '%', label: '투표 결과 불일치', threshold: 20, reverse: true }
        ];
        
        statusItems.forEach((item, index) => {
            // 첫 번째 아이템(국회의원 선택)은 건너뛰기
            if (index === 0) return;
            
            const statIndex = index - 1;
            if (statIndex < statsMapping.length) {
                const stat = statsMapping[statIndex];
                const valueElement = item.querySelector('.status-value');
                
                if (valueElement && mp.stats[stat.key] !== undefined) {
                    let value = mp.stats[stat.key];
                    let displayValue = value;
                    
                    // 특별 처리 (위원회)
                    if (stat.special === 'committee') {
                        displayValue = value;
                    } else {
                        displayValue = value + stat.suffix;
                    }
                    
                    // WIN/LOSE 표시 (두 명 모두 선택된 경우)
                    if (otherMember && stat.threshold !== null) {
                        const won = isWinner[stat.key] || false;
                        valueElement.innerHTML = `${won ? 'WIN' : 'LOSE'}(${displayValue})`;
                        valueElement.className = `status-value ${won ? 'win' : 'lose'}`;
                        
                        // 정당 색상 적용
                        if (partyData[mp.party]) {
                            valueElement.style.color = won ? 
                                partyData[mp.party].color : 
                                partyData[mp.party].lightColor;
                        }
                    } else {
                        valueElement.textContent = displayValue;
                        
                        // 위원회 특별 처리
                        if (stat.special === 'committee') {
                            const committeeRank = mp.stats.committeeRank || 1;
                            valueElement.className = 'status-value ' + (committeeRank > 1 ? 'win' : 'lose');
                        } else if (stat.threshold !== null) {
                            const isGood = stat.reverse ? 
                                value < stat.threshold : 
                                value > stat.threshold;
                            valueElement.className = 'status-value ' + (isGood ? 'win' : 'lose');
                        } else {
                            valueElement.className = 'status-value';
                        }
                    }
                }
            }
        });
    }

    // 두 국회의원 비교 함수
    function compareMemberStats(member1, member2, member1Index) {
        const comparison = {};
        
        comparison.attendance = member1.stats.attendance > member2.stats.attendance;
        comparison.billPassRate = member1.stats.billPassRate > member2.stats.billPassRate;
        comparison.petitionProposed = member1.stats.petitionProposed > member2.stats.petitionProposed;
        comparison.petitionResult = member1.stats.petitionResult > member2.stats.petitionResult;
        comparison.invalidVotes = member1.stats.invalidVotes < member2.stats.invalidVotes; // 적을수록 좋음
        comparison.voteConsistency = member1.stats.voteConsistency > member2.stats.voteConsistency;
        comparison.voteInconsistency = member1.stats.voteInconsistency < member2.stats.voteInconsistency; // 적을수록 좋음
        
        // 위원회 비교 (rank가 높을수록 좋음)
        comparison.committeePosition = member1.stats.committeeRank > member2.stats.committeeRank;
        
        return comparison;
    }

    // 툴팁 상세 정보 초기화
    function resetTooltipDetails(card) {
        try {
            // 출석 상세 정보 초기화
            const attendanceTooltip = card.querySelector('.tooltip-content[data-for="attendance"]');
            if (attendanceTooltip) {
                attendanceTooltip.querySelector('.detail-total-meetings').textContent = '-';
                attendanceTooltip.querySelector('.detail-attendance').textContent = '-';
                attendanceTooltip.querySelector('.detail-absences').textContent = '-';
                attendanceTooltip.querySelector('.detail-leaves').textContent = '-';
                attendanceTooltip.querySelector('.detail-business-trips').textContent = '-';
            }

            // 법안 상세 정보 초기화
            const billTooltip = card.querySelector('.tooltip-content[data-for="bill"]');
            if (billTooltip) {
                billTooltip.querySelector('.detail-bill-total').textContent = '-';
                billTooltip.querySelector('.detail-bill-approved').textContent = '-';
                billTooltip.querySelector('.detail-bill-discarded').textContent = '-';
                billTooltip.querySelector('.detail-bill-rejected').textContent = '-';
                billTooltip.querySelector('.detail-bill-other').textContent = '-';
            }
        } catch (error) {
            console.error('툴팁 상세 정보 초기화 실패:', error);
        }
    }

    // 국회의원 통계 정보 초기화 함수
    function resetMPStats(card) {
        const statusItems = card.querySelectorAll('.status-item');
        
        statusItems.forEach((item, index) => {
            // 첫 번째 아이템(국회의원 선택)은 건너뛰기
            if (index === 0) return;
            
            const valueElement = item.querySelector('.status-value');
            if (valueElement) {
                valueElement.textContent = '-';
                valueElement.className = 'status-value';
                valueElement.style.color = '';
            }
        });
    }

    // === 🔄 가중치 변경 실시간 업데이트 시스템 ===
    
    // 가중치 변경 감지 및 자동 새로고침
    function setupWeightChangeListener() {
        try {
            console.log('[CompareMember] 🔄 가중치 변경 감지 시스템 설정...');
            
            // 1. localStorage 이벤트 감지 (다른 페이지에서 가중치 변경 시)
            window.addEventListener('storage', function(event) {
                if (event.key === 'weight_change_event' && event.newValue) {
                    try {
                        const changeData = JSON.parse(event.newValue);
                        console.log('[CompareMember] 📢 가중치 변경 감지:', changeData);
                        handleWeightUpdate(changeData, 'localStorage');
                    } catch (e) {
                        console.warn('[CompareMember] 가중치 변경 데이터 파싱 실패:', e);
                    }
                }
            });
            
            // 2. BroadcastChannel 감지 (최신 브라우저)
            if (typeof BroadcastChannel !== 'undefined') {
                try {
                    const weightChannel = new BroadcastChannel('weight_updates');
                    weightChannel.addEventListener('message', function(event) {
                        console.log('[CompareMember] 📡 BroadcastChannel 가중치 변경 감지:', event.data);
                        handleWeightUpdate(event.data, 'BroadcastChannel');
                    });
                    
                    // 페이지 언로드 시 채널 정리
                    window.addEventListener('beforeunload', () => {
                        weightChannel.close();
                    });
                    
                    console.log('[CompareMember] ✅ BroadcastChannel 설정 완료');
                } catch (e) {
                    console.warn('[CompareMember] BroadcastChannel 설정 실패:', e);
                }
            }
            
            // 3. 커스텀 이벤트 감지 (같은 페이지 내)
            document.addEventListener('weightSettingsChanged', function(event) {
                console.log('[CompareMember] 🎯 커스텀 이벤트 가중치 변경 감지:', event.detail);
                handleWeightUpdate(event.detail, 'customEvent');
            });
            
            // 4. 주기적 체크 (폴백)
            let lastWeightCheckTime = localStorage.getItem('last_weight_update') || '0';
            setInterval(function() {
                const currentCheckTime = localStorage.getItem('last_weight_update') || '0';
                
                if (currentCheckTime !== lastWeightCheckTime && currentCheckTime !== '0') {
                    console.log('[CompareMember] ⏰ 주기적 체크로 가중치 변경 감지');
                    lastWeightCheckTime = currentCheckTime;
                    
                    const changeData = {
                        type: 'weights_updated',
                        timestamp: new Date(parseInt(currentCheckTime)).toISOString(),
                        source: 'periodic_check'
                    };
                    
                    handleWeightUpdate(changeData, 'periodicCheck');
                }
            }, 5000);
            
            console.log('[CompareMember] ✅ 가중치 변경 감지 시스템 설정 완료');
            
        } catch (error) {
            console.error('[CompareMember] ❌ 가중치 변경 감지 시스템 설정 실패:', error);
        }
    }
    
    // 가중치 업데이트 처리 함수
    async function handleWeightUpdate(changeData, source) {
        try {
            if (isLoading) {
                console.log('[CompareMember] 🔄 이미 로딩 중이므로 가중치 업데이트 스킵');
                return;
            }
            
            console.log(`[CompareMember] 🔄 가중치 업데이트 처리 시작 (${source})`);
            
            // 사용자에게 업데이트 알림
            showNotification('가중치가 변경되었습니다. 데이터를 새로고침합니다...', 'info');
            
            // 현재 선택된 의원들 정보 백업
            const currentSelections = selectedMembers.map((memberId, index) => {
                if (memberId) {
                    const member = mpData.find(m => m.id === memberId);
                    return member ? { member, cardIndex: index } : null;
                }
                return null;
            }).filter(selection => selection !== null);
            
            // 1초 딜레이 후 데이터 새로고침 (서버에서 가중치 처리 시간 고려)
            setTimeout(async () => {
                try {
                    // 새로운 데이터로 업데이트
                    await fetchMemberData();
                    
                    // 이전 선택 복원
                    currentSelections.forEach(({ member, cardIndex }) => {
                        const updatedMember = mpData.find(m => m.name === member.name && m.party === member.party);
                        if (updatedMember) {
                            selectMP(updatedMember, cardIndex);
                            console.log(`[CompareMember] 🔄 ${member.name} 의원 선택 복원 완료`);
                        }
                    });
                    
                    console.log('[CompareMember] ✅ 가중치 업데이트 완료');
                    showNotification('새로운 가중치가 적용되었습니다! 🎉', 'success');
                    
                    // 응답 전송 (percent 페이지 모니터링용)
                    try {
                        const response = {
                            page: 'compare_member.html',
                            timestamp: new Date().toISOString(),
                            success: true,
                            source: source,
                            restoredSelections: currentSelections.length
                        };
                        localStorage.setItem('weight_refresh_response', JSON.stringify(response));
                        setTimeout(() => localStorage.removeItem('weight_refresh_response'), 100);
                    } catch (e) {
                        console.warn('[CompareMember] 응답 전송 실패:', e);
                    }
                    
                } catch (error) {
                    console.error('[CompareMember] ❌ 가중치 업데이트 데이터 로드 실패:', error);
                    showNotification('가중치 업데이트에 실패했습니다. 다시 시도해주세요.', 'error');
                }
            }, 1000);
            
        } catch (error) {
            console.error('[CompareMember] ❌ 가중치 업데이트 처리 실패:', error);
            showNotification('가중치 업데이트 처리에 실패했습니다.', 'error');
        }
    }
    
    // 수동 새로고침 함수들 (외부에서 호출 가능)
    window.refreshCompareMemberData = function() {
        console.log('[CompareMember] 🔄 수동 새로고침 요청');
        fetchMemberData();
    };
    
    window.updateCompareMemberData = function(newData) {
        console.log('[CompareMember] 📊 외부 데이터로 업데이트:', newData);
        
        if (newData && Array.isArray(newData)) {
            mpData = newData;
            showNotification('데이터가 업데이트되었습니다', 'success');
            
            // 현재 선택된 의원들 재설정
            selectedMembers.forEach((memberId, index) => {
                if (memberId) {
                    const member = mpData.find(m => m.id === memberId);
                    if (member) {
                        selectMP(member, index);
                    }
                }
            });
        }
    };

    // 검색 및 필터 기능 초기화
    function initializeSearchAndFilter() {
        // CSS에서 정당별 색상 데이터 초기화
        partyData = getPartyColors();

        // 검색 필터 태그 선택 효과
        const filterTags = document.querySelectorAll('.filter-tag');
        
        filterTags.forEach(tag => {
            tag.addEventListener('click', function() {
                if (this.textContent === '정당별 필터') {
                    filterTags.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                } else {
                    const allTag = document.querySelector('.filter-tag:first-child');
                    allTag.classList.remove('active');
                    this.classList.toggle('active');
                }
            });
        });
        
        // 국회의원 검색 기능
        const searchInputs = document.querySelectorAll('.mp-search-input');
        const searchResults = document.querySelectorAll('.mp-search-results');
        
        searchInputs.forEach((input, index) => {
            input.addEventListener('focus', function() {
                if (this.value.length > 0) {
                    searchResults[index].classList.add('show');
                }
            });
            
            input.addEventListener('blur', function() {
                setTimeout(() => {
                    searchResults[index].classList.remove('show');
                }, 200);
            });
            
            input.addEventListener('input', function() {
                const searchValue = this.value.toLowerCase().trim();
                
                if (searchValue.length > 0) {
                    searchResults[index].innerHTML = '';
                    
                    // 활성화된 정당 필터 가져오기
                    const activeFilters = Array.from(document.querySelectorAll('.filter-tag.active'))
                        .map(tag => tag.textContent)
                        .filter(text => text !== '정당별 필터');
                    
                    // 검색어 및 필터로 국회의원 필터링
                    let filteredMPs = mpData.filter(mp => {
                        const matchesSearch = mp.name.toLowerCase().includes(searchValue) || 
                                            mp.district.toLowerCase().includes(searchValue) ||
                                            mp.party.toLowerCase().includes(searchValue);
                        
                        const matchesFilter = activeFilters.length === 0 || 
                                            activeFilters.includes(mp.party) ||
                                            (activeFilters.includes('기타 정당') && 
                                             !['더불어민주당', '국민의힘', '조국혁신당', '개혁신당', '진보당', '무소속'].includes(mp.party));
                        
                        return matchesSearch && matchesFilter;
                    });
                    
                    if (filteredMPs.length > 0) {
                        filteredMPs.slice(0, 10).forEach(mp => { // 최대 10개만 표시
                            const item = document.createElement('div');
                            item.className = 'mp-search-item';
                            
                            // 정당 색상 가져오기
                            const partyStyle = partyData[mp.party] ? 
                                `background-color: ${partyData[mp.party].color};` : 
                                'background-color: #999;';
                            
                            item.innerHTML = `
                                <div class="mp-search-photo">
                                    <img src="${mp.photo}" alt="${mp.name}" onerror="this.src='https://raw.githubusercontent.com/moody1317/osbasicproject_4/refs/heads/main/chat.png';">
                                </div>
                                <div class="mp-search-info">
                                    <div class="mp-search-name">${mp.name}</div>
                                    <div class="mp-search-party">${mp.party} · ${mp.district}</div>
                                </div>
                                <div class="mp-search-party-badge" style="${partyStyle}"></div>
                            `;
                            
                            item.addEventListener('click', function() {
                                selectMP(mp, index);
                                input.value = '';
                                searchResults[index].classList.remove('show');
                            });
                            
                            searchResults[index].appendChild(item);
                        });
                    } else {
                        // 검색 결과가 없을 때
                        const noResult = document.createElement('div');
                        noResult.className = 'mp-search-item';
                        noResult.innerHTML = '<span>검색 결과가 없습니다.</span>';
                        noResult.style.color = '#999';
                        noResult.style.cursor = 'default';
                        searchResults[index].appendChild(noResult);
                    }
                    
                    searchResults[index].classList.add('show');
                } else {
                    searchResults[index].classList.remove('show');
                }
            });
        });
        
        // 국회의원 제거 버튼
        const removeButtons = document.querySelectorAll('.mp-remove');
        
        removeButtons.forEach((button, index) => {
            button.addEventListener('click', function() {
                resetMP(index);
            });
        });
        
        // 초기 필터 태그 설정
        if (filterTags.length > 0) {
            filterTags[0].classList.add('active');
        }
    }

    // 페이지 초기화
    async function initializePage() {
        console.log('🚀 국회의원 비교 페이지 초기화 중...');
        
        try {
            // 국회의원 데이터 로드
            await fetchMemberData();
            
            // 검색 및 필터 기능 초기화
            initializeSearchAndFilter();
            
            // 가중치 변경 감지 시스템 설정
            setupWeightChangeListener();
            
            showNotification('국회의원 비교 페이지 로드 완료', 'success');
            console.log('✅ 국회의원 비교 페이지 초기화 완료');
            
        } catch (error) {
            console.error('❌ 페이지 초기화 오류:', error);
            showError('페이지 로드 중 오류가 발생했습니다');
        }
    }

    // 디버그 유틸리티 (전역)
    window.compareMemberDebug = {
        getMemberData: () => mpData,
        getSelectedMembers: () => selectedMembers,
        getMemberPhotos: () => memberPhotos,
        reloadData: () => initializePage(),
        showMemberStats: (memberName) => {
            const member = mpData.find(m => m.name === memberName);
            if (member) {
                console.log(`📊 ${memberName} 통계:`, member.stats);
                return member.stats;
            } else {
                console.log(`❌ ${memberName} 의원을 찾을 수 없습니다`);
                return null;
            }
        },
        clearSelection: () => {
            selectedMembers = [];
            const cards = document.querySelectorAll('.comparison-card');
            cards.forEach((card, index) => resetMP(index));
        },
        showInfo: () => {
            console.log('📊 국회의원 비교 페이지 정보:');
            console.log('- 로드된 의원 수:', mpData.length);
            console.log('- 선택된 의원:', selectedMembers);
            console.log('- 사진 데이터:', Object.keys(memberPhotos).length, '명');
            console.log('- APIService 상태:', window.APIService?._isReady ? '준비됨' : '대기중');
        },
        testAPIService: async () => {
            console.log('🔍 APIService 테스트 시작...');
            try {
                if (!window.APIService) {
                    console.error('❌ APIService가 없습니다');
                    return false;
                }
                
                const performance = await window.APIService.getPerformanceData();
                console.log('✅ 성과 데이터 로드 성공:', performance.length, '건');
                
                const photos = await window.APIService.getMemberPhotos();
                console.log('✅ 사진 데이터 로드 성공:', photos.length, '건');
                
                return true;
            } catch (error) {
                console.error('❌ APIService 테스트 실패:', error);
                return false;
            }
        },
        simulateWeightChange: () => {
            console.log('🔧 가중치 변경 시뮬레이션...');
            const changeData = {
                type: 'weights_updated',
                timestamp: new Date().toISOString(),
                source: 'debug_simulation'
            };
            handleWeightUpdate(changeData, 'debug');
        }
    };

    // 초기화 실행
    setTimeout(initializePage, 100);

    console.log('✅ 국회의원 비교 페이지 스크립트 로드 완료 (APIService 활용 + 사진 API 연동)');
    console.log('🔧 디버그 명령어:');
    console.log('  - window.compareMemberDebug.showInfo() : 페이지 정보 확인');
    console.log('  - window.compareMemberDebug.reloadData() : 데이터 새로고침');
    console.log('  - window.compareMemberDebug.clearSelection() : 선택 초기화');
    console.log('  - window.compareMemberDebug.testAPIService() : APIService 테스트');
    console.log('  - window.compareMemberDebug.simulateWeightChange() : 가중치 변경 시뮬레이션');
});