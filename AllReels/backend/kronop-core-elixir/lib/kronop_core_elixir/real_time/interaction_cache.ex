defmodule KronopCoreElixir.RealTime.InteractionCache do
  @moduledoc """
  Cache for interaction data
  
  Provides:
  - In-memory caching
  - Fast lookups
  - Cache statistics
  - Memory management
  """
  
  use GenServer
  require Logger
  
  @type user_id :: String.t()
  @type reel_id :: integer()
  @type interaction_id :: String.t()
  
  defstruct max_size: 10000,
            ttl: 3600, # 1 hour
            cache: %{},
            stats: %{
              hits: integer(),
              misses: integer(),
              size: integer(),
              evictions: integer(),
              hit_rate: float(),
            }
  
  # Public API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts)
  end
  
  # Like (Star) operations
  def toggle_like(cache, user_id, reel_id, device_info \\ %{}) do
    GenServer.call(cache, {:toggle_like, user_id, reel_id, device_info})
  end
  
  def get_like_count(cache, reel_id) do
    GenServer.call(cache, {:get_like_count, reel_id})
  end
  
  def get_user_liked_reels(cache, user_id) do
    GenServer.call(cache, {:get_user_liked_reels, user_id})
  end
  
  def is_liked(cache, user_id, reel_id) do
    GenServer.call(cache, {:is_liked, user_id, reel_id})
  end
  
  # Comment operations
  def add_comment(cache, user_id, reel_id, text, username \\ "", device_info \\ %{}) do
    GenServer.call(cache, {:add_comment, user_id, reel_id, text, username, device_info})
  end
  
  def get_comments(cache, reel_id, limit \\ 50) do
    GenServer.call(cache, {:get_comments, reel_id, limit})
  end
  
  def get_comment_count(cache, reel_id) do
    GenServer.call(cache, {:get_comment_count, reel_id})
  end
  
  def like_comment(cache, user_id, comment_id) do
    GenServer.call(cache, {:like_comment, user_id, comment_id})
  end
  
  def get_comment(cache, comment_id) do
    GenServer.call(cache, {:get_comment, comment_id})
  end
  
  # Share operations
  def increment_share(cache, user_id, reel_id, platform \\ "unknown", device_info \\ %{}) do
    GenServer.call(cache, {:increment_share, user_id, reel_id, platform, device_info})
  end
  
  def get_share_count(cache, reel_id) do
    GenServer.call(cache, {:get_share_count, reel_id})
  end
  
  def get_user_shared_reels(cache, user_id) do
    GenServer.call(cache, {:get_user_shared_reels, user_id})
  end
  
  # Save operations
  def toggle_save(cache, user_id, reel_id, device_info \\ %{}) do
    GenServer.call(cache, {:toggle_save, user_id, reel_id, device_info})
  end
  
  def get_save_count(cache, reel_id) do
    GenServer.call(cache, {:get_save_count, reel_id})
  end
  
  def get_user_saved_reels(cache, user_id) do
    GenServer.call(cache, {:get_user_saved_reels, user_id})
  end
  
  def is_saved(cache, user_id, reel_id) do
    GenServer.call(cache, {:is_saved, user_id, reel_id})
  end
  
  # Support (Follow) operations
  def toggle_support(cache, user_id, target_user_id, device_info \\ %{}) do
    GenServer.call(cache, {:toggle_support, user_id, target_user_id, device_info})
  end
  
  def get_support_count(cache, user_id) do
    GenServer.call(cache, {:get_support_count, user_id})
  end
  
  def get_user_supporting(cache, user_id) do
    GenServer.call(cache, {:get_user_supporting, user_id})
  end
  
  def get_user_supporters(cache, user_id) do
    GenServer.call(cache, {:get_user_supporters, user_id})
  end
  
  def is_supporting(cache, user_id, target_user_id) do
    GenServer.call(cache, {:is_supporting, user_id, target_user_id})
  end
  
  # Statistics
  def get_interaction_stats(cache, reel_id) do
    GenServer.call(cache, {:get_interaction_stats, reel_id})
  end
  
  def get_user_interaction_history(cache, user_id) do
    GenServer.call(cache, {:get_user_interaction_history, user_id})
  end
  
  def get_cache_stats(cache) do
    GenServer.call(cache, :get_cache_stats)
  end
  
  # Cache management
  def clear_cache(cache) do
    GenServer.call(cache, :clear_cache)
  end
  
  def cleanup_expired(cache) do
    GenServer.call(cache, :cleanup_expired)
  end
  
  # GenServer callbacks
  @impl true
  def init(opts) do
    max_size = Keyword.get(opts, :max_size, 10000)
    ttl = Keyword.get(opts, :ttl, 3600)
    
    state = %__MODULE__{
      max_size: max_size,
      ttl: ttl,
      cache: %{},
      stats: %{
        hits: 0,
        misses: 0,
        size: 0,
        evictions: 0,
        hit_rate: 0.0,
      }
    }
    
    # Start cleanup timer
    Process.send_after(self(), :cleanup_expired, ttl * 1000)
    
    Logger.info("InteractionCache started with max_size: #{max_size}, ttl: #{ttl}s")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:toggle_like, user_id, reel_id, device_info}, _from, state) do
    cache_key = "like:#{user_id}:#{reel_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        # Not liked before, add like
        like_data = %{
          id: UUID.uuid4(),
          user_id: user_id,
          reel_id: reel_id,
          is_liked: true,
          timestamp: DateTime.utc_now(),
          device_info: device_info,
        }
        
        new_cache = put_in_cache(state.cache, cache_key, like_data, state.max_size)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, true}, new_state}
      
      existing_like ->
        # Already liked, remove like
        new_cache = Map.delete(state.cache, cache_key)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, false}, new_state}
    end
  end
  
  def handle_call({:get_like_count, reel_id}, _from, state) do
    # Count likes for this reel
    like_count = 
      state.cache
      |> Enum.filter(fn {key, _} -> 
        String.starts_with?(key, "like:") and String.ends_with?(key, ":#{reel_id}")
      end)
      |> Enum.count()
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, like_count, new_state}
  end
  
  def handle_call({:get_user_liked_reels, user_id}, _from, state) do
    liked_reels = 
      state.cache
      |> Enum.filter(fn {key, _} -> 
        String.starts_with?(key, "like:#{user_id}:")
      end)
      |> Enum.map(fn {key, like_data} ->
        reel_id = String.split(key, ":") |> List.last() |> String.to_integer()
        {reel_id, like_data}
      end)
      |> Enum.into(%{})
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, liked_reels, new_state}
  end
  
  def handle_call({:is_liked, user_id, reel_id}, _from, state) do
    cache_key = "like:#{user_id}:#{reel_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        new_stats = update_stats(state.stats, :miss)
        new_state = %{state | stats: new_stats}
        {:reply, false, new_state}
      
      like_data ->
        new_stats = update_stats(state.stats, :hit)
        new_state = %{state | stats: new_stats}
        {:reply, like_data.is_liked, new_state}
    end
  end
  
  def handle_call({:add_comment, user_id, reel_id, text, username, device_info}, _from, state) do
    comment_id = UUID.uuid4()
    cache_key = "comment:#{comment_id}"
    
    comment_data = %{
      id: comment_id,
      user_id: user_id,
      reel_id: reel_id,
      text: text,
      username: username,
      timestamp: DateTime.utc_now(),
      likes: 0,
      parent_comment_id: nil,
      device_info: device_info,
    }
    
    new_cache = put_in_cache(state.cache, cache_key, comment_data, state.max_size)
    new_stats = update_stats(state.stats, :hit)
    
    new_state = %{state | cache: new_cache, stats: new_stats}
    {:reply, {:ok, comment_data}, new_state}
  end
  
  def handle_call({:get_comments, reel_id, limit}, _from, state) do
    comments = 
      state.cache
      |> Enum.filter(fn {key, comment} -> 
        String.starts_with?(key, "comment:") and comment.reel_id == reel_id
      end)
      |> Enum.map(fn {_, comment} -> comment end)
      |> Enum.sort_by(& &1.timestamp, :desc)
      |> Enum.take(limit)
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, comments, new_state}
  end
  
  def handle_call({:get_comment_count, reel_id}, _from, state) do
    comment_count = 
      state.cache
      |> Enum.filter(fn {key, comment} -> 
        String.starts_with?(key, "comment:") and comment.reel_id == reel_id
      end)
      |> Enum.count()
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, comment_count, new_state}
  end
  
  def handle_call({:like_comment, user_id, comment_id}, _from, state) do
    cache_key = "comment:#{comment_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        new_stats = update_stats(state.stats, :miss)
        new_state = %{state | stats: new_stats}
        {:reply, {:error, :not_found}, new_state}
      
      comment_data ->
        updated_comment = %{comment_data | likes: comment_data.likes + 1}
        new_cache = Map.put(state.cache, cache_key, updated_comment)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, updated_comment}, new_state}
    end
  end
  
  def handle_call({:get_comment, comment_id}, _from, state) do
    cache_key = "comment:#{comment_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        new_stats = update_stats(state.stats, :miss)
        new_state = %{state | stats: new_stats}
        {:reply, nil, new_state}
      
      comment_data ->
        new_stats = update_stats(state.stats, :hit)
        new_state = %{state | stats: new_stats}
        {:reply, comment_data, new_state}
    end
  end
  
  def handle_call({:increment_share, user_id, reel_id, platform, device_info}, _from, state) do
    share_id = UUID.uuid4()
    cache_key = "share:#{share_id}"
    
    share_data = %{
      id: share_id,
      user_id: user_id,
      reel_id: reel_id,
      platform: platform,
      share_url: "https://kronop.com/reels/#{reel_id}",
      timestamp: DateTime.utc_now(),
      device_info: device_info,
    }
    
    new_cache = put_in_cache(state.cache, cache_key, share_data, state.max_size)
    new_stats = update_stats(state.stats, :hit)
    
    new_state = %{state | cache: new_cache, stats: new_stats}
    {:reply, {:ok, share_data}, new_state}
  end
  
  def handle_call({:get_share_count, reel_id}, _from, state) do
    share_count = 
      state.cache
      |> Enum.filter(fn {key, share} -> 
        String.starts_with?(key, "share:") and share.reel_id == reel_id
      end)
      |> Enum.count()
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, share_count, new_state}
  end
  
  def handle_call({:get_user_shared_reels, user_id}, _from, state) do
    shared_reels = 
      state.cache
      |> Enum.filter(fn {key, share} -> 
        String.starts_with?(key, "share:") and share.user_id == user_id
      end)
      |> Enum.map(fn {_, share} -> {share.reel_id, share} end)
      |> Enum.into(%{})
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, shared_reels, new_state}
  end
  
  def handle_call({:toggle_save, user_id, reel_id, device_info}, _from, state) do
    cache_key = "save:#{user_id}:#{reel_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        # Not saved before, add save
        save_data = %{
          id: UUID.uuid4(),
          user_id: user_id,
          reel_id: reel_id,
          is_saved: true,
          timestamp: DateTime.utc_now(),
          device_info: device_info,
        }
        
        new_cache = put_in_cache(state.cache, cache_key, save_data, state.max_size)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, true}, new_state}
      
      existing_save ->
        # Already saved, remove save
        new_cache = Map.delete(state.cache, cache_key)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, false}, new_state}
    end
  end
  
  def handle_call({:get_save_count, reel_id}, _from, state) do
    save_count = 
      state.cache
      |> Enum.filter(fn {key, _} -> 
        String.starts_with?(key, "save:") and String.ends_with?(key, ":#{reel_id}")
      end)
      |> Enum.count()
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, save_count, new_state}
  end
  
  def handle_call({:get_user_saved_reels, user_id}, _from, state) do
    saved_reels = 
      state.cache
      |> Enum.filter(fn {key, _} -> 
        String.starts_with?(key, "save:#{user_id}:")
      end)
      |> Enum.map(fn {key, save_data} ->
        reel_id = String.split(key, ":") |> List.last() |> String.to_integer()
        {reel_id, save_data}
      end)
      |> Enum.into(%{})
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, saved_reels, new_state}
  end
  
  def handle_call({:is_saved, user_id, reel_id}, _from, state) do
    cache_key = "save:#{user_id}:#{reel_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        new_stats = update_stats(state.stats, :miss)
        new_state = %{state | stats: new_stats}
        {:reply, false, new_state}
      
      save_data ->
        new_stats = update_stats(state.stats, :hit)
        new_state = %{state | stats: new_stats}
        {:reply, save_data.is_saved, new_state}
    end
  end
  
  def handle_call({:toggle_support, user_id, target_user_id, device_info}, _from, state) do
    cache_key = "support:#{user_id}:#{target_user_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        # Not supporting before, add support
        support_data = %{
          id: UUID.uuid4(),
          user_id: user_id,
          target_user_id: target_user_id,
          is_supporting: true,
          timestamp: DateTime.utc_now(),
          device_info: device_info,
        }
        
        new_cache = put_in_cache(state.cache, cache_key, support_data, state.max_size)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, true}, new_state}
      
      existing_support ->
        # Already supporting, remove support
        new_cache = Map.delete(state.cache, cache_key)
        new_stats = update_stats(state.stats, :hit)
        
        new_state = %{state | cache: new_cache, stats: new_stats}
        {:reply, {:ok, false}, new_state}
    end
  end
  
  def handle_call({:get_support_count, user_id}, _from, state) do
    support_count = 
      state.cache
      |> Enum.filter(fn {key, _} -> 
        String.starts_with?(key, "support:") and String.ends_with?(key, ":#{user_id}")
      end)
      |> Enum.count()
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, support_count, new_state}
  end
  
  def handle_call({:get_user_supporting, user_id}, _from, state) do
    supporting = 
      state.cache
      |> Enum.filter(fn {key, support} -> 
        String.starts_with?(key, "support:#{user_id}:")
      end)
      |> Enum.map(fn {_, support} -> {support.target_user_id, support} end)
      |> Enum.into(%{})
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, supporting, new_state}
  end
  
  def handle_call({:get_user_supporters, user_id}, _from, state) do
    supporters = 
      state.cache
      |> Enum.filter(fn {key, support} -> 
        String.ends_with?(key, ":#{user_id}")
      end)
      |> Enum.map(fn {_, support} -> {support.user_id, support} end)
      |> Enum.into(%{})
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, supporters, new_state}
  end
  
  def handle_call({:is_supporting, user_id, target_user_id}, _from, state) do
    cache_key = "support:#{user_id}:#{target_user_id}"
    
    case Map.get(state.cache, cache_key) do
      nil ->
        new_stats = update_stats(state.stats, :miss)
        new_state = %{state | stats: new_stats}
        {:reply, false, new_state}
      
      support_data ->
        new_stats = update_stats(state.stats, :hit)
        new_state = %{state | stats: new_stats}
        {:reply, support_data.is_supporting, new_state}
    end
  end
  
  def handle_call({:get_interaction_stats, reel_id}, _from, state) do
    stats = %{
      reel_id: reel_id,
      likes: get_like_count(%{cache: state.cache}, reel_id),
      comments: get_comment_count(%{cache: state.cache}, reel_id),
      shares: get_share_count(%{cache: state.cache}, reel_id),
      saves: get_save_count(%{cache: state.cache}, reel_id),
      last_updated: DateTime.utc_now() |> DateTime.to_iso8601(),
    }
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, stats, new_state}
  end
  
  def handle_call({:get_user_interaction_history, user_id}, _from, state) do
    history = %{
      user_id: user_id,
      liked_reels: get_user_liked_reels(%{cache: state.cache}, user_id),
      shared_reels: get_user_shared_reels(%{cache: state.cache}, user_id),
      saved_reels: get_user_saved_reels(%{cache: state.cache}, user_id),
      supporting: get_user_supporting(%{cache: state.cache}, user_id),
      last_updated: DateTime.utc_now() |> DateTime.to_iso8601(),
    }
    
    new_stats = update_stats(state.stats, :hit)
    new_state = %{state | stats: new_stats}
    {:reply, history, new_state}
  end
  
  def handle_call(:get_cache_stats, _from, state) do
    stats = %{
      size: map_size(state.cache),
      max_size: state.max_size,
      ttl: state.ttl,
      hits: state.stats.hits,
      misses: state.stats.misses,
      evictions: state.stats.evictions,
      hit_rate: state.stats.hit_rate,
      utilization: map_size(state.cache) / state.max_size * 100,
    }
    
    {:reply, stats, state}
  end
  
  def handle_call(:clear_cache, _from, state) do
    new_state = %{state | cache: %{}, stats: reset_stats(state.stats)}
    {:reply, :ok, new_state}
  end
  
  def handle_call(:cleanup_expired, _from, state) do
    current_time = DateTime.utc_now()
    
    # Remove expired entries
    {new_cache, evicted_count} = 
      state.cache
      |> Enum.filter(fn {_, data} -> 
        DateTime.diff(current_time, data.timestamp, :second) < state.ttl
      end)
      |> Enum.reduce({%{}, 0}, fn {acc, {key, data}}, {acc_map, acc_count} ->
        {Map.put(acc_map, key, data), acc_count}
      end)
    
    new_stats = %{state.stats | evictions: state.stats.evictions + evicted_count}
    new_state = %{state | cache: new_cache, stats: new_stats}
    
    # Schedule next cleanup
    Process.send_after(self(), :cleanup_expired, state.ttl * 1000)
    
    {:reply, evicted_count, new_state}
  end
  
  # GenServer callbacks
  def handle_info(:cleanup_expired, state) do
    case cleanup_expired(state) do
      {:ok, evicted_count, new_state} ->
        Logger.info("Cleaned up #{evicted_count} expired cache entries")
        {:noreply, new_state}
    end
  end
  
  # Private functions
  defp put_in_cache(cache, key, data, max_size) do
    # Check if we need to evict entries
    if map_size(cache) >= max_size do
      # Remove oldest entry (simple LRU)
      oldest_key = 
        cache
        |> Enum.min_by(fn {_, data} -> data.timestamp end)
        |> elem(0)
      
      cache = Map.delete(cache, oldest_key)
    end
    
    Map.put(cache, key, data)
  end
  
  defp update_stats(stats, :hit) do
    total = stats.hits + stats.misses + 1
    hit_rate = if total > 0, do: stats.hits / total, else: 0.0
    
    %{stats | 
      hits: stats.hits + 1,
      total: total,
      hit_rate: hit_rate,
      size: map_size(stats.cache)
    }
  end
  
  defp update_stats(stats, :miss) do
    total = stats.hits + stats.misses + 1
    hit_rate = if total > 0, do: stats.hits / total, else: 0.0
    
    %{stats | 
      misses: stats.misses + 1,
      total: total,
      hit_rate: hit_rate,
      size: map_size(stats.cache)
    }
  end
  
  defp reset_stats(stats) do
    %{stats | 
      hits: 0,
      misses: 0,
      evictions: 0,
      hit_rate: 0.0,
      size: 0
    }
  end
end
