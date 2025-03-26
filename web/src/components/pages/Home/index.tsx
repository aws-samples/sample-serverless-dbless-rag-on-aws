import {
    Container,
    ContentLayout,
    Header,
    SpaceBetween,
    StatusIndicator,
    Link
} from "@cloudscape-design/components";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { listObject } from "../../commons/aws.tsx";
import { useTranslation } from "react-i18next";
import { NavigateFunction } from "react-router-dom";
import Architecture from "../../commons/architecture.tsx";

interface Props {
    setActiveHref: Dispatch<SetStateAction<string>>;
    navigate: NavigateFunction;
}

export const Home = (props: Props) => {
    const [step_1_status, setStep1Status] = useState<boolean>(false);
    const [step_2_status, setStep2Status] = useState<boolean>(false);
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
                                event.preventDefault();
                                if (!event.detail.external) {
                                    props.setActiveHref(event.detail.href ?? "/");
                                    props.navigate(event.detail.href ?? "/");
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
                            <div><StatusIndicator type="success">{t("pages.home.quickstart.step2success")}</StatusIndicator> </div>
                            : <StatusIndicator type="info">{t("pages.home.quickstart.step2failure")}</StatusIndicator>
                        }
                    </p>

                    <p>
                        {t("pages.home.quickstart.step3")}<br></br>
                        {step_2_status ? <div>
                            <StatusIndicator type="success"></StatusIndicator><Link href={"/ragchat"}
                                onFollow={(event) => {
                                    event.preventDefault();
                                    if (!event.detail.external) {
                                        props.setActiveHref(event.detail.href ?? "/");
                                        props.navigate(event.detail.href ?? "/");
                                    }
                                }}
                            >{t("pages.home.quickstart.step3success")}</Link>
                        </div> : <div></div>
                        }

                    </p>

                </ul>
            </Container>

            <Container>
            <Header variant="h3">{t("pages.home.architecture")}</Header>
                <Architecture></Architecture>
            </Container> 

            <Container>
                <Header variant="h3">{t("pages.home.quickstart.links")}</Header>
                <Link
                    href="https://github.com/aws-samples/sample-serverless-dbless-rag-on-aws"
                    external={true}
                    variant="primary"
                >
                    <span>GitHub Repository</span>
                </Link>
            </Container>

        </SpaceBetween>
    </ContentLayout>;
};

export default Home;
