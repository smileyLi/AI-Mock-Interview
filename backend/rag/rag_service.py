"""
RAG 检索服务，供 interview_service 调用。
"""
from pathlib import Path
from typing import List

import chromadb
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent.parent
CHROMA_DIR = ROOT / "data" / "chroma_db"
COLLECTION_NAME = "knowledge_base"
EMBED_MODEL = str(ROOT / "models" / "bge-small-zh-v1.5")


class RAGService:
    _instance = None

    def __new__(cls):
        # 单例：模型和向量库只加载一次
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        print("RAGService 初始化：加载 Embedding 模型...")
        self._model = SentenceTransformer(EMBED_MODEL)
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self._collection = client.get_collection(COLLECTION_NAME)
        print(f"向量库已加载，共 {self._collection.count()} 条记录")

    def query(self, text: str, n_results: int = 5, category: str = None) -> List[str]:
        """
        检索与 text 最相关的知识片段。

        Args:
            text:      查询文本（用户回答或当前话题）
            n_results: 返回条数
            category:  可选过滤，如 "面试题库" / "核心知识" 等

        Returns:
            List[str]，每条是可直接拼入 prompt 的知识片段
        """
        embedding = self._model.encode([text])[0].tolist()

        where = {"category": category} if category else None

        result = self._collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        docs = result["documents"][0]
        metas = result["metadatas"][0]
        distances = result["distances"][0]

        # 过滤掉相关性太低的结果（余弦距离 > 0.6 视为不相关）
        filtered = [
            doc for doc, dist in zip(docs, distances) if dist < 0.6
        ]

        return filtered

    def format_context(self, chunks: List[str]) -> str:
        """把检索到的 chunk 列表格式化为可注入 prompt 的字符串"""
        if not chunks:
            return ""
        parts = [f"[参考知识 {i+1}]\n{chunk}" for i, chunk in enumerate(chunks)]
        return "\n\n".join(parts)
