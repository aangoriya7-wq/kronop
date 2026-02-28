defmodule KronopCoreElixir.RealTime.InteractionBroadcaster do
  @moduledoc """
  Real-time broadcaster for interactions
  
  Handles:
  - Broadcasting like updates
  - Broadcasting comment updates
  - Broadcasting share updates
  - Broadcasting save updates
  - Broadcasting support updates
  - ProtoBuf serialization
  - Targeted messaging
  """
  
  use GenServer
  use Phoenix.PubSub
  require Logger
  
  @type reel_id :: integer()
  @type user_id :: String.t()
  @type interaction :: map()
  
  defstruct batch_size: 100,
            flush_interval: 50,
            update_queue: :queue.queue(),
            target_cache: %{},
            stats: %{
              total_broadcasts: integer(),
              like_broadcasts: integer(),
              comment_broadcasts: integer(),
              share_broadcasts: integer(),
              save_broadcasts: integer(),
              support_broadcasts: integer(),
              avg_batch_size: float(),
              total_targets: integer(),
            }
  
  # Public API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts)
  end
  
  def broadcast_like_update(reel_id, interaction) do
    GenServer.call(__MODULE__, {:broadcast_like, reel_id, interaction})
  end
  
  def broadcast_comment_update(reel_id, interaction) do
    GenServer.call(__MODULE__, {:broadcast_comment, reel_id, interaction})
  end
  
  def broadcast_comment_like_update(reel_id, comment) do
    GenServer.call(__MODULE__, {:broadcast_comment_like, reel_id, comment})
  end
  
  def broadcast_share_update(reel_id, interaction) do
    GenServer.call(__MODULE__, {:broadcast_share, reel_id, interaction})
  end
  
  def broadcast_save_update(reel_id, interaction) do
    GenServer.call(__MODULE__, {:broadcast_save, reel_id, interaction})
  end
  
  def broadcast_support_update(user_id, interaction) do
    GenServer.call(__MODULE__, {:broadcast_support, user_id, interaction})
  end
  
  def broadcast_batch_updates(updates) do
    GenServer.call(__MODULE__, {:broadcast_batch, updates})
  end
  
  def get_stats do
    GenServer.call(__MODULE__, :get_stats)
  end
  
  # GenServer callbacks
  @impl true
  def init(opts) do
    batch_size = Keyword.get(opts, :batch_size, 100)
    flush_interval = Keyword.get(opts, :flush_interval, 50)
    
    state = %__MODULE__{
      batch_size: batch_size,
      flush_interval: flush_interval,
      update_queue: :queue.new(),
      target_cache: %{},
      stats: %{
        total_broadcasts: 0,
        like_broadcasts: 0,
        comment_broadcasts: 0,
        share_broadcasts: 0,
        save_broadcasts: 0,
        support_broadcasts: 0,
        avg_batch_size: 0.0,
        total_targets: 0,
      }
    }
    
    # Start flush timer
    Process.send_after(self(), :flush_updates, flush_interval)
    
    Logger.info("InteractionBroadcaster started")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:broadcast_like, reel_id, interaction}, _from, state) do
    # Add to queue
    update = %{
      type: :like,
      reel_id: reel_id,
      interaction: interaction,
      timestamp: DateTime.utc_now(),
      targets: get_reel_viewers(reel_id),
    }
    
    new_queue = :queue.in(update, state.update_queue)
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | like_broadcasts: state.stats.like_broadcasts + 1}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call({:broadcast_comment, reel_id, interaction}, _from, state) do
    # Add to queue
    update = %{
      type: :comment,
      reel_id: reel_id,
      interaction: interaction,
      timestamp: DateTime.utc_now(),
      targets: get_reel_viewers(reel_id),
    }
    
    new_queue = :queue.in(update, state.update_queue)
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | comment_broadcasts: state.stats.comment_broadcasts + 1}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call({:broadcast_comment_like, reel_id, comment}, _from, state) do
    # Add to queue
    update = %{
      type: :comment_like,
      reel_id: reel_id,
      interaction: comment,
      timestamp: DateTime.utc_now(),
      targets: get_reel_viewers(reel_id),
    }
    
    new_queue = :queue.in(update, state.update_queue)
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | comment_broadcasts: state.stats.comment_broadcasts + 1}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call({:broadcast_share, reel_id, interaction}, _from, state) do
    # Add to queue
    update = %{
      type: :share,
      reel_id: reel_id,
      interaction: interaction,
      timestamp: DateTime.utc_now(),
      targets: get_reel_viewers(reel_id),
    }
    
    new_queue = :queue.in(update, state.update_queue)
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | share_broadcasts: state.stats.share_broadcasts + 1}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call({:broadcast_save, reel_id, interaction}, _from, state) do
    # Add to queue
    update = %{
      type: :save,
      reel_id: reel_id,
      interaction: interaction,
      timestamp: DateTime.utc_now(),
      targets: get_reel_viewers(reel_id),
    }
    
    new_queue = :queue.in(update, state.update_queue)
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | save_broadcasts: state.stats.save_broadcasts + 1}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call({:broadcast_support, user_id, interaction}, _from, state) do
    # Add to queue
    update = %{
      type: :support,
      user_id: user_id,
      interaction: interaction,
      timestamp: DateTime.utc_now(),
      targets: get_user_followers(user_id),
    }
    
    new_queue = :queue.in(update, state.update_queue)
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | support_broadcasts: state.stats.support_broadcasts + 1}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call({:broadcast_batch, updates}, _from, state) do
    # Add all updates to queue
    new_queue = Enum.reduce(updates, state.update_queue, fn update, acc ->
      :queue.in(update, acc)
    end)
    
    new_state = %{state | update_queue: new_queue}
    
    # Update stats
    new_stats = %{state.stats | total_broadcasts: state.stats.total_broadcasts + length(updates)}
    new_state = %{new_state | stats: new_stats}
    
    {:reply, :ok, new_state}
  end
  
  def handle_call(:get_stats, _from, state) do
    stats = %{
      total_broadcasts: state.stats.total_broadcasts,
      like_broadcasts: state.stats.like_broadcasts,
      comment_broadcasts: state.stats.comment_broadcasts,
      share_broadcasts: state.stats.share_broadcasts,
      save_broadcasts: state.stats.save_broadcasts,
      support_broadcasts: state.stats.support_broadcasts,
      avg_batch_size: state.stats.avg_batch_size,
      total_targets: state.stats.total_targets,
      queue_size: :queue.len(state.update_queue),
      batch_size: state.batch_size,
      flush_interval: state.flush_interval,
    }
    
    {:reply, stats, state}
  end
  
  # GenServer callbacks
  def handle_info(:flush_updates, state) do
    case flush_updates(state) do
      {:ok, updates, new_state} ->
        # Update stats
        new_stats = update_batch_stats(state.stats, updates)
        final_state = %{new_state | stats: new_stats}
        
        # Schedule next flush
        Process.send_after(self(), :flush_updates, state.flush_interval)
        {:noreply, final_state}
      
      {:empty, new_state} ->
        # Schedule next flush
        Process.send_after(self(), :flush_updates, state.flush_interval)
        {:noreply, new_state}
    end
  end
  
  # Private functions
  defp flush_updates(state) do
    if :queue.is_empty(state.update_queue) do
      {:empty, state}
    else
      # Get updates from queue
      {updates, remaining_queue} = :queue.split(state.batch_size, state.update_queue)
      
      # Group updates by type for efficient broadcasting
      grouped_updates = Enum.group_by(updates, & &1.type)
      
      # Broadcast each group
      Enum.each(grouped_updates, fn {type, type_updates} ->
        broadcast_updates_by_type(type, type_updates)
      end)
      
      # Update target cache
      new_target_cache = update_target_cache(state.target_cache, updates)
      
      new_state = %{
        state | 
        update_queue: remaining_queue,
        target_cache: new_target_cache
      }
      
      {:ok, updates, new_state}
    end
  end
  
  defp broadcast_updates_by_type(:like, updates) do
    Enum.each(updates, fn update ->
      # Serialize to ProtoBuf
      proto_message = %{
        id: update.interaction.id,
        user_id: update.interaction.user_id,
        reel_id: update.interaction.reel_id,
        is_liked: update.interaction.is_liked,
        timestamp: update.interaction.timestamp,
        device_info: update.interaction.device_info,
        location: update.interaction.location,
      }
      
      # Broadcast to reel channel
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "reel:#{update.reel_id}",
        {:like_update, proto_message}
      )
      
      # Broadcast to specific users
      Enum.each(update.targets, fn target_user_id ->
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "user:#{target_user_id}",
          {:like_update, proto_message}
        )
      end)
    end)
  end
  
  defp broadcast_updates_by_type(:comment, updates) do
    Enum.each(updates, fn update ->
      # Serialize to ProtoBuf
      proto_message = %{
        id: update.interaction.id,
        user_id: update.interaction.user_id,
        reel_id: update.interaction.reel_id,
        text: update.interaction.text,
        username: update.interaction.username,
        timestamp: update.interaction.timestamp,
        likes: update.interaction.likes,
        parent_comment_id: update.interaction.parent_comment_id,
        device_info: update.interaction.device_info,
      }
      
      # Broadcast to reel channel
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "reel:#{update.reel_id}",
        {:comment_update, proto_message}
      )
      
      # Broadcast to specific users
      Enum.each(update.targets, fn target_user_id ->
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "user:#{target_user_id}",
          {:comment_update, proto_message}
        )
      end)
    end)
  end
  
  defp broadcast_updates_by_type(:comment_like, updates) do
    Enum.each(updates, fn update ->
      # Serialize to ProtoBuf
      proto_message = %{
        id: update.interaction.id,
        user_id: update.interaction.user_id,
        reel_id: update.interaction.reel_id,
        comment_id: update.interaction.id,
        likes: update.interaction.likes,
        timestamp: update.interaction.timestamp,
      }
      
      # Broadcast to reel channel
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "reel:#{update.reel_id}",
        {:comment_like_update, proto_message}
      )
      
      # Broadcast to specific users
      Enum.each(update.targets, fn target_user_id ->
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "user:#{target_user_id}",
          {:comment_like_update, proto_message}
        )
      end)
    end)
  end
  
  defp broadcast_updates_by_type(:share, updates) do
    Enum.each(updates, fn update ->
      # Serialize to ProtoBuf
      proto_message = %{
        id: update.interaction.id,
        user_id: update.interaction.user_id,
        reel_id: update.interaction.reel_id,
        platform: update.interaction.platform,
        share_url: update.interaction.share_url,
        timestamp: update.interaction.timestamp,
        device_info: update.interaction.device_info,
        location: update.interaction.location,
      }
      
      # Broadcast to reel channel
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "reel:#{update.reel_id}",
        {:share_update, proto_message}
      )
      
      # Broadcast to specific users
      Enum.each(update.targets, fn target_user_id ->
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "user:#{target_user_id}",
          {:share_update, proto_message}
        )
      end)
    end)
  end
  
  defp broadcast_updates_by_type(:save, updates) do
    Enum.each(updates, fn update ->
      # Serialize to ProtoBuf
      proto_message = %{
        id: update.interaction.id,
        user_id: update.interaction.user_id,
        reel_id: update.interaction.reel_id,
        is_saved: update.interaction.is_saved,
        timestamp: update.interaction.timestamp,
        device_info: update.interaction.device_info,
        location: update.interaction.location,
      }
      
      # Broadcast to reel channel
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "reel:#{update.reel_id}",
        {:save_update, proto_message}
      )
      
      # Broadcast to specific users
      Enum.each(update.targets, fn target_user_id ->
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "user:#{target_user_id}",
          {:save_update, proto_message}
        )
      end)
    end)
  end
  
  defp broadcast_updates_by_type(:support, updates) do
    Enum.each(updates, fn update ->
      # Serialize to ProtoBuf
      proto_message = %{
        id: update.interaction.id,
        user_id: update.interaction.user_id,
        target_user_id: update.interaction.target_user_id,
        is_supporting: update.interaction.is_supporting,
        timestamp: update.interaction.timestamp,
        device_info: update.interaction.device_info,
        location: update.interaction.location,
      }
      
      # Broadcast to user channel
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "user:#{update.user_id}",
        {:support_update, proto_message}
      )
      
      # Broadcast to target user
      Phoenix.PubSub.broadcast(
        KronopCoreElixir.PubSub,
        "user:#{update.interaction.target_user_id}",
        {:support_update, proto_message}
      )
      
      # Broadcast to specific users
      Enum.each(update.targets, fn target_user_id ->
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "user:#{target_user_id}",
          {:support_update, proto_message}
        )
      end)
    end)
  end
  
  defp get_reel_viewers(reel_id) do
    # In a real implementation, this would get from presence tracker
    # For now, return empty list
    []
  end
  
  defp get_user_followers(user_id) do
    # In a real implementation, this would get from database
    # For now, return empty list
    []
  end
  
  defp update_target_cache(cache, updates) do
    # Update target cache with new targets
    Enum.reduce(updates, cache, fn update, acc ->
      targets = Map.get(acc, update.reel_id, MapSet.new())
      new_targets = Enum.reduce(update.targets, targets, fn target_id, acc_targets ->
        MapSet.put(acc_targets, target_id)
      end)
      Map.put(acc, update.reel_id, new_targets)
    end)
  end
  
  defp update_batch_stats(stats, updates) do
    total_updates = length(updates)
    total_targets = Enum.reduce(updates, 0, fn update, acc ->
      acc + length(update.targets)
    end)
    
    new_avg_batch_size = if stats.total_broadcasts > 0 do
      (stats.avg_batch_size * stats.total_broadcasts + total_updates) / (stats.total_broadcasts + 1)
    else
      total_updates
    end
    
    %{stats | 
      total_broadcasts: stats.total_broadcasts + total_updates,
      avg_batch_size: new_avg_batch_size,
      total_targets: stats.total_targets + total_targets
    }
  end
end
