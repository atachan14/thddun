export function deletionWarning(plan){return plan.accountCount?'対象Accountのログインと既存セッションも停止します。復旧手段は未登録です。最上位Accountは削除後に本人による復元ができず、アクセスを失います。外部の参照先やTaskは削除しません。':'子孫もまとめてゴミ箱に移します。外部の参照先は削除しません。';}
