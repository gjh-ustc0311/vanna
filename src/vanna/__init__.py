"""XPD-only natural-language data assistant."""

__version__ = "3.0.0"

from .integrations.xpd import create_xpd_agent, load_xpd_profile

__all__ = ["create_xpd_agent", "load_xpd_profile"]
