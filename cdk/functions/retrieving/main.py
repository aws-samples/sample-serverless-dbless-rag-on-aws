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
    try:
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
    except Exception as e:
        logger.error(f"ベクトルデータのロード中にエラーが発生しました: {str(e)}")
        raise

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
    try:
        VECTORSTORE = FAISS.load_local(VECTOR_PATH, embedding, allow_dangerous_deserialization=True)
        return VECTORSTORE
    except Exception as e:
        logger.error(f"FAISSのロード中にエラーが発生しました: {str(e)}")
        raise

def gen_RetrievalQA_instance(VECTORSTORE, prompt_template):
    try:
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
    except Exception as e:
        logger.error(f"RetrievalQAインスタンスの生成中にエラーが発生しました: {str(e)}")
        raise


def init():
    try:
        load_vectordata()
        VECTORSTORE = load_local_to_faiss()
        QA = gen_RetrievalQA_instance(VECTORSTORE, prompt_template)
        return QA
    except Exception as e:
        logger.error(f"初期化中にエラーが発生しました: {str(e)}")
        raise


# init 処理開始
qa = init()

def lambda_handler(event, context):
    try:
        question = event.get("question", "EC2とはなんですか？")
        answer = qa(question)

        references = [doc.metadata for doc in answer['source_documents']]
        result = {"result": answer['result'], "references": references}
        
        logger.info(f"正常に処理が完了しました: {result}")
        return {
            'statusCode': 200,
            'body': json.dumps(result, ensure_ascii=False)
        }
    except Exception as e:
        error_message = str(e)
        logger.error(f"処理中にエラーが発生しました: {error_message}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': True,
                'message': f"エラーが発生しました: {error_message}"
            }, ensure_ascii=False)
        }
    
if __name__ == '__main__':
    lambda_handler({}, {})

