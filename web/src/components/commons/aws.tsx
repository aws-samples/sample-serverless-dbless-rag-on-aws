import {fetchAuthSession} from "aws-amplify/auth";
import {CloudWatchClient, GetMetricDataCommand} from "@aws-sdk/client-cloudwatch";
import {InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda";
import {ListObjectsV2Command, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {CloudWatchLogsClient, DescribeLogStreamsCommand} from "@aws-sdk/client-cloudwatch-logs";

export const listLogStreams = async (logGroupName: string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new CloudWatchLogsClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        const command = new DescribeLogStreamsCommand({
            logGroupName: logGroupName,
        });

        const response = await client.send(command);
        const logStreams = response.logStreams || [];
        return logStreams.map(stream => stream.logStreamName);
    } catch (error) {
        console.error("Error fetching log streams:", error);
        throw error;
    }
};


export const putObject = async (bucket:string, keys:File[]) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new S3Client({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        

        for (const file of keys) {

            const fileContent = await file.arrayBuffer();

            const params = {
                Bucket: bucket,
                Key: file.name,
                Body: fileContent,
                ContentType: file.type,
            };

            const command = new PutObjectCommand(params);
            const response = await client.send(command);
            console.log('Upload Success:', response);
        }
    } catch (error) {
        console.error("Error calling S3:", error);
        throw error;
    }
};


export const listObject = async (bucket:string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new S3Client({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });
        const response = await client.send(
            new ListObjectsV2Command({
                Bucket: bucket,
            })
        );

        const keylist = response["Contents"]
            ? response["Contents"].sort((a, b) => new Date(b.LastModified!).getTime() - new Date(a.LastModified!).getTime())
            : [];
        return keylist;
    } catch (error) {
        console.error("Error calling S3:", error);
        throw error;
    }
};


export const getMetrics = async (metricDuration: number, nameSpace:string, metricName:string,dimension:[{ Name:string,Value:string}]) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new CloudWatchClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        const response = await client.send(
            new GetMetricDataCommand({
                MetricDataQueries: [
                    {
                        Id: "metric_alias_widget_preview_0",
                        MetricStat: {
                            Metric: {
                                Namespace: nameSpace,
                                MetricName: metricName,
                                Dimensions: dimension,
                            },
                            Period: 60,
                            Stat: "Average",
                        },
                    },
                ],
                StartTime: new Date(Date.now() - metricDuration * 1000),
                EndTime: new Date(),
            })
        );

        const result = response.MetricDataResults!;
        const metricData = result[0].Timestamps?.map((date, index) => ({
            x: date,
            y: result[0].Values![index],
        }));
        return metricData;
    } catch (error) {
        console.error("Error calling CloudWatch:", error);
        throw error;
    }
};

// nosemgrep: configs.rule-id-3
export const invokeSearchLambda = async (questionString: string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new LambdaClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        const command = new InvokeCommand({
            FunctionName: import.meta.env.VITE_APP_SEARCH_FUNCTION_NAME ?? import.meta.env.VITE_LOCAL_SEARCH_FUNCTION_NAME,
            Payload:
            JSON.stringify({question: questionString}),
        });

        const response = await client.send(command);
        const responsePayload = new TextDecoder().decode(response.Payload);
        const res = JSON.parse(responsePayload);
        const result = JSON.parse(res["body"]);
        return result;
    } catch (error: any) {
        return {
            result: error.message,
            references: [],
        }
    }
};