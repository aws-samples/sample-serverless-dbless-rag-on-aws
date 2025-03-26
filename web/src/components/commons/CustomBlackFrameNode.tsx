import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

interface CustomBlackFrameNodeProps {
    image: string;
    label: string;
    style?: React.CSSProperties;
}

const CustomBlackFrameNode: React.FC<{ data: CustomBlackFrameNodeProps }> = ({ data }) => {
    return (
        <>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    outline: '2px solid black',
                    boxSizing: 'border-box',
                    ...data.style
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center", // 垂直方向の中央揃え
                    }}
                >
                    <img
                        src={data.image}
                        alt="Node Icon"
                        style={{
                            width: '32px',
                            height: '32px',
                            marginRight: '8px', // 画像とラベルの間隔
                            outline: '1px black',
                        }}
                    />
                    <div style={{
                        display: 'flex',
                        alignItems: 'center' // ラベルテキストの垂直中央揃え
                    }}>
                        {data.label}
                    </div>
                </div>

            </div>



            <Handle
                type="target"
                position={Position.Left}
                id="l"
            />
            <Handle
                type="source"
                position={Position.Left}
                id="l"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="r"
            />
            <Handle
                type="target"
                position={Position.Right}
                id="r"
            />
            <Handle
                type="source"
                position={Position.Top}
                id="t"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="b"
            />
            <Handle
                type="target"
                position={Position.Top}
                id="t"
            />
            <Handle
                type="target"
                position={Position.Bottom}
                id="b"
            />
        </>
    );
};

export default memo(CustomBlackFrameNode);
