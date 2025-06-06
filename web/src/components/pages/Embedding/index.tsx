import {
  Box,
  Button,
  Container,
  ContentLayout,
  Header,
  Icon,
  Modal,
  SpaceBetween, Spinner,
  Table,
  TableProps,
} from "@cloudscape-design/components";
import { useCallback, useEffect, useMemo, useState } from "react";

import { _Object } from "@aws-sdk/client-s3";
import { useDropzone } from "react-dropzone";
import { formatBytes } from '../../commons/util';
import { getLogEvents, listLogStreams, listObject, putObject } from '../../commons/aws';
import { useTranslation } from "react-i18next";
import { LogEvent, LogStream } from "@aws-sdk/client-cloudwatch-logs";


export const Home = () => {
  const [assetBucketObjects, setEmbeddingBucketObjects] = useState<_Object[]>([]); // APIからの結果を保持する状態
  const [vectorBucketObjects, setVectorBucketObjects] = useState<_Object[]>([]); // APIからの結果を保持する状態
  const { t } = useTranslation();
  const embeddingBucketName = import.meta.env.VITE_APP_EMBEDDINGS_ASSET_BUCKET_NAME ?? import.meta.env.VITE_LOCAL_MATERIAL_BUCKET_NAME;
  const vectorBucketName = import.meta.env.VITE_APP_VECTOR_BUCKET_NAME ?? import.meta.env.VITE_LOCAL_VECTOR_BUCKET_NAME;
  const [isUploading, setIsUploading] = useState(false); // ローディング状態を管理
  
  const embeddingFunctionName = import.meta.env.VITE_EMBEDDING_FUNCTION_NAME ?? import.meta.env.VITE_LOCAL_EMBEDDING_FUNCTION_NAME;
  const [lambdaExecuteLogStreams, setLambdaExecuteLogStreams] = useState<LogStream[]>([]); // APIからの結果を保持する状態
  const [selectedLogStream, setSelectedLogStream] = useState<string | null>(null); // 選択されたログストリーム
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]); // ログイベントを保持する状態
  const [isLogModalVisible, setIsLogModalVisible] = useState(false); // ログモーダルの表示状態

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      await putObject(embeddingBucketName, myFiles);
      removeAll();
      listObject(embeddingBucketName).then(setEmbeddingBucketObjects).catch(console.error);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      removeAll();
    }
    setIsUploading(false);
  };


  const [myFiles, setMyFiles] = useState<File[]>([])
  const onDrop = useCallback((acceptedFiles: File[]) => {
    return setMyFiles(acceptedFiles);
  }, []);
  const removeAll = () => {
    setMyFiles([])
  }

  const init = () => {
    listObject(embeddingBucketName).then(setEmbeddingBucketObjects).catch(console.error);
    listObject(vectorBucketName).then(setVectorBucketObjects).catch(console.error);
  };
  
  // ログストリームをクリックした際の処理
  const handleLogStreamClick = async (logStreamName: string) => {
    setSelectedLogStream(logStreamName);
    try {
      const events = await getLogEvents(`/aws/lambda/${embeddingFunctionName}`, logStreamName);
      setLogEvents(events);
      setIsLogModalVisible(true);
    } catch (error) {
      console.error("Error fetching log events:", error);
    }
  };

  useEffect(() => {
    listObject(embeddingBucketName).then(setEmbeddingBucketObjects).catch(console.error);
    listObject(vectorBucketName).then(setVectorBucketObjects).catch(console.error);
    listLogStreams("/aws/lambda/"+embeddingFunctionName).then(setLambdaExecuteLogStreams).catch(console.error)
    init();
  }, []);

  interface Item {
    name: string;
    size: string;
    date: string;
  }

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({ onDrop });

  const itemDefinition: TableProps<Item>["columnDefinitions"] = [
    {
      id: "name",
      header: t("pages.embedding.name"),
      cell: (item) => <>{item.name}</>,
      width: 341,
      isRowHeader: true,
    },
    {
      id: "size",
      header: t("pages.embedding.size"),
      cell: (item) => <>{item.size}</>,
      width: 164,
    },
    {
      id: "date",
      header: t("pages.embedding.date"),
      cell: (item) => <>{item.date}</>,
      width: 164,
    },
  ];


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const borderNormalStyle: React.CSSProperties = {
    border: "2px dotted #888",
    height: "300px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column"
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const borderDragStyle: React.CSSProperties = {
    border: "1px solid #00f",
    transition: "border .10s ease-in-out",
    height: "300px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column"
  };
  const dropAreaStyle = useMemo(
    () => ({
      ...(isDragActive ? borderDragStyle : borderNormalStyle),
    }),
    [borderDragStyle, borderNormalStyle, isDragActive]
  );


  const files = useMemo(
    () =>
      myFiles.map((file) => (
        <div key={file.name}>
          {file.name} - {formatBytes(file.size)}
        </div>
      )),
    [myFiles]
  );

  return (
    <ContentLayout
      header={
        <Header variant="h1" description={t("pages.embedding.description")}>
          {t("pages.embedding.title")}
        </Header>
      }
    >
      <SpaceBetween size="l" direction="vertical">

        <Container>
          <SpaceBetween size={"l"}>
            <Header variant="h2">{t("pages.embedding.upload")}</Header>

            <div {...getRootProps({ style: dropAreaStyle })}>
              <input {...getInputProps()} />

              {(files.length == 0) && (<>
                {isDragActive ? (
                <p>
                  {t("pages.embedding.drophere")}
                  </p>
              ) : (
                <p>
                  <SpaceBetween size={"xl"} alignItems="center">
                  <Icon variant="disabled" name="upload" size="large"/>
                  {t("pages.embedding.draganddrop")}
                  </SpaceBetween>
                  </p>
              )}
              </>)}

              <ul>{files}</ul>
              {isUploading ? <Spinner /> : null}
            </div>

            <Box textAlign={"right"}>
              <Button onClick={() => { handleUpload() }} disabled={isUploading}>
                {t("pages.embedding.upload")}
              </Button>
            </Box>
          </SpaceBetween>
        </Container>

        <Container>
          <Header
            counter={
              "(" +
              assetBucketObjects.length +
              ")     " +
              formatBytes(
                assetBucketObjects.reduce((accumulator, currentItem) => {
                  return accumulator + currentItem.Size!;
                }, 0)
              )
            }
          >
            {t("pages.embedding.uploaded")}
          </Header>
          <Table
            enableKeyboardNavigation={true}
            variant="borderless"
            resizableColumns={true}
            items={assetBucketObjects.slice(0, 10).map((_object) => ({
              name: _object.Key!,
              size: formatBytes(_object.Size!), // Size を文字列に変換 (例: "1024 bytes")
              date: new Date(_object.LastModified!).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
            }))}
            columnDefinitions={itemDefinition}
          />
        </Container>

        <Container>
          <Header>
            {t("pages.embedding.embeddedindex")}
          </Header>
          <Table
            enableKeyboardNavigation={true}
            variant="borderless"
            resizableColumns={true}
            items={vectorBucketObjects.slice(0, 10).map((_object) => ({
              name: _object.Key!,
              size: formatBytes(_object.Size!), // Size を文字列に変換 (例: "1024 bytes")
              date: new Date(_object.LastModified!).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
            }))}
            columnDefinitions={itemDefinition}
          />
        </Container>
        
        <Container>
          <Header>
            取り込み中ログ
          </Header>
          <Table
            enableKeyboardNavigation={true}
            variant="borderless"
            resizableColumns={true}
            onRowClick={({ detail }) => {
              if (detail.item.logStreamName) {
                handleLogStreamClick(detail.item.logStreamName);
              }
            }}
            columnDefinitions={[
              {
                id: "logStreamName",
                header: "ログストリーム名",
                cell: item => item.logStreamName || "-",
                width: 341,
              },
              {
                id: "creationTime",
                header: "作成時刻",
                cell: item => item.creationTime ? new Date(item.creationTime).toLocaleString('ja-JP') : "-",
                width: 164,
              },
              {
                id: "lastIngestionTime",
                header: "最終取り込み時刻",
                cell: item => item.lastIngestionTime ? new Date(item.lastIngestionTime).toLocaleString('ja-JP') : "-",
                width: 164,
              },
            ]} 
            items={lambdaExecuteLogStreams.slice(0, 10)}
          />
        </Container>


      </SpaceBetween>

      {/* ログイベント表示用モーダル */}
      <Modal
        visible={isLogModalVisible}
        onDismiss={() => setIsLogModalVisible(false)}
        header={`ログストリーム: ${selectedLogStream || ""}`}
        size="large"
      >
        <Table
          enableKeyboardNavigation={true}
          variant="borderless"
          resizableColumns={true}
          columnDefinitions={[
            {
              id: "timestamp",
              header: "タイムスタンプ",
              cell: item => item.timestamp ? new Date(item.timestamp).toLocaleString('ja-JP') : "-",
              width: 200,
            },
            {
              id: "message",
              header: "メッセージ",
              cell: item => item.message || "-",
              width: 600,
            },
          ]}
          items={logEvents}
        />
      </Modal>
    </ContentLayout>
  );
};

export default Home;
