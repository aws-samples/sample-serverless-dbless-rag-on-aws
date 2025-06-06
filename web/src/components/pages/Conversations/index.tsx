import {
    Button,
    ButtonGroup,
    ContentLayout,
    Header,
    SpaceBetween,
    StatusIndicator,
    Textarea
} from "@cloudscape-design/components";
import ChatBubble from "@cloudscape-design/chat-components/chat-bubble";


import ReactMarkdown from 'react-markdown'
import { useEffect, useRef, useState } from "react";
import { invokeSearchLambda } from "../../commons/aws.tsx";
import userIcon from "../../../assets/Res_User_48_Light.png";
import aiIcon from "../../../assets/Arch_Amazon-Bedrock_48.png";
import { useTranslation } from "react-i18next";
import { LoadingBar } from "@cloudscape-design/chat-components";


export const Home = () => {

    const { t } = useTranslation();
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    const [results, setResults] = useState<{
        text: string;
        isUser: boolean,
        references: {
            source: string,
            page: number,
            title?: string,
            author?: string,
            creationdate?: string,
            page_label?: string,
            total_pages?: number,
            [key: string]: any
        }[],
        showReferences?: boolean
    }[]>([]); // APIからの結果を保持する状態
    const [value, setValue] = useState("");
    const [isLoading, setIsLoading] = useState(false); // ローディング状態を管理

    const handleinvokeLambda = async () => {
        setIsLoading(true);
        setResults([...results, { text: value, isUser: true, references: [] }]);
        const result = await invokeSearchLambda(value);
        console.log(result)

        setResults([...results, { text: value, isUser: true, references: [] }, {
            text: result["result"],
            isUser: false,
            references: result["references"],
            showReferences: false
        }]);
        setIsLoading(false);
    };

    // isLoading の値が更新されるたびにロード
    useEffect(() => {
        scrollBottomRef?.current?.scrollIntoView();
    }, [isLoading]);


    return (
        <ContentLayout
            header={
                <Header variant="h1" description={t("pages.ragchat.description")}>
                    {t("pages.ragchat.title")}
                </Header>
            }
        >
            {/*質問回答結果を表示*/}
            <SpaceBetween size="l" direction="vertical">
                {results.map((result, index) => (
                    <ChatBubble
                        key={index}
                        ariaLabel={result.isUser ? "user" : "ai"}
                        type={result.isUser ? "incoming" : "outgoing"}
                        avatar={
                            <img src={result.isUser ? userIcon : aiIcon} alt="icon"
                                style={{ marginRight: "8px", width: "24px", height: "24px" }} />
                        }
                        actions={
                            <div>
                                <ButtonGroup
                                    ariaLabel="Chat bubble actions"
                                    variant="icon"
                                    items={[
                                        {
                                            type: "icon-button",
                                            id: "copy",
                                            iconName: "copy",
                                            text: "Copy",
                                            popoverFeedback: (
                                                <StatusIndicator type="success">
                                                    Message copied
                                                </StatusIndicator>
                                            )
                                        }
                                    ]}
                                />
                                {result.references && result.references.length > 0 && (
                                    <div className="reference-container" style={{ marginTop: "10px" }}>
                                        <div
                                            onClick={() => {
                                                const newResults = [...results];
                                                newResults[index].showReferences = !newResults[index].showReferences;
                                                setResults(newResults);
                                            }}
                                            style={{
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "4px 0"
                                            }}
                                        >
                                            <span style={{
                                                display: "inline-block",
                                                width: "16px",
                                                height: "16px",
                                                textAlign: "center",
                                                marginRight: "8px",
                                                transform: result.showReferences ? "rotate(90deg)" : "rotate(0deg)",
                                                transition: "transform 0.2s"
                                            }}>▶</span>
                                            <span>{t("pages.ragchat.references") || "参照情報"} ({result.references.length})</span>
                                        </div>

                                        {result.showReferences && (
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginTop: "8px" }}>
                                                <thead>
                                                    <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
                                                        <th style={{ padding: "8px 4px" }}>{"タイトル"}</th>
                                                        <th style={{ padding: "8px 4px" }}>{"著者"}</th>
                                                        <th style={{ padding: "8px 4px" }}>{"ページ"}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.references.map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                                                            <td style={{ padding: "8px 4px" }}>
                                                                <div>{item.title || item.source}</div>
                                                                {/* {item.keywords && (
                                                                    <div style={{ fontSize: "11px", color: "#666", marginTop: "4px", lineHeight: "1.3" }}>
                                                                        {item.keywords}
                                                                    </div>
                                                                )} */}
                                                            </td>
                                                            <td style={{ padding: "8px 4px" }}>{item.author || "-"}</td>
                                                            <td style={{ padding: "8px 4px" }}>
                                                                {item.page_label || item.page}{item.total_pages ? ` / ${item.total_pages}` : ""}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>

                        }
                    >

                        <div style={{ maxWidth: "100%", width: "100vw", overflowWrap: "break-word", wordWrap: "break-word" }}>
                            <ReactMarkdown>
                                {result.text}
                            </ReactMarkdown>
                        </div>

                    </ChatBubble>

                ))}
                {isLoading ? <LoadingBar variant="gen-ai-masked" /> : null}
            </SpaceBetween>

            <div style={{ marginTop: "200px" }}></div>

            {/*質問用フォームを画面したに表示*/}
            <div
                style={{
                    top: "auto",
                    bottom: 60,
                    position: "fixed",
                    right: 40,
                    left: 340,
                    textAlign: "right",
                    display: "flex",      // これを追加
                    justifyContent: "center"  // これを追加
                }}
            >
                <div style={{ width: "80%" }}>
                    <SpaceBetween size="xs">
                        <Textarea
                            onChange={({ detail }) => setValue(detail.value)}
                            value={value}
                            placeholder={t("pages.ragchat.placeholder")}
                        ></Textarea>
                        <Button onClick={handleinvokeLambda} disabled={isLoading}>
                            {t("pages.ragchat.ask")}
                        </Button>
                    </SpaceBetween>
                </div>
            </div>


        </ContentLayout>
    );
};

export default Home;