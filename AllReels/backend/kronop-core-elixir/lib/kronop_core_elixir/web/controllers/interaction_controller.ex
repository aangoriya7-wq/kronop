defmodule KronopCoreElixirWeb.InteractionController do
  @moduledoc """
  Controller for interaction API endpoints
  
  Handles:
  - Like (Star) interactions
  - Comment interactions
  - Share interactions
  - Save interactions
  - Support (Follow) interactions
  - ProtoBuf serialization
  """
  
  use KronopCoreElixirWeb, :controller
  
  alias KronopCoreElixir.RealTime.InteractionManager
  
  # Like (Star) interactions
  def toggle_like(conn, %{"reel_id" => reel_id}) do
    user_id = get_user_id(conn)
    device_info = get_device_info(conn)
    
    case InteractionManager.toggle_like(user_id, reel_id, device_info) do
      {:ok, is_liked} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          is_liked: is_liked,
          reel_id: reel_id,
          user_id: user_id,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          success: false,
          error: reason,
          reel_id: reel_id,
          user_id: user_id,
        })
    end
  end
  
  def get_like_count(conn, %{"reel_id" => reel_id}) do
    count = InteractionManager.get_like_count(reel_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      reel_id: reel_id,
      like_count: count,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_user_liked_reels(conn, %{"user_id" => user_id}) do
    liked_reels = InteractionManager.get_user_liked_reels(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      user_id: user_id,
      liked_reels: liked_reels,
      count: map_size(liked_reels),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  # Comment interactions
  def add_comment(conn, %{"reel_id" => reel_id, "text" => text, "username" => username}) do
    user_id = get_user_id(conn)
    device_info = get_device_info(conn)
    
    case InteractionManager.add_comment(user_id, reel_id, text, username, device_info) do
      {:ok, comment} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          comment: comment,
          reel_id: reel_id,
          user_id: user_id,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          success: false,
          error: reason,
          reel_id: reel_id,
          user_id: user_id,
        })
    end
  end
  
  def get_comments(conn, %{"reel_id" => reel_id, "limit" => limit}) do
    limit = String.to_integer(limit || "50")
    comments = InteractionManager.get_comments(reel_id, limit)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      reel_id: reel_id,
      comments: comments,
      count: length(comments),
      limit: limit,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_comment_count(conn, %{"reel_id" => reel_id}) do
    count = InteractionManager.get_comment_count(reel_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      reel_id: reel_id,
      comment_count: count,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def like_comment(conn, %{"comment_id" => comment_id}) do
    user_id = get_user_id(conn)
    
    case InteractionManager.like_comment(user_id, comment_id) do
      {:ok, comment} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          comment: comment,
          comment_id: comment_id,
          user_id: user_id,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          success: false,
          error: reason,
          comment_id: comment_id,
          user_id: user_id,
        })
    end
  end
  
  # Share interactions
  def increment_share(conn, %{"reel_id" => reel_id, "platform" => platform}) do
    user_id = get_user_id(conn)
    device_info = get_device_info(conn)
    
    case InteractionManager.increment_share(user_id, reel_id, platform, device_info) do
      {:ok, share} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          share: share,
          reel_id: reel_id,
          user_id: user_id,
          platform: platform,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          success: false,
          error: reason,
          reel_id: reel_id,
          user_id: user_id,
        })
    end
  end
  
  def get_share_count(conn, %{"reel_id" => reel_id}) do
    count = InteractionManager.get_share_count(reel_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      reel_id: reel_id,
      share_count: count,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_user_shared_reels(conn, %{"user_id" => user_id}) do
    shared_reels = InteractionManager.get_user_shared_reels(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      user_id: user_id,
      shared_reels: shared_reels,
      count: map_size(shared_reels),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  # Save interactions
  def toggle_save(conn, %{"reel_id" => reel_id}) do
    user_id = get_user_id(conn)
    device_info = get_device_info(conn)
    
    case InteractionManager.toggle_save(user_id, reel_id, device_info) do
      {:ok, is_saved} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          is_saved: is_saved,
          reel_id: reel_id,
          user_id: user_id,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          success: false,
          error: reason,
          reel_id: reel_id,
          user_id: user_id,
        })
    end
  end
  
  def get_save_count(conn, %{"reel_id" => reel_id}) do
    count = InteractionManager.get_save_count(reel_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      reel_id: reel_id,
      save_count: count,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_user_saved_reels(conn, %{"user_id" => user_id}) do
    saved_reels = InteractionManager.get_user_saved_reels(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      user_id: user_id,
      saved_reels: saved_reels,
      count: map_size(saved_reels),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  # Support (Follow) interactions
  def toggle_support(conn, %{"target_user_id" => target_user_id}) do
    user_id = get_user_id(conn)
    device_info = get_device_info(conn)
    
    case InteractionManager.toggle_support(user_id, target_user_id, device_info) do
      {:ok, is_supporting} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          is_supporting: is_supporting,
          user_id: user_id,
          target_user_id: target_user_id,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        })
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          success: false,
          error: reason,
          user_id: user_id,
          target_user_id: target_user_id,
        })
    end
  end
  
  def get_support_count(conn, %{"user_id" => user_id}) do
    count = InteractionManager.get_support_count(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      user_id: user_id,
      support_count: count,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_user_supporting(conn, %{"user_id" => user_id}) do
    supporting = InteractionManager.get_user_supporting(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      user_id: user_id,
      supporting: supporting,
      count: map_size(supporting),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_user_supporters(conn, %{"user_id" => user_id}) do
    supporters = InteractionManager.get_user_supporters(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      user_id: user_id,
      supporters: supporters,
      count: map_size(supporters),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  # Statistics
  def get_interaction_stats(conn, %{"reel_id" => reel_id}) do
    stats = InteractionManager.get_interaction_stats(reel_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      stats: stats,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_user_interaction_history(conn, %{"user_id" => user_id}) do
    history = InteractionManager.get_user_interaction_history(user_id)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      history: history,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  def get_system_stats(conn, _params) do
    stats = InteractionManager.get_system_stats()
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      system_stats: stats,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  # Batch operations
  def batch_interactions(conn, %{"interactions" => interactions}) do
    # Process multiple interactions in batch
    results = Enum.map(interactions, fn interaction ->
      process_interaction(interaction, get_user_id(conn), get_device_info(conn))
    end)
    
    conn
    |> put_status(:ok)
    |> json(%{
      success: true,
      results: results,
      count: length(results),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    })
  end
  
  # Private functions
  defp get_user_id(conn) do
    # In a real implementation, this would get from authentication
    # For now, return a default user ID
    "user_#{:rand.uniform(1000, 9999)}"
  end
  
  defp get_device_info(conn) do
    # Get device information from request headers
    user_agent = get_req_header(conn, "user-agent", "unknown")
    ip_address = get_req_header(conn, "x-forwarded-for", get_req_header(conn, "remote-addr", "127.0.0.1"))
    
    %{
      user_agent: user_agent,
      ip_address: ip_address,
      platform: get_platform_from_user_agent(user_agent),
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
    }
  end
  
  defp get_platform_from_user_agent(user_agent) do
    cond do
      String.contains?(user_agent, "Android") -> "android"
      String.contains?(user_agent, "iOS") -> "ios"
      String.contains?(user_agent, "Windows") -> "windows"
      String.contains?(user_agent, "Mac") -> "macos"
      String.contains?(user_agent, "Linux") -> "linux"
      true -> "unknown"
    end
  end
  
  defp process_interaction(interaction, user_id, device_info) do
    case interaction["type"] do
      "like" ->
        reel_id = String.to_integer(interaction["reel_id"])
        case InteractionManager.toggle_like(user_id, reel_id, device_info) do
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
        reel_id = String.to_integer(interaction["reel_id"])
        text = interaction["text"]
        username = interaction["username"] || ""
        
        case InteractionManager.add_comment(user_id, reel_id, text, username, device_info) do
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
        reel_id = String.to_integer(interaction["reel_id"])
        platform = interaction["platform"] || "unknown"
        
        case InteractionManager.increment_share(user_id, reel_id, platform, device_info) do
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
        reel_id = String.to_integer(interaction["reel_id"])
        
        case InteractionManager.toggle_save(user_id, reel_id, device_info) do
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
        
        case InteractionManager.toggle_support(user_id, target_user_id, device_info) do
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
end
