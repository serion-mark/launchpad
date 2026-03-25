/**
 * Foundry Visual Editor — iframe 내부 편집 스크립트
 *
 * 역할: 배포된 앱의 HTML에 주입되어 편집 기능을 제공
 * 의존성: 없음 (독립 스크립트)
 * 통신: postMessage (부모 페이지 ↔ iframe)
 */
(function () {
  'use strict';

  // origin 검증: foundry.ai.kr 또는 localhost(개발)만 허용
  var ALLOWED_ORIGINS = [
    'https://foundry.ai.kr',
    'http://foundry.ai.kr',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  var editMode = false;
  var highlightEl = null; // 현재 하이라이트된 요소
  var selectedEl = null;  // 마지막 클릭된 요소
  var overlay = null;     // 하이라이트 오버레이 div

  // ── 하이라이트 오버레이 생성 ──
  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'foundry-editor-overlay';
    overlay.style.cssText =
      'position:fixed;pointer-events:none;z-index:99999;' +
      'border:2px solid #3182f6;background:rgba(49,130,246,0.08);' +
      'border-radius:4px;transition:all 0.15s ease;display:none;';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showOverlay(el) {
    if (!el || !overlay) return;
    var rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  // ── 요소 정보 추출 ──
  function getElementInfo(el) {
    // data-component 찾기 (부모 탐색)
    var component = '';
    var file = '';
    var current = el;
    while (current && current !== document.body) {
      if (current.getAttribute) {
        if (!component && current.getAttribute('data-component')) {
          component = current.getAttribute('data-component');
        }
        if (!file && current.getAttribute('data-foundry-file')) {
          file = current.getAttribute('data-foundry-file');
        }
      }
      if (component && file) break;
      current = current.parentElement;
    }

    var rect = el.getBoundingClientRect();
    var computed = window.getComputedStyle(el);

    return {
      tagName: el.tagName.toLowerCase(),
      textContent: (el.textContent || '').trim().slice(0, 200),
      innerText: (el.innerText || '').trim().slice(0, 200),
      className: (el.className || '').toString().slice(0, 300),
      id: el.id || '',
      component: component,
      file: file,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles: {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        padding: computed.padding,
        margin: computed.margin,
      },
      isImage: el.tagName === 'IMG',
      imageSrc: el.tagName === 'IMG' ? el.src : '',
      isText: isTextElement(el),
    };
  }

  // 텍스트 편집 가능한 요소인지 판단
  function isTextElement(el) {
    var tag = el.tagName.toLowerCase();
    var textTags = ['h1','h2','h3','h4','h5','h6','p','span','a','button','label','li','td','th','dt','dd'];
    if (textTags.indexOf(tag) >= 0) return true;
    // 자식이 텍스트 노드만 있는 경우
    if (el.childNodes.length > 0 && el.childNodes.length <= 3) {
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) return true;
      }
    }
    return false;
  }

  // ── 이벤트 핸들러 ──
  function onMouseOver(e) {
    if (!editMode) return;
    var el = e.target;
    if (el === overlay || el === document.body || el === document.documentElement) return;
    highlightEl = el;
    showOverlay(el);
  }

  function onMouseOut(e) {
    if (!editMode) return;
    hideOverlay();
    highlightEl = null;
  }

  function onClick(e) {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var el = e.target;
    if (el === overlay || el === document.body || el === document.documentElement) return;
    selectedEl = el;

    var info = getElementInfo(el);
    window.parent.postMessage({
      type: 'element-clicked',
      element: info,
    }, '*');
  }

  // ── 편집 모드 ON/OFF ──
  function enableEditMode() {
    if (editMode) return;
    editMode = true;
    createOverlay();
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.body.style.cursor = 'crosshair';
  }

  function disableEditMode() {
    if (!editMode) return;
    editMode = false;
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    hideOverlay();
    highlightEl = null;
    selectedEl = null;
    document.body.style.cursor = '';
  }

  // ── DOM 업데이트 (즉시 반영) ──
  function findSelectedElement() {
    // selectedEl이 아직 DOM에 있으면 그대로 사용
    if (selectedEl && document.contains(selectedEl)) return selectedEl;
    return null;
  }

  function updateText(data) {
    var el = findSelectedElement();
    if (!el) return;
    // 직접 텍스트 노드만 업데이트 (자식 HTML 보존)
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      el.childNodes[0].textContent = data.value;
    } else {
      el.textContent = data.value;
    }
  }

  function updateStyle(data) {
    var el = findSelectedElement();
    if (!el) return;
    if (data.property && data.value !== undefined) {
      el.style[data.property] = data.value;
    }
    if (data.styles && typeof data.styles === 'object') {
      for (var prop in data.styles) {
        el.style[prop] = data.styles[prop];
      }
    }
  }

  function updateImage(data) {
    var el = findSelectedElement();
    if (!el || el.tagName !== 'IMG') return;
    el.src = data.value;
  }

  // ── 메시지 수신 ──
  function onMessage(e) {
    if (ALLOWED_ORIGINS.indexOf(e.origin) === -1) return;
    if (!e.data || typeof e.data !== 'object') return;

    switch (e.data.type) {
      case 'enable-edit-mode':
        enableEditMode();
        break;
      case 'disable-edit-mode':
        disableEditMode();
        break;
      case 'update-text':
        updateText(e.data);
        break;
      case 'update-style':
        updateStyle(e.data);
        break;
      case 'update-image':
        updateImage(e.data);
        break;
    }
  }

  window.addEventListener('message', onMessage);

  // 부모에게 준비 완료 알림
  window.parent.postMessage({ type: 'foundry-editor-ready' }, '*');
})();
