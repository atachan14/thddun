# 統合状況・保留・旧作業場所

整理開始時の公開基準は `47704a3`。公開共有サンプルはREADYとalias割当、公開API58チェックで確認済みです。Manager/Staffの実画面と固定Accountのdisabled、共有警告を確認しましたが、ブラウザのnative確認ダイアログ制御でtimeoutし、そのブラウザ側の取消/退出完了は未確認でした。API検証sessionは全てsign-out済み。これを完全なブラウザQA/セキュリティ監査と呼ばないでください。

## 未反映成果の分類

| 元commit/場所 | 判断 |
| --- | --- |
| `415ffce` HTTP変換共通化 | 現行へ適用。UTF-8/body上限/複数cookieの検証。host認可は呼出側に残す |
| `a6786a0` snapshot/SQL永続化分離 | 現行へ適用。公開済み共有Account保護をwrapperとして維持。独立したDTO golden contractで検証 |
| `8bac672` field読取集約 | 現行へ適用。同値SQL contractと隔離DB検証。DB構造/権限変更なし |
| `4c714de` / `a5a0d21` ローカルsample | 公開版47704a3へ必要部分を移植済み。古いlocal-only入口やseedを丸ごと再適用しない |
| `f5c162f` Group | ローカル実装済み系列を保全。019とUI/Policy/所属が不可分。本番適用・公開は保留 |
| `3740baf` branding | 表示名変更のローカル系列を保全。今回はruntimeへの一括置換をしない。公開UIに旧表記が残る |
| `d5e47a9` と旧v02 dirty tree | 旧基盤・試作。現行へ無条件mergeしない。認証/CLI/試作UI/SQL案等に既存実装との重複・撤回案がある |

独立cloneに `preserved/local-public-demo`（3740baf）と `preserved/legacy-v02-foundation`（d5e47a9）をローカルrefとして保全しました。mainへの自動mergeや公開を意味しません。

旧v02は追跡変更12・未追跡103。比較した77ソース中、公開版と同一22、異なる19、公開版にない36でした。古い試作や検証ファイルの存在だけで、現行に必要/永久保管必須とは判断しません。未採用の仕様衝突は元のまま残し、必要になった際に用途を確認します。

## 旧フォルダ（今回削除/移動なし）

- `G:\source\repos\2026\thdmn`: v0.1 cf60e43。tracked treeはclean。`runtime/data/ledger.json`（revision52）と旧backup等はGit外。v02 worktreeのGit本体もこの配下。
- `G:\source\repos\2026\thdmn-v02`: 上の.gitを共有するworktree。d5e47a9と未commit成果を保持。
- `C:\Users\user\Documents\Codex\2026-10-19\task\thdmn-git-candidate`: local/public-demo 3740baf。旧ローカルDB、未公開Group/branding。次のC側worktreeの.git本体。
- `C:\Users\user\Documents\Codex\2026-10-20\task\thddun-host-compat`: 公開用47704a3。過去の非公開backup/検証ログは公開しない。

正式G thddunは独立.gitで、これらの.gitやDBに依存しません。旧folderを後で片付ける際はworktreeのGit依存解除と、旧ledger/未commit成果を捨ててよいかを別々に判断します。単に古いスクリーンショットや検証ログだからという理由で保管必須にはしません。

## 未決/未公開

Groupの正式取り込みと本番019、runtime brandingの反映、正式path用local preview/DB移行、復旧手段/運用者UI、任意参照作成、Google実認証確認は残件です。

PKB/Knowledgeは提案のみ。UI/権限を再利用し、Knowledge本体・追記型Revision・参照リンクを別モデルにする案ですが、実装・AI書込権限・個人情報投入・転送の承認はありません。
