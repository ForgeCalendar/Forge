# Development environment

The repository uses [devenv](https://devenv.sh/) for the Rust toolchain, SQLite tools, a local PostgreSQL service, and Graphify. The checked-in `devenv.lock` pins Nix inputs once generated. [direnv](https://devenv.sh/integrations/direnv/) loads the environment when you enter the directory.

## Start

Install Nix, devenv, and direnv. Enable direnv's hook in your shell, then run:

```sh
direnv allow
```

Alternatively, use `devenv shell` without direnv. Entering the shell does not start PostgreSQL.

## Database development

SQLite needs no service; the SQLite CLI and development libraries are in the shell. Put local database files under `.devenv/` or another ignored path.

Start the local PostgreSQL service when you need to test its storage backend:

```sh
devenv up
```

It creates a `forge` database and listens on `127.0.0.1:55432`. Its state stays under `.devenv/`. Use `psql forge` from the devenv shell; the service config supplies the local PostgreSQL environment variables. Pass a SQLite or PostgreSQL URL to `Storage::connect`; the crate applies its embedded migrations on connection.

## Graphify

Run `graphify` inside the shell. The wrapper uses the pinned `graphifyy` package through uv. The first invocation downloads it into uv's cache. The project-scoped Codex integration is in `.codex/skills/graphify` and `AGENTS.md`; see [the Graphify workflow](GRAPHIFY.md).

Graphify can extract the Rust workspace's code structure locally without an API key. Document extraction needs a configured LLM backend or the Codex skill's extraction workflow.

The Cargo workspace starts with `crates/forge-storage`. Use `cargo fmt --all`, `cargo clippy --workspace --all-targets`, and `cargo test --workspace` from the devenv shell. The storage tests use SQLite by default; set `FORGE_TEST_POSTGRES_URL` to a PostgreSQL test database URL to run the same calendar contract against PostgreSQL.
