"""A conservative MySQL SELECT policy for the XPD three-table contract."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Optional, Set, Tuple

from .contract import SchemaEvidence
from .errors import XpdSqlRejected


_EXECUTABLE_COMMENT = re.compile(r"/\s*\*[!+]", re.IGNORECASE)
_DANGEROUS_FUNCTIONS = {
    "benchmark",
    "get_lock",
    "is_free_lock",
    "is_used_lock",
    "load_file",
    "master_pos_wait",
    "name_const",
    "release_all_locks",
    "release_lock",
    "sleep",
    "sys_exec",
    "sys_eval",
}


@dataclass(frozen=True)
class PreparedSql:
    sql: str
    used_tables: Tuple[str, ...]


class XpdSqlGuard:
    """Parse and validate SQL against live schema evidence before execution."""

    def __init__(self, evidence: SchemaEvidence) -> None:
        self.evidence = evidence

    def prepare(self, sql: str) -> PreparedSql:
        try:
            import sqlglot
            from sqlglot import exp
            from sqlglot.optimizer.scope import traverse_scope
        except ImportError as exc:  # pragma: no cover - dependency installation fault
            raise XpdSqlRejected("sqlglot is required for SQL validation.") from exc

        if not isinstance(sql, str) or not sql.strip():
            raise XpdSqlRejected("A non-empty SQL string is required.")
        if len(sql) > 100_000:
            raise XpdSqlRejected("SQL exceeds the 100000-character policy limit.")
        if _EXECUTABLE_COMMENT.search(sql):
            raise XpdSqlRejected(
                "Optimizer hints and executable comments are forbidden."
            )

        try:
            statements = [
                statement
                for statement in sqlglot.parse(sql, read="mysql")
                if statement is not None
            ]
        except Exception as exc:
            raise XpdSqlRejected("SQL could not be parsed as MySQL.") from exc
        if len(statements) != 1:
            raise XpdSqlRejected("Exactly one SQL statement is required.")

        root = statements[0]
        if not isinstance(root, exp.Select):
            raise XpdSqlRejected(
                "Only a SELECT statement, optionally with CTEs, is allowed."
            )

        forbidden_class_names = {
            "Alter",
            "Analyze",
            "Attach",
            "Cache",
            "Command",
            "Commit",
            "Copy",
            "Create",
            "Delete",
            "Detach",
            "Drop",
            "Execute",
            "Grant",
            "Insert",
            "Into",
            "LoadData",
            "Lock",
            "Merge",
            "Pragma",
            "Rollback",
            "Set",
            "Show",
            "Transaction",
            "TruncateTable",
            "Uncache",
            "Update",
            "Use",
        }
        for node in root.walk():
            if type(node).__name__ in forbidden_class_names:
                raise XpdSqlRejected(f"Forbidden SQL construct: {type(node).__name__}.")

        for star in root.find_all(exp.Star):
            if not isinstance(star.parent, exp.Count):
                raise XpdSqlRejected(
                    "Wildcard projections are forbidden; name columns explicitly."
                )

        variable_types = tuple(
            candidate
            for candidate in (
                getattr(exp, "Parameter", None),
                getattr(exp, "SessionParameter", None),
                getattr(exp, "UserVariable", None),
            )
            if candidate is not None
        )
        if variable_types and any(
            isinstance(node, variable_types) for node in root.walk()
        ):
            raise XpdSqlRejected("SQL variables and parameters are forbidden.")

        for function in root.find_all(exp.Func):
            function_name = self._function_name(function)
            if function_name in _DANGEROUS_FUNCTIONS:
                raise XpdSqlRejected(f"Function {function_name} is forbidden.")

        scopes = list(traverse_scope(root))
        used_tables: Set[str] = set()
        for scope in scopes:
            used_tables.update(self._validate_sources(scope))
            self._validate_columns(scope)
            self._validate_joins(scope)

        if not used_tables:
            raise XpdSqlRejected("A query must read at least one approved XPD table.")

        normalized = root.sql(dialect="mysql", pretty=False, comments=False).strip()
        return PreparedSql(sql=normalized, used_tables=tuple(sorted(used_tables)))

    @staticmethod
    def _function_name(function: Any) -> str:
        try:
            name = function.sql_name()
        except Exception:
            name = getattr(function, "name", type(function).__name__)
        if str(name).upper() == "ANONYMOUS" and getattr(function, "name", None):
            name = function.name
        return str(name).lower()

    def _validate_sources(self, scope: Any) -> Set[str]:
        try:
            from sqlglot import exp
        except ImportError:  # pragma: no cover
            return set()

        used: Set[str] = set()
        physical_sources = 0
        for _alias, source in scope.sources.items():
            if not isinstance(source, exp.Table):
                continue
            physical_sources += 1
            if source.catalog:
                raise XpdSqlRejected("Catalog-qualified table names are forbidden.")
            if source.db and source.db != self.evidence.database:
                raise XpdSqlRejected("Cross-database table access is forbidden.")
            if source.name not in self.evidence.tables:
                raise XpdSqlRejected(f"Unknown or unapproved table: {source.name}.")
            if source.args.get("pivots") or not isinstance(source.this, exp.Identifier):
                raise XpdSqlRejected(
                    "Table functions and transformed table sources are forbidden."
                )
            used.add(source.name)

        joins = list(scope.expression.args.get("joins") or [])
        if physical_sources > 1 and not joins:
            raise XpdSqlRejected("Multiple tables require an explicit validated JOIN.")
        return used

    def _source_columns(self, source: Any) -> Set[str]:
        try:
            from sqlglot import exp
            from sqlglot.optimizer.scope import Scope
        except ImportError:  # pragma: no cover
            return set()

        if isinstance(source, exp.Table):
            table = self.evidence.tables.get(source.name)
            return table.column_names if table else set()
        if isinstance(source, Scope):
            return {
                str(name)
                for name in getattr(source.expression, "named_selects", [])
                if name
            }
        return set()

    @staticmethod
    def _find_qualified_source(scope: Any, qualifier: str) -> Optional[Any]:
        current = scope
        while current is not None:
            if qualifier in current.sources:
                return current.sources[qualifier]
            current = getattr(current, "parent", None)
        return None

    def _validate_columns(self, scope: Any) -> None:
        try:
            from sqlglot import exp
        except ImportError:  # pragma: no cover
            return

        explicit_aliases = {
            projection.alias
            for projection in getattr(scope.expression, "expressions", [])
            if isinstance(projection, exp.Alias) and projection.alias
        }
        for column in scope.columns:
            if isinstance(column.this, exp.Star):
                continue
            name = column.name
            if column.table:
                source = self._find_qualified_source(scope, column.table)
                if source is None:
                    raise XpdSqlRejected(f"Unknown column qualifier: {column.table}.")
                if name not in self._source_columns(source):
                    raise XpdSqlRejected(
                        f"Unknown column {column.table}.{name} in schema evidence."
                    )
                continue

            candidates = [
                alias
                for alias, source in scope.sources.items()
                if name in self._source_columns(source)
            ]
            if not candidates and name in explicit_aliases:
                continue
            if not candidates:
                raise XpdSqlRejected(f"Unknown column: {name}.")
            if len(candidates) > 1:
                raise XpdSqlRejected(
                    f"Ambiguous unqualified column: {name}; "
                    "qualify it with a table alias."
                )

    def _validate_joins(self, scope: Any) -> None:
        try:
            from sqlglot import exp
            from sqlglot.optimizer.scope import Scope
        except ImportError:  # pragma: no cover
            return

        joins = list(scope.expression.args.get("joins") or [])
        for join in joins:
            if (
                str(join.args.get("kind") or "").upper() == "CROSS"
                or join.args.get("on") is None
            ):
                raise XpdSqlRejected("CROSS and implicit joins are forbidden.")

            joined_alias = join.this.alias_or_name
            joined_source = scope.sources.get(joined_alias)
            if joined_source is None:
                raise XpdSqlRejected("JOIN source could not be resolved.")
            if isinstance(joined_source, Scope):
                raise XpdSqlRejected(
                    "Joining a derived table is outside the XPD v1 join contract."
                )
            if not isinstance(joined_source, exp.Table):
                raise XpdSqlRejected("Only approved tables may be joined.")

            equality_pairs: Set[Tuple[str, str, str, str]] = set()
            join_condition = join.args["on"]
            for equality in join_condition.find_all(exp.EQ):
                if self._relationship_equality_is_optional(
                    equality, join_condition, exp
                ):
                    continue
                left = equality.this
                right = equality.expression
                if not isinstance(left, exp.Column) or not isinstance(
                    right, exp.Column
                ):
                    continue
                if not left.table or not right.table:
                    continue
                left_source = self._find_qualified_source(scope, left.table)
                right_source = self._find_qualified_source(scope, right.table)
                if not isinstance(left_source, exp.Table) or not isinstance(
                    right_source, exp.Table
                ):
                    continue
                equality_pairs.add(
                    (left_source.name, left.name, right_source.name, right.name)
                )

            if not self._matches_relationship(equality_pairs, joined_source.name):
                raise XpdSqlRejected(
                    "JOIN does not match a physical foreign key or the approved "
                    "logical relationship."
                )

    @staticmethod
    def _relationship_equality_is_optional(
        equality: Any, join_condition: Any, exp: Any
    ) -> bool:
        """Reject relationship keys weakened by OR/NOT before the ON root."""

        current = equality.parent
        while current is not None and current is not join_condition:
            if isinstance(current, (exp.Or, exp.Not)):
                return True
            current = current.parent
        return isinstance(join_condition, (exp.Or, exp.Not))

    def _matches_relationship(
        self,
        equality_pairs: Iterable[Tuple[str, str, str, str]],
        joined_table: str,
    ) -> bool:
        pairs = set(equality_pairs)
        for relationship in self.evidence.relationships:
            if joined_table not in {relationship.left_table, relationship.right_table}:
                continue
            forward = {
                (
                    relationship.left_table,
                    left_column,
                    relationship.right_table,
                    right_column,
                )
                for left_column, right_column in zip(
                    relationship.left_columns,
                    relationship.right_columns,
                    strict=False,
                )
            }
            reverse = {
                (right_table, right_col, left_table, left_col)
                for left_table, left_col, right_table, right_col in forward
            }
            if forward.issubset(pairs) or reverse.issubset(pairs):
                return True
        return False
