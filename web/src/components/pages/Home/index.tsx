import {
    Container,
    ContentLayout,
    Header, SpaceBetween, StatusIndicator,
} from "@cloudscape-design/components";
import architecture from '../../../assets/architecture.png'
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {listObject} from "../../commons/aws.tsx";
import { useTranslation } from "react-i18next";
import Link from "@cloudscape-design/components/link";
import {NavigateFunction} from "react-router-dom";

interface Props {
    setActiveHref: Dispatch<SetStateAction<string>>;
    navigate: NavigateFunction;
}


export const Home =
    (props: Props) => {
    const [step_1_status, setStep1Status] = useState<boolean>(false); // APIからの結果を保持する状態
    const [step_2_status, setStep2Status] = useState<boolean>(false); // APIからの結果を保持する状態
    const { t } = useTranslation();
    const embeddingBucketName = import.meta.env.VITE_APP_EMBEDDINGS_ASSET_BUCKET_NAME ?? import.meta.env.VITE_LOCAL_MATERIAL_BUCKET_NAME;
    const vectorBucketName = import.meta.env.VITE_APP_VECTOR_BUCKET_NAME ?? import.meta.env.VITE_LOCAL_VECTOR_BUCKET_NAME;

    const init = () => {
        listObject(embeddingBucketName).then((response) => {
            if (response.length > 0) {
                setStep1Status(true);
            }
        }).catch(console.error);
        listObject(vectorBucketName).then(
            (response) => {
                if (response.length > 0) {
                    setStep2Status(true);
                }
            }
        ).catch(console.error);
    };

    useEffect(() => {
        listObject(embeddingBucketName).then((response) => {
            if (response.length > 0) {
                setStep1Status(true);
            }
        }).catch(console.error);
        listObject(vectorBucketName).then(
            (response) => {
                if (response.length > 0) {
                    setStep2Status(true);
                }
            }
        ).catch(console.error);

        init();
    }, []);


    return <ContentLayout
        header={
            <Header variant="h1" description={t("pages.home.description")}>
                {t("pages.home.title")}
            </Header>
        }
    >
        <SpaceBetween size="l" direction="vertical">
            <Container>
                <Header variant="h3">{t("pages.home.quickstart.title")}</Header>
                <ul>
                    <p>
                        {t("pages.home.quickstart.step1")}
                        <Link href={"/embedding"}
                              onFollow={(event) => {
                                  event.preventDefault(); // デフォルトのリンク動作を防止
                                  if (!event.detail.external) {
                                      props.setActiveHref(event.detail.href ?? "/");
                                      props.navigate(event.detail.href ?? "/");  // 手動でルート変更
                                  }
                              }}
                        >
                        {t("pages.home.quickstart.step1link")}
                        </Link>.
                        <br></br>
                        {step_1_status ?
                            <StatusIndicator type="success">{t("pages.home.quickstart.step1success")}</StatusIndicator>
                            : <StatusIndicator type="info">{t("pages.home.quickstart.step1failure")} </StatusIndicator>
                        }
                    </p>
                    <p>
                        {t("pages.home.quickstart.step2")}<br></br>
                        {step_2_status ?
                            <div><StatusIndicator type="success">{t("pages.home.quickstart.step2success")}</StatusIndicator> <p>
                                <Link href={"/ragchat"}
                                      onFollow={(event) => {
                                          event.preventDefault(); // デフォルトのリンク動作を防止
                                          if (!event.detail.external) {
                                              props.setActiveHref(event.detail.href ?? "/");
                                              props.navigate(event.detail.href ?? "/");  // 手動でルート変更
                                          }
                                      }}
                                >{t("pages.home.quickstart.step3")}</Link><br></br></p>
                                </div>
                                    : <StatusIndicator type="info">{t("pages.home.quickstart.step2failure")}</StatusIndicator>
                                    }
                                </p>

                            </ul>
                            </Container>

            <Container>
                <Header variant="h3">{t("pages.home.architecture")}</Header>
                <img src={architecture} alt="arch" width={"100%"}/>
            </Container>

        </SpaceBetween>
    </ContentLayout>;
};

export default Home;
