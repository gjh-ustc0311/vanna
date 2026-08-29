"""Plain rich-text message for the bundled XPD client."""

from ...core.rich_component import ComponentType, RichComponent


class RichTextComponent(RichComponent):
    type: ComponentType = ComponentType.TEXT
    content: str
