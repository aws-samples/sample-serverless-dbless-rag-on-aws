import {
    Box,
    Button,
    ColumnLayout,
    Container,
    ContentLayout,
    Header, Icon,
    SpaceBetween,
    Table
} from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import LineChart from "@cloudscape-design/components/line-chart";
import "@xyflow/react/dist/style.css";

import { getMetrics, calculateChartHeight } from '../../commons/aws';
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { fetchAuthSession } from "aws-amplify/auth";
import '../../commons/reactflow.css';
import { useTranslation } from "react-i18next";
import Architecture from "../../commons/architecture";



export const Home = () => {
    const { t } = useTranslation();
    const embeddingQueueName = import.meta.env.VITE_APP_EMBEDDINGS_ASSET_QUEUE_NAME ?? import.meta.env.VITE_LOCAL_QUEUE_NAME;
    const functionName = import.meta.env.VITE_APP_SEARCH_FUNCTION_NAME ?? import.meta.env.VITE_LOCAL_SEARCH_FUNCTION_NAME;

    const [sqsqueuemetric, setMetricData] = useState<{ x: Date; y: number; }[]>([]); // APIからの結果を保持する状態
    const [metricduration, setMetricDuration] = useState<number>(3600); // APIからの結果を保持する状態

    const [durationMetric, setLambdaDurationData] = useState<{ x: Date; y: number; }[]>([]); // APIからの結果を保持する状態
    const [lambdaDailyStats, setLambdaDailyStats] = useState<{
        date: Date | undefined;
        sumMs: number;
        costUSD: number;
        invocations: number;
    }[]>([]);

    const [invocationMetric, setInvocationMetric] = useState<{ x: Date; y: number; }[]>([]); // APIからの結果を保持する状態



    const fetchMetrics = async () => {
        try {
            const queueMetricData = await getMetrics(metricduration, "AWS/SQS", "ApproximateNumberOfMessagesNotVisible", [{
                Name: "QueueName",
                Value: embeddingQueueName
            }], 60, "Average");
            setMetricData(queueMetricData!);

            const durationMetricData = await getMetrics(86400, "AWS/Lambda", "Duration", [{
                Name: "FunctionName",
                Value: functionName
            }], 300, "Sum");
            setLambdaDurationData(durationMetricData!);

            const invocationMetric = await getMetrics(86400, "AWS/Lambda", "Invocations", [{
                Name: "FunctionName",
                Value: functionName
            }], 300, "Sum");
            setInvocationMetric(invocationMetric!);


            // GetMetricStatisticsCommandを使用して日次データを取得
            const credential = (await fetchAuthSession()).credentials;
            const cwClient = new CloudWatchClient({
                region: import.meta.env.VITE_APP_AWS_REGION ?? import.meta.env.VITE_LOCAL_AWS_REGION,
                credentials: credential,
            });
            
            // 2週間前から現在までの期間を設定
            const endTime = new Date();
            const startTime = new Date();
            startTime.setDate(startTime.getDate() - 14); // 2週間前
            
            // Duration統計を取得
            const durationCommand = new GetMetricStatisticsCommand({
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
                Period: 86400, // 1日単位（秒）
                Statistics: ["Sum"]
            });
            
            const durationResponse = await cwClient.send(durationCommand);
            const durationDataPoints = durationResponse.Datapoints || [];
            
            // 日付ごとのマップを作成
            const dailyStatsMap = new Map();
            
            // 実行時間データを処理
            durationDataPoints.forEach(point => {
                if (point.Timestamp) {
                    dailyStatsMap.set(point.Timestamp.toISOString().split('T')[0], {
                        date: point.Timestamp,
                        sumMs: point.Sum || 0,
                        invocations: 0
                    });
                }
            });
            
            // 呼び出し回数データを取得
            const invocationsCommand = new GetMetricStatisticsCommand({
                Namespace: "AWS/Lambda",
                MetricName: "Invocations",
                Dimensions: [
                    {
                        Name: "FunctionName",
                        Value: functionName
                    }
                ],
                StartTime: startTime,
                EndTime: endTime,
                Period: 86400, // 1日単位（秒）
                Statistics: ["Sum"]
            });
            
            const invocationsResponse = await cwClient.send(invocationsCommand);
            const invocationsDataPoints = invocationsResponse.Datapoints || [];
            
            // 呼び出し回数データを処理
            invocationsDataPoints.forEach(point => {
                if (point.Timestamp) {
                    const dateKey = point.Timestamp.toISOString().split('T')[0];
                    if (dailyStatsMap.has(dateKey)) {
                        const entry = dailyStatsMap.get(dateKey);
                        entry.invocations = point.Sum || 0;
                    } else {
                        dailyStatsMap.set(dateKey, {
                            date: point.Timestamp,
                            sumMs: 0,
                            invocations: point.Sum || 0
                        });
                    }
                }
            });
            
            // コスト計算を追加（GB-秒あたり USD 0.0000166667、関数サイズ 2GB）
            const costPerGBSecond = 0.0000166667;
            const memorySizeGB = 2;
            
            // マップから配列に変換してコスト計算
            const statsWithCost = Array.from(dailyStatsMap.values()).map(stat => ({
                ...stat,
                costUSD: (stat.sumMs / 1000) * costPerGBSecond * memorySizeGB
            }));
            
            // 日付でソート（降順）
            statsWithCost.sort((a, b) => 
                (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
            );
            
            setLambdaDailyStats(statsWithCost);
        } catch (error) {
            console.error("Error fetching metrics:", error);
        }
    };

    const init = () => {
        fetchMetrics();
    };

    useEffect(() => {
        init();
    }, []);

    console.log(sqsqueuemetric);
    console.log(durationMetric);


    return (
        <ContentLayout
            header={
                <Header variant="h1" description={t("pages.dashboard.description")}>
                    {t("pages.dashboard.title")}
                </Header>
            }
        >

            <SpaceBetween size="l" direction="vertical" >

                <Container>
                    <Architecture title={t("pages.home.architecture")}></Architecture>
                </Container>

                <Container>
                    <Header variant="h3">{t("pages.dashboard.embeddingprocessqueue")}</Header>

                    <Container
                        disableContentPaddings
                        disableHeaderPaddings
                        variant="stacked"
                    >
                        <ColumnLayout columns={5}>
                            <Button onClick={() => setMetricDuration(900)} variant="link">
                                15分
                            </Button>
                            <Button onClick={() => setMetricDuration(3600)} variant="link">
                                1時間
                            </Button>
                            <Button onClick={() => setMetricDuration(10800)} variant="link">
                                3時間
                            </Button>
                            <Button onClick={() => setMetricDuration(43200)} variant="link">
                                12時間
                            </Button>
                            <Button onClick={() => setMetricDuration(86400)} variant="link">
                                24時間
                            </Button>
                            <Button onClick={() => {
                                fetchMetrics();
                            }}> {t("pages.dashboard.update")} <Icon name="refresh" />  </Button>
                        </ColumnLayout>
                    </Container>

                    <Container>
                        <LineChart
                            series={[
                                {
                                    title: "Count",
                                    type: "line",
                                    data: sqsqueuemetric,
                                },
                            ]}
                            xDomain={[
                                new Date(Date.now() - metricduration * 1000),
                                new Date(Date.now()),
                            ]}
                            yDomain={[0, calculateChartHeight(sqsqueuemetric)]}
                            i18nStrings={{
                                xTickFormatter: (e) =>
                                    e
                                        .toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "numeric",
                                            hour12: !1,
                                        })
                                        .split(",")
                                        .join("\n"),
                                yTickFormatter: function s(e) {
                                    return Math.abs(e) >= 1e9
                                        ? (e / 1e9).toFixed(1).replace(/\.0$/, "") + "G"
                                        : Math.abs(e) >= 1e6
                                            ? (e / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
                                            : Math.abs(e) >= 1e3
                                                ? (e / 1e3).toFixed(1).replace(/\.0$/, "") + "K"
                                                : e.toFixed(2);
                                },
                            }}
                            ariaLabel="Single data series line chart"
                            height={300}
                            hideFilter
                            hideLegend
                            xScaleType="time"
                            xTitle="Time (UTC)"
                            yTitle={"ApproximateNumberOfMessagesNotVisible " + t("pages.dashboard.metrics")}
                        />
                    </Container>
                </Container>



                <Container>
                    <Header variant="h2">コストモニター</Header>

                    <SpaceBetween size="l" direction="vertical" >
                    <Container>
                        <LineChart
                            series={[
                                {
                                    title: "Count",
                                    type: "line",
                                    data: durationMetric,
                                },
                            ]}
                            xDomain={[
                                new Date(Date.now() - 86400 * 1000),
                                new Date(Date.now()),
                            ]}
                            yDomain={[0, calculateChartHeight(durationMetric)]}
                            i18nStrings={{
                                xTickFormatter: (e) =>
                                    e
                                        .toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "numeric",
                                            hour12: !1,
                                        })
                                        .split(",")
                                        .join("\n"),
                                yTickFormatter: function s(e) {
                                    return Math.abs(e) >= 1e9
                                        ? (e / 1e9).toFixed(1).replace(/\.0$/, "") + "G"
                                        : Math.abs(e) >= 1e6
                                            ? (e / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
                                            : Math.abs(e) >= 1e3
                                                ? (e / 1e3).toFixed(1).replace(/\.0$/, "") + "K"
                                                : e.toFixed(2);
                                },
                            }}
                            ariaLabel="Single data series line chart"
                            height={300}
                            hideFilter
                            hideLegend
                            xScaleType="time"
                            xTitle="Time (UTC)"
                            yTitle={"RAG に使用する Lambda 関数の Duration " + t("pages.dashboard.metrics") + "(mm sec) の5分毎の合計"}
                        />
                    </Container>

                    <Box padding={{ bottom: "s" }}>
                        <span>料金: GB-秒あたり USD 0.0000166667 / 関数メモリサイズ: 2GB</span>
                    </Box>
                    <Table
                        columnDefinitions={[
                            {
                                id: "date",
                                header: "日付",
                                cell: item => item.date ? item.date.toLocaleDateString("ja-JP") : "-",
                                sortingField: "date"
                            },
                            {
                                id: "invocations",
                                header: "問い合わせ回数",
                                cell: item => item.invocations.toLocaleString(),
                                sortingField: "invocations"
                            },
                            {
                                id: "sumMs",
                                header: "合計実行時間 (ms)",
                                cell: item => item.sumMs.toFixed(2),
                                sortingField: "sumMs"
                            },
                            {
                                id: "costUSD",
                                header: "実行時間にかかる推定コスト (USD)",
                                cell: item => item.costUSD.toFixed(8),
                                sortingField: "costUSD"
                            }
                        ]}
                        items={lambdaDailyStats}
                        sortingColumn={{ sortingField: "date" }}
                        sortingDescending={true}
                        loadingText="読み込み中"
                        empty={
                            <Box textAlign="center" color="inherit">
                                <b>データがありません</b>
                                <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                                    Lambda関数の実行データが見つかりませんでした。
                                </Box>
                            </Box>
                        }
                        header={
                            <Header
                                variant="h3"
                                counter={`(${lambdaDailyStats.length})`}
                                actions={
                                    <Button onClick={fetchMetrics}>
                                        更新 <Icon name="refresh" />
                                    </Button>
                                }
                            >
                                Lambda実行時間の日次集計
                            </Header>
                        }
                    />
                    </SpaceBetween>
                </Container>

            </SpaceBetween>
        </ContentLayout>
    );
};

export default Home;
