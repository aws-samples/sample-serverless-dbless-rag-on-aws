import {
  Box,
  Container,
  ContentLayout,
  Header,
  SpaceBetween, Spinner,
  Table,
  TableProps,
} from "@cloudscape-design/components";
import { useCallback, useEffect, useMemo, useState } from "react";

import {  _Object } from "@aws-sdk/client-s3";
import { useDropzone } from "react-dropzone";
import { Button } from "@aws-amplify/ui-react";
import { formatBytes } from '../../commons/util';
import { listObject, putObject } from '../../commons/aws';
import {useTranslation} from "react-i18next";


export const Home = () => {
  const [assetBucketObjects, setEmbeddingBucketObjects] = useState<_Object[]>([]); // APIからの結果を保持する状態
  const [vectorBucketObjects, setVectorBucketObjects] = useState<_Object[]>([]); // APIからの結果を保持する状態
  const { t } = useTranslation();
  const embeddingBucketName = import.meta.env.VITE_APP_EMBEDDINGS_ASSET_BUCKET_NAME ?? import.meta.env.VITE_LOCAL_MATERIAL_BUCKET_NAME;
  const vectorBucketName = import.meta.env.VITE_APP_VECTOR_BUCKET_NAME ?? import.meta.env.VITE_LOCAL_VECTOR_BUCKET_NAME;
  const [isUploading, setIsUploading] = useState(false); // ローディング状態を管理


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

  useEffect(() => {
    listObject(embeddingBucketName).then(setEmbeddingBucketObjects).catch(console.error);
    listObject(vectorBucketName).then(setVectorBucketObjects).catch(console.error);
    init();
  }, []);

  interface Item {
    name: string;
    size: string;
    date: string;
  }

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({onDrop});

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
  const borderNormalStyle = {
    border: "2px dotted #888",
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const borderDragStyle = {
    border: "1px solid #00f",
    transition: "border .10s ease-in-out",
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
        <li key={file.name}>
          {file.name} - {formatBytes(file.size)}
        </li>
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

          <Header variant="h2">{t("pages.embedding.upload")}</Header>


            <div {...getRootProps({ style:dropAreaStyle }) }>
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>{t("pages.embedding.drophere")}</p>
              ) : (
                <p>{t("pages.embedding.draganddrop")}</p>
              )}
              <ul>{files} </ul>
              {isUploading ? <Spinner />:null}
            </div>

          <Box textAlign={"right"}>
            <Button variation={"primary"} onClick={() => {handleUpload()}} disabled={isUploading}>
              {t("pages.embedding.upload")}
            </Button>
          </Box>


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


      </SpaceBetween>
    </ContentLayout>
  );
};

export default Home;
