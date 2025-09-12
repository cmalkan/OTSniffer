# imports python 3.11-slim 
# Slim means from a debian image base
# 
#
FROM python:3.11-slim

# Sets a working directory
WORKDIR /app

COPY requirements.txt .


RUN pip install --no-cache-dir -r requirements.txt

COPY ./dashboard.py /app/


EXPOSE 8501

CMD ["streamlit", "run", "/app/dashboard.py", "--server.address=0.0.0.0"]
