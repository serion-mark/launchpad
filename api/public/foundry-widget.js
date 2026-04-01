// Foundry 안내 위젯 — 생성된 앱에 자동 삽입
(function() {
  // 이미 삽입되었으면 무시
  if (document.getElementById('foundry-widget')) return;

  var projectId = '';
  var meta = document.querySelector('[data-foundry-project]');
  if (meta) projectId = meta.getAttribute('data-foundry-project') || '';
  // script 태그에서도 projectId 추출
  if (!projectId) {
    var scripts = document.querySelectorAll('script[data-foundry-project]');
    for (var i = 0; i < scripts.length; i++) {
      var pid = scripts[i].getAttribute('data-foundry-project');
      if (pid) { projectId = pid; break; }
    }
  }

  var builderUrl = projectId
    ? 'https://foundry.ai.kr/builder?projectId=' + projectId
    : 'https://foundry.ai.kr/dashboard';
  var startUrl = 'https://foundry.ai.kr/start';

  var widget = document.createElement('div');
  widget.id = 'foundry-widget';
  widget.innerHTML =
    '<div style="position:fixed;bottom:16px;left:16px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">' +
      // 펼친 상태
      '<div id="fw-expanded" style="background:#1b1b21;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px 18px;color:#fff;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:280px;position:relative;backdrop-filter:blur(10px);">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">' +
          '<span style="font-size:15px;">&#9889;</span>' +
          '<span style="font-weight:700;font-size:13px;letter-spacing:-0.3px;">Foundry로 만든 앱입니다</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
          '<a href="' + builderUrl + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;background:#3182f6;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;transition:background 0.15s;white-space:nowrap;" onmouseover="this.style.background=\'#1b6ff5\'" onmouseout="this.style.background=\'#3182f6\'">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '\uc774 \uc571 \uc218\uc815\ud558\uae30' +
          '</a>' +
          '<a href="' + startUrl + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.06);color:#8b95a1;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:500;border:1px solid rgba(255,255,255,0.08);transition:all 0.15s;white-space:nowrap;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\';this.style.color=\'#fff\'" onmouseout="this.style.background=\'rgba(255,255,255,0.06)\';this.style.color=\'#8b95a1\'">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            '\ub098\ub3c4 \ub9cc\ub4e4\uc5b4\ubcf4\uae30' +
          '</a>' +
        '</div>' +
        '<div style="color:#6b7684;font-size:11px;line-height:1.4;">10\ubd84\uc774\uba74 \uc774\ub7f0 \uc571\uc744 \ub9cc\ub4e4 \uc218 \uc788\uc5b4\uc694</div>' +
        '<button onclick="document.getElementById(\'fw-expanded\').style.display=\'none\';document.getElementById(\'fw-collapsed\').style.display=\'flex\';" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#6b7684;cursor:pointer;font-size:16px;line-height:1;padding:2px;" title="\uc811\uae30">&times;</button>' +
      '</div>' +
      // 접힌 상태
      '<div id="fw-collapsed" style="display:none;align-items:center;gap:5px;background:#1b1b21;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:7px 14px;color:#8b95a1;font-size:11px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.3);font-weight:500;transition:all 0.15s;backdrop-filter:blur(10px);" onclick="document.getElementById(\'fw-expanded\').style.display=\'block\';document.getElementById(\'fw-collapsed\').style.display=\'none\';" onmouseover="this.style.color=\'#fff\'" onmouseout="this.style.color=\'#8b95a1\'">' +
        '<span style="font-size:12px;">&#9889;</span> Made with Foundry' +
      '</div>' +
    '</div>';

  // DOM 준비되면 삽입
  if (document.body) {
    document.body.appendChild(widget);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(widget);
    });
  }
})();
