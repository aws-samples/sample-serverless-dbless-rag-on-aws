import {Construct} from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import {aws_iam, custom_resources, Names} from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import {NodejsBuild} from 'deploy-time-build';
import * as cognito from "aws-cdk-lib/aws-cognito";
import { NagSuppressions } from "cdk-nag";
import {CdkStack} from "./cdk-stack";
import { randomBytes } from 'node:crypto';


// aws-amplify の L2 Constructor はまだ alpha なので、CodeBuild で S3 へ Deploy する
export class Frontend {
    constructor(scope: CdkStack,
                assetBucket:  cdk.aws_s3.Bucket,
                vectorBucket:  cdk.aws_s3.Bucket,
                embeddingsBucketName: string,
                vectorBucketName: string,
                embeddingQueueName: string,
                searchFunctionArn: string,
                searchFunctionName: string,
                generateInitialUser: boolean,
                ) {

        //  ==  == == ==  ==  ==  ==  == Front Assets ==  ==  ==  ==  ==  ==  ==  ==
        const frontendBucket = new s3.Bucket(scope, 'frontendBucket' + Names.uniqueId(scope),
            {
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                enforceSSL: true,
                encryption: s3.BucketEncryption.S3_MANAGED,
            }
        );

        const distribution = new cloudfront.Distribution(scope, 'FrontendDistribution', {
            defaultBehavior: {
                origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
                    frontendBucket
                ),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            },

            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
        });

        assetBucket.addCorsRule({
            allowedOrigins: ['*'],
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
            allowedHeaders: ['*'],
        });

        vectorBucket.addCorsRule({
            allowedOrigins: ['*'],
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
            allowedHeaders: ['*'],
        });

