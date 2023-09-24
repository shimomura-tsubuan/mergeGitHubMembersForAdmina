
function main() {
  /*==================================================
  スクリプトプロパティから必要情報を取得
  ==================================================*/
  const apiKey = PropertiesService.getScriptProperties().getProperty("apiKey");
  const organizationId = PropertiesService.getScriptProperties().getProperty("organizationId");
  const employeeMasterSerivceName = PropertiesService.getScriptProperties().getProperty("employeeMasterSerivceName");

  /*==================================================
  スプレッドシートからGitHubユーザー名とメールアドレスのマッピングを取得。
  下記のようなオブジェクトが生成される想定。
  mappingObject[GitHubユーザー名] = {
    "email": メールアドレス,
  }
  ==================================================*/
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('list');
  const rows = sheet.getDataRange().getValues();
  const mappingObject = {};
  for (const row of rows) {
    const username = row[0];
    const email = row[1];
    if ( username == "username" ) { continue; }
    mappingObject[username] = {
      "email": email,
    };
  }

  /*==================================================
  GitHubと従業員マスターで利用しているSaaSのサービスIDを取得
  ==================================================*/
  const employeeMasterSerivceId = getServiceId({
    "apiKey": apiKey,
    "organizationId": organizationId,
    "serviceName": employeeMasterSerivceName,
  });
  if ( employeeMasterSerivceId === null ) {
    console.log("Error: 従業員マスタのサービスID取得に失敗しました。");
    return;
  }
  console.log(`従業員マスタのサービス(${employeeMasterSerivceName})のIDは${employeeMasterSerivceId}です。`);
  const githubServiceId = getServiceId({
    "apiKey": apiKey,
    "organizationId": organizationId,
    "serviceName": "GitHub",
  });
  if ( githubServiceId === null ) {
    console.log("Error: GitHubのサービスID取得に失敗しました。");
    return;
  }
  console.log(`GitHubのService IDは${githubServiceId}です。`);

  /*==================================================
  GitHubと従業員マスターで利用しているSaaSのサービスIDを取得
  ==================================================*/
  console.log("従業員マスターのメンバーを取得します。");
  const employeeMasterMembers = getServiceMembers({
    "apiKey": apiKey,
    "organizationId": organizationId,
    "serviceId": employeeMasterSerivceId,
  });
  console.log("GitHubのメンバーを取得します。");
  const githubMembers = getServiceMembers({
    "apiKey": apiKey,
    "organizationId": organizationId,
    "serviceId": githubServiceId,
    "types": "unknown",
  });

  /*==================================================
  従業員マスターとGitHubのIDをマージする。
  ==================================================*/
  console.log("マージを開始します。");
  for (const username of Object.keys(mappingObject)) {
    const email = mappingObject[username]["email"];
    //従業員マスタに存在しなかった場合はスキップ
    if ( employeeMasterMembers["email"][email] === undefined ) { continue; }
    //GitHub上に存在しなかった場合はスキップ
    if ( githubMembers["username"][username] === undefined ) { continue; }
    //従業員マスターの"People ID"を取得
    const employeeMasterPeopleId = employeeMasterMembers["email"][email]["peopleId"];
    //GitHubの"People ID"を取得
    const githubPeopleId = githubMembers["username"][username]["peopleId"];
    //マージする
    mergePeople({
      "apiKey": apiKey,
      "organizationId": organizationId,
      "username": username,
      "email": email,
      "fromPeopleId": githubPeopleId,
      "toPeopleId": employeeMasterPeopleId,  
    })
    //念のため、1秒sleep
    Utilities.sleep(1000);
  }
}

/*==================================================
以下、外部関数
==================================================*/

function getServiceId(params){
  /*==================================================
  引数から必要情報を取得
  ==================================================*/
  const apiKey = params["apiKey"];
  const organizationId = params["organizationId"];
  const serviceName = params["serviceName"];

  /*==================================================
  事前準備
  ==================================================*/
  console.log(`${serviceName}のIDを取得します。`);
  const url = `https://api.itmc.i.moneyforward.com/api/v1/organizations/${organizationId}/services?keyword=${encodeURIComponent(serviceName)}`;
  const options = {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    method: 'GET'
  };

  /*==================================================
  処理開始
  ==================================================*/
  try {
    const responseOrg = UrlFetchApp.fetch(url, options);
    const statusCode = responseOrg.getResponseCode();
    if ( statusCode != 200 ) {
      console.log(`Error: ${serviceName}のID取得に失敗しました。(Status Code:${statusCode})`)
    }
    const response = JSON.parse(responseOrg.getContentText());
    for (const item of response["items"]) {
      if ( item["name"] == serviceName ) {
        return item["id"];
      }
    }
  } catch (e) {
    console.log(`Error: ${serviceName}のID取得に失敗しました。`)
    console.log(e);
  }
  return null;
}

