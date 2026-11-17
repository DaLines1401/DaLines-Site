# Sens Lab — Antigravity handoff

Updated: 2026-11-17 (Asia/Bangkok). This file records project context, not a request to publish or purchase services.

## Start here

- Repository: https://github.com/DaLines1401/DaLines-Site
- Branch: `main`. Latest implementation commit: `1488053e15c4b578993b3bf62bdd632ec64f2b15`.
- Local checkout: `C:\Users\TuangPCH\Documents\Codex\2026-11-17\c\DaLines-Site`
- App directory: `sens-lab/`. Current version: **0.2.1**.
- The user is continuing in Antigravity because their Codex quota is running out. Communicate in Thai. Inspect the current checkout and any new instructions before editing; preserve existing work and saved user data.
- All implementation changes above have been committed and pushed to GitHub. This handoff is committed separately.

## Product and work completed

Offline Electron/Three.js Windows portable app for mouse-sensitivity comparison in Valorant, CS2 and Apex Legends. It uses two stages (coarse then fine), each comparing three Sens values using Flick and Tracking. It is separate from the repository's Cloudflare website.

User feedback was: results hard to read, results need clearer explanation, adjustable round count. Implemented:

- Results emphasize the best Sens, change from starting value, copy action and plain-language next steps. Three ranked comparison cards replace the dense graph/table. Conversions and per-round tables are collapsed details.
- Separate states for clear, tied/noisy, edge-of-range, incomplete/insufficient and free-practice results. Practice and partial sessions do not claim a recommended Sens.
- **12 / 24 / 36 / 48 rounds**, default 24; corresponding 1 / 2 / 3 / 4 repetitions per mode per candidate per stage. All candidates get matching seeds per mode/repeat; ordering alternates. 12-round results are explicitly preliminary and never claim repeat consistency. Longer sessions assess variation across all repeats.
- Selected length controls progress, coarse-to-fine transition, completion, saved draft and resume. Old records/configs without `rounds` default to 24. Storage schema remains version 1.
- User-provided green bear/skull logo is in `assets/logo.png`; multi-size `assets/app.ico` brands the window and packaged EXE. No artwork redesign.
- Discord Rich Presence via local named-pipe IPC using only Node built-ins: public Application ID `1572201166853513286`. Logo is the saved Developer Portal App Icon via its CDN URL. No Bot Token, Client Secret, login or reading contacts/messages. Status shares only generic app information and elapsed time, not DPI, Sens or results. Enabled by default, with a persisted opt-out in settings. Reconnects when Discord starts/restarts, handles ping and split frames, clears its own presence on disable/exit. Automated Electron self-tests do not publish activity.
- Windows portable package generated; `resedit` is a build-only dependency used to embed the EXE icon. Package script accepts an optional output-directory argument and refuses to overwrite a destination containing user/test data.

## Key files

| File | Purpose |
| --- | --- |
| `src/core.mjs` | Round plans, scoring, ranking, recommendation and repetition validation |
| `src/app.js` | Settings, state, session lifecycle, results/history and Electron QA hooks |
| `src/index.html`, `src/style.css` | Thai UI, logo, adjustable rounds and Discord toggle |
| `src/arena.js` | Three.js range and pointer-lock input; not changed in this iteration |
| `desktop/main.cjs`, `desktop/preload.cjs` | Electron lifecycle, restricted IPC, local files and QA captures |
| `desktop/discord.cjs` | Optional Discord IPC client, public App ID and logo URL |
| `scripts/build.mjs`, `scripts/package.mjs` | Offline bundle and Windows portable packaging |
| `tests/core.test.mjs`, `tests/discord.test.mjs` | Comparison fairness/scoring and real local-pipe protocol tests |
| `README.md` (inside `sens-lab/`) | User/developer instructions and upgrade/Discord/SmartScreen notes |

## Run and verify

Node.js 22.12+ is required (tested locally on 24.19.0). From `sens-lab/` in Windows PowerShell use `npm.cmd`, because `npm.ps1` was blocked by execution policy earlier. Do not change the system policy.

```powershell
npm.cmd ci
npm.cmd start
npm.cmd test
npm.cmd run verify
npm.cmd run package -- release/DaLines-Sens-Lab-0.2.1
```

Choose a fresh output directory if the named release directory already has data or QA output. Never delete a release folder just to make packaging pass.

Latest verification before push: **19 Node tests passed; 92 Electron checks passed; 7 results previews, no renderer errors**. Packaged 0.2.1 EXE also passed its self-test. A separate live test received a successful `SET_ACTIVITY` response from the user's running Discord, then cleared the test activity. Readiness/layout checks use simulated runs; they do not replace physical cm/360 measurements.

