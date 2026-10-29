# thddun

Account・Taskの階層、前提関係、担当状態と権限をGUIで扱うアプリです。

- 正式checkout: `G:\source\repos\2026\thddun`（独立したGit repository）
- Remote: https://github.com/atachan14/thddun / 基準branch: `main`
- 現行アプリ: https://thddun.vercel.app/top.html
- **引継ぎ入口: [docs/README.md](docs/README.md)**
- [現行仕様](docs/SPEC.md) / [構成・検証・公開](docs/DEVELOPMENT.md) / [統合状況と保留項目](docs/STATUS.md)

Node 24.xを使用します。依存準備後の検証は以下です。DB接続・本番データは不要です。

```sh
node scripts/test.mjs
node scripts/build.mjs
```

`main`へのpushは既存Vercelの本番自動deployにつながります。整理用review branchへのpushと、本番反映は区別してください。
旧READMEのv0.1起動・Tier説明は過去版です（`git show cf60e43:README.md`）。旧launcherや旧ledgerを現行アプリの正本として扱わないでください。
