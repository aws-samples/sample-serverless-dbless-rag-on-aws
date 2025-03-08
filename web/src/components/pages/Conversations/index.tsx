import {
    Button,
    ContentLayout,
    Header,
    SpaceBetween,
    Textarea
} from "@cloudscape-design/components";
import ChatBubble from "@cloudscape-design/chat-components/chat-bubble";


import ReactMarkdown from 'react-markdown'
import {useEffect, useRef, useState} from "react";
import {invokeSearchLambda} from "../../commons/aws.tsx";
import userIcon from "../../../assets/Res_User_48_Light.png";
import aiIcon from "../../../assets/Arch_Amazon-Bedrock_48.png";
import {useTranslation} from "react-i18next";
import {LoadingBar} from "@cloudscape-design/chat-components";

export const Home = () => {

    const { t } = useTranslation();
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    const [results, setResults] = useState<{
        text: string;
        isUser: boolean,
        references: { source: string, page: number }[]
    }[]>([]); // APIからの結果を保持する状態
    const [value, setValue] = useState("");
    const [isLoading, setIsLoading] = useState(false); // ローディング状態を管理

    const handleinvokeLambda = async () => {
        setIsLoading(true);
        setResults([...results, {text: value, isUser: true, references: []}]);
        const result = await invokeSearchLambda(value);
        console.log(result)

        setResults([...results, {text: value, isUser: true, references: []}, {
            text: result["result"],
            isUser: false,
            references: result["references"]
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
                        type="incoming"
                        avatar={
                            <img src={result.isUser ? userIcon : aiIcon} alt="icon"
                                 style={{marginRight: "8px", width: "24px", height: "24px"}}/>
                        }
                    >
                        <ReactMarkdown>
                            {result.text}
                        </ReactMarkdown>

                        {result.isUser ? null : <hr/>}
                        {result.isUser ? null : t("pages.ragchat.references")}

                        {result.references && (
                            <ul>
                                {result.references.map((item, idx) => (
                                    <li key={idx}>
                                        <span style={{display: "inline-block"}}>{item.source}  </span>
                                        <span> {t("pages.ragchat.page")} {item.page}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ChatBubble>

                ))}
                {isLoading ? <LoadingBar variant="gen-ai-masked"/> : null}
            </SpaceBetween>

            <div style={{marginTop: "100px"}}></div>

            {/*質問用フォームを画面したに表示*/}
            <div
                style={{
                    top: "auto",
                    bottom: 20,
                    position: "fixed",
                    right: 20,
                    left: 300,
                    textAlign: "right",
                }}
            >
                <SpaceBetween size="xs">
                    <Textarea
                        onChange={({detail}) => setValue(detail.value)}
                        value={value}
                        placeholder={t("pages.ragchat.placeholder")}
                    ></Textarea>
                    <Button onClick={handleinvokeLambda} disabled={isLoading}>
                        {t("pages.ragchat.ask")}
                    </Button>
                </SpaceBetween>
            </div>


            <div ref={scrollBottomRef}/>
        </ContentLayout>
    );
};

export default Home;