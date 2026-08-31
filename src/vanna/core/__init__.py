"""
Core components of the Vanna Agents framework.

This package contains the fundamental abstractions and implementations
that form the foundation of the agent framework.
"""

# Core domains - re-export from new structure
from .tool import T, Tool, ToolCall, ToolContext, ToolResult, ToolSchema
from .llm import LlmMessage, LlmRequest, LlmResponse, LlmService, LlmStreamChunk
from .storage import Conversation, ConversationStore, Message
from .user import User, UserService
from .agent import Agent, AgentConfig
from .system_prompt import DefaultSystemPromptBuilder, SystemPromptBuilder
from .lifecycle import LifecycleHook
from .middleware import LlmMiddleware
from .workflow import WorkflowHandler, WorkflowResult, DefaultWorkflowHandler
from .recovery import ErrorRecoveryStrategy, RecoveryAction, RecoveryActionType
from .enricher import ToolContextEnricher
from .enhancer import LlmContextEnhancer, DefaultLlmContextEnhancer
from .filter import ConversationFilter
from .observability import ObservabilityProvider, Span, Metric
from .audit import (
    AuditLogger,
    AuditEvent,
    AuditEventType,
    ToolAccessCheckEvent,
    ToolInvocationEvent,
    ToolResultEvent,
    AiResponseEvent,
)

# Components
from ..components import (
    Component,
    DataFrameComponent,
    LinkComponent,
    TextComponent,
)

# Exceptions
from .errors import (
    AgentError,
    ConversationNotFoundError,
    LlmServiceError,
    PermissionError,
    ToolExecutionError,
    ToolNotFoundError,
    ValidationError,
)

# Core implementations
from .registry import ToolRegistry

# Evaluation framework
from .evaluation import (
    Evaluator,
    TestCase,
    ExpectedOutcome,
    AgentResult,
    EvaluationResult,
    TestCaseResult,
    AgentVariant,
    EvaluationRunner,
    TrajectoryEvaluator,
    OutputEvaluator,
    LLMAsJudgeEvaluator,
    EfficiencyEvaluator,
    EvaluationReport,
    ComparisonReport,
    EvaluationDataset,
)

__all__ = [
    # Models
    "User",
    "Message",
    "Conversation",
    "ToolCall",
    "ToolResult",
    "ToolContext",
    "ToolSchema",
    "LlmMessage",
    "LlmRequest",
    "LlmResponse",
    "LlmStreamChunk",
    "RecoveryAction",
    "RecoveryActionType",
    "Span",
    "Metric",
    # Interfaces
    "Tool",
    "Agent",
    "LlmService",
    "ConversationStore",
    "UserService",
    "SystemPromptBuilder",
    "LifecycleHook",
    "LlmMiddleware",
    "WorkflowHandler",
    "DefaultWorkflowHandler",
    "WorkflowResult",
    "ErrorRecoveryStrategy",
    "ToolContextEnricher",
    "LlmContextEnhancer",
    "DefaultLlmContextEnhancer",
    "ConversationFilter",
    "ObservabilityProvider",
    "AuditLogger",
    "T",
    # Audit
    "AuditEvent",
    "AuditEventType",
    "ToolAccessCheckEvent",
    "ToolInvocationEvent",
    "ToolResultEvent",
    "AiResponseEvent",
    # Components
    "Component",
    "DataFrameComponent",
    "LinkComponent",
    "TextComponent",
    # Core implementations
    "ToolRegistry",
    "Agent",
    "AgentConfig",
    "DefaultSystemPromptBuilder",
    # Evaluation
    "Evaluator",
    "TestCase",
    "ExpectedOutcome",
    "AgentResult",
    "EvaluationResult",
    "TestCaseResult",
    "AgentVariant",
    "EvaluationRunner",
    "TrajectoryEvaluator",
    "OutputEvaluator",
    "LLMAsJudgeEvaluator",
    "EfficiencyEvaluator",
    "EvaluationReport",
    "ComparisonReport",
    "EvaluationDataset",
    # Exceptions
    "AgentError",
    "ToolExecutionError",
    "ToolNotFoundError",
    "PermissionError",
    "ConversationNotFoundError",
    "LlmServiceError",
    "ValidationError",
]
