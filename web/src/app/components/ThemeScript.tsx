// SSR 시점에 다크 클래스를 미리 적용해서 FOUC(깜빡임) 방지
export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('foundry_theme');
        var isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) document.documentElement.classList.add('dark');
      } catch(e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
