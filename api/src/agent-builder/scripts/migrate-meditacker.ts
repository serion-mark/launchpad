// 일회성 마이그레이션 — 서버의 /tmp/foundry-agent-*/meditacker/ 를 projects 테이블로 이관
// 사용: 배포 후 서버에서 `node dist/agent-builder/scripts/migrate-meditacker.js`
//
// 왜 필요한가: 사장님이 오늘 밤 Agent Mode로 메디트래커를 만들었을 때는
// ProjectPersistenceService가 없어서 DB에 저장되지 않고 /tmp 에만 남아있음.
// 이 스크립트는 그 cwd를 읽어서 "내 프로젝트"에 복구한다 (추가 Agent 호출 X).

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const TMP_DIR = '/tmp';
const TARGET_USER_ID = 'cmmvse7h00000rh8h9fxxipdd'; // mark@serion.ai.kr
const PROJECT_NAME = '메디트래커';
const DESCRIPTION = 'Agent Mode로 생성 — 복약관리 + 건강수치 기록 + 진료기록 + 의료진 연동 + 병원 예약';
const SUB_DIR = 'meditacker';

// ProjectPersistenceService와 동일 규칙
const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', '.cache', '.turbo', 'coverage', '.vercel', '.DS_Store',
]);
const MAX_FILE_BYTES = 500 * 1024;
const MAX_TOTAL_FILES = 500;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function findSandboxRoot(subDir: string): string | null {
  try {
    for (const e of fs.readdirSync(TMP_DIR)) {
      if (!e.startsWith('foundry-agent-')) continue;
      const cand = path.join(TMP_DIR, e, subDir);
      if (fs.existsSync(cand)) return cand;
    }
  } catch {}
  return null;
}

function collectFiles(root: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  let totalBytes = 0;
  const walk = (dir: string, rel = '') => {
    if (out.length >= MAX_TOTAL_FILES || totalBytes >= MAX_TOTAL_BYTES) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.git')) continue;
      const full = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, relPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(full);
          if (stat.size > MAX_FILE_BYTES) continue;
          if (totalBytes + stat.size > MAX_TOTAL_BYTES) continue;
          const content = fs.readFileSync(full, 'utf8');
          out.push({ path: relPath, content });
          totalBytes += stat.size;
          if (out.length >= MAX_TOTAL_FILES) return;
        } catch {
          // binary 또는 읽기 실패 skip
        }
      }
    }
  };
  walk(root);
  return out;
}

async function main() {
  const root = findSandboxRoot(SUB_DIR);
  if (!root) {
    console.error(`❌ ${SUB_DIR} 디렉토리 없음 (/tmp/foundry-agent-*/${SUB_DIR})`);
    process.exit(1);
  }
  console.log(`📁 sandbox cwd: ${root}`);

  const files = collectFiles(root);
  console.log(`📋 수집된 파일: ${files.length}`);
  if (files.length === 0) {
    console.error('❌ 파일 0개 — 마이그레이션 중단');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    // 중복 체크 — 동일 이름 + userId로 이미 있으면 스킵
    const existing = await prisma.project.findFirst({
      where: { userId: TARGET_USER_ID, name: PROJECT_NAME },
    });
    if (existing) {
      console.log(`⚠️  동일 프로젝트 이미 존재 (id=${existing.id}) — 업데이트 모드로 진행`);
      const updated = await prisma.project.update({
        where: { id: existing.id },
        data: {
          description: DESCRIPTION,
          template: 'agent-mode',
          status: 'active',
          generatedCode: files as any,
        },
      });
      console.log(`✅ 업데이트 완료`);
      console.log(`   project.id = ${updated.id}`);
      console.log(`   subdomain  = ${updated.subdomain ?? '(없음)'}`);
      if (updated.subdomain) {
        console.log(`   예상 URL    = https://${updated.subdomain}.foundry.ai.kr`);
      }
      return;
    }

    const project = await prisma.project.create({
      data: {
        name: PROJECT_NAME,
        description: DESCRIPTION,
        template: 'agent-mode',
        status: 'active',
        userId: TARGET_USER_ID,
        generatedCode: files as any,
      },
    });
    console.log(`✅ 새 프로젝트 생성 완료`);
    console.log(`   project.id = ${project.id}`);
    console.log(`   subdomain  = ${project.subdomain ?? '(없음)'}`);
    if (project.subdomain) {
      console.log(`   예상 URL    = https://${project.subdomain}.foundry.ai.kr`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('💥 마이그레이션 실패:', err);
  process.exit(1);
});
