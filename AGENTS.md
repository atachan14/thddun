# Working on thddun

作り直し中。まず README.md と docs/README.md を読む。

- 仕様と経緯は docs/ が正。docs/archive/ と タグ `prototype-v02` は以前の試作で、参考にするだけ。そこにある仕様を、確認なしに今の要件として扱わない。
- 作業はブランチ `rebuild` で行う。**`main` への push は、Vercel の本番デプロイ(https://thddun.vercel.app)を動かす。** 今の本番は以前の試作のままで、Neon の DB を使っている。`main` への push と、DB・認証・Vercel・ドメインの変更は、ユーザーに確認してから、コードの作業とは別に行う。
- ローカル版で扱う kb の中身(特に `_private/`)や個人のデータを、公開版・デモ・コミットに入れない。
- 秘密の情報(接続文字列・トークン・パスワード)、実行時のデータ、バックアップ、生成物をコミットしない。
