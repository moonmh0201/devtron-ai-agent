const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 설정 ---
const GEMINI_API_KEY = "AIzaSyB5Xh4GGpOscEHSq74El3r1hAuSeMnMuw4";
const TARGET_FILE_TO_RUN = "app.js";
const MAX_ATTEMPTS = 3; // 무한 루프 방지를 위한 최대 시도 횟수

// --- AI 클라이언트 초기화 ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

/**
 * 터미널 명령어를 실행하고 결과를 Promise로 반환하는 함수
 */
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        const process = exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error.message);
                return;
            }
            resolve(stdout);
        });

        // 서버 프로세스 감시 로직
        if (command.startsWith('node')) {
            let output = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
                if (output.includes('Server is running')) {
                    console.log("✅ [성공] 서버가 정상적으로 시작되었습니다.");
                    process.kill();
                    resolve(output);
                }
            });
            // 서버가 즉시 에러를 내뱉고 종료될 경우를 대비
            process.stderr.on('data', (data) => {
                // 이 데이터는 reject에서 이미 처리되므로 여기선 로깅만
            });
        }
    });
}

/**
 * 선제적 의존성 검사 및 설치 함수
 */
async function preflightCheck() {
    console.log("🕵️  [점검] 실행 전 선제적 의존성 검사를 시작합니다...");
    try {
        const sourceCode = await fs.readFile(TARGET_FILE_TO_RUN, 'utf-8');
        const requiredModules = [...sourceCode.matchAll(/require\(['"]([^'"]+)['"]\)/g)]
            .map(match => match[1])
            .filter(moduleName => !moduleName.startsWith('.'));

        if (requiredModules.length === 0) {
            console.log("✅ [점검 완료] 외부 라이브러리 의존성이 없습니다.");
            return;
        }

        console.log(`-  [발견] 코드에서 다음 라이브러리를 필요로 합니다: [${requiredModules.join(', ')}]`);
        for (const moduleName of requiredModules) {
            try {
                await fs.access(path.join('node_modules', moduleName));
                console.log(`-  [확인] '${moduleName}' 라이브러리가 이미 설치되어 있습니다.`);
            } catch (error) {
                console.warn(`⚠️ [조치] '${moduleName}' 라이브러리가 없습니다. 설치를 시작합니다.`);
                await executeCommand(`npm install ${moduleName}`);
                console.log(`✅ [조치 완료] '${moduleName}' 설치가 완료되었습니다.`);
            }
        }
    } catch (error) {
        console.error("❌ [점검 실패] 선제적 검사 중 오류가 발생했습니다:", error);
        throw error;
    }
}


/**
 * ⭐ 최종 기능: AI에게 코드 버그 수정을 요청하는 함수 ⭐
 * @param {string} sourceCode - 버그가 있는 원본 코드
 * @param {string} errorMessage - 실행 시 발생한 에러 메시지
 * @returns {Promise<string>} AI가 수정한 새로운 코드
 */
async function requestBugFixFromAI(sourceCode, errorMessage) {
    console.log("🧠 [분석] AI에게 코드 버그 수정을 요청합니다...");
    const prompt = `
      너는 최고의 Node.js 디버깅 전문가다. 아래 소스 코드를 실행했더니 심각한 버그가 발생했다.
      에러 메시지를 분석하여 코드의 근본적인 원인을 찾고, 완벽하게 수정된 전체 코드를 제공해줘.

      **[실행 시 발생한 에러 메시지]**
      \`\`\`
      ${errorMessage}
      \`\`\`

      **[수정 대상 원본 코드]**
      \`\`\`javascript
      ${sourceCode}
      \`\`\`

      **[너의 임무]**
      1.  **설명은 필요 없다.**
      2.  **오직 수정된 전체 코드만** 하나의 JavaScript 코드 블록 안에 담아서 즉시 응답해줘.
    `;

    const result = await model.generateContent(prompt);
    const fixResponse = result.response.text();
    // AI 응답에서 코드 부분만 깔끔하게 추출
    if (fixResponse.includes('```javascript')) {
        const fixedCode = fixResponse.split('```javascript')[1].split('```')[0].trim();
        return fixedCode;
    }
    throw new Error("AI가 유효한 코드 수정안을 반환하지 않았습니다.");
}


/**
 * 자율 복구 에이전트의 메인 로직
 */
async function runSelfHealingAgent() {
    let lastError = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            // 1단계: 선제적 의존성 검사
            if (attempt === 1) await preflightCheck();

            // 2단계: 코드 실행
            console.log(`\n--- [시도 #${attempt}] '${TARGET_FILE_TO_RUN}' 실행 ---`);
            await executeCommand(`node ${TARGET_FILE_TO_RUN}`);
            console.log("🏆 [최종 성공] 에이전트가 모든 문제를 해결하고 코드를 정상 실행했습니다.");
            return; // 성공 시 즉시 종료

        } catch (error) {
            console.warn("\n⚠️ [실패] 파일 실행 중 오류가 발생했습니다.");
            console.error("📄 에러 내용:\n", error.toString());

            // 무한 루프 방지: 똑같은 에러가 반복되면 중지
            if (lastError === error.toString()) {
                console.error("❌ [실패] AI가 문제를 해결하지 못했습니다. 동일한 오류가 반복됩니다.");
                break;
            }
            lastError = error.toString();
            
            if (attempt === MAX_ATTEMPTS) {
                console.error("❌ [실패] 최대 시도 횟수를 초과하여 에이전트를 중지합니다.");
                break;
            }
            
            // 3단계: AI에게 코드 수정을 요청하고 파일을 덮어쓰기
            try {
                const sourceCode = await fs.readFile(TARGET_FILE_TO_RUN, 'utf-8');
                const fixedCode = await requestBugFixFromAI(sourceCode, error.toString());
                await fs.writeFile(TARGET_FILE_TO_RUN, fixedCode, 'utf-8');
                console.log(`✅ [조치 완료] AI가 제안한 수정안으로 '${TARGET_FILE_TO_RUN}' 파일을 업데이트했습니다.`);
            } catch (aiError) {
                console.error("❌ [AI 오류] AI로부터 수정안을 받아오는 데 실패했습니다:", aiError);
                break;
            }
        }
    }
}

module.exports = { runSelfHealingAgent };