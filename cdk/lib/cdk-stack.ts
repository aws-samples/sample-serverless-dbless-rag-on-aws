import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr_deploy from 'cdk-ecr-deployment';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as logs from 'aws-cdk-lib/aws-logs';
import {Construct} from 'constructs';
import {Names} from 'aws-cdk-lib';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import {Frontend} from './frontend';
import { NagSuppressions } from "cdk-nag";


interface CdkStackProps extends cdk.StackProps {
    createFrontend: boolean;
    generateInitialUser: boolean;
}


export class CdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: CdkStackProps) {
        super(scope, id, props);

        //  ==  == == ==  ==  ==  ==  == S3 ==  ==  ==  ==  ==  ==  ==  ==
        const assetBucket = new s3.Bucket(this, 'ragassetbucket' + Names.uniqueId(this),
            {
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                enforceSSL: true,
                encryption: s3.BucketEncryption.S3_MANAGED,
            }
        );

        const dlq = new sqs.Queue(this, 'EmbeddingProcessDeadLetterQueue', {
                queueName: 'EmbeddingProcess-DLQ',
        });
        const queue = new sqs.Queue(this, 'EmbeddingProcessQueue',
            {
                visibilityTimeout: cdk.Duration.minutes(18),
                deadLetterQueue: {
                    maxReceiveCount: 1,
                    queue: dlq,
                },
            }
        );
        assetBucket.addEventNotification(s3.EventType.OBJECT_CREATED_PUT, new s3n.SqsDestination(queue));



        const vectorBucket = new s3.Bucket(this, 'ragvectorbucket' + Names.uniqueId(this),
            {
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                encryption: s3.BucketEncryption.S3_MANAGED,
                enforceSSL: true,
            }
        );


        //  ==  == == ==  ==  ==  ==  == ECR ==  ==  ==  ==  ==  ==  ==  ==
        const embeddingImageAsset = new ecr_assets.DockerImageAsset(this, 'embeddingImage', {
            directory: './containers/embedding',
        });
        const retrievingImageAsset = new ecr_assets.DockerImageAsset(this, 'retrievingImage', {
            directory: './containers/retrieving',
        });

        // ECR repository
        const embeddingRepo = new ecr.Repository(this, 'embedding', {
            emptyOnDelete: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            repositoryName: 'embedding',
        });

        const embeddingDeploy = new ecr_deploy.ECRDeployment(this, 'embeddingDockerImage', {
            src: new ecr_deploy.DockerImageName(embeddingImageAsset.imageUri),
            dest: new ecr_deploy.DockerImageName(`${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${embeddingRepo.repositoryName}:latest`),
        })

        const retrievingRepo = new ecr.Repository(this, 'retrieving', {
            emptyOnDelete: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            repositoryName: 'retrieving',
        });

        const retrievingDeploy = new ecr_deploy.ECRDeployment(this, 'retrievingDockerImage', {
            src: new ecr_deploy.DockerImageName(retrievingImageAsset.imageUri),
            dest: new ecr_deploy.DockerImageName(`${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${retrievingRepo.repositoryName}:latest`),
        })


        const embeddingresultLogGroup = new logs.LogGroup(this, 'SRAGLogs', {
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            logGroupName: "ServerlessRAGLogs",
        });


