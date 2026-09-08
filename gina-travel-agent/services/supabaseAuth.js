const { createClient } = require('@supabase/supabase-js');

let client = null;

function getClient() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
  return client;
}

// 클라이언트가 보낸 access token(JWT)을 Supabase Auth 서버에 검증 요청한다.
// 로컬에서 JWT 서명만 검사하는 대신 실제 네트워크 검증을 쓰는 이유:
// 로그아웃/삭제된 계정의 토큰도 즉시 걸러내기 위함 (Supabase 공식 권장 방식).
async function verifyAccessToken(accessToken) {
  if (!accessToken) return null;
  const { data, error } = await getClient().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

module.exports = { verifyAccessToken };
