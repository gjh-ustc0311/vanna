# Profile configuration

This directory contains `app-local.yaml`, `app-dev.yaml`, and `app-prod.yaml`. These tracked
files are the project's explicit credential-storage exception and may contain real profile values.
Restrict repository, build, and file access; never print their credentials or copy values between
profiles. The environment owner must complete and validate the selected profile before it can start
or be built into an image. `history` contains only its enable switch and reuses that profile's
`database` connection.

The authoritative field contract and deployment rules are documented in
[`docs/archs/deployment.md`](../docs/archs/deployment.md). Validate a completed file without
starting the service:

```bash
xpd-report-agent config-check local
xpd-report-agent config-check dev
xpd-report-agent config-check prod
```

Empty required fields intentionally fail `config-check`; never weaken validation to make an
incomplete profile start. Prefer mode `0600` on POSIX, and treat committed historical values as
recoverable until revoked.

Profiles use `schema_version: 4` and require complete `prometheus` and `oss_access` blocks. Local
requires `oss_presign` with a fixed 86,400-second URL TTL and a disabled loopback exporter. Dev and
prod require `main_cdn` with their exact internal Main service origin, the allowed CDN host, bounded
timeouts and attempts, and an enabled `0.0.0.0:19000/monitor/prometheus` exporter. Main CDN profiles
must not contain a token TTL. Older profile schemas are not loaded through a compatibility fallback.
History connection fields such as
`history.host`, `history.port`, `history.name`, `history.username`, and `history.password` are not
accepted.
