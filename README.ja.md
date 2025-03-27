# Serverless dbless RAG
サーバーレスRAGは、AWSでの検索拡張生成（RAG）の実装です。
このソリューションは、AWS CDK リソースと React プロジェクトで構成されています。
アーキテクチャは主にサーバーレスのイベント駆動型AWSサービスで構成されており、低コストでユーザーにRAGエクスペリエンスを提供します。

## デモ
https://github.com/user-attachments/assets/85d91786-e1af-4a48-8d56-2130dbf60fdf

## ソリューションのデプロイ
### 前提条件
- AWS CDK
- Docker
- Node.JS
- AWSアカウントで以下のモデルアクセスを事前に[有効にする](https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/model-access-modify.html)こと
    - Amazon Titan Embed Text V1
    - Claude 3 Haiku


###  クイックスタート
以下コマンドを実行することで DBless Serverless RAG を開始することができます
```bash
git clone git@github.com:aws-samples/sample-serverless-dbless-rag-on-aws.git
cd sample-serverless-dbless-rag-on-aws
cd cdk
npm install
cdk deploy --context createFrontend=true --context generateInitialUser=true --context enableSnapStart=true
```

デプロイされた CloudFront の URL にアクセスし、デプロイ時に出力された ユーザー名と初期パスワードでログインできます。
GUI でドキュメント(PDF)のアップロードを行うと、SQSを介してLambdaが埋め込みジョブを自動で順次処理します。
埋め込みが完了した後は、GUI から埋め込んだドキュメントの内容に関して QA ができます。

### Lambda SnapStart の有効化/無効化
以下オプションを設定することで、Lambda SnapStart を有効化しコールドスタートの影響を抑えることで UX を向上することができます
```bash
cdk deploy --context enableSnapStart=true
```

### フロントエンドを含める/含めない場合のデプロイ
`createFrontend`コンテキストを true に設定することで、フロントエンドを含めてデプロイできます。
```bash
cdk deploy --context createFrontend=true
```

`createFrontend`コンテキストが true の場合、`generateInitialUser`コンテキストをtrueに設定することで、フロントエンドの初期ユーザーを設定できます。
```bash
cdk deploy --context createFrontend=true --context generateInitialUser=true
```

デプロイされた CloudFront の URL にアクセスすることで、GUI でドキュメントの埋め込みと検索が可能です。 

### フロントエンドを含めない場合のデプロイ
```bash
cdk deploy
```

以下のように手動でLambda関数を呼び出すことができます。
```bash
aws lambda invoke --function-name <Function Name> \
--cli-binary-format raw-in-base64-out \
--payload '{ "question": "What is EC2 instance?" }' output.txt
```


## 予想コスト
このソリューションを ap-northeast-1 リージョンにデプロイした場合の見積もりコストは以下の通りです。
> 注：小さなコスト項目やGUIのコストは以下の表から除外されています。

### 質問応答 1000 回分のコスト
| サービス               |                          項目 |            量 | コスト (USD) |
|-----------------------|-----------------------------:|-------------:|-----------:|
| Lambda(x86, 2GB)      |              GB-実行時間 (sec)|     2 * 1000 |    0.03333 |
| Lambda                |                    リクエスト数|         1000 |     0.0002 |
| Bedrock               |  Claude 3 Haiku, 入力トークン数|  1000 * 1000 |       0.25 |
| Bedrock               |  Claude 3 Haiku, 出力トークン数|   300 * 1000 |      0.375 |
| Total estimated cost  |                            - |            - |    0.65373 |


### 1 MB の資料の埋め込みコスト
| サービス                |                                       項目 |              量 | コスト (USD) |
|------------------------|------------------------------------------:|----------------:|-----------:|
| Lambda(x86, 4GB)       |                           GB-実行時間 (sec) |         4 * 20 |     0.0133 |
| Bedrock                | Amazon Titan Text Embeddings, 入力トークン数 |          30000 |      0.006 |
| Total estimated cost	 |                                         - |               - |     0.0143 |


### 月間ストレージコスト

| サービス                |                                  項目 |  量 |         コスト (USD) |
|------------------------|--------------------------------------:|---:|-------------------:|
| ECR                    |                      イメージサイズ (GB) |  1 |                0.1 |
| S3                     |                       アセットサイズ(GB) |  1 |              0.025 |


Notes: 
- 実際のコストは埋め込み対象となる資料や検索内容によって変わるため、本資料はあくまで参考値となります。
- AWS で提供しているサービスの一部で無料利用枠が提供されています。本試算では無料利用枠を考慮せずに試算を行っており、実際にはより安価にご利用頂ける場合があります。
- この試算は、東京リージョンの料金単価を基に計算しています。なるべく最新の状況に追従しますが、こちらに記載の価格と AWS 公式ウェブサイト記載の価格に相違があった場合、AWS 公式ウェブサイトの価格を優先とさせていただきます。



## セキュリティ
See [CONTRIBUTING](./CONTRIBUTING.md) for more information.

## ライセンス
This library is licensed under the MIT-0 License. See the [LICENSE](./LICENSE) file.



