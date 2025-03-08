import {Handle, Position} from "@xyflow/react";
import {memo} from "react";

interface DataProps {
    color: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    image: string,
    label: string,
    value: string
}

const FlowAwsIconNode: React.FC<{ data: DataProps }> = ({data}) => {
    return (
        <>
            <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                <div>
                    <img src={data.image} alt={"icon"}/>
                </div>
                <div>{data.label}</div>
                <div>{data.value}</div>
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

export default memo(FlowAwsIconNode);