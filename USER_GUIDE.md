# SharePage 사용자 가이드

SharePage 플러그인을 사용하여 옵시디언 노트를 웹에 공유하는 상세 방법입니다.

---

## 🚀 시작하기 전 준비사항 (Pre-requisites)

이 플러그인은 **GitHub Pages**를 기반으로 작동합니다. 따라서 다음이 필요합니다:
1.  **GitHub 계정**
2.  **SharePage 웹 템플릿 레포지토리**: 
    - [SharePage 레포지토리](https://github.com/wis-graph/sharepage)를 자신의 계정으로 **Fork**하거나, 새 레포지토리를 생성하여 템플릿을 복사해야 합니다.
    - 레포지토리 설정(Settings -> Pages)에서 **GitHub Pages**가 활성화되어 있어야 합니다.

---

## 🛠 1단계: 플러그인 설정하기

플러그인을 옵시디언에 설치한 후, 아래 순서로 설정을 진행하세요.

### 1-1. GitHub 토큰 생성
1.  옵시디언 설정 -> **SharePage** 탭으로 이동합니다.
2.  **[Generate Token]** 버튼을 클릭합니다.
3.  GitHub 토큰 생성 페이지가 열리면 **[Generate token]**을 누릅니다. (필요한 권한인 `repo`와 `workflow`가 자동으로 체크되어 있습니다.)
4.  생성된 토큰(`ghp_...`)을 복사하여 플러그인의 **GitHub Token** 필드에 붙여넣습니다.

### 📂 컨텐츠 관리 및 삭제
업로드된 노트를 삭제하고 싶을 때, 로컬 저장소 파일을 건드리지 않고 GitHub에서 직접 삭제할 수 있습니다.
1. 옵시디언 설정 -> **SharePage Settings**로 이동합니다.
2. **📂 Content Management** 섹션의 **Open Manager** 버튼을 클릭합니다.
3. 삭제하고 싶은 파일들을 선택한 후 **Delete Selected**를 누르세요.
4. 삭제 후 GitHub Actions가 자동으로 사이트를 다시 빌드하며(약 1분 소요), 이후 사이트에서 해당 글이 사라집니다.

### 1-2. 레포지토리 연결
1.  **[Load Repositories]** 버튼을 클릭합니다.
2.  내 계정의 레포지토리 목록이 드롭다운으로 나타납니다. **SharePage 템플릿을 Fork한 레포지토리**를 선택하세요.
3.  선택 즉시 **Owner**와 **Name**이 자동으로 채워집니다.

### 1-3. 연결 테스트
1.  **[Test]** 버튼을 클릭합니다.
2.  "Connection successful!" 메시지가 뜨면 모든 설정이 올바르게 완료된 것입니다.

### 1-4. GitHub Actions & Pages 설정 (필수)
**Fork한 레포지토리는 보안상 기능이 비활성화되어 있어, 아래 설정을 반드시 마쳐야 웹사이트가 공개됩니다.**

#### 1) Actions 활성화
1.  GitHub에서 내 **SharePage 레포지토리**로 이동합니다.
2.  상단 메뉴에서 **[Actions]** 탭을 클릭합니다.
3.  **"I understand my workflows, go ahead and enable them"** 초록색 버튼을 클릭하여 활성화합니다.

#### 2) Pages 설정 (웹사이트 배포 주소 설정)
1.  레포지토리 상단의 **[Settings]** 탭으로 이동합니다.
2.  왼쪽 메뉴에서 **[Pages]**를 클릭합니다.
3.  **Build and deployment > Source**가 `Deploy from a branch`로 되어 있는지 확인합니다.
4.  **Branch** 항목을 `main`으로, 폴더를 `/(root)`로 선택하고 **[Save]**를 누릅니다.
5.  잠시 후 상단에 생성된 `https://<ID>.github.io/sharepage-wis/` 주소가 사용자님의 웹사이트 주소가 됩니다.

---

## 📝 2단계: 노트 공유하기

설정이 완료되면 아주 간단하게 노트를 공유할 수 있습니다.

### 방법 1: 명령 팔레트 사용 (추천)
- 공유하고 싶은 노트를 연 상태에서 `Ctrl + P` (또는 `Cmd + P`)를 누릅니다.
- `SharePage: Share current note to GitHub`를 검색하여 실행합니다.

### 방법 2: 우클릭 메뉴 사용
- 옵시디언 왼쪽의 파일 탐색기에서 파일을 우클릭합니다.
- **[Share to GitHub]** 메뉴를 선택합니다.

---

## 🖼 3단계: 이미지 처리 및 결과 확인

### 이미지 자동 업로드
- 노트 안에 포함된 이미지(`![[image.png]]`)는 플러그인이 자동으로 감지합니다.
- 노트가 업로드될 때 이미지 파일도 GitHub의 `images/` 폴더로 함께 업로드됩니다.

### 공유 URL 확인
- 업로드가 성공하면 "Successfully shared!" 알림과 함께 **공유 URL이 자동으로 클립보드에 복사**됩니다.
- 웹브라우저 주소창에 붙여넣어 결과를 확인하세요.
- URL 형식: `https://<사용자이름>.github.io/<레포이름>/#/노트이름.md`

---

## � 4단계: 배포 상태 모니터링 (Deployment Status)

GitHub에 새로운 내용이 전달되면 웹사이트를 다시 만드는 **GitHub Actions**가 자동으로 실행됩니다.

- **언제 실행되나요?**: 
    - 새 노트를 **Share** 할 때
    - 기존 노트를 **Unshare** 하거나 매니저에서 삭제할 때
    - **Template Sync**로 템플릿을 업데이트할 때
    - **Custom Style**을 동기화할 때
- **확인 방법**: 옵시디언 설정창 상단의 **Deployment Status** 섹션에서 실시간 상태(Queued, In Progress, Success)를 확인할 수 있습니다.
- **주의사항**: 상태가 🟢 **Success**가 되어야 실제 웹사이트에 변경 사항이 반영됩니다. (보통 30~60초 소요)

---

## �🔄 5단계: 업스트림 동기화 (Template Sync)

개발자의 원본 레포지토리(SharePage)에 새로운 기능이 추가되거나 오류가 수정되었을 때, 내 포크된 레포지토리를 최신 상태로 유지하는 기능입니다.

1.  옵시디언 설정 -> **SharePage** -> 최하단의 **Template Sync** 섹션으로 이동합니다.
2.  **[Check for Updates]** 버튼을 클릭합니다.
3.  업데이트가 있을 경우, 원본보다 얼마나 뒤처져 있는지 표시됩니다.
4.  **[Update Now]** 버튼을 누르면 GitHub의 `merge-upstream` 기능을 사용하여 내 레포지토리가 자동으로 최신 코드로 업데이트됩니다.
    - *참고*: 이 과정에서 사용자님이 업로드한 `notes/`나 `images/` 폴더의 데이터는 삭제되지 않고 그대로 유지됩니다.

---

## 🎨 커스텀 CSS (디자인 변경)

SharePage의 기본 디자인을 변경하고 싶다면 `css/custom.css` 파일을 수정하세요.
이 파일은 업데이트 시에도 초기화되지 않고 유지됩니다.

1.  GitHub 레포지토리에서 `sharepage/css/custom.css` 파일로 이동합니다.
2.  편집 버튼(연필 아이콘)을 누르고 원하는 CSS를 작성합니다.
3.  Commit Changes를 눌러 저장하면, 잠시 후 웹사이트에 반영됩니다.

**예시:**
```css
/* 배경색 변경 */
body {
    background-color: #f0f0f0;
}

/* 폰트 변경 */
body, p, h1, h2, h3 {
    font-family: 'Pretendard', sans-serif !important;
}
```

---

## ❓ 자주 묻는 질문 (FAQ)

**Q. 업로드했는데 웹사이트에 바로 안 나타나요.**
A. GitHub 서버에서 사이트를 빌드하는 데 시간이 필요합니다. 설정창의 **Deployment Status**가 🟢 **Success**가 되었는지 확인해 보세요.

**Q. 이미지 링크가 깨져서 보여요.**
A. 이미지가 옵시디언 볼트 내에 실제로 존재하는지 확인해 주세요. 플러그인은 볼트 내에서 찾을 수 있는 이미지만 함께 업로드합니다.

**Q. 기존 노트를 수정하면 어떻게 되나요?**
A. 수정 후 다시 **[Share to GitHub]**를 실행하면 GitHub의 파일이 새 내용으로 업데이트됩니다.
