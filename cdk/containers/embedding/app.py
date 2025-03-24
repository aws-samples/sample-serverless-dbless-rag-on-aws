# coding: UTF-8
import json
import time
from langchain_aws import BedrockEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
import boto3
import logging
import tempfile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

EMBEDDING_MODELID = "amazon.titan-embed-text-v1"
CHUNK_SIZE = 512
MATERIALBUCKET = os.getenv("MATERIALBUCKET")
VECTORBUCKET = os.getenv("VECTORBUCKET")
RESULTLOGGROUPNAME = os.getenv("RESULTLOGGROUPNAME", "SRGLOGS/results")
embedding = BedrockEmbeddings(model_id=EMBEDDING_MODELID)
materialbucket = boto3.resource("s3").Bucket(MATERIALBUCKET)
vectorbucket = boto3.resource("s3").Bucket(VECTORBUCKET)
logsclient = boto3.client('logs')


def upload_index(temp_dir):
    logger.info("Upload all document")
    for root, directories, files in os.walk(temp_dir):
        for filename in files:
            vectorbucket.upload_file(os.path.join(root, filename), filename)



def chunking(file_path):
    _, file_extension = os.path.splitext(file_path)
    file_extension = file_extension.lower()

    try:
        if file_extension == ".pdf":
            loader = PyPDFLoader(file_path=file_path)
        else:
            raise ValueError("Supported file types are PDF only")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE)
        data = loader.load()
        splited_data = text_splitter.split_documents(data)

        logger.info("splited_data chunks length " + str(len(splited_data)))
        return splited_data

    except Exception as e:
        print(e)
        return []


def insert_document(document, vector_path):
    logger.info("Embedding and insert document to FAISS engine")
    try:
        faiss = FAISS.load_local(vector_path, embedding, allow_dangerous_deserialization=True)
        faiss.add_documents(document)
        faiss.save_local(vector_path)
    except Exception as e:
        print(e)
        faiss = FAISS.from_documents(document, embedding)
        faiss.save_local(vector_path)


def load_vectordata(temp_dir):
    logger.info("Download vector data")
    for obj in vectorbucket.objects.filter(Prefix=""):
        if obj.key.endswith('/'):
            continue
        file_path = os.path.join(temp_dir, obj.key)
        logger.info("file_path: " + file_path + " obj.key: " + obj.key)
        vectorbucket.download_file(obj.key, file_path)


def get_document_from_s3(object_key, file_path):
    logger.info("Download " + object_key + " to " + file_path)
    materialbucket.download_file(object_key, file_path)



def lambda_handler(event, context):
    print(event)
    logger.info('==== INVOKE HANDLER ====')
    body = json.loads(event["Records"][0]["body"])
    object_key = body["Records"][0]["s3"]["object"]["key"]


    with tempfile.TemporaryDirectory() as temp_dir:
        vector_path = temp_dir
        load_vectordata(vector_path)

        with tempfile.TemporaryDirectory() as material_dir:
            file_path = os.path.join(material_dir, os.path.basename(object_key))
            get_document_from_s3(object_key, file_path)
            document = chunking(file_path)
            insert_document(document, vector_path)

        logger.info('==== COMPLETE EMBEDDING AND INDEXING ====')
        upload_index(vector_path)
        logger.info('==== COMPLETE TASK ====')

    return {'statusCode': 200}


if __name__ == '__main__':
    lambda_handler({}, {})