

import S3Icon from '../../assets/Arch_Amazon-Simple-Storage-Service_48.png'
import LambdaIcon from '../../assets/Arch_AWS-Lambda_48.png'
import SqsIcon from '../../assets/Arch_Amazon-Simple-Queue-Service_48.png'
import BedrockIcon from '../../assets/Arch_Amazon-Bedrock_48.png'
import CloudWatchIcon from '../../assets/Arch_Amazon-CloudWatch_48.png'
import UserIcon from '../../assets/Res_User_48_Light.png'
import UsersIcon from '../../assets/Res_Users_48_Light.png'
import CloudIcon from '../../assets/AWS-Cloud-logo_32.png'
import AwsIconNode from './FlowAwsIconNode';
import './reactflow.css';
import {  MarkerType, ReactFlow } from '@xyflow/react';
import CustomBlackFrameNode from './CustomBlackFrameNode'

interface ArchitectureProps {
    title?: string;
}

const nodeTypes = {
    awsNode: AwsIconNode,
    groupNode: CustomBlackFrameNode

};

// Architectureコンポーネント
const Architecture: React.FC<ArchitectureProps> = ({ title = '' }) => {

    const initialNodes = [
        {
            id: "embeddinggroup",
            position: { x: 150, y: 140 },
            width: 350,
            height: 360,
            style: {backgroundColor:'#ddeeff', borderColor:"transparent"},
            zIndex: -1,
            data:{label: "Document embedding Part",},
        },
        {
            id: "rag",
            position: { x: 660, y: 140 },
            width: 180,
            height: 360,
            style: {backgroundColor:'#ddeeff', borderColor:"transparent"},
            zIndex: -1,
            data:{label: "RAG Part",},
        },
        {
            id: "snapstart",
            position: { x: 510, y: 330 },
            width: 140,
            height: 170,
            style: {backgroundColor:'#eeddff', borderColor:"transparent"},
            zIndex: -1,
            data:{label: "SnapStart part (Optional)",},
        },
        {
            id: "awscloud",
            type: 'groupNode',
            data: { label: "AWS Cloud", image: CloudIcon,style: {width: 750,height: 600,}},
            position: { x: 120, y: 0 },
        },
        {
            id: "1",
            type: "awsNode",
            position: { x: 160, y: 180 },
            data: { color: '#1A192B', image: S3Icon, label: "Amazon S3" },
        },
        {
            id: "2",
            type: "awsNode",
            position: { x: 280, y: 180 },
            data: { color: '#1A192B', image: SqsIcon, label: "SQS" },
        },
        {
            id: "3",
            type: "awsNode",
            position: { x: 400, y: 180 },
            data: { color: '#1A192B', image: LambdaIcon, label: "Lambda" },
        },
        {
            id: "8",
            type: "awsNode",
            position: { x: 400, y: 390 },
            data: { color: '#1A192B', image: BedrockIcon, label: "Bedrock" },
        },
        {
            id: "4",
            type: "awsNode",
            position: { x: 540, y: 180 },
            data: { color: '#1A192B', image: S3Icon, label: "Amazon S3" },
        },
        {
            id: "5",
            type: "awsNode",
            position: { x: 750, y: 180 },
            data: { color: '#1A192B', image: LambdaIcon, label: "Lambda" },
        },
        {
            id: "6",
            type: "awsNode",
            position: { x: 750, y: 390 },
            data: { color: '#1A192B', image: BedrockIcon, label: "Bedrock" },
        },
        {
            id: "7",
            type: "awsNode",
            position: { x: 950, y: 250 },
            data: { color: '#1A192B', image: UsersIcon, label: "End Users" },
        },
        {
            id: "9",
            type: "awsNode",
            position: { x: 10, y: 250 },
            data: { color: '#1A192B', image: UserIcon, label: "Admin" },
        },
        {
            id: "10",
            type: "awsNode",
            position: { x: 544, y: 390 },
            data: { color: '#1A192B', image: LambdaIcon, label: "Lambda" },
        },
        {
            id: "11",
            type: "awsNode",
            position: { x: 240, y: 510 },
            data: { color: '#1A192B', image: CloudWatchIcon, label: "CloudWatch Metrics" },
        },

    ];
    const initialEdges = [
        {
            id: "e1-2",
            source: "1",
            target: "2",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e2-3",
            source: "2",
            target: "3",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e3-4",
            source: "3",
            target: "4",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "r",
            targetHandle: "l",
        },
        {
            id: "e4-5",
            source: "5",
            target: "4",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            markerStart: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "l",
            targetHandle: "r",
            label: 'Pull vectors',
            labelShowBg: false
        },
        {
            id: "e5-7",
            source: "7",
            target: "5",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            markerStart: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "l",
            targetHandle: "r",
            label: 'Question and answering',
            labelShowBg: false
        },
        {
            id: "e5-6",
            source: "5",
            target: "6",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            markerStart: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "b",
            targetHandle: "t",
            label: 'Summarize answer',
            labelShowBg: false
        },
        {
            id: "e3-8",
            source: "3",
            target: "8",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            markerStart: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "b",
            targetHandle: "t",
            label: 'Feature Vectorization',
            labelShowBg: false
        },
        {
            id: "e9-1",
            source: "9",
            target: "1",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "r",
            targetHandle: "l",
            label: 'Put Document (PDF)',
            labelShowBg: false
        },
        {
            id: "e4-10",
            source: "4",
            target: "10",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "b",
            targetHandle: "t",
            label: 'S3 notification',
            labelShowBg: false
        },
        {
            id: "e10-6",
            source: "10",
            target: "5",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "r",
            targetHandle: "l",
            label: 'Publish new version',
            labelShowBg: false
        },
        {
            id: "e2-11",
            source: "2",
            target: "11",
            markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: "#000000" },
            sourceHandle: "b",
            targetHandle: "t",
            label: 'Push metrics',
            labelShowBg: false
        }
    ];

    return (
        <div className="architecture-container">
            <h2>{title}</h2>
                <div style={{ width: "100%", height: "60vh" }}>
                    <ReactFlow nodes={initialNodes}
                        edges={initialEdges}
                        nodeTypes={nodeTypes}
                        zoomOnDoubleClick={false}
                        fitView
                        minZoom={0.1}
                        maxZoom={1.5}
                        draggable={false}
                        panOnDrag={false}
                        elementsSelectable={false}
                        onlyRenderVisibleElements={false}
                    />
                </div>
        </div>
    );
};

export default Architecture;
