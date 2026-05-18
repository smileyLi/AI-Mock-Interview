建议使用python = 3.10

1.依赖下载
cd backend
pip install -r requirements.txt

2.模型下载
访问https://huggingface.co/BAAI/bge-small-zh-v1.5，进入Files and versions
将一个文件夹以及10个文件
1_Pooling

config.json
config_sentence_transformers.json
model.safetensors
modules.json
pytorch_model.bin
sentence_bert_config.json
special_tokens_map.json
tokenizer.json
tokenizer_config.json
vocab.txt
全部下载，并存放到根目录的models/bge-small-zh-v1.5

随后在根目录运行 python -m backend.rag.ingest 以加载RAG模型

3.运行项目
在根目录运行 python run.py 即可