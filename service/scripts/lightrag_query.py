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


def write_response(payload: dict) -> None:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(data)
    sys.stdout.flush()


async def build_llm_func():
    from lightrag.llm.openai import openai_complete_if_cache
    from lightrag.types import GPTKeywordExtractionFormat

    async def llm_func(prompt, system_prompt=None, history_messages=None, keyword_extraction=False, **kwargs):
        if keyword_extraction:
            kwargs["response_format"] = GPTKeywordExtractionFormat
        return await openai_complete_if_cache(
            os.getenv("LLM_MODEL", "gpt-4o-mini"),
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages or [],
            base_url=os.getenv("LLM_BINDING_HOST"),
            api_key=os.getenv("LLM_BINDING_API_KEY"),
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
            model=os.getenv("EMBEDDING_MODEL"),
            base_url=os.getenv("EMBEDDING_BINDING_HOST"),
            api_key=os.getenv("EMBEDDING_BINDING_API_KEY"),
            embedding_dim=embedding_dim,
        ),
    )


async def main():
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
