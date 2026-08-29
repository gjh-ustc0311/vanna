"""Bounded tabular result component with no export capability."""

from typing import Any, Dict, List, Optional

from pydantic import Field

from ....core.rich_component import ComponentType, RichComponent


class DataFrameComponent(RichComponent):
    type: ComponentType = ComponentType.DATAFRAME
    rows: List[Dict[str, Any]] = Field(default_factory=list, max_length=100)
    columns: List[str] = Field(default_factory=list)
    title: Optional[str] = None
    description: Optional[str] = None
    row_count: int = 0
    column_count: int = 0

    def __init__(self, **kwargs: Any) -> None:
        kwargs.setdefault("rows", [])
        kwargs.setdefault("columns", [])
        super().__init__(**kwargs)
        if not self.columns and self.rows:
            self.columns = list(self.rows[0])
        if "row_count" not in kwargs:
            self.row_count = len(self.rows)
        if "column_count" not in kwargs:
            self.column_count = len(self.columns)
