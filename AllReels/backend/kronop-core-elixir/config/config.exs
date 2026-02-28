import Config

# Configure your database
config :kronop_core_elixir, KronopCoreElixir.Repo,
  database: "kronop_core",
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  pool_size: 10,
  show_sensitive_data_on_failure: false

# Configure the endpoint
config :kronop_core_elixir, KronopCoreElixirWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixEndpoint,
  render_errors: [view: KronopCoreElixirWeb.ErrorView, accepts: ~w],
  pubsub_server: [Phoenix.PubSub, name: KronopCoreElixir.PubSub, adapter: Phoenix.PubSub.PGSQL],
  live_view: [signing_salt: "kronop_salt"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
