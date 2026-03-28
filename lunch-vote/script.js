document.addEventListener('DOMContentLoaded', () => {
    const menuCards = document.querySelectorAll('.menu-card');
    const voteBtn = document.getElementById('vote-btn');
    const totalCountEl = document.getElementById('total-count');
    const resultsContainer = document.getElementById('results-section');

    // Google Sheets & API Settings
    const SHEET_ID = '1O-Xz5OFkPKd-beU3Llngxu8sbOu_1HGGZgiqEwkowpU';

    // [중요] 구글 앱스 스크립트 배포 후 아래 URL을 실제로 발급받은 URL로 교체해야 합니다. 
    // "Best Practice": 백엔드(GAS)를 통해 데이터베이스(Sheets)를 조작합니다.
    const API_URL = 'https://script.google.com/macros/s/AKfycby8Vu3hh4HhovhNfN5z2Qn3ZYPUop2RF7gZjyRiEWqWzgeRbnF0u1zNeO4xghwtP08R/exec'; // EX: 'https://script.google.com/macros/s/.../exec'

    // 읽기 전용으로 공개된 CSV URL (GAS 연동 전까지 데이터 불러오기에 사용 가능)
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

    // Mapping Sheet menu names to internal keys
    const menuMapping = {
        '비빔밥': 'bibimbap',
        '돈까스': 'donkatsu',
        '국밥': 'gukbap',
        '샐러드': 'salad'
    };

    let voteData = {
        bibimbap: 0,
        donkatsu: 0,
        gukbap: 0,
        salad: 0
    };

    let totalVotes = 0;
    let selectedMenu = null;

    // Load Data from Sheet on Start
    loadVotesFromSheet();

    // Menu Card Selection
    menuCards.forEach(card => {
        card.addEventListener('click', () => {
            menuCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedMenu = card.dataset.menu;

            const btnLabel = card.querySelector('h3').textContent;
            voteBtn.disabled = false;
            voteBtn.textContent = `${btnLabel} 투표하기`;
        });
    });

    // Voting Button Click
    voteBtn.addEventListener('click', async () => {
        if (!selectedMenu) return;

        const menuNameKR = Object.keys(menuMapping).find(key => menuMapping[key] === selectedMenu);

        // UI 처리
        voteBtn.classList.add('loading');
        voteBtn.disabled = true;
        voteBtn.textContent = '투표 데이터를 시트에 기록 중...';

        try {
            // API_URL이 설정되지 않았을 때를 위한 안내
            if (!API_URL) {
                console.warn('API_URL이 설정되지 않았습니다. Apps Script 배포 후 URL을 추가해야 시트에 저장됩니다.');
                // 가상 업데이트 (데모용)
                voteData[selectedMenu]++;
                totalVotes++;
                updateResults();
            } else {
                // 실시간 구글 시트 업데이트 요청 (POST)
                const response = await fetch(API_URL, {
                    method: 'POST',
                    mode: 'no-cors', // CORS 정책으로 인해 요청 성공 여부를 직접 읽지는 못하지만 데이터는 전송됨
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        menu: menuNameKR,
                        voter: '익명'
                    })
                });

                // 데이터 반영을 위해 약간의 지연 후 리로드 (시트 저장 시간 고려)
                setTimeout(() => loadVotesFromSheet(), 1500);
            }

            // 성공 피드백
            voteBtn.textContent = '투표 완료!';
            voteBtn.style.background = 'linear-gradient(to right, #00D2D3, #45aaf2)';

            const item = document.querySelector(`.result-item[data-menu="${selectedMenu}"]`);
            item.classList.add('updated');
            setTimeout(() => item.classList.remove('updated'), 2000);

            // 초기화
            setTimeout(() => {
                menuCards.forEach(c => c.classList.remove('selected'));
                selectedMenu = null;
                voteBtn.textContent = '투표하기';
                voteBtn.style.background = '';
                voteBtn.disabled = true;
            }, 3000);

        } catch (error) {
            console.error('투표 전송 실패:', error);
            voteBtn.textContent = '전송 실패 (콘솔 확인)';
            voteBtn.disabled = false;
        }
    });

    async function loadVotesFromSheet() {
        try {
            // "Best Practice": API_URL이 있으면 JSON으로, 없으면 CSV로 읽음
            const response = await fetch(API_URL || CSV_URL);
            let rows = [];

            if (API_URL) {
                const jsonData = await response.json();
                // JSON 형태 { menu: '비빔밥', ... } 일 때의 처리
                rows = jsonData.map(item => [null, item.menu]);
            } else {
                const csvText = await response.text();
                rows = csvText.split('\n').map(row => row.split(','));
            }

            // 데이터 초기화
            Object.keys(voteData).forEach(k => voteData[k] = 0);
            totalVotes = 0;

            // 시트 데이터 집계 (1행 헤더 제외)
            for (let i = 1; i < rows.length; i++) {
                const menuInSheet = rows[i][1]?.replace(/"/g, '').trim();
                if (menuInSheet && menuMapping[menuInSheet]) {
                    voteData[menuMapping[menuInSheet]]++;
                    totalVotes++;
                }
            }

            updateResults();
        } catch (error) {
            console.error('데이터 로딩 오류:', error);
            updateResults();
        }
    }

    function updateResults() {
        totalCountEl.textContent = `총 ${totalVotes}명 참여`;

        Object.keys(voteData).forEach(menu => {
            const count = voteData[menu];
            const percent = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";

            const resultItem = document.querySelector(`.result-item[data-menu="${menu}"]`);
            const progressFill = resultItem.querySelector('.progress-fill');
            const countEl = resultItem.querySelector('.count');

            progressFill.style.width = `${percent}%`;
            countEl.textContent = `${count}표 (${percent}%)`;
        });
    }
});


