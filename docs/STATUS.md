# 状況

2026-11-09 時点。

- **作業:** ブランチ `rebuild` で作り直し中。以前の試作のコードは消して、docs は archive に移した。要件定義の下書きは [REQUIREMENTS.md](REQUIREMENTS.md)。新しいコードはまだない。
- **Vercel:** プロジェクトはリセットせず、`rebuild` の push で Preview を動かしながら開発する。今は `site/` の静的なページを、ビルドなしでそのまま公開する設定(`vercel.json`)。
- **本番:** 2026-11-09 に、https://thddun.vercel.app を「作り直し中」の静的なページ(`site/index.html`)に置き換えた。以前の試作の画面と API は、もう公開していない。
- **DB:** 以前の試作の Neon の DB(全部テスト用)は、2026-11-09 にプロジェクトごと消した。Vercel の Neon の連携(thddun だけにつながっていた)も外し、thddun の環境変数は1つもない。
- **以前の作業フォルダ:** `G:\source\repos\2026\thdmn`・`thdmn-v02` と、Codex の作業フォルダ2つ(`thdmn-git-candidate`・`thddun-host-compat`)は、2026-11-09 にごみ箱へ移した。Codex の日付フォルダに残っていた作業ファイル(パッチ・SQL・スクリーンショットなど)と、`.local-test-tools/` も同じ。保管用のブランチ `preserved/*` も消した。以前の試作で残っているのは、タグ `prototype-v02` と `docs/archive/` だけ。v0.1 の `ledger.json` のタスク102件は、当時の docs から作ったサンプルで、運用していないデータだった。GitHub の `atachan14/thdmn` は、このリポジトリの昔の名前(転送が残っているだけ)。
- **次にやること:** コアと、Markdown の読み込みを作る(まず kb を読み取り専用で表示する)。Node は導入済み。

## 未決
- 名前(thddun のままか)。中身が固まってから決める。
