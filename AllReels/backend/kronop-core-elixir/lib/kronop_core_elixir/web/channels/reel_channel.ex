defmodule KronopCoreElixirWeb.ReelChannel do
  @moduledoc """
  Phoenix Channel for real-time reel updates
  
  Handles:
  - WebSocket connections
  - Real-time updates
  - User presence
  - Performance optimization
  """
  
  use Phoenix.Channel
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.{ReelBroadcaster, PresenceTracker}
  
  @type reel_id :: integer()
  @type user_id :: String.t()
  
  def join(reel_id, opts \\ []) do
    Phoenix.Channel.join("reel:#{reel_id}", opts)
  end
  
  def handle_in(_pid, %{"user_id" => user_id}, socket) do
    # Track user presence
    PresenceTracker.track_user(user_id, socket.id, %{
      "device" => get_device_info(socket),
      "ip_address" => get_ip_address(socket),
      "user_agent" => get_user_agent(socket),
    })
    
    # Send initial reel data
    send_initial_reel_data(socket, reel_id)
    
    {:push, socket, {:join, "reel:#{reel_id}", "reel_joined"}, %{}}
  end
  
  def handle_in(_pid, %{"event" => event}, socket) do
    handle_event(event, socket)
  end
  
  def handle_info({:reel_updated, reel_id, update}, socket) do
    # Broadcast to all users watching this reel
    ReelBroadcaster.broadcast_reel_update(reel_id, update)
    
    # Send update to current user
    push(socket, {:reel_update, update})
    
    {:noreply, socket}
  end
  
  def handle_in(_pid, message, socket) do
    Logger.warn("Unhandled message in ReelChannel: #{inspect(message)}")
    {:noreply, socket}
  end
  
  # Private functions
  defp send_initial_reel_data(socket, reel_id) do
    # Get reel metadata
    reel_metadata = get_reel_metadata(reel_id)
    
    # Send reel metadata
    push(socket, {:reel_metadata, reel_metadata})
    
    # Send initial stats
    push(socket, {:reel_stats, get_reel_stats(reel_id)})
    
    # Send initial interactions
    push(socket, {:reel_interactions, get_reel_interactions(reel_id)})
  end
  
  defp get_device_info(socket) do
    case get_connect_info(socket) do
      %{ip: ip} -> ip
      %{user_agent: user_agent} -> user_agent
      _ -> "unknown"
    end
  end
  end
  
  defp get_ip_address(socket) do
    case get_connect_info(socket) do
      %{ip} -> ip
      _ -> "127.0.0.1"
    end
  end
  
  defp get_user_agent(socket) do
    case get_connect_info(socket) do
      %{user_agent} -> user_agent
      _ -> "unknown"
    end
  end
  
  defp get_connect_info(socket) do
    case Phoenix.Socket.get_connect_info(socket) |
      %{peer_data: %{peer_data}} -> peer_data
      _ -> nil
    end
  end
  
  defp get_reel_metadata(reel_id) do
    # In a real implementation, this would fetch from database
    %{
      reel_id: reel_id,
      title: "Reel #{reel_id}",
      description: "Amazing reel content",
      thumbnail_url: "https://cdn.kronop.com/reels/#{reel_id}/thumbnail.jpg",
      video_url: "https://cdn.kronop.com/reels/#{reel_id}/video.mp4",
      duration_ms: 15000,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      save_count: 0,
      is_liked: false,
      is_saved: false,
      is_supporting: false,
      tags: ["trending", "viral", "entertainment"],
      created_at: DateTime.utc() |> DateTime.to_iso8601(),
      updated_at: DateTime.utc() |> DateTime.to_iso860(),
      creator_id: "system",
      creator_metadata: %{
        "source" => "system",
        "quality" => "high",
      },
    }
  end
  
  defp get_reel_stats(reel_id) do
    # In a real implementation, this would calculate from actual data
    %{
      reel_id: reel_id,
      total_chunks: 10,
      cached_chunks: 8,
      streaming_chunks: 2,
      buffer_utilization: 0.8,
      avg_fps: 59.8,
      decoding_speed: 52.3,
      total_bytes: 98304000,
      cache_hits: 8,
      cache_misses: 2,
      cache_hit_ratio: 0.8,
      last_updated: DateTime.utc() |> DateTime.to_iso8601(),
    }
  end
  
  defp get_reel_interactions(reel_id) do
    # In a real implementation, this would fetch from database
    [
      %{
        id: "like_#{reel_id}_1",
        reel_id: reel_id,
        user_id: "user_1",
        interaction_type: "like",
        interaction_data: %{
          "position": 0.5,
          "duration": 2000,
        },
        timestamp: DateTime.utc() |> DateTime.to_iso8601(),
      },
      %{
        id: "comment_#{reel_id}_1",
        reel_id: reel_id,
        user_id: "user_1",
        interaction_type: "comment",
        interaction_data: %{
          "text": "Amazing reel!",
          "position": 0.3,
          "duration": 5000,
        },
        timestamp: DateTime.utc() |> DateTime.to_iso8601(),
      },
    ]
  end
end
