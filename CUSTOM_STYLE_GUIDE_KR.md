# SharePage 스타일 커스터마이징 가이드 (custom.css)

SharePage는 사용자가 자신만의 스타일을 정의할 수 있도록 `css/custom.css` 파일을 제공합니다. 이 가이드는 플러그인의 CSS 에디터를 통해 사이트의 디자인을 어떻게 변경할 수 있는지 설명합니다.

---

## 🎨 기본 원리

1.  **우선순위**: `custom.css`는 전체 스타일 시트의 가장 마지막에 로드됩니다. 따라서 표준 CSS 문법을 사용하여 시스템의 기본 설정을 손쉽게 덮어씌울 수 있습니다.
2.  **변수 활용**: 시스템 전반에서 사용되는 색상, 크기, 간격 등은 CSS 변수(--variable-name)로 정의되어 있습니다. 이 변수 값만 바꿔도 사이트 전체의 분위기를 바꿀 수 있습니다.

---

## 1. 색상 테마 변경 (Color DNA)

사이트 전반의 색상 테마를 바꾸고 싶다면 `:root`와 `body.theme-dark` 섹션을 활용하세요.

```css
/* 라이트 모드 테마 */
:root {
  --color-accent-primary: #ff5722; /* 포인트 색상을 주황색으로 변경 */
  --color-accent-hover: #e64a19;
  --color-surface-base: #ffffff;
  --color-text-primary: #1a1a1a;
}

/* 다크 모드 테마 */
body.theme-dark {
  --color-accent-primary: #ff7043;
  --color-surface-base: #121212;
  --color-text-primary: #f0f0f0;
}
```

---

## 2. 타이포그래피 (Typography)

글꼴 크기나 줄 간격을 조절하여 가독성을 개선할 수 있습니다.

```css
:root {
  --text-body-1: 17px;         /* 기본 본문 글자 크기 확대 */
  --line-height-relaxed: 1.7;  /* 줄 간격을 조금 더 여유 있게 */
  --text-heading-2: 28px;      /* H2 제목 크기 변경 */
}

/* 본문 영역에만 특정 폰트 적용 (예: Google Fonts 사용 시) */
.markdown-content {
  font-family: 'Pretendard', sans-serif;
  letter-spacing: -0.01em;
}
```

---

## 3. 레이아웃 및 간격 (Layout & Spacing)

문서의 최대 너비나 사이드바 영역을 조정할 수 있습니다.

```css
/* 문서 본문 폭 조정 */
.document-container {
  max-width: 900px; /* 본문 폭을 조금 더 넓게 */
  padding: 40px;
}

/* 네비게이션바(상단바) 스타일 수정 */
.navbar {
  border-bottom: 2px solid var(--color-accent-primary);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}
```

---

## 4. 컴포넌트 커스텀 이미지 (Cards & Tags)

대시보드의 카드 스타일이나 태그를 개성 있게 꾸며보세요.

```css
/* 문서 카드에 부드러운 그림자 추가 */
.dashboard-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.dashboard-card:hover {
  transform: translateY(-5px);
}

/* 태그 스타일 변경 */
.tag-badge {
  background-color: var(--color-surface-muted);
  color: var(--color-accent-primary);
  border: 1px solid var(--color-accent-primary);
}
```

---

## 🚀 꿀팁: 브라우저 개발자 도구 활용
1. 배포된 사이트에서 `F12`를 눌러 개발자 도구를 엽니다.
2. 원하는 요소를 선택(`Ctrl+Shift+C`)합니다.
3. 오른쪽 `Styles` 탭에서 사용되고 있는 변수 이름을 확인합니다.
4. 해당 변수명을 `custom.css`에 복사하여 값을 변경한 뒤 저장하면 배포 후 즉시 반영됩니다!
