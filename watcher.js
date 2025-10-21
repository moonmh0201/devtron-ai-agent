const chokidar = require('chokidar');
const { runSelfHealingAgent } = require('./runner_agent.js'); // 2단계에서 부품으로 만든 에이전트를 불러옵니다.

const TARGET_FILE_TO_WATCH = "app.js"; // 감시할 대상 파일

console.log(`👀 [Watcher] '${TARGET_FILE_TO_WATCH}' 파일 감시를 시작합니다...`);
console.log("이제 파일을 수정하고 저장하면 에이전트가 자동으로 실행됩니다.");

// chokidar를 사용하여 파일 감시를 설정합니다.
const watcher = chokidar.watch(TARGET_FILE_TO_WATCH, {
    persistent: true, // 프로세스가 계속 실행되도록 합니다.
    ignoreInitial: true, // 처음 실행 시에는 이벤트가 발생하지 않도록 합니다.
});

let isAgentRunning = false; // 에이전트가 중복 실행되는 것을 방지하기 위한 깃발

// 'change' 이벤트 (파일 내용이 변경되고 저장될 때)가 발생하면 실행될 로직
watcher.on('change', async (path) => {
    if (isAgentRunning) {
        console.log("🏃 [Watcher] 이전 에이전트가 아직 실행 중입니다. 이번 변경은 건너뜁니다.");
        return;
    }
    
    isAgentRunning = true; // 에이전트 실행 시작
    console.log(`\n🔔 [Watcher] '${path}' 파일 변경이 감지되었습니다!`);
    
    // 불러온 AI 에이전트를 실행합니다.
    await runSelfHealingAgent(); 
    
    isAgentRunning = false; // 에이전트 실행 완료
    console.log("\n👀 [Watcher] 다시 파일 감시를 시작합니다...");
});