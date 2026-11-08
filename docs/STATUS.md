# 状況

2026-11-09 時点。

- **作業:** ブランチ `rebuild` で作り直し中。以前の試作のコードは消して、docs は archive に移した。要件定義の下書きは [REQUIREMENTS.md](REQUIREMENTS.md)。新しいコードはまだない。
- **Vercel:** プロジェクトはリセットせず、`rebuild` の push で Preview を動かしながら開発する。
- **本番:** https://thddun.vercel.app は以前の試作(`prototype-v02` と同じ `main`)のまま動いていて、Neon の DB を使っている。誰でも新規登録できる状態。止めるか、残すか、置き換えるかは未決。
- **次にやること:**
  1. 要件定義の未決を詰める。
  2. Node を入れる。
  3. コアと、Markdown の読み込みを作る(まず kb を読み取り専用で表示する)。

## 未決
- 今の本番と DB の扱い。Preview の環境変数に、本番の DB の接続先が残っていないかの確認。
- 以前の作業フォルダ(`G:\source\repos\2026\thdmn`、`thdmn-v02`、Codex の作業フォルダ)の片付け。一覧は archive の `STATUS.md`。
- ローカルだけにある保管用のブランチ `preserved/local-public-demo` と `preserved/legacy-v02-foundation`。未公開の Group などを含むので push していない。
