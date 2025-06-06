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
  const [lambdaExecuteLogStreams, setLambdaExecuteLogStreams] = useState<(LogStream & { status?: string; events?: LogEvent[] })[]>([]); // APIからの結果を保持する状態
  const [selectedLogStream, setSelectedLogStream] = useState<string | null>(null); // 選択されたログストリーム
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]); // ログイベントを保持する状態
  const [isLogModalVisible, setIsLogModalVisible] = useState(false); // ログモーダルの表示状態
  const [isLoading, setIsLoading] = useState(false); // ログ取得中の状態

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
  const handleLogStreamClick = (logStreamName: string, events?: LogEvent[]) => {
    setSelectedLogStream(logStreamName);
    if (events) {
      setLogEvents(events);
      setIsLogModalVisible(true);
    } else {
      // イベントがない場合は取得する
      const logGroupName = `/aws/lambda/${embeddingFunctionName}`;
      setIsLoading(true);
      getLogEvents(logGroupName, logStreamName)
        .then(fetchedEvents => {
          setLogEvents(fetchedEvents);
          setIsLogModalVisible(true);
        })
        .catch(error => {
          console.error("Error fetching log events:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  // ログストリームのステータスを判定する関数
  const determineLogStatus = (events: LogEvent[]): string => {
    const messages = events.map(event => event.message || "");
    const combinedMessage = messages.join(" ");
    
    if (combinedMessage.includes("COMPLETE TASK")) {
      return "complete";
    } else if (combinedMessage.includes("ERROR") || combinedMessage.includes("Task timed out")) {
      return "error";
    } else {
      return "processing";
    }
  };

  // ログストリームとそのイベントを取得する関数
  const fetchLogStreamsWithEvents = async () => {
    setIsLoading(true);
    try {
      const logGroupName = "/aws/lambda/" + embeddingFunctionName;
      const streams = await listLogStreams(logGroupName);
      
      // 最新のログストリームが上に来るようにソート
      const sortedStreams = [...streams].sort((a, b) => {
        const timeA = a.lastIngestionTime || a.creationTime || 0;
        const timeB = b.lastIngestionTime || b.creationTime || 0;
        return timeB - timeA; // 降順ソート
      });
      
      const streamsWithEvents = await Promise.all(
        sortedStreams.slice(0, 10).map(async (stream) => {
          if (!stream.logStreamName) return { ...stream, status: "unknown" };
          
          try {
            const events = await getLogEvents(logGroupName, stream.logStreamName);
            const status = determineLogStatus(events);
            return { ...stream, status, events };
          } catch (error) {
            console.error(`Error fetching events for ${stream.logStreamName}:`, error);
            return { ...stream, status: "error" };
          }
        })
      );
      
      setLambdaExecuteLogStreams(streamsWithEvents);
    } catch (error) {
      console.error("Error fetching log streams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    listObject(embeddingBucketName).then(setEmbeddingBucketObjects).catch(console.error);
    listObject(vectorBucketName).then(setVectorBucketObjects).catch(console.error);
    fetchLogStreamsWithEvents();
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
          <Header
            actions={
              <Button onClick={fetchLogStreamsWithEvents} disabled={isLoading}>
                更新
              </Button>
            }
          >
            取り込み中ログ
          </Header>
          <Table
            enableKeyboardNavigation={true}
            variant="borderless"
            resizableColumns={true}
            loading={isLoading}
            loadingText="ログを取得中..."
            // 行クリックは無効化し、アイコンボタンでのみ詳細を表示するようにする
            columnDefinitions={[
              {
                id: "logStreamName",
                header: "ログストリーム名",
                cell: item => item.logStreamName || "-",
                width: 250,
              },
              {
                id: "details",
                header: "詳細",
                cell: item => (
                  <Button 
                    iconName="external" 
                    variant="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.logStreamName) {
                        handleLogStreamClick(item.logStreamName, item.events);
                      }
                    }}
                    ariaLabel="ログ詳細を表示"
                  />
                ),
                width: 60,
              },
              {
                id: "status",
                header: "ステータス",
                cell: item => {
                  switch(item.status) {
                    case "complete":
                      return <span style={{ color: "green" }}>完了</span>;
                    case "error":
                      return <span style={{ color: "red" }}>エラー</span>;
                    case "processing":
                      return <span style={{ color: "blue" }}>処理中</span>;
                    default:
                      return <span style={{ color: "gray" }}>不明</span>;
                  }
                },
                width: 100,
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
            items={lambdaExecuteLogStreams}
          />
        </Container>


      </SpaceBetween>

      {/* ログイベント表示用モーダル */}
      <Modal
        visible={isLogModalVisible}
        onDismiss={() => setIsLogModalVisible(false)}
        header={`ログストリーム: ${selectedLogStream || ""}`}
        size="large"
        style={{ maxWidth: "90vw" }}
      >
        <Table
          enableKeyboardNavigation={true}
          variant="borderless"
          resizableColumns={true}
          wrapLines={true}
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
              cell: item => {
                const message = item.message || "-";
                const hasError = message.includes("ERROR");
                return (
                  <div style={{ 
                    color: hasError ? "red" : "inherit",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: "none"
                  }}>
                    {message}
                  </div>
                );
              },
              width: 800,
            },
          ]}
          items={[...logEvents].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))}
        />
      </Modal>
    </ContentLayout>
  );
};

export default Home;
