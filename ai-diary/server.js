require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;

// CORS 설정 (프론트엔드에서 오는 데이터 요청 허용)
app.use(cors());
app.use(express.json());

// 환경 변수에서 GEMINI_API_KEY 로드
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === '여기에_발급받은_API_키를_입력하세요') {
    console.error("경고: .env 파일에 유효한 GEMINI_API_KEY가 설정되지 않았습니다.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// 분석 요청을 처리하는 웹 서버 라우트
app.post('/api/analyze', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: "일기 내용이 없습니다." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고 사용자의 감정을 한 단어(예. 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: [요약된 감정] \\n\\n [응원 메시지]' 와 같이 줄바꿈을 포함해서 보내줘.\n\n사용자 일기: "${text}"`;
        
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        // 프론트엔드로 다시 분석 결과 반환
        res.json({ reply: responseText });
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "답변을 생성하는 중에 오류가 발생했습니다." });
    }
});

app.listen(port, () => {
    console.log(`서버가 성공적으로 실행되었습니다: http://localhost:${port}`);
    console.log(`프론트엔드 통신 대기 중...`);
});
