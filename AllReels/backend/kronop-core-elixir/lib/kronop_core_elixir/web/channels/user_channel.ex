defmodule KronopCoreElixirWeb.UserChannel do
  @moduledoc """
  Phoenix Channel for user-specific communication
  
  Handles:
  - User-specific updates
  - Private messaging
  - User presence
  - Performance optimization
  """
  
  use Phoenix.Channel
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.{PresenceTracker, ReelBroadcaster}
  
  def join(user_id, opts \\ []) do
    Phoenix.Channel.join("user:#{user_id}", opts)
  end
  
  def handle_in(_pid, %{"user_id" => user_id}, socket) do
    # Track user presence
    PresenceTracker.track_user(user_id, socket.id, %{
      "device" => get_device_info(socket),
      "ip_address" => get_ip_address(socket),
      "user_agent" => get_user_agent(socket),
    })
    
    # Send welcome message
    push(socket, {:user_connected, user_id})
    
    {:push, socket, {:user_connected, user_id}, %{}}
  end
  
  def handle_in(_pid, message, socket) do
    handle_message(message, socket)
  end
  
  def handle_info({: user_connected, user_id}, socket) do
    Logger.info("User connected: #{user_id}")
    {:noreply, socket}
  end
  
  def handle_in({: user_disconnected, user_id}, socket) do
    PresenceTracker.untrack_user(user_id, socket.id)
    Logger.info("User disconnected: #{user_id}")
    {:noreply, socket}
  end
  
  def handle_in({: user_activity, user_id, activity}, socket) do
    PresenceTracker.update_user_activity(user_id, socket.id, activity)
    Logger.debug("User activity: #{user_id} - #{activity}")
    {:noreply, socket}
  end
  
  def handle_in({: reel_interaction, user_id, interaction}, socket) do
    # Broadcast interaction to user's connections
    ReelBroadcaster.broadcast_reel_update_to_users(interaction.reel_id, [user_id], interaction)
    
    # Update interaction stats
    update_interaction_stats(user_id, interaction.interaction_type)
    
    # Send confirmation
    push(socket, {:interaction_received, interaction})
    
    {:noreply, socket}
  end
  
  def handle_in({: reel_updated, reel_id, update}, socket) do
    # Check if user is watching this reel
    current_reel = get_current_reel(socket)
    
    if current_reel == reel_id do
      # Send update to user
      push(socket, {:reel_updated, update})
    end
    
    {:noreply, socket}
  end
  
  def handle_in(message, socket) do
    Logger.warn("Unhandled message in UserChannel: #{inspect(message)}")
    {:noreply, socket}
  end
  
  # Private functions
  defp get_current_reel(socket) do
    # In a real implementation, this would track the current reel for the user
    case get_connect_info(socket) do
      %{user_id} -> user_id
      _ -> nil
    end
  end
  
  defp update_interaction_stats(user_id, interaction_type) do
    # In a real implementation, this would update user statistics
    Logger.debug("User #{user_id} performed #{interaction_type}")
  end
  
  defp get_device_info(socket) do
    case Phoenix.Socket.get_connect_info(socket) do
      %{peer_data} -> peer_data
      _ -> nil
    end
  end
  
  defp get_ip_address(socket) do
    case Phoenix.Socket.get_connect_info(socket) do
      %{ip} -> ip
      _ -> "127.0.0.1"
    end
  end
  
  defp get_user_agent(socket) do
    case Phoenix.Socket.get_connect_info(socket) do
      %{user_agent} -> user_agent
      _ -> "unknown"
    end
  end
  
  defp get_connect_info(socket) do
    case Phoenix.Socket.get_connect_info(socket) do
      %{peer_data} -> peer_data
      _ -> nil
    end
  end
end
