"""Small UI-state messages understood by the bundled XPD client."""

from typing import Any, Optional

from ....core.rich_component import ComponentType, RichComponent


class StatusBarUpdateComponent(RichComponent):
    type: ComponentType = ComponentType.STATUS_BAR_UPDATE
    status: str
    message: str
    detail: Optional[str] = None

    def __init__(self, **kwargs: Any) -> None:
        kwargs.setdefault("id", "xpd-status-bar")
        super().__init__(**kwargs)


class ChatInputUpdateComponent(RichComponent):
    type: ComponentType = ComponentType.CHAT_INPUT_UPDATE
    placeholder: Optional[str] = None
    disabled: Optional[bool] = None

    def __init__(self, **kwargs: Any) -> None:
        kwargs.setdefault("id", "xpd-chat-input")
        super().__init__(**kwargs)
