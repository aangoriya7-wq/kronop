defmodule KronopCoreElixir.RealTime.System do
  @moduledoc """
  Real-time Reels System Supervisor
  
  Manages all real-time components including:
  - WebSocket connections
  - Real-time updates
  - User presence
  - Live interactions
  """
  
  use Supervisor
  
  alias KronopCoreElixir.RealTime.{ConnectionManager, PresenceTracker, LiveUpdater}
  alias KronopCoreElixir.RealTime.{ReelBroadcaster, InteractionBroadcaster}
  
  def start_link(init_arg) do
    children = [
      # Connection manager for WebSocket connections
      {ConnectionManager, []},
      # Presence tracker for user presence
      {PresenceTracker, []},
      # Live updater for real-time updates
      {LiveUpdater, []},
      # Reel broadcaster for reel updates
      {ReelBroadcaster, []},
      # Interaction broadcaster for likes, comments, shares
      {InteractionBroadcaster, []},
    ]

    opts = [strategy: :one_for_one, name: KronopCoreElixir.RealTime.System]
    Supervisor.start_link(children, opts)
  end
end
