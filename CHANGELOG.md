# SharePage Plugin Changelog

## [1.5.0] - 2026-02-15
### ✨ Features
- **터보 싱크 (Turbo Sync, Beta)**: 깃헙 액션 빌드가 완료되기 전에도 즉시 공유가 가능한 고속 공유 모드입니다. 로컬에서 미리보기 HTML을 직접 생성하여 업로드합니다.
- **실시간 주소 상태 모니터링**: 깃헙 액션의 상태만 보는 것이 아니라, 실제 해당 주소가 "살아있는지(200 OK)" 직접 체크하여 알림을 주므로 카카오톡 미리보기 캐싱 문제를 근본적으로 해결합니다.
- **개발/배포 폴더 분리**: 원본 템플릿(`sharepage-template`)과 실제 배포용 환경(`sharepage-github`)을 분리하여 안정성을 확보했습니다.

### 🛠 Improvements
- **Advanced Mode 도입**: 숙련된 사용자를 위한 터보 싱크 설정을 추가했습니다.
- **삭제/업로드 시 .html 자동 관리**: 터보 싱크 사용 시 생성되는 `.html` 정적 파일들을 자동으로 관리(업로드/삭제)합니다.


## [1.4.0] - 2026-02-15
### ✨ Features
- **배포 성공 알림음 (Success Chime)**: 배포가 성공적으로 완료되면 맑은 "띵~" 소리로 알려주어 즉시 확인이 가능합니다.
- **버전 기반 업데이트 로직**: 템플릿 업데이트 시 커밋 수보다 실제 버전 번호를 우선 비교하여 불필요한 업데이트 알림을 방지합니다.

### 🛠 Improvements
- **배포 상태 피드백 개선**: "준비 중입니다. 완료 시 소리로 알려드릴게요"와 같이 사용자 안내 문구를 보강하여 배포 전 주소 클릭을 방지합니다.
- **자동 업데이트 재검증**: 업데이트 성공 후 2초 뒤 자동으로 버전을 재확인하여 화면에 바로 성공 상태가 반영되도록 했습니다.
- **삭제 프로세스 모니터링**: 문서 삭제 시에도 배포 완료 소리 알림과 상태 추적이 지원됩니다.

## [1.3.0] - 2026-02-14
### Changed
- version bump

## [1.2.0] - 2026-02-14
### Changed
- version bump

## [1.1.1] - 2026-02-14
### Changed
- version bump

## [1.3.1] - 2026-02-14
### Changed
- version bump

## [1.1.0] - 2026-02-15
### ✨ Features
- **Dynamic Template Updater**: Automatically synchronizes ALL system files from the upstream repository without manual file lists.
- **Underscore URL Support**: All uploaded notes and images are now standardized with underscores for better web compatibility and SEO.
- **Enhanced Delete Manager**: Prettified file titles (underscores to spaces) and improved search responsiveness in the content management modal.

### 🛠 Improvements
- Robust image upload pipeline with automatic space-to-underscore conversion.
- Optimized GitHub API calls for force updates using recursive tree analysis.
- Protected `CNAME` and `favicon.ico` during template updates to preserve custom domains.

---

## [1.0.0] - 2026-02-15
### 🎉 Major Release
- Initial stable release of SharePage!

### ✨ Features
- **Integrated Content Management**: Manage and delete uploaded notes directly from Obsidian.
- **Smart Deployment Tracking**: Real-time monitoring of GitHub Actions with live notifications.
- **Improved Updater**: Always-accessible "Force Update" and template version tracking.
- **Searchable Manager**: Easily find uploaded files in the management modal.
- **Safe Dashboard**: Protection for `_dashboard.md` to prevent accidental deletion.

### 🛠 Improvements
- Enhanced description extraction (cleans Markdown and Obsidian links for dashboard cards).
- Faster deployment polling strategy (30s delay + 5s interval).
- Atomic updates for core template files to prevent race conditions.
- Automatic hiding of empty dashboard sections.

### 🐛 Bug Fixes
- Resolved issue where URLs with special characters (spaces, etc.) wouldn't resolve correctly on GitHub Pages.
- Fixed infinite "Updating..." loop in certain Git states.
