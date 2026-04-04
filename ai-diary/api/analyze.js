const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
    // 1. CORS 설정 (Vercel 배포 시 필요할 수 있음)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // OPTIONS 요청 (프리플라이트) 처리
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. POST 메서드만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 3. 사용자 일기 내용 가져오기
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: "일기 내용이 없습니다." });
        }

        // Vercel 환경 변수에서 가져오기
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "서버에 API 키가 설정되지 않았습니다." });
        }

        // 4. Gemini API 호출
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // 지정된 심리 상담가 프롬프트
        const prompt = `너는 심리 상담가야. 사용자가 작성한 일기 내용을 읽고 사용자의 감정을 한 단어(예. 기쁨, 슬픔, 분노, 불안, 평온)로 요약해줘. 그리고 그 감정에 공감해주고, 따뜻한 응원의 메시지를 2~3문장으로 작성해줘. 답변 형식은 반드시 '감정: [요약된 감정] \\n\\n [응원 메시지]' 와 같이 줄바꿈을 포함해서 보내줘.\n\n사용자 일기: "${text}"`;
        
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        // 5. 프론트엔드로 다시 분석 결과 반환
        return res.status(200).json({ reply: responseText });
        
    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: "답변을 생성하는 중에 오류가 발생했습니다." });
    }
};
