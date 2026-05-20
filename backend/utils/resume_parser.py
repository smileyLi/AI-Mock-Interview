"""从 PDF / Word(.docx) 字节中提取纯文本。"""
from __future__ import annotations

import io
import re
from pathlib import Path


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf_text(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        parts: list[str] = []
        has_text = False
        
        for i, page in enumerate(reader.pages):
            try:
                t = page.extract_text() or ""
            except Exception as e:
                raise ValueError(f"PDF第{i+1}页解析失败: {str(e)}")
            
            if t.strip():
                parts.append(t)
                has_text = True
        
        if not has_text:
            raise ValueError(
                "PDF中未提取到可识别的文字，可能原因：\n"
                "1. 该PDF为扫描件（图片转换），需OCR识别\n"
                "2. PDF被加密或受保护\n"
                "3. PDF格式特殊，建议另存为.docx后上传"
            )
        
        return normalize_text("\n".join(parts))
        
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"PDF解析失败: {str(e)}")


def extract_docx_text(data: bytes) -> str:
    from docx import Document

    try:
        doc = Document(io.BytesIO(data))
        parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
        
        if not parts:
            raise ValueError("Word文档中未提取到段落文字，可能为空文档或内容在表格/图片中")
        
        return normalize_text("\n".join(parts))
        
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Word文档解析失败: {str(e)}")


def extract_text_from_upload(filename: str, data: bytes) -> str:
    if not data:
        raise ValueError("文件为空")

    suffix = Path(filename or "").suffix.lower()
    if suffix == ".pdf":
        return extract_pdf_text(data)
    if suffix == ".docx":
        return extract_docx_text(data)
    if suffix == ".doc":
        raise ValueError("暂不支持旧版 .doc，请将简历另存为 .docx 或导出为 PDF 后再上传")

    raise ValueError("仅支持 PDF 或 Word（.docx）")
