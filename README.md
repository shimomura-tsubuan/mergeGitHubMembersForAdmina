# 内容

[Moneyforward Admina](https://i.moneyforward.com)(以下、Admina) で社員マスタのIDとGitHubのIDをマージするためのスクリプトです。

## 経緯

- AdminaではGitHubと連携した初回だと「不明なアカウント」として、Adminaに登録されます。  
- GitHubではIDがEmailベースではなくUsernameベースだからです。  
- (Usernameベースなので社員マスタのIDと一致できず「不明なアカウント」となる)  
- これを解消するには 「[SaaSアカウントを他のアカウントに手動で紐付け（名寄せ/マージ）する](https://support.itmc.i.moneyforward.com/l/ja/article/d97dy5z2l7-merge)」 という手順でマージできるのですが、正直面倒です。  
- そのため、GitHubのユーザー名とそのユーザー名のメールアドレスを記載したスプレッドシートを用意しておくことでこのマージ作業を楽にします。  
  
## 環境準備

1.  [このスプレッドシート](https://docs.google.com/spreadsheets/d/14opkC09G-Az_mn8t69hOOdu6PBE-MSha-EOdMp2EnVo/edit#gid=0) を開き、自分のGoogle Workspaceの環境にコピーします。
    - その際、**mergeGitHubMembersForAdmina** というスクリプトもコピーされますが問題ありません。
    - ※上記スクリプトが実体になります。
2. Adminaにて下記内容を取得します。
   - 従業員マスタとして利用しているSaaS名(Azure AD, Okta等)を確認する。
     - Adminaを開き、「設定 - 組織」を選択し、「従業員マスター設定」に登録されているSaaS名をメモに控えておきます。
       - ["組織"のURL](https://itmc.i.moneyforward.com/mntsq/settings#tab=organization)
   - APIキー
     - Adminaを開き、「設定 - APIキー一覧 - APIキーを作成」を選択し、APIキーをメモに控えておきます。
       - ["APIキー一覧"のURL](https://itmc.i.moneyforward.com/mntsq/settings#tab=apikeys)
     - [参考: Adminaの公式リファレンス](https://docs.itmc.i.moneyforward.com/?_ga=2.260492557.1226873289.1695482035-1371359741.1686796777&_gac=1.183360852.1695549041.Cj0KCQjwvL-oBhCxARIsAHkOiu1p0KIHNHG8YHsJyKCJ4y1iY0BlTdLTzfq3m5ECVYWxRPqP-9llu5EaAoBmEALw_wcB&_gl=1*19qmp35*_ga*MTM3MTM1OTc0MS4xNjg2Nzk2Nzc3*_ga_ZP4NVS4L89*MTY5NTU0OTIyMC40OS4xLjE2OTU1NDk0NTguNDYuMC4w)
   - 組織ID
     - 上記の「APIキー一覧」ページに **組織ID** が記載されているのでそれをメモに控えておきます。
3. コピーしたスプレッドシートにて「拡張機能 - Apps Script」を選択して、Google Apps Scriptを開きます。
4. 左側のメニューの「プロジェクトの設定」を開き、「スクリプト プロパティ」に下記プロパティ名で各種値を登録します。
   - **apiKey**
     - 上記の手順1で取得したAdminaのAPIキーを登録します。
   - **organizationId**
     - 上記の手順1で取得したAdminaの組織IDを登録します。
   - **employeeMasterSerivceName**
     - 上記の手順1で取得した従業員マスタとして利用しているSaaS名を登録します。(例： Azure AD, Okta等)

## 反映手順

1. コピーしたスプレッドシートの **list** シートに下記内容を記載します。
   - A列：username
     - GitHubのユーザー名を記載します。(例：私の場合だとshimomura-tsubuan)
   - B列: email
     - 対象ユーザーのemailを記載します。
2. コピーしたスプレッドシートにて「拡張機能 - Apps Script」を選択して、Google Apps Scriptを開きます。
3. 左側のメニューから「エディタ」を開き、 **main** という名前の関数を実行します。
   - スプレッドシートに記載した内容に基づきAdminaにてマージが実行されます。