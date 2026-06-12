"""
RAG 检索服务，供 interview_service 调用。
支持单Collection + domain元数据过滤的多岗位检索。
"""
from pathlib import Path
from typing import List, Optional

import chromadb
from sentence_transformers import SentenceTransformer

from ..config import Config
from ..logger import get_logger


class RAGService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.logger = get_logger(__name__)
        self.logger.info("RAGService 初始化：加载 Embedding 模型...")
        self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        client = chromadb.PersistentClient(path=Config.RAG_DB_DIR)
        self._collection = client.get_collection(Config.RAG_COLLECTION)
        self.logger.info(f"向量库已加载，共 {self._collection.count()} 条记录")

    def query(
        self,
        text: str,
        n_results: int = 5,
        domain: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[str]:
        """
        检索与 text 最相关的知识片段。

        Args:
            text:      查询文本（用户回答或当前话题）
            n_results: 返回条数
            domain:    岗位过滤，如 "java_backend" / "web_frontend"
            category:  分类过滤，如 "面试题库" / "核心知识" 等

        Returns:
            List[str]，每条是可直接拼入 prompt 的知识片段
        """
        embedding = self._model.encode([text])[0].tolist()

        where_conditions = {}
        if domain:
            where_conditions["domain"] = domain
        if category:
            where_conditions["category"] = category

        where = where_conditions if where_conditions else None

        result = self._collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        docs = result["documents"][0]
        distances = result["distances"][0]

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
