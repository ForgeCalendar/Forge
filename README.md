# Forge

Forge is being rebuilt in Rust. The current repository contains the architecture proposal only; product behavior and UI design are still to be decided.

Start with [the architecture document](docs/ARCHITECTURE.md). It records the current boundaries, their dependency direction, the shared client contract, and the questions to settle before implementation.

The [development environment](docs/DEVELOPMENT.md) uses devenv and direnv for Rust, SQLite, PostgreSQL, and Graphify.

Graphify indexes the design documents and, later, the Rust workspace. The [Graphify workflow](docs/GRAPHIFY.md) explains how to build and query that graph without treating generated output as the source of truth.