        //  ==  == == ==  ==  ==  ==  == Cognito ==  ==  ==  ==  ==  ==  ==  ==
        const userpool = new cognito.UserPool(scope, 'web-userpool', {
            selfSignUpEnabled: false,
            signInAliases: {username: true},
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireDigits: true,
                requireSymbols: true,
                requireUppercase: true,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const appclient = new cognito.UserPoolClient(scope, 'web-client-id', {
            userPool: userpool,
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
            }
        });


        if (generateInitialUser) {
            const userName = 'InitUser_' + randomBytes(10).toString('hex');
            const password = 'Tmp0_' + randomBytes(16).toString('hex');
            const createUser = new custom_resources.AwsCustomResource(
                scope,
                `cognito-initial-user`,
                {
                    onCreate: {
                        service: "CognitoIdentityServiceProvider",
                        action: "adminCreateUser",
                        parameters: {
                            UserPoolId: userpool.userPoolId,
                            Username: userName,
                            TemporaryPassword: password,
                            ForceAliasCreation: false,
                        },
                        physicalResourceId: custom_resources.PhysicalResourceId.of(
                            `cognito-create-user`
                        ),
                    },
                    policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
                        resources: [userpool.userPoolArn],
                    }),
                }
            );
            new cdk.CfnOutput(scope, "Initial user account name", {
                value: userName,
            })
            new cdk.CfnOutput(scope, "Initial user account temporary password", {
                value: password,
            })
        }


        const idpool = new cognito.CfnIdentityPool(scope, 'web-idpool', {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: appclient.userPoolClientId,
                    providerName: userpool.userPoolProviderName,
                }],
            identityPoolName: 'web-idpool' + Names.uniqueId(scope),
        });
        idpool.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

        const idpoolAuthRole = new aws_iam.Role(scope, 'web-idpool-auth-role', {
            assumedBy: new aws_iam.FederatedPrincipal(
                'cognito-identity.amazonaws.com', {
                "StringEquals": {"cognito-identity.amazonaws.com:aud": idpool.ref},
                "ForAnyValue:StringLike": {"cognito-identity.amazonaws.com:amr": "authenticated"},
            },
                "sts:AssumeRoleWithWebIdentity"
            ),
        });

        idpoolAuthRole.addToPolicy(new aws_iam.PolicyStatement({
            actions: ['s3:ListBucket','s3:PutObject','s3:GetObject'],
            resources: [assetBucket.bucketArn , assetBucket.bucketArn + '/*', vectorBucket.bucketArn , vectorBucket.bucketArn + '/*'],
        }));
        idpoolAuthRole.addToPolicy(new aws_iam.PolicyStatement({
            actions: ['cloudwatch:GetMetricData', 'cloudwatch:GetMetricStatistics'],
            resources: ['*'],
        }));
        idpoolAuthRole.addToPolicy(new aws_iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [searchFunctionArn + '*'],
            sid: "SearchFunction"
        }));


        const idpoolAuthRoleAttachment = new cognito.CfnIdentityPoolRoleAttachment(scope, 'web-idpool-auth-role-attachment', {
            identityPoolId: idpool.ref,
            roles: {
                authenticated: idpoolAuthRole.roleArn,
            },
        });


        new NodejsBuild(scope, 'FrontendAsset', {
            assets: [
                {
                    // フロントエンドのソースコードがあるローカルのディレクトリ
                    path: '../web',
                    exclude: [
                        '.git',
                        '.github',
                        '.gitignore',
                        '.prettierignore',
                        '.prettierrc.json',
                        '*.md',
                        'LICENSE',
                        'docs',
                        'imgs',
                        'setup-env.sh',
                        'node_modules',
                        'prompt-templates',
                        'packages/cdk/**/*',
                        '!packages/cdk/cdk.json',
                        'packages/web/dist',
                        'packages/web/dev-dist',
                        'packages/web/node_modules',
                    ],
                },
            ],
            destinationBucket: frontendBucket,
            distribution: distribution,
            nodejsVersion: 20,

            outputSourceDirectory: 'dist',
            buildCommands: ['npm i typescript -g','npm ci', 'npm run build'],
            buildEnvironment: {
                VITE_APP_NODE_ENV: 'production',
                VITE_APP_EMBEDDINGS_ASSET_BUCKET_NAME: embeddingsBucketName,
                VITE_APP_VECTOR_BUCKET_NAME: vectorBucketName,
                VITE_APP_USER_POOL_ID: userpool.userPoolId,
                VITE_APP_USER_POOL_CLIENT_ID: appclient.userPoolClientId,
                VITE_APP_IDENTITY_POOL_ID: idpool.ref,
                VITE_APP_AWS_REGION: cdk.Aws.REGION,
                VITE_APP_EMBEDDINGS_ASSET_QUEUE_NAME: embeddingQueueName,
                VITE_APP_SEARCH_FUNCTION_NAME: searchFunctionName,
            },
        });

        new cdk.CfnOutput(scope, "Frontend GUI Console URL", {
            value: distribution.distributionDomainName,
        })



        NagSuppressions.addStackSuppressions(scope, [
            {
            id: 'AwsSolutions-L1', 
            reason: 'In this pj, nodejs version 20 is used for deploy-time-build'
            }
        ]);
  

        NagSuppressions.addResourceSuppressionsByPath(scope,
            ['/ServerlessRAG/web-idpool-auth-role/DefaultPolicy/Resource',]
        ,[{ id: "AwsSolutions-IAM5", reason: "Policies of this resouce are restricted manually.",},
        ]);

        NagSuppressions.addResourceSuppressionsByPath(scope,
            ['/ServerlessRAG/FrontendAsset/Project/Role/DefaultPolicy/Resource',
            '/ServerlessRAG/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/DefaultPolicy/Resource']
            ,[{ id: "AwsSolutions-IAM5", reason: "This role is temporally used for building frontend in deploy-time-build",},
        ]);

        NagSuppressions.addResourceSuppressionsByPath(scope,
            ['/ServerlessRAG/FrontendAsset/Project/Resource'],
            [{ id: "AwsSolutions-CB4", reason: "This build is temporally used for building frontend in deploy-time-build",},
            ]);

        NagSuppressions.addStackSuppressions(scope, [
            { id: 'CdkNagValidationFailure', reason: 'We are using an intrinsic function to generate frontend resource' }
        ]);

        NagSuppressions.addResourceSuppressions(
            distribution,
            [
                {id: 'AwsSolutions-CFR1', reason: 'Get-restriction is not required because this is example',},
                {id: 'AwsSolutions-CFR2', reason: 'WAF is not required because this is example',},
                {id: 'AwsSolutions-CFR3', reason: 'AccessLog is not required because this is example',},
                {id: 'AwsSolutions-CFR4', reason: 'In this PJ, default domain is used and policy cannot be changed',},
            ]
        );


        NagSuppressions.addResourceSuppressions(
            userpool,
            [
                {id: 'AwsSolutions-COG2', reason: 'This is example and user can customize if needed.',},
                {id: 'AwsSolutions-COG3', reason: 'This is example and user can customize if needed.',},
            ]
        );


    }
}