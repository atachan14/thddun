# thdmn

日本語UIのローカルTaskBoard試作、v0.1です。Taskの親子階層と、先に完了が必要な前提関係を分けて管理します。

## 起動

Node.js 24以降と現行のブラウザーを使用します。外部パッケージのインストールは不要です。

```sh
node server.cjs
```

http://127.0.0.1:18742 を開いてください。Windowsでは `launch.cmd` も利用できます。`launch.cjs` はローカルプロセスを起動し、ログをruntimeへ保存します。

初回は架空サンプルが表示されます。表示利用者を選び、詳細にある「保存先へ移行」から台帳を初期化してください。初期化前のサンプルと、保存後の共有台帳は別管理です。

## 機能

- 親Taskを開いて表示範囲を絞る関係図と、同じ台帳を使うDashboard。
- 前提は右、後続は左へ配置。1依存段階1列で、完了Taskは同段階の下部に表示。
- 担当者ごとの未着手・進行・保留・完了。記録のない取り込み状態は未確認として表示。
- 担当者全員と子Taskの完了からTask全体の状態を計算。前提待ちは別に判定。
- 作成権限・修正権限・担当者と、その設定項目を保護するTier。
- 子Task作成時の設定コピー、親・前提の循環検証、Task参照のお気に入り。
- ズーム・パン、詳細Pane、サイズ変更、ブラウザー内の表示設定保存。

## 保存と更新

正本は `runtime/data/ledger.json` です。更新はrevisionによる競合確認、操作IDによる重複防止、ロック、原子的置換、バックアップを使用します。runtimeと画像はGit管理対象外です。

`THDMN_PORT` と `THDMN_DATA_DIR` で別ポート・別保存先を指定できます。既存台帳を試験用データで上書きしないでください。

```sh
node cli.mjs show
node cli.mjs apply command.json --revision N --actor USER_ID
```

コマンドは同じlocalhost APIを利用します。Task作成は `createTask`、変更は `patchTask`、本人状態は `setMyState` です。TierやPolicyに応じた検証があるため、JSONを直接書き換える更新は推奨しません。バックアップからの復元やデータ形式移行は慎重に行ってください。

## 開発とテスト

```sh
node test.mjs
node domain-test.mjs
node tier-test.mjs
node work-states-test.mjs
node relations-test.mjs
node layered-layout-test.mjs
node store-api-test.mjs
```

その他の `*-test.mjs` も個別実行できます。保存テストは一時ディレクトリを使用します。ブラウザー実装は `app.mjs`、共有ルールは `domain.mjs`、保存層は `ledger-store.mjs`、HTTP入口は `server.mjs` です。

## 現在の制約

localhost専用です。ローカル利用者の切替は認証ではなく、インターネットへ公開するサーバー用途には対応していません。閲覧権限・Account/Group認証・Git同期・docs連携・PWAは未実装です。保留と成果物の受入確認は別概念で、成果物版単位の受入機能はありません。

v0.2の検討ではdocsへの参照連携を優先し、リポジトリのTask用フォルダからTaskを生成するGit取込は対象外としています。予定の機能を実装済みとは扱いません。

ライセンスはまだ設定していません。
