defmodule KronopCoreElixir.RealTime.ReelBroadcaster do
  @moduledoc """
  Broadcasts reel updates to connected users
  
  Handles:
  - Real-time reel updates
  - User targeting
  - Performance optimization
  - Message batching
  """
  
  use GenServer
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.{ReelUpdate, UpdateQueue}
  
  @type reel_id :: integer()
  @type user_id :: String
  @type update :: %ReelUpdate{}
  @type update_queue :: %UpdateQueue{}
  
  defstruct update_queue: %UpdateQueue{},
            batch_size: 100,
            flush_interval: 50,
            max_queue_size: 10000
  
  defstruct state do
    state.update_queue
  end
  
  # Public API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts)
  end
  
  def broadcast_reel_update(reel_id, update) do
    GenServer.call(__MODULE__, {:broadcast_reel_update, reel_id, update})
  end
  
  def broadcast_reel_update_to_users(reel_id, user_ids, update) do
    GenServer.call(__MODULE__, {:broadcast_reel_update_to_users, reel_id, user_ids, update})
  end
  
  def broadcast_reel_update_to_channel(reel_id, channel, update) do
    GenServer.call(__MODULE__, {:broadcast_reel_update_to_channel, reel_id, channel, update})
  end
  
  def get_stats do
    GenServer.call(__MODULE__, :get_stats)
  end
  
  # GenServer callbacks
  @impl true
  def init(opts) do
    batch_size = Keyword.get(opts, :batch_size, 100)
    flush_interval = Keyword.get(opts, :flush_interval, 50)
    max_queue_size = Keyword.get(opts, :max_queue_size, 10000)
    
    update_queue = %UpdateQueue{
      batch_size: batch_size,
      flush_interval: flush_interval,
      max_queue_size: max_queue_size,
    }
    
    # Start flush timer
    Process.send_after(self(), :flush_updates, flush_interval)
    
    state = %__MODULE__{update_queue: update_queue}
    
    # Subscribe to reel events
    Phoenix.PubSub.subscribe(KronopCoreElixir.PubSub, "reel_events")
    
    Logger.info("ReelBroadcaster started")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:broadcast_reel_update, reel_id, update}, _from, state) do
    case add_to_queue(state.update_queue, reel_id, update) do
      {:ok, new_queue} ->
        new_state = %{state | update_queue: new_queue}
        {:reply, :ok, new_state}
      
      {:error, :queue_full} ->
        Logger.warn("Reel update queue full for reel #{reel_id}")
        {:reply, {:error, :queue_full}, state}
    end
  end
  
  def handle_call({:broadcast_reel_update_to_users, reel_id, user_ids, update}, _from, state) do
    update = %{update | target_users: user_ids}
    
    case add_to_queue(state.update_queue, reel_id, update) do
      {:ok, new_queue} ->
        new_state = %{state | update_queue: new_queue}
        {:reply, :ok, new_state}
      
      {:error, :queue_full} ->
        Logger.warn("Reel update queue full for reel #{reel_id}")
        {:reply, {:error, :queue_full}, state}
    end
  end
  
  def handle_call({:broadcast_reel_update_to_channel, reel_id, channel, update}, _from, state) do
    update = %{update | target_channel: channel}
    
    case add_to_queue(state.update_queue, reel_id, update) do
      {:ok, new_queue} ->
        new_state = %{state | update_queue: new_queue}
        {:reply, :ok, new_state}
      
      {:error, :queue_full} ->
        Logger.warn("Reel update queue full for reel #{reel_id}")
        {:reply, {:error, :queue_full}, state}
    end
  end
  
  def handle_call(:get_stats, _from, state) do
    stats = %{
      queue_size: UpdateQueue.size(state.update_queue),
      batch_size: state.update_queue.batch_size,
      flush_interval: state.update_queue.flush_interval,
      max_queue_size: state.update_queue.max_queue_size,
      utilization: UpdateQueue.size(state.update_queue) / state.update_queue.max_queue_size * 100,
    }
    
    {:reply, stats, state}
  end
  
  # PubSub callbacks
  def handle_info({: reel_updated, reel_id, update}, state) do
    # Add to queue for broadcasting
    case add_to_queue(state.update_queue, reel_id, update) do
      {:ok, new_queue} ->
        new_state = %{state | update_queue: new_queue}
        {:noreply, new_state}
      
      {:error, :queue_full} ->
        Logger.warn("Reel update queue full for reel #{reel_id}")
        {:noreply, state}
    end
  end
  
  # Private functions
  defp add_to_queue(queue, reel_id, update) do
    if UpdateQueue.size(queue) >= queue.max_queue_size do
      {:error, :queue_full}
    else
      new_update = ReelUpdate.new(reel_id, update)
      new_queue = UpdateQueue.add(queue, new_update)
      {:ok, new_queue}
    end
  end
  
  defp flush_updates(state) do
    case UpdateQueue.flush(state.update_queue) do
      {:ok, updates, new_queue} ->
        # Broadcast updates
        Enum.each(updates, fn update ->
          broadcast_update(update)
        end)
        
        new_state = %{state | update_queue: new_queue}
        Process.send_after(self(), :flush_updates, state.update_queue.flush_interval)
        {:noreply, new_state}
      
      {:empty, new_queue} ->
        new_state = %{state | update_queue: new_queue}
        Process.send_after(self(), :flush_updates, state.update_queue.flush_interval)
        {:noreply, new_state}
    end
  end
  
  defp broadcast_update(update) do
    cond do
      update.target_users ->
        # Broadcast to specific users
        Enum.each(update.target_users, fn user_id ->
          Phoenix.PubSub.broadcast(
            KronopCoreElixir.PubSub,
            "user:#{user_id}",
            {:reel_update, update.reel_id, update}
          )
        end)
      
      update.target_channel ->
        # Broadcast to specific channel
        Phoenix.PubSub.broadcast(
          KronopElixir.PubSub,
          "channel:#{update.target_channel}",
          {:reel_update, update.reel_id, update}
        )
      
      true ->
        # Broadcast to all
        Phoenix.PubSub.broadcast(
          KronopElixir.PubSub,
          "reel_updates",
          {:reel_update, update.reel_id, update}
        )
    end
  end
end
