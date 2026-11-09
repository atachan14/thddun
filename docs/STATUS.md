# 状況

2026-11-09 時点。

- **作業:** ブランチ `rebuild` で作り直し中。以前の試作のコードは消して、docs は archive に移した。要件定義の下書きは [REQUIREMENTS.md](REQUIREMENTS.md)。新しいコードはまだない。
- **Vercel:** プロジェクトはリセットせず、`rebuild` の push で Preview を動かしながら開発する。今は `site/` の静的なページを、ビルドなしでそのまま公開する設定(`vercel.json`)。
- **本番:** 2026-11-09 に、https://thddun.vercel.app を「作り直し中」の静的なページ(`site/index.html`)に置き換えた。以前の試作の画面と API は、もう公開していない。
- **次にやること:**
  1. Node を入れる。
  2. コアと、Markdown の読み込みを作る(まず kb を読み取り専用で表示する)。

## 未決
- Neon の DB。以前の試作のデータは全部テスト用なので、プロジェクトごと消す(2026-11-09 決定)。Vercel の thddun の環境変数(DB の接続先など6つ)は同日に削除済み。残りは Neon の画面での作業: thddun の Neon プロジェクトの Vercel 連携を切る → プロジェクトを消す。Neon の連携が残っている間は、ブランチを push すると Preview 用の DB の枝と環境変数が自動で作られる。
- 以前の作業フォルダ(`G:\source\repos\2026\thdmn`、`thdmn-v02`、Codex の作業フォルダ)の片付け。一覧は archive の `STATUS.md`。
- ローカルだけにある保管用のブランチ `preserved/local-public-demo` と `preserved/legacy-v02-foundation`。未公開の Group などを含むので push していない。
