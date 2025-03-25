# coding: UTF-8
import json
from langchain_aws import BedrockEmbeddings, ChatBedrock
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
import os
import boto3
import logging
import tempfile

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 変数定義
EMBEDDING_MODELID = "amazon.titan-embed-text-v1"
GENERATION_MODELID = "anthropic.claude-3-haiku-20240307-v1:0"
VECTOR_PATH = "/tmp/vectorstore" # nosec B108
CHUNK_SIZE = 512
embedding = BedrockEmbeddings(model_id=EMBEDDING_MODELID)
VECTORBUCKET = os.getenv("VECTORBUCKET")
vectorbucket = boto3.resource("s3",).Bucket(VECTORBUCKET)

def load_vectordata():
    if not os.path.exists(VECTOR_PATH):
        os.makedirs(VECTOR_PATH)

    # FAISSファイルのダウンロード
    faiss_file_path = os.path.join(VECTOR_PATH, "index.faiss")
    vectorbucket.download_file(
        "index.faiss", 
        faiss_file_path,
    )
    # PKLファイルのダウンロード
    pkl_file_path = os.path.join(VECTOR_PATH, "index.pkl")
    vectorbucket.download_file(
        "index.pkl", 
        pkl_file_path,
    )

# プロンプトの定義
prompt_template = '''Human:
Text: {context}

Question: {question}

Question に記述された質問に対して、 Text で与えられた情報を使い、Question と同じ言語で文章量は短くしつつも多くの情報を回答してください。
Question に記述された質問に関連する情報が Text に含まれていない場合、回答できないことを返答してください。

A:
'''

# The de-serialization relies loading a pickle file. Pickle files are generated same system and stored restricetd s3 bucket.
def load_local_to_faiss():
    VECTORSTORE = FAISS.load_local(VECTOR_PATH, embedding, allow_dangerous_deserialization=True)
    return VECTORSTORE

def gen_RetrievalQA_instance(VECTORSTORE, prompt_template):
    chain_type_kwargs = {"prompt": PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )}
    llm = ChatBedrock(model_id=GENERATION_MODELID,)
    QA = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=VECTORSTORE.as_retriever(),
        chain_type_kwargs=chain_type_kwargs,
        return_source_documents=True,
    )

    return QA


def init():
    load_vectordata()
    VECTORSTORE = load_local_to_faiss()
    QA = gen_RetrievalQA_instance(VECTORSTORE, prompt_template)
    return QA


# init 処理開始
qa = init()

def lambda_handler(event, context):
    question = event.get("question", "EC2とはなんですか？")
    answer = qa(question)

    references = [doc.metadata for doc in answer['source_documents']]
    result={"result": answer['result'], "references":references}
    
    print(result)
    return {
        'statusCode': 200,
        'body': str(json.dumps(result, ensure_ascii=False))
    }
    
if __name__ == '__main__':
    lambda_handler({}, {})