function getServiceMembers(params){
  /*==================================================
  引数から必要情報を取得
  ==================================================*/
  const apiKey = params["apiKey"];
  const organizationId = params["organizationId"];
  const serviceId = params["serviceId"];
  const types = params["types"];

  /*==================================================
  取得処理
  ==================================================*/
  const result = {};
  result["username"] = {};
  result["email"] = {};

  let nextCursor = '';
  while (nextCursor !== null ) {
    try {
      //補足: serviceIdsは一つだけだとエラーになるのでダミーとして99999を指定しています。
      let url = `https://api.itmc.i.moneyforward.com/api/v1/organizations/${organizationId}/people?limit=100&serviceIds=${serviceId}&serviceIds=99999`;
      if ( nextCursor != '' ) {
        url = `${url}&cursor=${nextCursor}`;
      }
      if ( types !== undefined ){
        url = `${url}&types=${types}`;
      }
      const options = {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        method: 'GET'
      };
      let response;
      try {
        const responseOrg = UrlFetchApp.fetch(url, options);
        const statusCode = responseOrg.getResponseCode();
        if ( statusCode != 200 ) {
          console.log(`Error: メンバーの取得に失敗しました。(Status Code:${statusCode})`);
          return null;
        }
        response = JSON.parse(responseOrg.getContentText());
      } catch (e) {
        console.log(`Error: メンバーの取得に失敗しました。`);
        console.log(e);
        return null;
      }
      nextCursor = response["meta"]["nextCursor"];
      //念のため
      if ( nextCursor == "" ) { nextCursor = null; }
      if ( nextCursor === undefined ) { nextCursor = null; }
      for (const item of response["items"]) {
        const peopleId = item["id"];
        const username = item["username"];
        const status = item["status"];
        const email = item["primaryEmail"];

        if ( peopleId === undefined ) { continue; }
        
        if ( username !== undefined ) {
          result["username"][username] = {
            "peopleId": peopleId,
          };
        }
        if ( email !== undefined ) {
          result["email"][email] = {
            "peopleId": peopleId,
          };
        }
      }
      //念のため、1秒sleep
      Utilities.sleep(1000);
    } catch (e) {
      console.log(e);
      nextCursor = null;
    }
  }
  
  return result;
}

function mergePeople(params){
  /*==================================================
  引数から必要情報を取得
  ==================================================*/
  const apiKey = params["apiKey"];
  const organizationId = params["organizationId"];
  const username = params["username"];
  const email = params["email"];
  const fromPeopleId = params["fromPeopleId"];
  const toPeopleId = params["toPeopleId"];
  
  /*==================================================
  事前準備
  ==================================================*/
  console.log(`${username}(${email})のマージを開始します。`);
  const url = `https://api.itmc.i.moneyforward.com/api/v1/organizations/${organizationId}/people/merge`;
  const headers = { //headerを定義
    "Content-Type": "application/json; charset=UTF-8",
    "Authorization": `Bearer ${apiKey}`
  };
  let data = {
    "merges": [
      {
        "fromPeopleId": fromPeopleId,
        "toPeopleId": toPeopleId
      }
    ]
  }
  const options = {
    'method': 'post',
    "payload" : JSON.stringify(data),
    'headers': headers,
    'muteHttpExceptions': true
  };

  /*==================================================
  処理実行
  ==================================================*/
  try {
    const responseOrg = UrlFetchApp.fetch(url, options);
    const statusCode = responseOrg.getResponseCode();
    if ( statusCode != 201 ) {
      console.log(`Error: ${username}のマージに失敗しました。(Status Code:${statusCode})`)
    }
  } catch (e) {
    console.log(`Error: ${username}のマージに失敗しました。`)
    console.log(e);
  }
}
