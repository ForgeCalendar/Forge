# Graphify workflow

The Markdown design documents are the source of truth for decisions. Graphify is a generated index used to inspect connections, find affected components, and guide implementation.

1. Install the official `graphifyy` package, which provides the `graphify` command, following the [Graphify installation guide](https://graphiffy.com/docs/install).
2. Register its Codex integration for this project with `graphify codex install --project` if desired.
3. Build the graph from the repository root with Graphify's project workflow (`$graphify .` in Codex, or the headless CLI extraction command supported by the installed version). Graphify's headless CLI needs an LLM backend to extract Markdown; once Rust code exists, `graphify extract . --code-only` can index source code without one.
4. Query the graph before a cross-layer change. Check which contract types, adapters, server routes, and storage operations are connected. Update the graph after the change.
5. Review the generated graph against source files and these documents. A generated or inferred edge is evidence to check, not an architecture decision.

Keep generated `graphify-out/` local. Commit design documents and code, then regenerate the graph as needed.
