'use client';

import { useMemo, useState } from 'react';

interface GeneratedFile {
  path: string;
  content: string;
}

interface LivePreviewProps {
  files: GeneratedFile[];
  previewMode: 'mobile' | 'desktop';
  visualEditMode?: boolean;
}

/**
 * 실시간 미리보기 — 생성된 코드를 빌드 없이 iframe에서 렌더링
 * Tailwind CDN + React CDN으로 클라이언트 사이드 렌더링
 */
export default function LivePreview({ files, previewMode, visualEditMode = false }: LivePreviewProps) {
  const [activePage, setActivePage] = useState('/');

  // 페이지 목록 추출 (src/app/*/page.tsx)
  const pages = useMemo(() => {
    return files
      .filter(f => f.path.match(/src\/app\/(.+\/)?page\.tsx$/))
      .map(f => {
        const match = f.path.match(/src\/app\/(.+)\/page\.tsx$/);
        const route = match ? `/${match[1]}` : '/';
        return { route, path: f.path, content: f.content };
      })
      .sort((a, b) => {
        if (a.route === '/') return -1;
        if (b.route === '/') return 1;
        return a.route.localeCompare(b.route);
      });
  }, [files]);

  // 현재 선택된 페이지 코드
  const currentPage = pages.find(p => p.route === activePage) || pages[0];

  // globals.css 추출
  const globalsCss = files.find(f => f.path.includes('globals.css'))?.content || '';

  // layout.tsx에서 메타데이터/앱이름 추출
  const layoutFile = files.find(f => f.path.includes('layout.tsx'));
  const appNameMatch = layoutFile?.content?.match(/title:\s*['"](.+?)['"]/);
  const appName = appNameMatch?.[1] || 'My App';

  // JSX를 정적 HTML로 변환 (간이 변환기)
  const pageHtml = useMemo(() => {
    if (!currentPage) return '<div style="padding:40px;text-align:center;color:#94a3b8">페이지를 선택하세요</div>';
    return convertJsxToStaticHtml(currentPage.content, appName);
  }, [currentPage, appName]);

  // Visual Edit 모드 스크립트
  const visualEditScript = visualEditMode ? `
    // Visual Edit Mode — 호버 하이라이트 + 클릭 선택
    var hoveredEl = null;
    document.addEventListener('mouseover', function(e) {
      if (hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl.style.outlineOffset = '';
      }
      hoveredEl = e.target;
      e.target.style.outline = '2px solid #3182f6';
      e.target.style.outlineOffset = '2px';
    });
    document.addEventListener('mouseout', function(e) {
      e.target.style.outline = '';
      e.target.style.outlineOffset = '';
    });
    document.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var el = e.target;
      var component = null;
      var current = el;
      while (current) {
        if (current.getAttribute && current.getAttribute('data-component')) {
          component = current.getAttribute('data-component');
          break;
        }
        current = current.parentElement;
      }
      var rect = el.getBoundingClientRect();
      parent.postMessage({
        type: 'element-clicked',
        element: {
          tagName: el.tagName,
          className: (el.className || '').toString().slice(0, 200),
          textContent: (el.textContent || '').slice(0, 100),
          component: component,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        }
      }, '*');
    }, true);
  ` : '';

  // iframe에 주입할 전체 HTML
  const iframeHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; ${visualEditMode ? 'cursor: crosshair;' : ''} }
    ${extractCssVariables(globalsCss)}
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-pulse { animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
  </style>
</head>
<body class="min-h-screen bg-gray-50 antialiased">
  ${pageHtml}
  <script>
    ${visualEditMode ? visualEditScript : `
    // 네비게이션 인터셉트 → 부모에 메시지
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (link) {
        e.preventDefault();
        var href = link.getAttribute('href');
        if (href && href.startsWith('/')) {
          parent.postMessage({ type: 'navigate', route: href }, '*');
        }
      }
    });
    `}
    // 폼 제출 방지
    document.addEventListener('submit', function(e) { e.preventDefault(); });
  </script>
</body>
</html>`;
  }, [pageHtml, globalsCss, visualEditMode, visualEditScript]);

  return (
    <div className="flex h-full flex-col">
      {/* 페이지 탭 */}
      {pages.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-primary)] px-3 py-2 scrollbar-none">
          {pages.map(p => (
            <button
              key={p.route}
              onClick={() => setActivePage(p.route)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activePage === p.route
                  ? 'bg-[var(--toss-blue)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.route === '/' ? '홈' : routeToKorean(p.route)}
            </button>
          ))}
        </div>
      )}

      {/* Visual Edit 모드 인디케이터 */}
      {visualEditMode && (
        <div className="flex items-center gap-2 bg-[var(--toss-yellow)]/10 border-b border-[var(--toss-yellow)]/30 px-3 py-1.5">
          <span className="text-[11px] text-[var(--toss-yellow)] font-medium">Visual Edit 모드 — 요소를 클릭하여 수정</span>
        </div>
      )}

      {/* iframe 미리보기 */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-[var(--bg-secondary)] p-4">
        <div
          className={`overflow-hidden border bg-white shadow-2xl transition-all duration-300 ${
            visualEditMode ? 'border-[var(--toss-yellow)]' : 'border-[var(--border-primary)]'
          } ${
            previewMode === 'mobile' ? 'w-[375px] rounded-[2.5rem]' : 'w-full max-w-[900px] rounded-xl'
          }`}
          style={{ height: previewMode === 'mobile' ? '700px' : '600px' }}
        >
          {previewMode === 'mobile' && (
            <div className="flex h-[44px] items-center justify-center bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
              <div className="h-[5px] w-[120px] rounded-full bg-[var(--bg-secondary)]" />
            </div>
          )}
          <iframe
            srcDoc={iframeHtml}
            className="w-full border-0"
            style={{ height: previewMode === 'mobile' ? '656px' : '600px' }}
            title="Live Code Preview"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}

/** 영어 라우트를 한글 메뉴명으로 변환 */
function routeToKorean(route: string): string {
  const map: Record<string, string> = {
    'store-intro': '매장소개', 'member': '회원', 'products': '상품',
    'orders': '주문', 'shipping': '배송', 'coupons': '쿠폰',
    'reviews': '리뷰', 'subscriptions': '정기구독', 'experience': '체험예약',
    'dashboard': '대시보드', 'settings': '설정', 'customers': '고객',
    'analytics': '분석', 'reservations': '예약', 'payment': '결제',
    'cart': '장바구니', 'profile': '프로필', 'login': '로그인',
    'signup': '회원가입', 'about': '소개', 'contact': '문의',
    'notifications': '알림', 'chat': '채팅', 'search': '검색',
  };
  const key = route.replace(/^\//, '').split('/')[0];
  return map[key] || route.replace(/^\//, '').replace(/\//g, ' / ');
}

/** globals.css에서 CSS 변수만 추출 */
function extractCssVariables(css: string): string {
  const rootMatch = css.match(/:root\s*\{[^}]+\}/);
  return rootMatch ? rootMatch[0] : '';
}

/**
 * JSX 코드를 정적 HTML로 간이 변환
 * - React hooks, state, useEffect 등을 제거하고 UI 부분만 추출
 * - Tailwind 클래스는 CDN으로 처리
 * - Supabase/인증 코드 자동 제거 (미리보기에선 불필요)
 */
function convertJsxToStaticHtml(code: string, appName: string): string {
  try {
    // Step 1: import문 + 로직부 제거, JSX(return) 블록만 추출
    let cleanCode = code;

    // 'use client' 제거
    cleanCode = cleanCode.replace(/['"]use client['"];?\s*/g, '');

    // import문 전체 제거
    cleanCode = cleanCode.replace(/^import\s+.*$/gm, '');
    cleanCode = cleanCode.replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?\s*$/gm, '');
    cleanCode = cleanCode.replace(/^import\s[\s\S]*?from\s*['"][^'"]+['"];?\s*$/gm, '');

    // 타입/인터페이스 선언 제거
    cleanCode = cleanCode.replace(/^(type|interface)\s+\w+[\s\S]*?^}/gm, '');

    // return (...) 블록 추출 — 괄호 매칭으로 정확히 추출
    let jsx = '';
    const returnIdx = cleanCode.lastIndexOf('return (');
    if (returnIdx !== -1) {
      let depth = 0;
      let start = -1;
      for (let i = returnIdx + 7; i < cleanCode.length; i++) {
        if (cleanCode[i] === '(') {
          if (depth === 0) start = i + 1;
          depth++;
        } else if (cleanCode[i] === ')') {
          depth--;
          if (depth === 0) {
            jsx = cleanCode.slice(start, i);
            break;
          }
        }
      }
    }

    // fallback: 단순 정규식
    if (!jsx) {
      const returnMatch = cleanCode.match(/return\s*\(\s*([\s\S]*)\s*\)\s*;?\s*\}?\s*$/);
      if (returnMatch) jsx = returnMatch[1];
    }
    if (!jsx) {
      const returnSimple = cleanCode.match(/return\s+(<[\s\S]*>)\s*;?\s*\}?\s*$/);
      if (returnSimple) jsx = returnSimple[1];
    }

    if (!jsx) {
      return `<div style="padding:40px;text-align:center;color:#94a3b8">
        <div style="font-size:48px;margin-bottom:16px">🔧</div>
        <div style="font-size:14px">미리보기를 준비 중입니다</div>
      </div>`;
    }

    // Step 2: JSX → HTML 변환
    let html = jsx;

    // 프래그먼트 → div
    html = html.replace(/<>/g, '<div>').replace(/<\/>/g, '</div>');

    // className → class
    html = html.replace(/className=/g, 'class=');

    // {변수 ? '...' : '...'} → 두 번째 값 (기본 상태 표시)
    html = html.replace(/\{[\w.!]+\s*\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]\s*\}/g, '$2');
    html = html.replace(/\{[\w.!]+\s*\?\s*['"]([^'"]*)['"]\s*:\s*([^}]+)\}/g, '$2');
    // {변수 ? (<JSX>) : (<JSX>)} → 두 번째 JSX
    html = html.replace(/\{[\w.!]+\s*\?\s*\([^)]*\)\s*:\s*\(([\s\S]*?)\)\s*\}/g, '$1');

    // {`텍스트 ${변수}`} → 텍스트 ...
    html = html.replace(/\{`([^`]*)\$\{[^}]+\}([^`]*)`\}/g, '$1...$2');

    // {변수.map(...)} → 내부 JSX를 3개 샘플로 렌더링
    html = html.replace(/\{[\w.]+\.map\(\s*\([^)]*\)\s*=>\s*\(([\s\S]*?)\)\s*\)\}/g, (_match, inner) => {
      let sample = inner
        .replace(/\{[\w.]+\.name\}/g, '샘플 항목')
        .replace(/\{[\w.]+\.title\}/g, '샘플 제목')
        .replace(/\{[\w.]+\.description\}/g, '설명 텍스트입니다')
        .replace(/\{[\w.]+\.price\}/g, '15,000원')
        .replace(/\{[\w.]+\.image\w*\}/g, '')
        .replace(/\{[\w.]+\.status\}/g, '진행중')
        .replace(/\{[\w.]+\.date\}/g, '2026-03-23')
        .replace(/\{[\w.]+\.count\}/g, '5')
        .replace(/\{[\w.]+\.id\}/g, '1')
        .replace(/\{[\w.[\]?]+\}/g, '...')
        .replace(/key=\{[^}]+\}/g, '')
        .replace(/className=/g, 'class=');
      return sample + sample + sample;
    });
    // 단순 map + 단일 JSX return (화살표 후 바로 태그)
    html = html.replace(/\{[\w.]+\.map\(\s*\([^)]*\)\s*=>\s*(<[\s\S]*?>[\s\S]*?<\/[\s\S]*?>)\s*\)\}/g, (_match, inner) => {
      let sample = inner.replace(/\{[\w.[\]?]+\}/g, '...').replace(/key=\{[^}]+\}/g, '').replace(/className=/g, 'class=');
      return sample + sample + sample;
    });
    // 남은 map 제거
    html = html.replace(/\{[\w.]+\.map\([^]*?\)\}/g, '');

    // {조건 && (...)} → 내용 표시
    html = html.replace(/\{[\w!.]+\s*&&\s*\(\s*([\s\S]*?)\s*\)\}/g, '$1');
    html = html.replace(/\{[\w!.]+\s*&&\s*(<[^}]+>)\}/g, '$1');

    // 남은 {변수} → 빈 문자열 또는 플레이스홀더
    html = html.replace(/\{error\}/g, '');
    html = html.replace(/\{[\w.[\]]+\.toLocaleString\(\)\}/g, '0');
    html = html.replace(/\{[\w.[\]]+\.toFixed\(\d+\)\}/g, '0');
    // 여러 단어 표현식 (함수 호출 등) 제거
    html = html.replace(/\{[^}]*\}/g, '');

    // onClick, onChange, onSubmit 등 이벤트 핸들러 제거
    html = html.replace(/\s+on[A-Z]\w+=\{[^}]*\}/g, '');

    // disabled={...} → disabled
    html = html.replace(/disabled=\{[^}]+\}/g, 'disabled');

    // value={변수} → value="" placeholder 유지
    html = html.replace(/value=\{[^}]+\}/g, 'value=""');
    html = html.replace(/defaultValue=\{[^}]+\}/g, '');

    // ref={...} 제거
    html = html.replace(/\s+ref=\{[^}]+\}/g, '');

    // style={{...}} → style="..."
    html = html.replace(/style=\{\{([^}]+)\}\}/g, (_, styles) => {
      const cssStr = styles
        .replace(/(\w+):/g, (_m: string, p: string) => p.replace(/([A-Z])/g, '-$1').toLowerCase() + ':')
        .replace(/,\s*/g, ';')
        .replace(/'/g, '');
      return `style="${cssStr}"`;
    });

    // 앱 이름 치환
    html = html.replace(/\$\{appName\}/g, appName);
    html = html.replace(/'My App'/g, `'${appName}'`);

    // 자기 닫힘 태그 수정
    html = html.replace(/<(input|img|br|hr)([^>]*?)\/>/g, '<$1$2>');

    // Link → a
    html = html.replace(/<Link\s/g, '<a ');
    html = html.replace(/<\/Link>/g, '</a>');
    html = html.replace(/\s+href=\{(['"][^'"]+['"])\}/g, ' href=$1');
    html = html.replace(/\s+href=\{[^}]+\}/g, ' href="#"');

    // 커스텀 컴포넌트 태그를 div로 치환 (대문자로 시작하는 태그)
    // 단, HTML 내장 태그와 특별한 컴포넌트는 제외
    const htmlTags = new Set(['a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote','body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr','html','i','iframe','img','input','ins','kbd','label','legend','li','link','main','map','mark','menu','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','picture','pre','progress','q','rp','rt','ruby','s','samp','script','section','select','slot','small','source','span','strong','style','sub','summary','sup','table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track','u','ul','var','video','wbr','svg','path','circle','rect','line','polyline','polygon','g','text','defs','clipPath','use','symbol','mask','pattern','image','foreignObject','stop','linearGradient','radialGradient']);
    html = html.replace(/<([A-Z]\w+)(\s|>|\/)/g, (match, tag, after) => {
      if (htmlTags.has(tag.toLowerCase())) return match;
      return `<div data-component="${tag}"${after}`;
    });
    html = html.replace(/<\/([A-Z]\w+)>/g, (match, tag) => {
      if (htmlTags.has(tag.toLowerCase())) return match;
      return '</div>';
    });

    return html;
  } catch {
    return `<div style="padding:40px;text-align:center;color:#94a3b8">
      <div style="font-size:48px;margin-bottom:16px">📄</div>
      <div style="font-size:14px">미리보기 변환 중 오류 발생</div>
    </div>`;
  }
}
