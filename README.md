# Serverless dbless RAG
Serverless RAG is an implementation of Retrieval Augumented Generation (RAG) on AWS.
This solution is composed of AWS CDK resources and React project.
Architecture is mainly composed of serverless, event-driven AWS services to deliver RAG experience for uses with low costs.

日本語の説明はこちら
[日本語](./README.ja.md)

## Demo
https://github.com/user-attachments/assets/85d91786-e1af-4a48-8d56-2130dbf60fdf

## Architecture
![Architecture](./architecture/architecture.png "architecture")

## Deploying the Solution
### Prerequisites
- AWS CDK
- Docker
- Node.JS
- [Enable](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access-modify.html) the following model access on your AWS Account:
    - Amazon Titan Embed Text V1
    - Claude 3 Haiku

### QuickStart
You can start the DBless Serverless RAG by executing the following commands:
```bash
git clone git@github.com:aws-samples/sample-serverless-dbless-rag-on-aws.git
cd sample-serverless-dbless-rag-on-aws
cd cdk
npm install
cdk deploy --context createFrontend=true --context generateInitialUser=true --context enableSnapStart=true
```

You can access the deployed CloudFront URL and log in using the username and initial password output during deployment.
When you upload documents (PDF) through the GUI, Lambda will automatically process the embedding jobs sequentially via SQS.
After the embedding is complete, you can perform Q&A on the content of the embedded documents through the GUI.

### Enabling/Disabling Lambda SnapStart
You can enable Lambda SnapStart to improve UX by reducing the impact of cold starts with the following option:
```bash
cdk deploy --context enableSnapStart=true
```

### Deploying with/without Frontend
You can deploy including the frontend by setting the `createFrontend` context to true:
```bash
cdk deploy --context createFrontend=true
```

When the `createFrontend` context is true, you can set up the initial user for the frontend by setting the `generateInitialUser` context to true:
```bash
cdk deploy --context createFrontend=true --context generateInitialUser=true
```

You can access the GUI for document embedding and search by accessing the deployed CloudFront URL.

### Deploying without Frontend
```bash
cdk deploy
```

You can manually invoke the Lambda function as follows:
```bash
aws lambda invoke --function-name <Function Name> \
--cli-binary-format raw-in-base64-out \
--payload '{ "question": "What is EC2 instance?" }' output.txt
```



## Estimated Costs
Estimated costs when this solution is deployed in the ap-northeast-1 region are as follows.
> Note: Minor cost items and GUI costs are excluded from the table below.

### Cost for 1000 Question Answering sessions
| Service               |                          Item |            Quantity | Cost (USD) |
|-----------------------|------------------------------:|--------------------:|-----------:|
| Lambda(x86, 2GB)      |              GB-Duration (sec)|           2 * 1000 |    0.03333 |
| Lambda                |            Number of requests|                1000 |     0.0002 |
| Bedrock               |  Claude 3 Haiku, input tokens|          1000 * 1000 |       0.25 |
| Bedrock               |  Claude 3 Haiku, output tokens|           300 * 1000 |      0.375 |
| Total estimated cost  |                            - |                    - |    0.65373 |


### Cost for Embedding 1 MB of documents
| Service                |                                       Item |              Quantity | Cost (USD) |
|------------------------|------------------------------------------:|--------------------:|-----------:|
| Lambda(x86, 4GB)       |                           GB-Duration (sec) |               4 * 20 |     0.0133 |
| Bedrock                | Amazon Titan Text Embeddings, input tokens |              30000 |      0.006 |
| Total estimated cost	 |                                         - |                   - |     0.0143 |


### Monthly Storage Costs

| Service                |                                  Item |  Quantity |         Cost (USD) |
|------------------------|--------------------------------------:|----------:|-------------------:|
| ECR                    |                      Image size (GB) |         1 |                0.1 |
| S3                     |                       Assets size(GB) |         1 |              0.025 |


Notes: 
- The actual costs may vary depending on the documents being embedded and the search content. This information is provided for reference only.
- Some AWS services offer a free tier. This calculation does not take into account the free tier, so you may be able to use the services at a lower cost in practice.
- This calculation is based on the pricing in the Tokyo region. While we strive to keep this information up-to-date, if there is any discrepancy between the prices listed here and those on the official AWS website, the prices on the official AWS website take precedence.


## Security
See [CONTRIBUTING](./CONTRIBUTING.md) for more information.

## License
This library is licensed under the MIT-0 License. See the [LICENSE](./LICENSE) file.
