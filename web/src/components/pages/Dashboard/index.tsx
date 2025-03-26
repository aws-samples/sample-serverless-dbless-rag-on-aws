import {
    Button,
    ColumnLayout,
    Container,
    ContentLayout,
    Header, Icon,
    SpaceBetween,
} from "@cloudscape-design/components";
import {useEffect, useState} from "react";
import LineChart from "@cloudscape-design/components/line-chart";
import "@xyflow/react/dist/style.css";

import {getMetrics} from '../../commons/aws';
import '../../commons/reactflow.css';
import {useTranslation} from "react-i18next";
import Architecture from "../../commons/architecture";



export const Home = () => {
    const { t } = useTranslation();
    const embeddingQueueName = import.meta.env.VITE_APP_EMBEDDINGS_ASSET_QUEUE_NAME ?? import.meta.env.VITE_LOCAL_QUEUE_NAME;

    const [sqsqueuemetric, setMetricData] = useState<{ x: Date; y: number; }[]>([]); // APIからの結果を保持する状態
    const [metricduration, setMetricDuration] = useState<number>(3600); // APIからの結果を保持する状態


    const fetchMetrics = async () => {
        try {
            const metricData = await getMetrics(metricduration, "AWS/SQS", "ApproximateNumberOfMessagesNotVisible", [{
                Name: "QueueName",
                Value: embeddingQueueName
            }]);
            setMetricData(metricData!);
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



    return (
        <ContentLayout
            header={
                <Header variant="h1" description={t("pages.dashboard.description")}>
                    {t("pages.dashboard.title")}
                </Header>
            }
        >



            <SpaceBetween size="l" direction="vertical">

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
                            yDomain={[0, 50]}
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
                            yTitle={"ApproximateNumberOfMessagesNotVisible " +t("pages.dashboard.metrics")}
                        />
                    </Container>
                </Container>
            </SpaceBetween>
        </ContentLayout>
    );
};

export default Home;
