# thddun 引継ぎ入口

## 目的とコンセプト

Taskを実際の親子階層に置き、前提関係と担当者ごとの状態を分けて管理します。Accountの直下ページと担当ページも区別します。左Pane・中央Board/関係図・右詳細Paneを基盤とし、詳細選択とCurrentの遷移は別操作です。

まず [SPEC.md](SPEC.md) で仕様、[DEVELOPMENT.md](DEVELOPMENT.md) で構成と実行方法、[STATUS.md](STATUS.md) で公開/未公開と旧作業木を確認してください。

## 正本

- 正式作業場所: `G:\source\repos\2026\thddun`
- 公開元: `atachan14/thddun` の `main`。フォルダ名やローカルmtimeが公開版を決めるわけではありません。
- 整理開始時の公開基準: `47704a3204e5a8b441343dbe2578a3227746d410`。
- この整理で統合するのは検証付きの保守改善。Group/brandingの未公開系列を丸ごと上書きしていません。
- DB・session cookie・APIの内部名に残る `thdmn` は互換性上の識別子です。一括置換しないでください。

## 読む際の注意

ソース内の各README、`DEPLOYMENT.md`、`PRODUCTION-READINESS.md`には、それぞれの段階での制約・検証記録があります。現在の公開状態は本docsと実Git/VercelのSHAで照合してください。古い試作・サンプル・SQL案の存在を、機能の公開やDB適用済みの証拠にしないでください。

PKB/Knowledgeは相談段階です。専用Knowledge本体・追記型Revision・出典リンクの追加案があるだけで、Taskへの統合、AIの自動書込、個人情報投入、外部転送は実装/承認済みではありません。
