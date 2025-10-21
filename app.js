const express = require('express');
const app = express();

// 가상의 사용자 데이터를 가져오는 함수 (DB 조회라고 가정)
function findUserById(id) {
  const users = {
    '1': { id: '1', name: 'Alice', age: 30 },
    '2': { id: '2', name: 'Bob', age: 25 },
  };
  // id 3번 사용자는 일부러 누락
  return users[id] || null;
}

app.get('/users/:id/profile', (req, res) => {
  try {
    const userId = req.params.id;
    const user = findUserById(userId);

    // 1. user가 null일 경우를 체크하여 404 에러를 반환하도록 수정
    if (!user) {
      // return을 사용하여 함수를 즉시 종료
      return res.status(404).send({ error: 'User not found' });
    }

    // 2. 중복 선언된 'message' 변수 제거
    const message = `Welcome, ${user.name}!`;

    res.send({ message });
  } catch (error) {
    // 실제 서버라면 더 정교한 로깅을 하겠지만, 예시를 위해 단순화
    console.error(`[ERROR] ${new Date().toISOString()} - ${error.stack}`);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => console.log('Server is running on port 3000'));