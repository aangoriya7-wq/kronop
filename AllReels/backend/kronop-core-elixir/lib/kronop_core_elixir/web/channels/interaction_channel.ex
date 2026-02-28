defmodule KronopCoreElixirWeb.InteractionChannel do
  @moduledoc """
  Phoenix Channel for real-time interaction updates
  
  Handles:
  - Like (Star) updates
  - Comment updates
  - Share updates
  - Save updates
  - Support (Follow) updates
  - Real-time broadcasting
  """
  
  use Phoenix.Channel
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.InteractionManager
  
  @type user_id :: String.t()
  @type reel_id :: integer()
  @type interaction_type :: atom()
  
  def join("interaction", %{"user_id" => user_id}, socket) do
    # Track user presence
    Phoenix.PubSub.subscribe(KronopCoreElixir.PubSub, "interaction_events")
    
    # Send welcome message
    push(socket, {:interaction_connected, user_id})
    
    {:push, socket, {:interaction_connected, user_id}, %{}}
  end
  
  def handle_in(_pid, %{"event" => event}, socket) do
    handle_interaction_event(event, socket)
  end
  
  def handle_info({:interaction_event, event}, socket) do
    # Broadcast interaction event to all connected users
    push(socket, {:interaction_update, event})
    
    {:noreply, socket}
  end
  
  def handle_in(message, socket) do
    Logger.warn("Unhandled message in InteractionChannel: #{inspect(message)}")
    {:noreply, socket}
  end
  
  # Private functions
  defp handle_interaction_event(%{"type" => "like", "reel_id" => reel_id}, socket) do
    user_id = get_user_id(socket)
    
    case InteractionManager.toggle_like(user_id, reel_id) do
      {:ok, is_liked} ->
        # Broadcast like update
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "interaction_events",
          {:like_update, %{
            user_id: user_id,
            reel_id: reel_id,
            is_liked: is_liked,
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
          }}
        )
        
        # Send confirmation
        push(socket, {:like_updated, %{
          reel_id: reel_id,
          is_liked: is_liked,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
      
      {:error, reason} ->
        push(socket, {:error, %{
          type: "like",
          error: reason,
          reel_id: reel_id,
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "comment", "reel_id" => reel_id, "text" => text, "username" => username}, socket) do
    user_id = get_user_id(socket)
    
    case InteractionManager.add_comment(user_id, reel_id, text, username) do
      {:ok, comment} ->
        # Broadcast comment update
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "interaction_events",
          {:comment_update, %{
            user_id: user_id,
            reel_id: reel_id,
            comment: comment,
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
          }}
        )
        
        # Send confirmation
        push(socket, {:comment_added, %{
          reel_id: reel_id,
          comment: comment,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
      
      {:error, reason} ->
        push(socket, {:error, %{
          type: "comment",
          error: reason,
          reel_id: reel_id,
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "share", "reel_id" => reel_id, "platform" => platform}, socket) do
    user_id = get_user_id(socket)
    
    case InteractionManager.increment_share(user_id, reel_id, platform) do
      {:ok, share} ->
        # Broadcast share update
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "interaction_events",
          {:share_update, %{
            user_id: user_id,
            reel_id: reel_id,
            share: share,
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
          }}
        )
        
        # Send confirmation
        push(socket, {:share_added, %{
          reel_id: reel_id,
          share: share,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
      
      {:error, reason} ->
        push(socket, {:error, %{
          type: "share",
          error: reason,
          reel_id: reel_id,
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "save", "reel_id" => reel_id}, socket) do
    user_id = get_user_id(socket)
    
    case InteractionManager.toggle_save(user_id, reel_id) do
      {:ok, is_saved} ->
        # Broadcast save update
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "interaction_events",
          {:save_update, %{
            user_id: user_id,
            reel_id: reel_id,
            is_saved: is_saved,
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
          }}
        )
        
        # Send confirmation
        push(socket, {:save_updated, %{
          reel_id: reel_id,
          is_saved: is_saved,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
      
      {:error, reason} ->
        push(socket, {:error, %{
          type: "save",
          error: reason,
          reel_id: reel_id,
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "support", "target_user_id" => target_user_id}, socket) do
    user_id = get_user_id(socket)
    
    case InteractionManager.toggle_support(user_id, target_user_id) do
      {:ok, is_supporting} ->
        # Broadcast support update
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "interaction_events",
          {:support_update, %{
            user_id: user_id,
            target_user_id: target_user_id,
            is_supporting: is_supporting,
            timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
          }}
        )
        
        # Send confirmation
        push(socket, {:support_updated, %{
          user_id: user_id,
          target_user_id: target_user_id,
          is_supporting: is_supporting,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
      
      {:error, reason} ->
        push(socket, {:error, %{
          type: "support",
          error: reason,
          target_user_id: target_user_id,
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "batch", "interactions" => interactions}, socket) do
    user_id = get_user_id(socket)
    
    # Process batch interactions
    results = Enum.map(interactions, fn interaction ->
      process_single_interaction(interaction, user_id)
    end)
    
    # Broadcast batch results
    Phoenix.PubSub.broadcast(
      KronopCoreElixir.PubSub,
      "interaction_events",
      {:batch_update, %{
        user_id: user_id,
        results: results,
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      }}
    )
    
    # Send confirmation
    push(socket, {:batch_processed, %{
      results: results,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    }})
    
    {:noreply, socket}
  end
  
  defp handle_interaction_event(%{"type" => "get_stats", "reel_id" => reel_id}, socket) do
    case InteractionManager.get_interaction_stats(reel_id) do
      stats ->
        push(socket, {:stats_response, %{
          reel_id: reel_id,
          stats: stats,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "get_user_history", "user_id" => user_id}, socket) do
    case InteractionManager.get_user_interaction_history(user_id) do
      history ->
        push(socket, {:user_history_response, %{
          user_id: user_id,
          history: history,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => "get_system_stats"}, socket) do
    case InteractionManager.get_system_stats() do
      stats ->
        push(socket, {:system_stats_response, %{
          stats: stats,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }})
        
        {:noreply, socket}
    end
  end
  
  defp handle_interaction_event(%{"type" => unknown_type}, socket) do
    Logger.warn("Unknown interaction type: #{unknown_type}")
    
    push(socket, {:error, %{
      type: "unknown",
      error: "Unknown interaction type: #{unknown_type}",
    }})
    
    {:noreply, socket}
  end
  
  defp process_single_interaction(interaction, user_id) do
    case interaction["type"] do
      "like" ->
        reel_id = interaction["reel_id"]
        case InteractionManager.toggle_like(user_id, reel_id) do
          {:ok, is_liked} ->
            %{
              type: "like",
              success: true,
              reel_id: reel_id,
              user_id: user_id,
              is_liked: is_liked,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
          {:error, reason} ->
            %{
              type: "like",
              success: false,
              reel_id: reel_id,
              user_id: user_id,
              error: reason,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
        end
      
      "comment" ->
        reel_id = interaction["reel_id"]
        text = interaction["text"]
        username = interaction["username"] || ""
        
        case InteractionManager.add_comment(user_id, reel_id, text, username) do
          {:ok, comment} ->
            %{
              type: "comment",
              success: true,
              reel_id: reel_id,
              user_id: user_id,
              comment: comment,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
          {:error, reason} ->
            %{
              type: "comment",
              success: false,
              reel_id: reel_id,
              user_id: user_id,
              error: reason,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
        end
      
      "share" ->
        reel_id = interaction["reel_id"]
        platform = interaction["platform"] || "unknown"
        
        case InteractionManager.increment_share(user_id, reel_id, platform) do
          {:ok, share} ->
            %{
              type: "share",
              success: true,
              reel_id: reel_id,
              user_id: user_id,
              share: share,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
          {:error, reason} ->
            %{
              type: "share",
              success: false,
              reel_id: reel_id,
              user_id: user_id,
              error: reason,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
        end
      
      "save" ->
        reel_id = interaction["reel_id"]
        
        case InteractionManager.toggle_save(user_id, reel_id) do
          {:ok, is_saved} ->
            %{
              type: "save",
              success: true,
              reel_id: reel_id,
              user_id: user_id,
              is_saved: is_saved,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
          {:error, reason} ->
            %{
              type: "save",
              success: false,
              reel_id: reel_id,
              user_id: user_id,
              error: reason,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
        end
      
      "support" ->
        target_user_id = interaction["target_user_id"]
        
        case InteractionManager.toggle_support(user_id, target_user_id) do
          {:ok, is_supporting} ->
            %{
              type: "support",
              success: true,
              user_id: user_id,
              target_user_id: target_user_id,
              is_supporting: is_supporting,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
          {:error, reason} ->
            %{
              type: "support",
              success: false,
              user_id: user_id,
              target_user_id: target_user_id,
              error: reason,
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
            }
        end
      
      _ ->
        %{
          type: "unknown",
          success: false,
          error: "Unknown interaction type",
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        }
    end
  end
  
  defp get_user_id(socket) do
    # In a real implementation, this would get from authentication
    # For now, return a default user ID
    "user_#{:rand.uniform(1000, 9999)}"
  end
end
