{ pkgs, ... }:
{
  languages.rust.enable = true;

  packages = with pkgs; [
    pkg-config
    postgresql
    python312
    sqlite
    uv
  ];

  services.postgres = {
    enable = true;
    initialDatabases = [ { name = "forge"; } ];
    listen_addresses = "127.0.0.1";
    port = 55432;
  };

  env.PGDATABASE = "forge";

  scripts.graphify = {
    exec = ''
      exec uvx --python ${pkgs.python312}/bin/python --from graphifyy==0.9.112 graphify "$@"
    '';
    description = "Run the pinned Graphify CLI";
  };
}
