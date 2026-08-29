"""Tool interface for the XPD-only runtime."""

from abc import ABC, abstractmethod
from typing import Any, Generic, Type, TypeVar, cast

from .models import ToolContext, ToolResult, ToolSchema

T = TypeVar("T")


class Tool(ABC, Generic[T]):
    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def description(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def get_args_schema(self) -> Type[T]:
        raise NotImplementedError

    @abstractmethod
    async def execute(self, context: ToolContext, args: T) -> ToolResult:
        raise NotImplementedError

    def get_schema(self) -> ToolSchema:
        args_model = self.get_args_schema()
        parameters = (
            cast(Any, args_model).model_json_schema()
            if hasattr(args_model, "model_json_schema")
            else {}
        )
        return ToolSchema(
            name=self.name,
            description=self.description,
            parameters=parameters,
        )