QA artifacts are ignored under `qa-output/`: `report.json`, `pre-push-verify.log`, `results-*.png` and packaged verification logs. Initial Electron setup issues in the restricted environment were resolved; the full verification now runs successfully. If runtime installation is needed, use `node node_modules/electron/install.js` and a writable cache/temp directory rather than deleting user data.

## Saved results: preserve them

- Portable: `data/` next to the EXE. Developer mode: `.local-data/` inside `sens-lab/`.
- `data/records/workspace.json`: settings, recent history and active draft. Full sessions: `data/records/sessions/<id>.json`.
- V1 results are compatible. Close both apps, back up V1 `data`, then copy the entire directory into a fresh V2 folder next to its EXE. An independently extracted ZIP starts without that previous history; it does not delete it.
- Known V1 location: `C:\Users\TuangPCH\Downloads\DaLines-Sens-Lab-0.1.0-Windows-x64\DaLines-Sens-Lab`. Four saved session files were observed there; do not assume their current count or modify them automatically.
- The older local `sens-lab/release/DaLines-Sens-Lab/` now contains a `data` directory. Preserve it. The 0.2.1 release is separate.
- Do not commit or distribute `data`, `.local-data`, `qa-output`, `node_modules` or user results. Distributable ZIPs exclude them.

## Local deliverables already built

Directory: `C:\Users\TuangPCH\Documents\Codex\2026-11-17\c\outputs`

- `DaLines-Sens-Lab-0.2.1-Windows-x64.zip` (~159 MB decimal), with a `DaLines-Sens-Lab/` folder; tested and checked for required Discord files and absence of user/test data.
- `sens-lab-0.2.1-source.zip` (source backup; GitHub is the authoritative current source).
- Older 0.2.0 ZIPs and `sens-lab-results.png` / `sens-lab-comparison.png` also exist.
- Packaged 0.2.1 directory: `sens-lab/release/DaLines-Sens-Lab-0.2.1/`. Self-testing adds a `qa-output` subfolder; exclude it when making a distributable.
- ZIP binaries were **not** committed, uploaded as GitHub Releases or uploaded to Google Drive in this session.

## Open topics and useful next steps

### Website/download publishing (not yet done)

`downloads/sens-lab.html` still advertises **v0.1.0** and links to the existing Google Drive ZIP. The new ZIP has only been delivered locally. When the user requests distribution updates, upload the intended new artifact to the agreed location and update the download link/version/screenshots together. Do not change the page to 0.2.1 while leaving a known-old binary behind its link. The root website build excludes the application source/binaries. Root README describes Cloudflare auto-deployment from `main`; avoid unrelated website changes.

### SmartScreen / Microsoft Store (discussed, not implemented)

The user's friend saw “Windows protected your PC” / “Unknown publisher”. The new EXE is still **NotSigned**, verified with `Get-AuthenticodeSignature`. Changing the icon/EXE name/ZIP does not resolve this. No publisher certificate or Microsoft Store developer account was supplied; no purchases, account registration, certificate generation, signing or Store submissions were performed.

Discussed legitimate options: a trusted Code Signing identity for direct distribution, or an MSIX submission through Microsoft Store (the Store handles signing for that path). Signing does not guarantee immediate SmartScreen reputation. Do not disable Windows security, install a self-signed root as a workaround, or promise all machines will stop warning.

The user asked whether Store submission is difficult. We explained account/identity verification, preparing MSIX/listing/screenshots, then certification; they have **not yet requested a Store submission**. If they choose this route, account-specific package identity/publisher details are needed. Adapt the current portable storage design for a Store-installed app: do not write data beside a protected installed EXE, and provide a safe migration path. Preserve the portable edition.

Official references:
- https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation
- https://learn.microsoft.com/en-us/windows/apps/publish/get-started
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/create-app-submission
- https://docs.discord.com/developers/topics/rpc

### Discord follow-up

Developer Portal icon/name were confirmed saved using its public application metadata endpoint. Current logo URL is hard-coded in `desktop/discord.cjs`; changing the portal icon changes its hash, so update this URL when changing the logo. Users need desktop Discord and activity sharing enabled; visibility follows their Discord privacy settings. No custom Rich Presence asset upload is required for the current CDN-image approach. No need to ask for any secret.

## Suggested first prompt in Antigravity

“อ่าน sens-lab/HANDOFF.md และตรวจ git status ก่อน ทำต่อจาก Sens Lab 0.2.1 บน main โดยรักษาข้อมูล data และงานเดิมทั้งหมด สรุปงานที่ค้างแล้วช่วยทำตามสิ่งที่ฉันเลือกต่อ”
