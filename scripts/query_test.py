import argparse
import os
from pathlib import Path

from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


DEFAULT_DB_DIR = Path(__file__).resolve().parent.parent / "db"
DEFAULT_COLLECTION = "interview_knowledge"
DEFAULT_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query interview knowledge from Chroma.")
    parser.add_argument("--db-dir", default=str(DEFAULT_DB_DIR), help="Chroma persistence directory.")
    parser.add_argument("--collection-name", default=DEFAULT_COLLECTION, help="Chroma collection name.")
    parser.add_argument(
        "--embedding-model",
        default=DEFAULT_MODEL,
        help="Embedding model name or local path.",
    )
    parser.add_argument(
        "--local-model-only",
        action="store_true",
        help="Only load embedding model from local files.",
    )
    parser.add_argument("--query", required=True, help="User query.")
    parser.add_argument("--role", default="java_backend", help="Job role filter.")
    parser.add_argument("--topic", default="", help="Optional topic filter such as jvm or mysql.")
    parser.add_argument("--k", type=int, default=3, help="Top K results.")
    return parser.parse_args()


def resolve_embeddings(model_name_or_path: str, local_only: bool) -> HuggingFaceEmbeddings:
    model_path = Path(model_name_or_path)
    model_kwargs = {"local_files_only": local_only or model_path.exists()}
    return HuggingFaceEmbeddings(
        model_name=str(model_path if model_path.exists() else model_name_or_path),
        model_kwargs=model_kwargs,
        encode_kwargs={"normalize_embeddings": True},
    )


def build_filter(role: str, topic: str) -> dict:
    search_filter = {"job_role": role}
    if topic:
        search_filter["topic"] = topic
    return search_filter


def main() -> None:
    args = parse_args()
    embeddings = resolve_embeddings(args.embedding_model, args.local_model_only)
    db = Chroma(
        persist_directory=str(Path(args.db_dir).resolve()),
        embedding_function=embeddings,
        collection_name=args.collection_name,
    )

    results = db.similarity_search(
        args.query,
        k=args.k,
        filter=build_filter(args.role, args.topic),
    )

    print(f"\n--- Retrieval results for role={args.role}, topic={args.topic or 'ALL'} ---")
    for index, result in enumerate(results, start=1):
        meta = result.metadata
        question = meta.get("question") or meta.get("title")
        print(
            f"[{index}] title={meta.get('title')} | topic={meta.get('topic')} | "
            f"type={meta.get('question_type')} | difficulty={meta.get('difficulty')} | "
            f"section={meta.get('section')} | source={meta.get('source')}"
        )
        if question:
            print(f"question={question}")
        print(result.page_content[:240].replace("\n", " "))
        print()


if __name__ == "__main__":
    main()
