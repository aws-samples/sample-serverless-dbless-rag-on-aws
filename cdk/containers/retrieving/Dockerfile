#checkov:skip=CKV_DOCKER_2: This image is used for event-driven lambda container
#checkov:skip=CKV_DOCKER_3: command is executed as the specific Lambda user
FROM public.ecr.aws/lambda/python:3.12


COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

COPY app.py ./

CMD [ "app.lambda_handler" ]