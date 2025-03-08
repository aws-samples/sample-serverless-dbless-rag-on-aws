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
import {MarkerType, ReactFlow} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {getMetrics} from '../../commons/aws';


import S3Icon from '../../../assets/Arch_Amazon-Simple-Storage-Service_48.png'
import LambdaIcon from '../../../assets/Arch_AWS-Lambda_48.png'
import SqsIcon from '../../../assets/Arch_Amazon-Simple-Queue-Service_48.png'
import BedrockIcon from '../../../assets/Arch_Amazon-Bedrock_48.png'
import UserIcon from '../../../assets/Res_User_48_Light.png'
import AwsIconNode from '../../commons/FlowAwsIconNode';
import '../../commons/reactflow.css';
import {useTranslation} from "react-i18next";

const nodeTypes = {
    awsNode: AwsIconNode,
};



export const Home = () => {
    const { t } = useTranslation();
    const embeddingQueueName = import.meta.env.VITE_APP_EMBEDDINGS_ASSET_QUEUE_NAME ?? import.meta.env.VITE_LOCAL_QUEUE_NAME;

    const initialNodes = [
        {
            id: "1",
            type: "awsNode",
            position: {x: 0, y: 30},
            data: {color: '#1A192B', image: S3Icon, label: "S3" },
        },
        {
            id: "2",
            type: "awsNode",
            position: {x: 150, y: 30},
            data: {color: '#1A192B', image: SqsIcon, label: "SQS"},
        },
        {
            id: "3",
            type: "awsNode",
            position: {x: 300, y: 30},
            data: {color: '#1A192B', image: LambdaIcon, label: "Lambda"},
        },
        {
            id: "4",
            type: "awsNode",
            position: {x: 450, y: 30},
            data: {color: '#1A192B', image: S3Icon, label: "S3"},
        },
        {
            id: "5",
            type: "awsNode",
            position: {x: 600, y: 30},
            data: {color: '#1A192B', image: LambdaIcon, label: "Lambda"},
        },
        {
            id: "6",
            type: "awsNode",
            position: {x: 600, y: 150},
            data: {color: '#1A192B', image: BedrockIcon, label: "Bedrock"},
        },
        {
            id: "7",
            type: "awsNode",
            position: {x: 750, y: 30},
            data: { color: '#1A192B', image: UserIcon, label: "User"},
        },
        {
            id: "8",
            type: "awsNode",
            position: {x: 300, y: 150},
            data: {color: '#1A192B', image: BedrockIcon, label: "Bedrock"},
        },
    ];
    const initialEdges = [
        {
            id: "e1-2",
            source: "1",
            target: "2",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e2-3",
            source: "2",
            target: "3",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e3-4",
            source: "3",
            target: "4",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e4-5",
            source: "4",
            target: "5",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e5-7",
            source: "7",
            target: "5",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "l",
            targetHandle: "r",
        },
        {
            id: "e5-6",
            source: "5",
            target: "6",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "b",
            targetHandle: "t",
        },
        {
            id: "e3-8",
            source: "3",
            target: "8",
            markerEnd: {type: MarkerType.Arrow, width: 20, height: 20, color: "#000000"},
            sourceHandle: "b",
            targetHandle: "t",
        }
    ];


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
                    <Header variant="h3">{t("pages.dashboard.architecture")}</Header>
                    <div style={{width: "100vw", height: "30vh"}}>
                        <ReactFlow nodes={initialNodes}
                                   edges={initialEdges}
                                   nodeTypes={nodeTypes}
                                   zoomOnDoubleClick={false}
                                   minZoom={1}
                                   maxZoom={1}
                                   draggable={false}
                                   panOnDrag={false}
                                   elementsSelectable={false}
                                   onlyRenderVisibleElements={false}
                        />
                    </div>
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
