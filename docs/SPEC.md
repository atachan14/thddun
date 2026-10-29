# 現行仕様

## Account / Task / ID

- Accountはログイン主体と所有Pageを持ち、本人は自分のAccountに暗黙のmanageを持ちます。公開AccountIDとログインIDは同一。ASCII英字開始、4–20文字、英数字/_/-、小文字正規化・一意・作成後固定です。
- Taskの公開IDは0001からの連番、9999以降は10000。再利用せず、移動でも不変。内部の関連キーとは分離します。
- 単独表記は `@Account名` / `@accountid`、`#Task名` / `#0001`。セットは名前と記号付きID。担当ページ名は `!担当@Account`。
- Task完了は「担当者が1人以上、全員done」。前提による準備状態とは別です。Account完了は担当Taskと直下Task/Accountを再帰評価し、全部空なら完了です。

## Policyと操作

- manage（管理） > add（追加） > view（閲覧）。実際の祖先から下へ継承し、子側で弱められません。子Accountの外部grantは親へ逆流しません。
- 担当者はそのTaskのadd/viewを暗黙に持ちます。自分の担当状態だけを変更可能。担当の追加/解除とPolicyの変更は管理者操作です。
- 親のaddのみで新Taskを作成した場合、作成者は新Taskのmanageを初期付与されます。親や兄弟は昇格しません。
- 移動は移動元の親のmanageと移動先addが必要。Accountの移動は対象Accountのmanageも必要。明示grantは維持し、継承は移動先から再計算します。
- 削除は対象manageで子孫をまとめてsoft-delete。外部参照先は削除しません。配下Accountのログイン/sessionも停止します。復元は元の親を管理できる範囲。rootは通常ユーザーのCurrentになりません。本人用の復旧手段/運用者復旧UIは未提供です。
- 同じworkspaceでも各PageのPolicyを検査します。IDを知るだけでは閲覧できず、検索/参照/件数/祖先表示にも閲覧境界を適用します。

## UIとフィールド

- Card本体は詳細選択、件数ボタンはCurrent遷移。空白クリックはCurrentの詳細へ戻します。dragは親を変えず、親/表示ページ単位の座標を保存します。担当ページのCardは原本を参照します。
- 左Paneの直下/担当はログイン本人のAccountに固定。そこから遷移した先を遷移パンくずの先頭にします。Headerは遷移/階層の切替で、階層は最初の不可視祖先で止めます。
- 作成/編集Overlayは保存成功か取消まで維持。本文・担当・前提・フィールド・明示Policyは同じ保存境界。状態selectorの通常表示は自分の状態だけ自動保存します。
- フィールド定義の流用は値の継承ではありません。祖先の子孫強制と入力必須は別。create/edit時の必須空欄はserverでも拒否し、既存空欄はCard/詳細の赤枠で示します。
- 作成日/作成日時/最終完了とAccountの最終ログインは任意表示の自動フィールド。元の日時は表示選択と無関係に保持。表示はJSTです。最終完了はfalse→true時、未完了に戻しても保持します。
- auditと日時記録はありますが、本文の完全な版管理・差分履歴UIはありません。Task参照はアクセスを与えず、任意の参照作成UIは未提供です。

## 公開共有サンプル

`/top.html?demo=manager#@sample_orion`、`?demo=staff`、`?demo=guest`が通常UIへ入ります。通常ユーザーと同じDB/workspace/Policyを使い、架空13Account・80Taskに3共有Accountと3starter Taskを追加しています。

共有Accountの入口は誰でも利用可能。通常の所有者が共有Accountに許可した情報は全訪問者が通常Policyの範囲で操作できます。grant/担当追加時は警告と明示確認を要求します。未許可の通常データへの自動grantはありません。

固定共有Account自体の編集・Policy/資格情報変更・移動・削除、祖先やtrash経由の迂回はserver/UI双方で禁止。StaffはManagerの子ですが、Staffへの外部grantはManagerへ広がりません。Guestは同じworkspace内の別sandbox階層です。

通常sessionと共有sessionは別のSecure/HttpOnly/SameSite=Strict cookieです。入口/書込/退出はCSRF検査、入口は既存rate limitを使用。資格情報はランダムな非公開ハッシュのみDBに保持します。
