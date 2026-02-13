{ pkgs, lib, ... }:

let
  # Binaries from nixpkgs
  prisma = pkgs.prisma;
  engines = pkgs.prisma-engines_6;

  # Helper to get absolute paths to executables
  exe = pkg: lib.getExe pkg;

  # prisma-engines provides multiple executables; getExe can't pick among them,
  # so we reference their known paths under the package output.
  schemaEngine        = "${engines}/bin/schema-engine";
  migrationEngine     = "${engines}/bin/migration-engine";
  introspectionEngine = "${engines}/bin/introspection-engine";
  prismaFmt           = "${engines}/bin/prisma-fmt";

  # The query engine "library" is a .node file. Different nixpkgs revisions may
  # place it under /lib or /libexec. We export the common /lib path; if your
  # nixpkgs differs, run: `ls ${pkgs.prisma-engines}/lib` and adjust.
  queryEngineLib = "${engines}/lib/libquery_engine.node";
in
{
  # Core tooling you want in the dev shell
  packages = [
    pkgs.nodejs_22
    pkgs.sqlite
    prisma
    engines
  ];

  # Make sure Prisma CLI uses Nix-provided engines instead of trying to download
  env = {
    PRISMA_SCHEMA_ENGINE_BINARY        = schemaEngine;
    PRISMA_MIGRATION_ENGINE_BINARY     = migrationEngine;
    PRISMA_INTROSPECTION_ENGINE_BINARY = introspectionEngine;
    PRISMA_FMT_BINARY                  = prismaFmt;
    PRISMA_QUERY_ENGINE_LIBRARY        = queryEngineLib;

    # Optional: keep Prisma from trying to be clever about engine downloads
    PRISMA_CLI_QUERY_ENGINE_TYPE = "library";
  };

  # Convenience commands
  scripts = {
    "db:init".exec = ''
      # uses your existing npm script semantics, but works even if you run it directly
      export DATABASE_URL="file:./dev.db"
      ${exe prisma} migrate dev
    '';

    "db:reset".exec = ''
      export DATABASE_URL="file:./dev.db"
      ${exe prisma} migrate reset --force
    '';

    "db:studio".exec = ''
      export DATABASE_URL="file:./dev.db"
      ${exe prisma} studio
    '';
  };

  # Helpful sanity check when entering the shell
  enterShell = ''
    echo "Prisma engines:"
    echo "  schema:        $PRISMA_SCHEMA_ENGINE_BINARY"
    echo "  migration:     $PRISMA_MIGRATION_ENGINE_BINARY"
    echo "  introspection: $PRISMA_INTROSPECTION_ENGINE_BINARY"
    echo "  fmt:           $PRISMA_FMT_BINARY"
    echo "  query lib:     $PRISMA_QUERY_ENGINE_LIBRARY"
    if [ ! -e "$PRISMA_QUERY_ENGINE_LIBRARY" ]; then
      echo "NOTE: libquery_engine.node not found at:"
      echo "  $PRISMA_QUERY_ENGINE_LIBRARY"
      echo "Run: ls ${engines}/lib and update queryEngineLib in devenv.nix if needed."
    fi
  '';
}
