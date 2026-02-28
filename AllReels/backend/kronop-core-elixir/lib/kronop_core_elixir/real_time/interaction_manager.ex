defmodule KronopCoreElixir.RealTime.InteractionManager do
  @moduledoc """
  Real-time interaction manager for likes, comments, shares, saves, and supports
  
  Handles:
  - Like (Star) interactions
  - Comment interactions  
  - Share interactions
  - Save interactions
  - Support (Follow) interactions
  - Real-time broadcasting
  - ProtoBuf serialization
  """
  
  use GenServer
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.{InteractionBroadcaster, InteractionCache}
  
  @type user_id :: String.t()
  @type reel_id :: integer()
  @type interaction_type :: atom()
  
  defstruct cache: %InteractionCache{},
            broadcaster: %InteractionBroadcaster{},
            stats: %{
              total_interactions: integer(),
              likes_count: integer(),
              comments_count: integer(),
              shares_count: integer(),
              saves_count: integer(),
              supports_count: integer(),
              avg_response_time: float(),
              cache_hit_rate: float(),
            }
  
  # Public API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts)
  end
  
  # Like (Star) interactions
  def toggle_like(user_id, reel_id, device_info \\ %{}) do
    GenServer.call(__MODULE__, {:toggle_like, user_id, reel_id, device_info})
  end
  
  def get_like_count(reel_id) do
    GenServer.call(__MODULE__, {:get_like_count, reel_id})
  end
  
  def get_user_liked_reels(user_id) do
    GenServer.call(__MODULE__, {:get_user_liked_reels, user_id})
  end
  
  # Comment interactions
  def add_comment(user_id, reel_id, text, username \\ "", device_info \\ %{}) do
    GenServer.call(__MODULE__, {:add_comment, user_id, reel_id, text, username, device_info})
  end
  
  def get_comments(reel_id, limit \\ 50) do
    GenServer.call(__MODULE__, {:get_comments, reel_id, limit})
  end
  
  def get_comment_count(reel_id) do
    GenServer.call(__MODULE__, {:get_comment_count, reel_id})
  end
  
  def like_comment(user_id, comment_id) do
    GenServer.call(__MODULE__, {:like_comment, user_id, comment_id})
  end
  
  # Share interactions
  def increment_share(user_id, reel_id, platform \\ "unknown", device_info \\ %{}) do
    GenServer.call(__MODULE__, {:increment_share, user_id, reel_id, platform, device_info})
  end
  
  def get_share_count(reel_id) do
    GenServer.call(__MODULE__, {:get_share_count, reel_id})
  end
  
  def get_user_shared_reels(user_id) do
    GenServer.call(__MODULE__, {:get_user_shared_reels, user_id})
  end
  
  # Save interactions
  def toggle_save(user_id, reel_id, device_info \\ %{}) do
    GenServer.call(__MODULE__, {:toggle_save, user_id, reel_id, device_info})
  end
  
  def get_save_count(reel_id) do
    GenServer.call(__MODULE__, {:get_save_count, reel_id})
  end
  
  def get_user_saved_reels(user_id) do
    GenServer.call(__MODULE__, {:get_user_saved_reels, user_id})
  end
  
  # Support (Follow) interactions
  def toggle_support(user_id, target_user_id, device_info \\ %{}) do
    GenServer.call(__MODULE__, {:toggle_support, user_id, target_user_id, device_info})
  end
  
  def get_support_count(user_id) do
    GenServer.call(__MODULE__, {:get_support_count, user_id})
  end
  
  def get_user_supporting(user_id) do
    GenServer.call(__MODULE__, {:get_user_supporting, user_id})
  end
  
  def get_user_supporters(user_id) do
    GenServer.call(__MODULE__, {:get_user_supporters, user_id})
  end
  
  # Batch operations
  def get_interaction_stats(reel_id) do
    GenServer.call(__MODULE__, {:get_interaction_stats, reel_id})
  end
  
  def get_user_interaction_history(user_id) do
    GenServer.call(__MODULE__, {:get_user_interaction_history, user_id})
  end
  
  def get_system_stats do
    GenServer.call(__MODULE__, :get_system_stats)
  end
  
  # GenServer callbacks
  @impl true
  def init(opts) do
    cache = InteractionCache.new(opts)
    broadcaster = InteractionBroadcaster.new(opts)
    
    state = %__MODULE__{
      cache: cache,
      broadcaster: broadcaster,
      stats: %{
        total_interactions: 0,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        saves_count: 0,
        supports_count: 0,
        avg_response_time: 0.0,
        cache_hit_rate: 0.0,
      }
    }
    
    # Subscribe to interaction events
    Phoenix.PubSub.subscribe(KronopCoreElixir.PubSub, "interaction_events")
    
    Logger.info("InteractionManager started")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:toggle_like, user_id, reel_id, device_info}, _from, state) do
    start_time = System.monotonic_time(:millisecond)
    
    case InteractionCache.toggle_like(state.cache, user_id, reel_id, device_info) do
      {:ok, is_liked, new_cache} ->
        # Update stats
        new_stats = update_stats(state.stats, :like, is_liked)
        
        # Create ProtoBuf message
        like_interaction = %{
          id: UUID.uuid4(),
          user_id: user_id,
          reel_id: reel_id,
          is_liked: is_liked,
          timestamp: DateTime.utc_now() |> DateTime.to_unix(),
          device_info: Jason.encode!(device_info),
          location: Map.get(device_info, "location", "unknown"),
        }
        
        # Broadcast update
        state.broadcaster.broadcast_like_update(reel_id, like_interaction)
        
        # Update reel stats
        update_reel_stats(reel_id, :likes, is_liked ? 1 : -1)
        
        # Send response time
        response_time = System.monotonic_time(:millisecond) - start_time
        new_stats = %{new_stats | avg_response_time: update_avg_response_time(new_stats.avg_response_time, response_time)}
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, is_liked}, new_state}
      
      {:error, reason} ->
        Logger.error("Failed to toggle like: #{reason}")
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:get_like_count, reel_id}, _from, state) do
    count = InteractionCache.get_like_count(state.cache, reel_id)
    {:reply, count, state}
  end
  
  def handle_call({:get_user_liked_reels, user_id}, _from, state) do
    liked_reels = InteractionCache.get_user_liked_reels(state.cache, user_id)
    {:reply, liked_reels, state}
  end
  
  def handle_call({:add_comment, user_id, reel_id, text, username, device_info}, _from, state) do
    start_time = System.monotonic_time(:millisecond)
    
    case InteractionCache.add_comment(state.cache, user_id, reel_id, text, username, device_info) do
      {:ok, comment, new_cache} ->
        # Update stats
        new_stats = update_stats(state.stats, :comment, true)
        
        # Create ProtoBuf message
        comment_interaction = %{
          id: comment.id,
          user_id: user_id,
          reel_id: reel_id,
          text: text,
          username: username,
          timestamp: comment.timestamp,
          likes: comment.likes,
          parent_comment_id: comment.parent_comment_id,
          device_info: Jason.encode!(device_info),
        }
        
        # Broadcast update
        state.broadcaster.broadcast_comment_update(reel_id, comment_interaction)
        
        # Update reel stats
        update_reel_stats(reel_id, :comments, 1)
        
        # Send response time
        response_time = System.monotonic_time(:millisecond) - start_time
        new_stats = %{new_stats | avg_response_time: update_avg_response_time(new_stats.avg_response_time, response_time)}
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, comment}, new_state}
      
      {:error, reason} ->
        Logger.error("Failed to add comment: #{reason}")
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:get_comments, reel_id, limit}, _from, state) do
    comments = InteractionCache.get_comments(state.cache, reel_id, limit)
    {:reply, comments, state}
  end
  
  def handle_call({:get_comment_count, reel_id}, _from, state) do
    count = InteractionCache.get_comment_count(state.cache, reel_id)
    {:reply, count, state}
  end
  
  def handle_call({:like_comment, user_id, comment_id}, _from, state) do
    case InteractionCache.like_comment(state.cache, user_id, comment_id) do
      {:ok, comment, new_cache} ->
        # Broadcast comment like update
        state.broadcaster.broadcast_comment_like_update(comment.reel_id, comment)
        
        new_state = %{state | cache: new_cache}
        {:reply, {:ok, comment}, new_state}
      
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:increment_share, user_id, reel_id, platform, device_info}, _from, state) do
    start_time = System.monotonic_time(:millisecond)
    
    case InteractionCache.increment_share(state.cache, user_id, reel_id, platform, device_info) do
      {:ok, share, new_cache} ->
        # Update stats
        new_stats = update_stats(state.stats, :share, true)
        
        # Create ProtoBuf message
        share_interaction = %{
          id: share.id,
          user_id: user_id,
          reel_id: reel_id,
          platform: platform,
          share_url: share.share_url,
          timestamp: share.timestamp,
          device_info: Jason.encode!(device_info),
          location: Map.get(device_info, "location", "unknown"),
        }
        
        # Broadcast update
        state.broadcaster.broadcast_share_update(reel_id, share_interaction)
        
        # Update reel stats
        update_reel_stats(reel_id, :shares, 1)
        
        # Send response time
        response_time = System.monotonic_time(:millisecond) - start_time
        new_stats = %{new_stats | avg_response_time: update_avg_response_time(new_stats.avg_response_time, response_time)}
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, share}, new_state}
      
      {:error, reason} ->
        Logger.error("Failed to increment share: #{reason}")
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:get_share_count, reel_id}, _from, state) do
    count = InteractionCache.get_share_count(state.cache, reel_id)
    {:reply, count, state}
  end
  
  def handle_call({:get_user_shared_reels, user_id}, _from, state) do
    shared_reels = InteractionCache.get_user_shared_reels(state.cache, user_id)
    {:reply, shared_reels, state}
  end
  
  def handle_call({:toggle_save, user_id, reel_id, device_info}, _from, state) do
    start_time = System.monotonic_time(:millisecond)
    
    case InteractionCache.toggle_save(state.cache, user_id, reel_id, device_info) do
      {:ok, is_saved, new_cache} ->
        # Update stats
        new_stats = update_stats(state.stats, :save, is_saved)
        
        # Create ProtoBuf message
        save_interaction = %{
          id: UUID.uuid4(),
          user_id: user_id,
          reel_id: reel_id,
          is_saved: is_saved,
          timestamp: DateTime.utc_now() |> DateTime.to_unix(),
          device_info: Jason.encode!(device_info),
          location: Map.get(device_info, "location", "unknown"),
        }
        
        # Broadcast update
        state.broadcaster.broadcast_save_update(reel_id, save_interaction)
        
        # Update reel stats
        update_reel_stats(reel_id, :saves, is_saved ? 1 : -1)
        
        # Send response time
        response_time = System.monotonic_time(:millisecond) - start_time
        new_stats = %{new_stats | avg_response_time: update_avg_response_time(new_stats.avg_response_time, response_time)}
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, is_saved}, new_state}
      
      {:error, reason} ->
        Logger.error("Failed to toggle save: #{reason}")
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:get_save_count, reel_id}, _from, state) do
    count = InteractionCache.get_save_count(state.cache, reel_id)
    {:reply, count, state}
  end
  
  def handle_call({:get_user_saved_reels, user_id}, _from, state) do
    saved_reels = InteractionCache.get_user_saved_reels(state.cache, user_id)
    {:reply, saved_reels, state}
  end
  
  def handle_call({:toggle_support, user_id, target_user_id, device_info}, _from, state) do
    start_time = System.monotonic_time(:millisecond)
    
    case InteractionCache.toggle_support(state.cache, user_id, target_user_id, device_info) do
      {:ok, is_supporting, new_cache} ->
        # Update stats
        new_stats = update_stats(state.stats, :support, is_supporting)
        
        # Create ProtoBuf message
        support_interaction = %{
          id: UUID.uuid4(),
          user_id: user_id,
          target_user_id: target_user_id,
          is_supporting: is_supporting,
          timestamp: DateTime.utc_now() |> DateTime.to_unix(),
          device_info: Jason.encode!(device_info),
          location: Map.get(device_info, "location", "unknown"),
        }
        
        # Broadcast update
        state.broadcaster.broadcast_support_update(target_user_id, support_interaction)
        
        # Update user stats
        update_user_stats(target_user_id, :supports, is_supporting ? 1 : -1)
        
        # Send response time
        response_time = System.monotonic_time(:millisecond) - start_time
        new_stats = %{new_stats | avg_response_time: update_avg_response_time(new_stats.avg_response_time, response_time)}
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, is_supporting}, new_state}
      
      {:error, reason} ->
        Logger.error("Failed to toggle support: #{reason}")
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:get_support_count, user_id}, _from, state) do
    count = InteractionCache.get_support_count(state.cache, user_id)
    {:reply, count, state}
  end
  
  def handle_call({:get_user_supporting, user_id}, _from, state) do
    supporting = InteractionCache.get_user_supporting(state.cache, user_id)
    {:reply, supporting, state}
  end
  
  def handle_call({:get_user_supporters, user_id}, _from, state) do
    supporters = InteractionCache.get_user_supporters(state.cache, user_id)
    {:reply, supporters, state}
  end
  
  def handle_call({:get_interaction_stats, reel_id}, _from, state) do
    stats = InteractionCache.get_interaction_stats(state.cache, reel_id)
    {:reply, stats, state}
  end
  
  def handle_call({:get_user_interaction_history, user_id}, _from, state) do
    history = InteractionCache.get_user_interaction_history(state.cache, user_id)
    {:reply, history, state}
  end
  
  def handle_call(:get_system_stats, _from, state) do
    cache_stats = InteractionCache.get_cache_stats(state.cache)
    
    system_stats = %{
      total_interactions: state.stats.total_interactions,
      likes_count: state.stats.likes_count,
      comments_count: state.stats.comments_count,
      shares_count: state.stats.shares_count,
      saves_count: state.stats.saves_count,
      supports_count: state.stats.supports_count,
      avg_response_time: state.stats.avg_response_time,
      cache_hit_rate: cache_stats.hit_rate,
      cache_size: cache_stats.size,
      cache_utilization: cache_stats.utilization,
    }
    
    {:reply, system_stats, state}
  end
  
  # PubSub callbacks
  def handle_info({:interaction_event, event}, state) do
    Logger.debug("Received interaction event: #{event.event_type}")
    {:noreply, state}
  end
  
  # Private functions
  defp update_stats(stats, interaction_type, is_positive) do
    case interaction_type do
      :like -> 
        %{stats | 
          likes_count: stats.likes_count + (is_positive ? 1 : 0),
          total_interactions: stats.total_interactions + 1
        }
      :comment -> 
        %{stats | 
          comments_count: stats.comments_count + 1,
          total_interactions: stats.total_interactions + 1
        }
      :share -> 
        %{stats | 
          shares_count: stats.shares_count + 1,
          total_interactions: stats.total_interactions + 1
        }
      :save -> 
        %{stats | 
          saves_count: stats.saves_count + 1,
          total_interactions: stats.total_interactions + 1
        }
      :support -> 
        %{stats | 
          supports_count: stats.supports_count + 1,
          total_interactions: stats.total_interactions + 1
        }
    end
  end
  
  defp update_avg_response_time(current_avg, new_time) do
    if current_avg == 0 do
      new_time
    else
      (current_avg + new_time) / 2
    end
  end
  
  defp update_reel_stats(reel_id, stat_type, value) do
    # In a real implementation, this would update the database
    # For now, we'll just log it
    Logger.debug("Updating reel #{reel_id} #{stat_type} by #{value}")
  end
  
  defp update_user_stats(user_id, stat_type, value) do
    # In a real implementation, this would update the database
    # For now, we'll just log it
    Logger.debug("Updating user #{user_id} #{stat_type} by #{value}")
  end
end
