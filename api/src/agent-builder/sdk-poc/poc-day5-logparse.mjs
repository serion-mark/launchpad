// Day 5 단위 검증 — admin.service.ts 파싱 regex 가 SDK END 로그를 올바르게 해석하는지 실측
//
// 배포하지 않고도 regex 정확성 확인 가능. 실제 파싱 로직을 복제 (admin.service.ts:292~336)

// 신포맷 (userId + email 포함)
const reNew =
  /\[cost\] session=(\S+) END userId=(\S+) email="([^"]*)" projectId=(\S+) name="([^"]*)" iter=(\d+) total=\$([0-9.]+) durationMs=(\d+) isEdit=(true|false) fileCount=(\d+)/;
// Day 5 SDK 선택적 캐시 필드
const reCache =
  /via=SDK\s+cache_read=(\d+)\s+cache_create=(\d+)\s+hit_ratio=([\d.]+)%/;

// SDK service 가 만들 실제 라인 예시 (agent-builder-sdk.service.ts)
const fixtures = [
  {
    label: '✅ SDK 신규 세션 (캐시 read=0)',
    line: `[cost] session=8814b552 END userId=cmmvse7h00000rh8h9fxxipdd email="test@serion.ai.kr" projectId=none name="" iter=1 total=$0.024349 durationMs=4201 isEdit=false fileCount=0 via=SDK cache_read=0 cache_create=5362 hit_ratio=0.0%`,
    expect: { via: 'SDK', cacheRead: 0, cacheCreate: 5362, hitRatio: 0.0 },
  },
  {
    label: '✅ SDK resume 세션 (캐시 hit)',
    line: `[cost] session=8814b552 END userId=cmmvse7h00000rh8h9fxxipdd email="test@serion.ai.kr" projectId=proj-abc name="localpick" iter=2 total=$0.005975 durationMs=3102 isEdit=true fileCount=0 via=SDK cache_read=17124 cache_create=41 hit_ratio=99.8%`,
    expect: { via: 'SDK', cacheRead: 17124, cacheCreate: 41, hitRatio: 99.8 },
  },
  {
    label: '⏩ 기존 수제 루프 (SDK 필드 없음)',
    line: `[cost] session=abc12345 END userId=u1 email="m@x.com" projectId=proj-xyz name="cafe" iter=12 total=$0.500000 durationMs=60000 isEdit=true fileCount=25`,
    expect: { via: null, cacheRead: null },
  },
];

let pass = 0;
let fail = 0;

console.log('🧪 Day 5 로그 파싱 단위 검증\n');

for (const f of fixtures) {
  console.log(`▶️  ${f.label}`);
  const mNew = f.line.match(reNew);
  const mCache = f.line.match(reCache);

  if (!mNew) {
    console.log('   ❌ reNew 매칭 실패');
    fail++;
    continue;
  }

  const parsed = {
    sessionId: mNew[1],
    userId: mNew[2],
    email: mNew[3],
    projectId: mNew[4],
    name: mNew[5],
    iter: parseInt(mNew[6], 10),
    totalUsd: parseFloat(mNew[7]),
    isEdit: mNew[9] === 'true',
    fileCount: parseInt(mNew[10], 10),
    via: mCache ? 'SDK' : null,
    cacheRead: mCache ? parseInt(mCache[1], 10) : null,
    cacheCreate: mCache ? parseInt(mCache[2], 10) : null,
    hitRatio: mCache ? parseFloat(mCache[3]) : null,
  };

  const expectViaOk = parsed.via === f.expect.via;
  const expectReadOk = parsed.cacheRead === f.expect.cacheRead;
  const expectCreateOk = f.expect.cacheCreate === undefined || parsed.cacheCreate === f.expect.cacheCreate;
  const expectRatioOk = f.expect.hitRatio === undefined || parsed.hitRatio === f.expect.hitRatio;

  console.log(`   session=${parsed.sessionId} user=${parsed.email} total=$${parsed.totalUsd}`);
  console.log(`   via=${parsed.via} cache_read=${parsed.cacheRead} cache_create=${parsed.cacheCreate} hit_ratio=${parsed.hitRatio}%`);
  const ok = expectViaOk && expectReadOk && expectCreateOk && expectRatioOk;
  if (ok) {
    console.log('   ✅ 기대치 일치\n');
    pass++;
  } else {
    console.log(`   ❌ 기대치: ${JSON.stringify(f.expect)}\n`);
    fail++;
  }
}

console.log(`\n🚦 Day 5 파싱 게이트: ${pass}/${pass + fail} 통과`);
process.exit(fail === 0 ? 0 : 2);
