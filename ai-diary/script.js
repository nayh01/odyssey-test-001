const btnVoice = document.getElementById('btnVoice');
const diaryInput = document.getElementById('diary-input');

// Web Speech API 지원 확인 (Chrome은 webkitSpeechRecognition을 사용)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ko-KR'; // 한국어 인식 설정
    recognition.interimResults = true; // 말하는 동안 중간 결과를 계속 반환
    recognition.continuous = true; // 멈춰도 연속해서 들을 수 있도록 설정

    let isRecording = false;
    let finalTranscript = '';

    // 음성 인식이 시작될 때
    recognition.onstart = () => {
        isRecording = true;
        btnVoice.innerHTML = '🎙️ 음성 인식 중...';
        // 버튼을 시각적으로 활성화 상태로 표시
        btnVoice.style.color = '#ff4d4f'; 
        btnVoice.style.fontWeight = 'bold';
        
        // 기존 텍스트가 있다면 이어서 쓸 수 있도록 저장
        finalTranscript = diaryInput.value;
        if(finalTranscript && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
            finalTranscript += ' ';
        }
    };

    // 음성 인식 결과가 반환될 때마다 실행
    recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptChunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                // 문장이 최종 결정되면 finalTranscript에 추가
                finalTranscript += transcriptChunk + ' ';
            } else {
                // 아직 인식 중인 중간 결과
                interimTranscript += transcriptChunk;
            }
        }
        // 확정된 텍스트 + 인식 중인 텍스트 조합해서 입력창에 표시
        diaryInput.value = finalTranscript + interimTranscript;
    };

    // 마이크 접근 실패 등 에러 발생 시
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
            alert('마이크 사용 권한을 허용해주세요.');
        }
    };

    // 음성 인식이 종료될 때
    recognition.onend = () => {
        isRecording = false;
        btnVoice.innerHTML = '🎙️ 음성으로 입력하기'; // 텍스트 원상복구
        btnVoice.style.color = ''; // 스타일 원상복구
        btnVoice.style.fontWeight = '';
    };

    // 버튼 클릭 이벤트
    btnVoice.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

} else {
    // Web Speech API를 지원하지 않는 브라우저 대응
    btnVoice.addEventListener('click', () => {
        alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 이용해 주세요.');
    });
}

// --- [Gemini AI 분석 기능 (서버 연동)] ---
const btnAnalyze = document.getElementById('btnAnalyze');
const aiResponseBox = document.getElementById('aiResponse');

btnAnalyze.addEventListener('click', async () => {
    const textContext = diaryInput.value.trim();
    if (!textContext) {
        alert("일기 내용을 먼저 작성해주세요!");
        return;
    }

    // 상태 변경 (로딩 애니메이션 혹은 텍스트)
    btnAnalyze.innerHTML = '✨ 분석 중...';
    btnAnalyze.disabled = true;
    aiResponseBox.innerHTML = '<span style="color: #666;">AI가 답변을 고민하고 있어요... 잠시만 기다려주세요 💭</span>';

    try {
        // 백엔드 (Vercel Serverless Function) 로 사용자의 일기 전송
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: textContext })
        });
        
        const data = await response.json();

        if (response.ok) {
            // 줄바꿈 문자를 <br> 태그로 변환하여 출력
            const formattedReply = data.reply.replace(/\n/g, '<br>');
            aiResponseBox.innerHTML = formattedReply;

            // 로컬 스토리지에 현재 일기 내용과 AI 답변 저장
            localStorage.setItem('savedDiary', textContext);
            localStorage.setItem('savedResponse', formattedReply);
        } else {
            aiResponseBox.innerHTML = `<span style="color: red;">오류 발생: ${data.error}</span>`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        aiResponseBox.innerHTML = `<span style="color: red;">서버 통신 실패: 인터넷 연결이나 서버 상태를 확인해주세요.</span>`;
    } finally {
        // 복구
        btnAnalyze.innerHTML = '✨ 분석 요청하기';
        btnAnalyze.disabled = false;
    }
});

// --- [페이지 로드 시 로컬 스토리지 데이터 불러오기] ---
window.addEventListener('DOMContentLoaded', () => {
    const savedDiary = localStorage.getItem('savedDiary');
    const savedResponse = localStorage.getItem('savedResponse');

    if (savedDiary) {
        diaryInput.value = savedDiary;
    }
    if (savedResponse) {
        aiResponseBox.innerHTML = savedResponse;
    }
});
