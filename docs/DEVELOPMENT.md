# 構成・検証・運用

## 環境と入口

正式pathは `G:\source\repos\2026\thddun`。独立cloneで `origin=https://github.com/atachan14/thddun.git`、通常branchは `main` / upstream `origin/main`です。旧worktreeの.gitを借りていません。

Node 24.x、lockfileに合わせたpnpm 11.25.0を使用します。新しい環境では `pnpm install --frozen-lockfile --ignore-scripts`。パッケージを勝手に最新版へ更新しないでください。この整理では使用済み依存コードを独立コピーし、secret・DBはコピーしていません。pnpm未導入PCでも、依存準備済みならpackage script本体を直接実行できます。

```sh
node scripts/test.mjs
node scripts/build.mjs
```

テストはfake/隔離PGlite/loopbackを使用し、remote DBへfallbackしません。PGlite engineは `.local-test-tools/pglite/dist/index.js`、または環境変数 `THDMN_TEST_PGLITE_MODULE`で指定します。これは依存コードであり、既存DBディレクトリとは別です。

Buildは `public/` と `.build/`のみを生成し、DB接続・seed・認証設定変更を行いません。source closure、secret sentinel、ライセンス、compiled APIの拒否境界をbuild-testで確認します。

## 主なモジュール

| 場所 | 責務 |
| --- | --- |
| `v02/ui/production-entry.mjs` / `top-page.mjs` | 公開top、認証導線、共有入口 |
| `v02/ui/canvas-shell.mjs` / detail・form群 | Current/選択、Board、Overlay |
| `v02/local-auth/production-application.mjs` | password APIのhost/origin/workspace境界 |
| `credential-service.mjs` / `password.mjs` | scrypt、session、CSRF、rate limit |
| `policy-repository.mjs` / `downward-policy.mjs` | transaction、現在権限、操作検査 |
| `policy-snapshot.mjs` | 認可済みDTO投影。共有Account保護のwrapperを維持 |
| `field-store.mjs` / `fields.mjs` | SQL永続化とフィールド規則の分離 |
| `v02/http/node-adapter.mjs` | Node request/Response変換。認証やhost認可は呼出側 |
| `v02/samples/` | 架空blueprint/operator seedと隔離テスト。公開APIではない |
| `api/index.mjs` / `vercel.json` | 既存Git連携のbuild/rewrite |

## ローカル起動の位置づけ

通常の現行UI確認URLは https://thddun.vercel.app/top.html です。`node server.cjs` / `launch.cmd`は旧v0.1 ledger系で、現行password APIの起動手順ではありません。

`v02/ui/top-local-server.mjs`は旧ローカルDB用previewです。旧cafe生成物の読取と初期化経路が残るため、正式checkoutでの新規起動用とはまだ扱いません。旧C側previewのDBやGroup込み019スキーマを黙ってコピー/再初期化しないでください。正式pathへのローカルDB移行・launcher更新・実起動は今回実施していません。既存previewの起動停止もしません。

新規cloneで安全に実行できる検証入口は上のtest/buildです。GUI付きlocal実行を整える際は、別途既存DBバックアップ・適用schema・保持対象を確認してから行います。

## 公開とDB

既存GitHub mainへのpushはVercel project `thddun` の本番自動deployを起動します。`review/workspace-handoff`等のreview branchは本番mainの置換ではありません。push前にremote差分・公開範囲・CI/previewの影響を確認してください。今回の整理では本番main反映を確認待ちにし、明示deploy/promoteは行いません。

公開反映時は対象SHAのREADY、alias `thddun.vercel.app`のdeployment ID、HTTPとAPIを照合します。短縮aliasが旧deploymentを指し続けた実績があるため、READYだけで反映済みと判断しないでください。旧 `thdmn.vercel.app` は削除済みで再作成しません。

既存DBはNeonの既存project/branch、DB `thdmn`、schema `thdmn_v02_trial`、workspace `demo`。接続値はdocs/commit/logへ書きません。`DATABASE_URL`やNeon Auth設定の変更はコード整理とは別の操作です。資格情報をファイルへ保存する試みは過去に拒否されています。保存済みsecretの抽出や、広いprocess commandline取得で迂回しないでください。

既存migrationは001/002、003、004–010、012、014–018。019 Groupは未公開系列です。buildや起動案内を理由に本番SQLやseedを自動実行しないでください。DB適用・sample再投入・backup restoreは対象と現在状態を確認し、明示された範囲で実施します。

Google/Bearerの既存root系と新password API `/api/app/v1`は別経路です。ID連携や旧Task移動を自動では行いません。実Google OAuthの成功は未検証で、今回もgrantやprovider設定を変更していません。
