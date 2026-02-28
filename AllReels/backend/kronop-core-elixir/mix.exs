defmodule KronopCoreElixir.MixProject do
  use Mix.Project

  def project do
    [
      app: :kronop_core_elixir,
      version: "1.0.0",
      elixir: "~> 1.14",
      elixirc_paths: ["lib"],
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Configuration
  def application do
    [
      mod: {KronopCoreElixir.Application, []},
      extra_applications: [:logger, :runtime_tools],
      start_permanent: Mix.env() == :prod,
    ]
  end

  # Dependencies
  defp deps do
    [
      # Phoenix Channels for real-time communication
      {:phoenix, "~> 1.7.7"},
      {:phoenix_pubsub, "~> 2.1.1"},
      {:phoenix_ecto, "~> 4.4.0"},
      {:ecto_sql, "~> 3.10"},
      {:postgrex, ">= 0.0.0"},
      
      # ProtoBuf for high-performance data serialization
      {:protobuf, "~> 0.12.0"},
      {:exprotobuf, "~> 0.11.0"},
      
      # JSON and XML
      {:jason, "~> 1.4"},
      {:poison, "~> 5.0"},
      
      # HTTP and WebSockets
      {:cowboy, "~> 2.9"},
      {:plug_cowboy, "~> 2.5"},
      {:websockex, "~> 0.4.3"},
      
      # Concurrency and Performance
      {:gen_stage, "~> 1.1"},
      {:poolboy, "~> 1.5"},
      {:nimble_pool, "~> 1.0"},
      
      # Caching
      {:con_cache, "~> 2.1"},
      {:redix, "~> 1.1"},
      
      # Metrics and Monitoring
      {:telemetry_metrics, "~> 0.6"},
      {:prometheus_ex, "~> 3.0"},
      
      # Logging
      {:logger, "~> 1.1"},
      {:timber, "~> 3.1"},
      
      # Utilities
      {:uuid, "~> 1.1"},
      {:timex, "~> 3.7"},
      {:decimal, "~> 2.0"},
      
      # Development tools
      {:ex_doc, "~> 0.27", only: :dev, runtime: false},
      {:credo, "~> 1.6", only: [:dev, :test]},
      {:dialyxir, "~> 1.4", only: [:dev, :test]},
    ]
  end
end
