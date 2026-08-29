"""Stable, sanitized errors exposed by the XPD integration."""


class XpdError(Exception):
    """Base class for errors that are safe to surface to a local operator."""

    code = "xpd_error"
    public_message = "XPD operation failed."

    def __init__(self, detail: str = "") -> None:
        self.detail = detail
        message = self.public_message if not detail else f"{self.public_message} {detail}"
        super().__init__(message)


class XpdConfigError(XpdError):
    code = "xpd_config_invalid"
    public_message = "XPD configuration is invalid."


class XpdSchemaError(XpdError):
    code = "xpd_schema_unavailable"
    public_message = "XPD schema preflight failed."


class XpdSqlRejected(XpdError):
    code = "xpd_sql_rejected"
    public_message = "SQL was rejected by the XPD read-only policy."


class XpdQueryTimeout(XpdError):
    code = "xpd_query_timeout"
    public_message = "XPD query timed out."


class XpdDatabaseUnavailable(XpdError):
    code = "xpd_database_unavailable"
    public_message = "XPD database is unavailable."


class XpdQueryExecutionError(XpdError):
    code = "xpd_query_failed"
    public_message = "XPD query could not be completed."
