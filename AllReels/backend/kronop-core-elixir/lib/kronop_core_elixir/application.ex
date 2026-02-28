defmodule KronopCoreElixir.Application do
  @moduledoc """
  Kronop Core Elixir Application
  
  Real-time Reels System with Phoenix Channels and ProtoBuf
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start the Ecto repository
      KronopCoreElixir.Repo,
      # Start the Telemetry supervisor
      KronopCoreElixir.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: KronopCoreElixir.PubSub},
      # Start the Endpoint supervisor
      KronopCoreElixirWeb.Endpoint,
      # Start the real-time system
      KronopCoreElixir.RealTime.System,
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: KronopCoreElixir.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
