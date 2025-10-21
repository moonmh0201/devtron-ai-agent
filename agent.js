// 필요한 라이브러리를 가져옵니다.
// fs.promises는 파일을 비동기적으로 읽고 쓰기 위해 사용됩니다.
const fs = require('fs').promises; 
const { GoogleGenerativeAI } = require('@google/generative-ai');

/*
=================================================================
                          ** 설정 **
=================================================================
*/

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// 1. Google AI Studio에서 발급받은 여러분의 API 키를 아래에 붙여넣으세요.
const GEMINI_API_KEY = "AIzaSyB5Xh4GGpOscEHSq74El3r1hAuSeMnMuw4";
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// 2. 분석할 파일들의 경로를 지정합니다.
const LOG_FILE_PATH = "server.log";
const SOURCE_CODE_PATH = "app.js";

/*
=================================================================
                        ** AI 에이전트 로직 **
=================================================================
*/

// Gemini 클라이언트를 초기화합니다.
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

/**
 * AI 에이전트의 메인 로직을 실행하는 비동기 함수
 */
async function runAgent() {
    console.log("🤖 AI 에이전트가 로그와 코드를 분석 중입니다...");

    try {
        // --- 단계 1: 파일 내용 읽기 (에이전트의 '눈' 역할) ---
        const logContent = await fs.readFile(LOG_FILE_PATH, "utf-8");
        const sourceCodeContent = await fs.readFile(SOURCE_CODE_PATH, "utf-8");

        // --- 단계 2: AI에게 전달할 프롬프트 생성 (에이전트의 '두뇌' 역할) ---
        // AI에게 명확한 역할, 분석할 정보(Context), 수행할 임무(Task)를 구체적으로 지시합니다.
        const prompt = `
너는 10년차 Node.js 시니어 개발자야. 너의 임무는 로그 파일과 소스 코드를 분석해서 문제의 근본 원인을 찾고, 안전하게 수정된 코드를 제안하는 거야.

### 1. 분석 대상 정보 (Context):

**[ server.log 파일 내용 ]**
\`\`\`
${logContent}
\`\`\`

**[ app.js 소스 코드 내용 ]**
\`\`\`javascript
${sourceCodeContent}
\`\`\`

### 2. 너의 과업 (Task):

위 정보를 바탕으로 아래 형식에 맞춰 답변해줘.

**1. 문제 원인 분석:**
- 로그에서 어떤 에러가 발생했는지 설명해.
- 소스 코드의 몇 번째 줄에서 왜 이 문제가 발생하는지 근본적인 원인을 설명해줘.

**2. 해결 방안:**
- 이 문제를 해결하기 위한 가장 좋은 방법을 설명해줘. (예: null 체크 추가)

**3. 리팩토링된 코드 제안:**
- 문제가 해결된 \`app.js\` 파일의 전체 코드를 코드 블록 안에 제공해줘.
- 어떤 부분이 어떻게 변경되었는지 주석으로 설명해주면 더욱 좋아.
`;

        // --- 단계 3: Gemini API 호출 및 결과 수신 (에이전트의 '입' 역할) ---
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("\n--- AI 에이전트 분석 보고서 ---");
        console.log(text);
        console.log("-----------------------------\n");
        console.log("✅ 분석이 완료되었습니다.");

    } catch (error) {
        // --- 예외 처리 ---
        // 파일이 없을 경우 더 친절한 에러 메시지를 보여줍니다.
        if (error.code === 'ENOENT') {
             console.error(`❌ 오류: '${error.path}' 파일을 찾을 수 없습니다. 파일 이름과 경로를 확인하세요.`);
        } else {
             console.error(`❌ AI 모델 호출 중 오류가 발생했습니다:`, error);
        }
    }
}

// --- 에이전트 실행 ---
runAgent();