# 状況

2026-11-06 時点。

- **作業:** ブランチ `rebuild` で、以前の試作のコードを消して docs を archive に移した。新しいコードはまだない。
- **本番:** https://thddun.vercel.app は以前の試作(`prototype-v02` と同じ `main`)のまま動いていて、Neon の DB を使っている。止めるか、残すか、置き換えるかは未決。
- **次にやること:**
  1. 以前の仕様(archive の `SPEC.md`)から、残すものを選んで書き直す。
  2. ローカル版のデータの形(Markdown のファイルの形)を決める。
  3. コアと、Markdown の保存先を作る。

## 未決
- 今の本番と DB の扱い。
- 以前の作業フォルダ(`G:\source\repos\2026\thdmn`、`thdmn-v02`、Codex の作業フォルダ)の片付け。一覧は archive の `STATUS.md`。
- ローカルだけにある保管用のブランチ `preserved/local-public-demo` と `preserved/legacy-v02-foundation`。未公開の Group などを含むので push していない。
