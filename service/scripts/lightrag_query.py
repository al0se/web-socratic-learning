import asyncio
import json
import os
import sys
from functools import partial


def read_request() -> dict:
    raw = sys.stdin.read()
    if not raw:
        raise ValueError("Empty LightRAG query request")
    return json.loads(raw)


def sanitize_text(value: str) -> str:
    return value.encode("utf-8", errors="replace").decode("utf-8")


def sanitize_payload(value):
    if isinstance(value, str):
        return sanitize_text(value)
    if isinstance(value, list):
        return [sanitize_payload(item) for item in value]
    if isinstance(value, dict):
        return {
            sanitize_payload(key) if isinstance(key, str) else key: sanitize_payload(item)
            for key, item in value.items()
        }
    return value


def install_safe_json_dumps() -> None:
    original_dumps = json.dumps

    def safe_dumps(*args, **kwargs):
        result = original_dumps(*args, **kwargs)
        if kwargs.get("ensure_ascii") is False and isinstance(result, str):
            return sanitize_text(result)
        return result

    json.dumps = safe_dumps


def get_env(*names: str, default=None):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def write_response(payload: dict) -> None:
    data = json.dumps(sanitize_payload(payload), ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(data)
    sys.stdout.flush()


async def build_llm_func():
    from lightrag.llm.openai import openai_complete_if_cache
    from lightrag.types import GPTKeywordExtractionFormat

    async def llm_func(prompt, system_prompt=None, history_messages=None, keyword_extraction=False, **kwargs):
        if keyword_extraction:
            kwargs["response_format"] = GPTKeywordExtractionFormat
        return await openai_complete_if_cache(
            get_env("LLM_MODEL", default="gpt-4o-mini"),
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages or [],
            base_url=get_env("LLM_BINDING_HOST", "OPENAI_API_BASE_URL"),
            api_key=get_env("LLM_BINDING_API_KEY", "OPENAI_API_KEY"),
            **kwargs,
        )

    return llm_func


def build_embedding_func():
    from lightrag.llm.openai import openai_embed
    from lightrag.utils import EmbeddingFunc

    embedding_dim = int(os.getenv("EMBEDDING_DIM", "3072"))
    max_token_size = int(os.getenv("EMBEDDING_TOKEN_LIMIT", "8192"))

    return EmbeddingFunc(
        embedding_dim=embedding_dim,
        max_token_size=max_token_size,
        func=partial(
            openai_embed.func,
            model=get_env("EMBEDDING_MODEL", default="text-embedding-3-large"),
            base_url=get_env("EMBEDDING_BINDING_HOST", "OPENAI_API_BASE_URL"),
            api_key=get_env("EMBEDDING_BINDING_API_KEY", "OPENAI_API_KEY"),
            embedding_dim=embedding_dim,
        ),
    )


async def main():
    install_safe_json_dumps()
    request = read_request()

    repo_dir = request["repoDir"]
    os.chdir(repo_dir)
    if repo_dir not in sys.path:
        sys.path.insert(0, repo_dir)

    from lightrag import LightRAG, QueryParam

    llm_func = await build_llm_func()
    embedding_func = build_embedding_func()

    rag = LightRAG(
      working_dir=request["workingDir"],
      workspace=request.get("workspace", ""),
      llm_model_func=llm_func,
      llm_model_name=os.getenv("LLM_MODEL", "gpt-4o-mini"),
      embedding_func=embedding_func,
    )

    try:
        await rag.initialize_storages()
        result = await rag.aquery_llm(
            request["query"],
            QueryParam(
                mode=request["mode"],
                only_need_prompt=True,
                top_k=request["topK"],
                chunk_top_k=request["chunkTopK"],
                max_entity_tokens=request["maxEntityTokens"],
                max_relation_tokens=request["maxRelationTokens"],
                max_total_tokens=request["maxTotalTokens"],
                enable_rerank=request["enableRerank"],
            ),
        )
        payload = {
            "status": result.get("status", "failure"),
            "message": result.get("message", ""),
            "prompt": ((result.get("llm_response") or {}).get("content") or ""),
            "data": result.get("data", {}),
            "metadata": result.get("metadata", {}),
        }
        write_response(payload)
    finally:
        await rag.finalize_storages()


if __name__ == "__main__":
    asyncio.run(main())