        //  ==  == == ==  ==  ==  ==  == Lambda Functions ==  ==  ==  ==  ==  ==  ==  ==
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
        });

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:AbortMultipartUpload'],
            resources: [assetBucket.bucketArn,assetBucket.bucketArn+"/*",vectorBucket.bucketArn,vectorBucket.bucketArn+"/*"],
        })
        );
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: ['logs:PutLogEvents'],
            resources: [embeddingresultLogGroup.logGroupArn],
        })
        );
        lambdaRole.addToPolicy(new iam.PolicyStatement({
                actions: ['bedrock:InvokeModel'],
                resources: [`arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/amazon.titan-embed-text-v1`,
                    `arn:aws:bedrock:${cdk.Aws.REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`],
            })
        );


        const searchFunction = new lambda.DockerImageFunction(this, 'SearchFunction', {
            code: lambda.DockerImageCode.fromEcr(
                retrievingRepo, {
                    tagOrDigest: "latest"
                }
            ),
            environment: {
                MATERIALBUCKET: assetBucket.bucketName,
                VECTORBUCKET: vectorBucket.bucketName,
            },
            role: lambdaRole,
            timeout: cdk.Duration.minutes(5),
            memorySize: 2048
        });
        searchFunction.node.addDependency(retrievingDeploy);


        const embeddingFunction = new lambda.DockerImageFunction(this, 'EmbeddingFunction', {
            code: lambda.DockerImageCode.fromEcr(
                embeddingRepo, {
                    tagOrDigest: "latest"
                }
            ),
            environment: {
                MATERIALBUCKET: assetBucket.bucketName,
                VECTORBUCKET: vectorBucket.bucketName,
                RESULTLOGGROUPNAME: embeddingresultLogGroup.logGroupName
            },
            role: lambdaRole,
            timeout: cdk.Duration.minutes(15),
            memorySize: 4096,
            reservedConcurrentExecutions: 1
        });
        embeddingFunction.node.addDependency(embeddingDeploy);
        embeddingFunction.addEventSource(new SqsEventSource(queue, {
            batchSize: 1,
            }
        ))


        //  ==  == ==  ==  ==  ==  ==  == Frontend ==  ==  ==  ==  ==  ==  ==  ==
        if (props?.createFrontend) {
            new Frontend(this,
                assetBucket,
                vectorBucket,
                assetBucket.bucketName,
                vectorBucket.bucketName,
                queue.queueName,
                searchFunction.functionArn,
                searchFunction.functionName,
                props.generateInitialUser
            );
        }


        //  ==  ==  ==  ==  ==  ==  ==  == Outputs ==  ==  ==  ==  ==  ==  ==  ==
        new cdk.CfnOutput(this, "Material S3 Bucket", {
            value: assetBucket.bucketName,
        })

        new cdk.CfnOutput(this, "Vector S3 Bucket", {
            value: vectorBucket.bucketName,
        })

        new cdk.CfnOutput(this, "Search Function", {
            value: searchFunction.functionArn,
        })

        new cdk.CfnOutput(this, "Embedding Function", {
            value: embeddingFunction.functionArn,
        })


        NagSuppressions.addResourceSuppressionsByPath(this,
            [
                '/ServerlessRAG/LambdaExecutionRole/DefaultPolicy/Resource',
                '/ServerlessRAG/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource',
                '/ServerlessRAG/Custom::CDKECRDeploymentbd07c930edb94112a20f03f096f53666512MiB/ServiceRole/DefaultPolicy/Resource'
            ]
            ,[
            { id: "AwsSolutions-IAM5",
                reason: "These roles are automaticall created by CDK and are used by the Lambda functions.",
            },
        ]);

        NagSuppressions.addStackSuppressions(
            this,
            [
                {
                    id: 'AwsSolutions-IAM4',
                    reason: 'These policy are allowd',
                    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'],
                },
            ],
        );
        NagSuppressions.addStackSuppressions(
            this,
            [
                {
                    id: 'AwsSolutions-S1',
                    reason: 'All buckets are accessed by IAM entity so that they are not public',},
            ],
        );
        NagSuppressions.addStackSuppressions(
            this,
            [
                {
                    id: 'AwsSolutions-S10',
                    reason: 'All buckets are accessed by IAM entity or accessed via cloudfront'},
            ],
        );
        NagSuppressions.addStackSuppressions(
            this,
            [
                {
                    id: 'AwsSolutions-SQS4',
                    reason: 'All queues are accessed by IAM entity'},
            ],
        );



    }
}