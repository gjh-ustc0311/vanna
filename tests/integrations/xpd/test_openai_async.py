import asyncio
from types import SimpleNamespace

import pytest

from vanna.core.llm import LlmMessage, LlmRequest
from vanna.core.user import User
from vanna.integrations.xpd.llm import XpdOpenAILlmService
from vanna.servers.fastapi import routes


class FakeAsyncStream:
    def __init__(self, events, gate):
        self.events = iter(events)
        self.gate = gate
        self.started = False
        self.closed = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.started:
            self.started = True
            await self.gate.wait()
        try:
            return next(self.events)
        except StopIteration as exc:
            raise StopAsyncIteration from exc

    async def close(self):
        self.closed = True


class FakeCompletions:
    def __init__(self, stream):
        self.stream = stream
        self.calls = []

    async def create(self, **payload):
        self.calls.append(payload)
        if payload["stream"]:
            return self.stream
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content="complete", tool_calls=None),
                    finish_reason="stop",
                )
            ],
            usage=None,
        )


def _event(*, content=None, tool_calls=None, finish_reason=None):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                delta=SimpleNamespace(content=content, tool_calls=tool_calls),
                finish_reason=finish_reason,
            )
        ]
    )


def _tool_delta(*, call_id=None, name=None, arguments=None):
    return SimpleNamespace(
        index=0,
        id=call_id,
        function=SimpleNamespace(name=name, arguments=arguments),
    )


@pytest.mark.asyncio
async def test_xpd_openai_requests_are_async_and_preserve_streamed_tool_calls(
    monkeypatch,
):
    import openai

    gate = asyncio.Event()
    fake_stream = FakeAsyncStream(
        [
            _event(content="hello"),
            _event(
                tool_calls=[
                    _tool_delta(
                        call_id="call_1",
                        name="run_xpd_sql",
                        arguments='{"sql":"',
                    )
                ]
            ),
            _event(
                tool_calls=[
                    _tool_delta(arguments='SELECT 1"}'),
                ],
                finish_reason="tool_calls",
            ),
        ],
        gate,
    )
    completions = FakeCompletions(fake_stream)
    captured_client_kwargs = {}

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            captured_client_kwargs.update(kwargs)
            self.chat = SimpleNamespace(completions=completions)

    monkeypatch.setattr(openai, "AsyncOpenAI", FakeAsyncOpenAI)
    service = XpdOpenAILlmService(
        model="test-model",
        api_key="test-key",
        base_url="https://model.example.test/v1",
        timeout=120,
        max_retries=0,
    )
    request = LlmRequest(
        messages=[LlmMessage(role="user", content="question")],
        user=User(id="123"),
        stream=True,
    )

    response = await service.send_request(request)
    assert response.content == "complete"

    heartbeat_stream = routes._iterate_with_heartbeat(
        service.stream_request(request),
        interval_seconds=0.01,
    )
    assert await asyncio.wait_for(heartbeat_stream.__anext__(), timeout=0.1) is None

    gate.set()
    chunks = [chunk async for chunk in heartbeat_stream if chunk is not None]

    assert captured_client_kwargs == {
        "api_key": "test-key",
        "base_url": "https://model.example.test/v1",
        "timeout": 120,
        "max_retries": 0,
    }
    assert [call["stream"] for call in completions.calls] == [False, True]
    assert completions.calls[1]["temperature"] == 0
    assert chunks[0].content == "hello"
    assert chunks[-1].finish_reason == "tool_calls"
    assert chunks[-1].tool_calls is not None
    assert chunks[-1].tool_calls[0].id == "call_1"
    assert chunks[-1].tool_calls[0].name == "run_xpd_sql"
    assert chunks[-1].tool_calls[0].arguments == {"sql": "SELECT 1"}
    assert fake_stream.closed is True


@pytest.mark.asyncio
async def test_xpd_openai_stream_closes_when_heartbeat_consumer_stops(monkeypatch):
    import openai

    gate = asyncio.Event()
    fake_stream = FakeAsyncStream([], gate)
    completions = FakeCompletions(fake_stream)

    class FakeAsyncOpenAI:
        def __init__(self, **_kwargs):
            self.chat = SimpleNamespace(completions=completions)

    monkeypatch.setattr(openai, "AsyncOpenAI", FakeAsyncOpenAI)
    service = XpdOpenAILlmService(model="test-model", api_key="test-key")
    request = LlmRequest(
        messages=[LlmMessage(role="user", content="question")],
        user=User(id="123"),
        stream=True,
    )
    heartbeat_stream = routes._iterate_with_heartbeat(
        service.stream_request(request),
        interval_seconds=0.01,
    )
    assert await asyncio.wait_for(heartbeat_stream.__anext__(), timeout=0.1) is None

    await heartbeat_stream.aclose()

    assert fake_stream.closed is True
