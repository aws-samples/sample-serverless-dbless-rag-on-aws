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

    for obj in vectorbucket.objects.filter(Prefix=""):
        if obj.key.endswith('/'):
            continue
        file_path = VECTOR_PATH +"/"+ obj.key.replace("", "")
        print(file_path)
        vectorbucket.download_file(obj.key, file_path)


load_vectordata()
VECTORSTORE = FAISS.load_local(VECTOR_PATH, embedding, allow_dangerous_deserialization=True)

# プロンプトの定義
prompt_template = '''Human:
Text: {context}

Question: {question}

Question に記述された質問に対して、 Text で与えられた情報を使い、Question と同じ言語で文章量は短くしつつも多くの情報を回答してください。
Question に記述された質問に関連する情報が Text に含まれていない場合、回答できないことを返答してください。

A:
'''


chain_type_kwargs = {"prompt": PromptTemplate(
    template=prompt_template, input_variables=["context", "question"]
)}
llm = ChatBedrock(
    model_id=GENERATION_MODELID,
)
qa = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=VECTORSTORE.as_retriever(),
    chain_type_kwargs=chain_type_kwargs,
    return_source_documents=True,
)


def lambda_handler(event, context):
    logger.info('==== INVOKE HANDLER ====')
    question = event.get("question", "EC2とはなんですか？")
    answer = qa(question)
    logger.info('==== COMPLETE TASK ====')
    print(answer)

    references = [doc.metadata for doc in answer['source_documents']]
    result={"result": answer['result'], "references":references}
    
    return {
        'statusCode': 200,
        'body': str(json.dumps(result, ensure_ascii=False))
    }
    
if __name__ == '__main__':
    lambda_handler({}, {})
