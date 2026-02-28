defmodule KronopCoreElixir.RealTime.ConnectionPool do
  @moduledoc """
  Connection pool for WebSocket connections
  
  Provides:
  - Connection pooling
  - Resource management
  - Performance optimization
  - Load balancing
  """
  
  use GenServer
  require Logger
  
  @type connection_id :: String
  @type connection :: %KronopCoreElixir.RealTime.Connection{}
  @type pool_size :: integer()
  
  defstruct pool_size: 0,
            available: [],
            in_use: %{},
            waiting_queue: :queue.queue(),
            max_wait_time: 5000
  
  @type t :: %__MODULE__{
    pool_size: pool_size(),
    available: [connection_id()],
    in_use: %{connection_id() => connection()},
    waiting_queue: :queue.queue(),
    max_wait_time: integer()
  }
  
  def new(pool_size) do
    GenServer.start_link(__MODULE__, pool_size)
  end
  
  def get_connection(pool) do
    GenServer.call(pool, :get_connection, pool.max_wait_time)
  end
  
  def return_connection(pool, connection) do
    GenServer.call(pool, {:return_connection, connection})
  end
  
  def available_count(pool) do
    GenServer.call(pool, :available_count)
  end
  
  def in_use_count(pool) do
    GenServer.call(pool, :in_use_count)
  end
  
  def get_stats(pool) do
    GenServer.call(pool, :get_stats)
  end
  
  # GenServer callbacks
  @impl true
  def init(pool_size) do
    state = %__MODULE__{
      pool_size: pool_size,
      available: [],
      max_wait_time: 5000,
    }
    
    Logger.info("ConnectionPool initialized with size: #{pool_size}")
    {:ok, state}
  end
  
  @impl true
  def handle_call(:get_connection, timeout, from, state) do
    case get_available_connection(state) do
      {:ok, connection_id, new_state} ->
        new_in_use = Map.put(new_state.in_use, connection_id, from)
        new_state = %{new_state | in_use: new_in_use}
        {:reply, {:ok, connection_id}, new_state}
      
      :empty ->
        case :queue.len(state.waiting_queue) do
          0 ->
            {:reply, {:error, :no_connections_available}, state}
          _ ->
            new_waiting_queue = :queue.in(from, state.waiting_queue)
            new_state = %{state | waiting_queue: new_waiting_queue}
            {:reply, {:error, :no_connections_available}, new_state}
        end
    end
  end
  
  def handle_call({:return_connection, connection_id}, _from, state) do
    case Map.get(state.in_use, connection_id) do
      nil ->
        {:reply, {:error, :not_in_use}, state}
      
      from ->
        new_in_use = Map.delete(state.in_use, connection_id)
        new_available = [connection_id | state.available]
        
        # Check if there are waiting processes
        case :queue.out(state.waiting_queue) do
          {:empty, new_waiting_queue} ->
            new_state = %{state | 
              available: new_available,
              in_use: new_in_use,
              waiting_queue: new_waiting_queue
            }
            {:reply, :ok, new_state}
          
          {{:value, waiting_from}, new_waiting_queue} ->
            new_in_use = Map.put(new_in_use, connection_id, waiting_from)
            new_state = %{state | 
              available: new_available,
              in_use: new_in_use,
              waiting_queue: new_waiting_queue
            }
            
            # Notify waiting process
            GenServer.reply(waiting_from, {:ok, connection_id})
            {:reply, :ok, new_state}
        end
    end
  end
  
  def handle_call(:available_count, _from, state) do
    {:reply, length(state.available), state}
  end
  
  def handle_call(:in_use_count, _from, state) do
    {:reply, map_size(state.in_use), state}
  end
  
  def handle_call(:get_stats, _from, state) do
    stats = %{
      pool_size: state.pool_size,
      available: length(state.available),
      in_use: map_size(state.in_use),
      waiting: :queue.len(state.waiting_queue),
      utilization: (map_size(state.in_use) / state.pool_size) * 100,
    }
    
    {:reply, stats, state}
  end
  
  # Private functions
  defp get_available_connection(state) do
    case state.available do
      [connection_id | remaining] ->
        new_available = remaining
        {:ok, connection_id, %{state | available: new_available}}
      [] ->
        :empty
    end
  end
end
