# coding: UTF-8
import json
import os
import boto3
import logging
import time
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 変数定義
RETRIEVE_FUNCTION = os.getenv("RETRIEVE_FUNCTION")
client = boto3.client('lambda')
MAX_RETRIES = 3  # 最大試行回数（30秒）

# 関数定義
def delete_function_versions(function_name):
    try:
        versions = client.list_versions_by_function(FunctionName=function_name)        
        for version in versions['Versions']:
            if version['Version'] != '$LATEST':
                client.delete_function(
                    FunctionName=function_name,
                    Qualifier=version['Version']
                )
    except Exception as e:
        print(f"An error occurred while deleting the version.: {str(e)}")

def create_new_version(function_name):
    try:
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        description = f"Version created at {current_time}"
        client.update_function_configuration(
            FunctionName=function_name,
            Description=description
        )

        # GetFunctionConfiguration を使用して status をチェック
        retries = 0
        while retries < MAX_RETRIES:
            response = client.get_function_configuration(FunctionName=function_name)
            status = response.get('LastUpdateStatus')
            if status == 'Success':
                break
            retries += 10
            time.sleep(10)  # 1秒待機

        if retries == MAX_RETRIES:
            raise Exception("Function configuration update timed out")

        # publish_version を実行
        response = client.publish_version(FunctionName=function_name)
        return response['Version']
    except Exception as e:
        print(f"An error occurred while publishing the version.: {str(e)}")
        return None

def lambda_handler(event, context):
    delete_function_versions(RETRIEVE_FUNCTION)
    new_version = create_new_version(RETRIEVE_FUNCTION)
    
    if new_version:
        result = f"New version is published: {RETRIEVE_FUNCTION}:{new_version}"
        logger.info(result)
        return {
            'statusCode': 200,
            'body': json.dumps(result, ensure_ascii=False)
        }
    else:
        error_message = "Failed to publish new version"
        logger.error(error_message)
        return {
            'statusCode': 500,
            'body': json.dumps(error_message, ensure_ascii=False)
        }

if __name__ == '__main__':
    lambda_handler({}, {})
