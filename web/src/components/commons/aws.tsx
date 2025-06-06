import {fetchAuthSession} from "aws-amplify/auth";
import {CloudWatchClient, GetMetricDataCommand, GetMetricStatisticsCommand} from "@aws-sdk/client-cloudwatch";
import {InvokeCommand, LambdaClient, ListVersionsByFunctionCommand} from "@aws-sdk/client-lambda";
import {ListObjectsV2Command, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand} from "@aws-sdk/client-cloudwatch-logs";


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


export const getMetrics = async (
    metricDuration: number, nameSpace:string, metricName:string,dimension:[{ Name:string,Value:string}],
    period: number, stat:string
) => {
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
                            Period: period,
                            Stat: stat, // 指定された統計タイプを使用
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

/**
 * メトリクスデータの最大値に基づいてグラフの高さを計算する関数
 * @param data メトリクスデータ配列
 * @param margin 最大値に対する余白の割合（デフォルト: 0.1 = 10%）
 * @returns 適切なグラフの高さ上限値
 */
export const calculateChartHeight = (data: { x: Date; y: number }[] | undefined, margin: number = 0.1): number => {
    if (!data || data.length === 0) {
        return 50; // デフォルト値
    }
    
    // 最大値を取得
    const maxValue = Math.max(...data.map(point => point.y));
    if (maxValue === 0) {
        return 5; // 最大値が0の場合はデフォルト値を返す
    }

    // 最大値の1.1倍（10%増し）を返す
    return maxValue * (1 + margin);
};

// nosemgrep: configs.rule-id-3
export const invokeSearchLambda = async (questionString: string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new LambdaClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        const functionName = import.meta.env.VITE_APP_SEARCH_FUNCTION_NAME ?? import.meta.env.VITE_LOCAL_SEARCH_FUNCTION_NAME;

        // バージョンを取得
        const listVersionsCommand = new ListVersionsByFunctionCommand({ FunctionName: functionName });
        const versionsResponse = await client.send(listVersionsCommand);

        // "$LATEST" を除外し、数値的に最新のバージョンを選択
        const latestVersion = versionsResponse.Versions
        ?.filter(v => v.Version !== '$LATEST')
        .map(v => parseInt(v.Version || '0'))
        .reduce((max, current) => Math.max(max, current), 0) || 0;
    
        // 最新バージョンが存在する場合は、そのバージョンを使用
        const functionNamewithVersion = latestVersion > 0 ? `${functionName}:${latestVersion}` : functionName;
        

        const command = new InvokeCommand({
            FunctionName: functionNamewithVersion,
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

// Lambda 関数の実行ログからまずはストリームを列挙する関数
export const listLogStreams = async (logGroupName: string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new CloudWatchLogsClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        const command = new DescribeLogStreamsCommand({
                logGroupName: logGroupName,
                orderBy: "LastEventTime",
        });

        const response = await client.send(command);
        const logStreams = response.logStreams || [];
        return logStreams;
    } catch (error) {
        console.error("Error fetching log streams:", error);
        throw error;
    }
};

// getLogEvents

export const getLogEvents = async (logGroupName: string, logStreamName: string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new CloudWatchLogsClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        const command = new GetLogEventsCommand({
            logGroupName: logGroupName,
            logStreamName: logStreamName,
            startFromHead: true,
        });

        const response = await client.send(command);
        const logEvents = response.events || [];
        return logEvents;
    } catch (error) {
        console.error("Error fetching log events:", error);
        throw error;
    }
};


 // Lambda関数のDurationメトリクスの合計を取得する関数
export const getLambdaDurationMetrics = async (functionName: string) => {
    try {
        const credential = (await fetchAuthSession()).credentials;
        const client = new CloudWatchClient({
            region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
            credentials: credential,
        });

        // 2週間前から現在までの期間を設定
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 14); // 2週間前

        const command = new GetMetricStatisticsCommand({
            Namespace: "AWS/Lambda",
            MetricName: "Duration",
            Dimensions: [
                {
                    Name: "FunctionName",
                    Value: functionName
                }
            ],
            StartTime: startTime,
            EndTime: endTime,
            Period: 86400, // 1日単位で集計（秒単位）
            Statistics: ["Sum", "Average", "Maximum"],
        });

        const response = await client.send(command);
        
        // 結果を整形
        const dataPoints = response.Datapoints || [];
        const sortedDataPoints = dataPoints.sort((a, b) => 
            (a.Timestamp?.getTime() || 0) - (b.Timestamp?.getTime() || 0)
        );
        
        // 合計実行時間を計算（ミリ秒単位）
        const totalDurationMs = dataPoints.reduce((sum, point) => sum + (point.Sum || 0), 0);
        
        return {
            totalDurationMs,
            averageDurationMs: dataPoints.length > 0 ? 
                dataPoints.reduce((sum, point) => sum + (point.Average || 0), 0) / dataPoints.length : 0,
            maxDurationMs: Math.max(...dataPoints.map(point => point.Maximum || 0)),
            dailyData: sortedDataPoints.map(point => ({
                date: point.Timestamp,
                sumMs: point.Sum || 0,
                avgMs: point.Average || 0,
                maxMs: point.Maximum || 0
            }))
        };
    } catch (error) {
        console.error("Error fetching Lambda duration metrics:", error);
        throw error;
    }
};

