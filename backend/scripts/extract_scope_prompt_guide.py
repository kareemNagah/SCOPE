from __future__ import annotations

import argparse
import base64
import re
from pathlib import Path

import fitz


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to the source PDF")
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parents[1] / "app" / "agents" / "resources" / "scope_prompt_guide.md"),
        help="Path to the generated Markdown file",
    )
    return parser.parse_args()


def clean_text(text: str) -> str:
    text = text.replace("\u0000", "")
    text = re.sub(r"(?<=\w)-\n(?=\w)", "", text)
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def readability_score(text: str) -> float:
    letters = sum(ch.isalpha() for ch in text)
    words = re.findall(r"[A-Za-z]{3,}", text)
    if not text or not words:
        return 0.0
    return (letters / max(len(text), 1)) * min(len(words) / 500, 1.0)


def extract_with_pymupdf(pdf_path: Path) -> str:
    doc = fitz.open(pdf_path)
    pages: list[str] = []
    for index, page in enumerate(doc):
        page_text = clean_text(page.get_text("text"))
        if not page_text:
            continue
        pages.append(f"## Page {index + 1}\n\n{page_text}")
    return "# SCOPE Prompt Guide\n\n" + "\n\n".join(pages).strip() + "\n"


async def transcribe_pages_with_openrouter(pdf_path: Path) -> str:
    from app.agents.model_factory import openrouter_chat_completion
    from app.core.config import get_settings

    settings = get_settings()
    doc = fitz.open(pdf_path)
    pages: list[str] = []
    for index, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        png_bytes = pix.tobytes("png")
        image_data = base64.b64encode(png_bytes).decode("ascii")
        message = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Transcribe this PDF page into readable markdown. Preserve headings, numbered sections, and JSON blocks.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_data}"},
                    },
                ],
            }
        ]
        response = await openrouter_chat_completion(
            messages=message,
            model=settings.scope_multimodal_model,
            max_tokens=4000,
        )
        page_text = response["choices"][0]["message"]["content"].strip()
        pages.append(f"## Page {index + 1}\n\n{page_text}")
    return "# SCOPE Prompt Guide\n\n" + "\n\n".join(pages).strip() + "\n"


async def main() -> None:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    markdown = extract_with_pymupdf(input_path)
    if readability_score(markdown) < 0.35:
        markdown = await transcribe_pages_with_openrouter(input_path)

    output_path.write_text(markdown, encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
