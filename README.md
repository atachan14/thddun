# thddun

Task の親子階層・前提関係・担当者ごとの状態を、ボードと関係図で扱うアプリ。**作り直し中**(2026-11-06 開始、ブランチ `rebuild`)。

- まずローカル版を作る。自分と AI が使い、保存先は Markdown と Git。DB は使わない。
- 公開版は、あとから同じコアに保存先と入口を足して作る。
- 入口: [docs/README.md](docs/README.md)

## 動かし方(ローカル版)
Node 22 以降が必要。外部のパッケージは使っていないので、インストールは要らない。

```bash
npm run workspace -- add kb G:/kb/content --readonly
```

```bash
npm start
```

http://127.0.0.1:4310/ を開く。Workspace の一覧は、このパソコンの `%APPDATA%\thddun\workspaces.json` に保存される(リポジトリには入れない)。テストは `npm test`。

| 場所 | 中身 |
|---|---|
| `core/` | コア。ファイルにもネットワークにも触らない(ブラウザでも使えるように) |
| `local/` | ローカル版: フォルダの読み込み、Workspace の一覧、サーバー |
| `ui/` | 画面 |
| `test/` | テスト(`node --test`) |
| `site/` | 本番(Vercel)の「作り直し中」のページ |

以前の試作(v0.1 のローカル版と v0.2 の共有版)のコードは、タグ `prototype-v02` に残っています。当時の docs は [docs/archive/20261106/](docs/archive/20261106/) にあります。
