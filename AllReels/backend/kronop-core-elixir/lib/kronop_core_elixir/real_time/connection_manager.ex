defmodule KronopCoreElixir.RealTime.ConnectionManager do
  @moduledoc """
  Manages WebSocket connections for real-time communication
  
  Handles:
  - WebSocket connection lifecycle
  - Connection pooling
  - Connection health monitoring
  - Load balancing
  """
  
  use GenServer
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.{Connection, ConnectionPool}
  
  @type connection_id :: String
  @type user_id :: String
  @type socket_pid :: pid()
  
  # Client state
  defstruct state do
    field :connection_pool, %ConnectionPool{}
    field :active_connections, %{} :: %{connection_id() => Connection.t()}
    field :user_connections, %{} :: %{user_id() => MapSet.t(connection_id())}
    field :connection_stats, %{} :: %{connection_id() => Connection.stats()}
    field :pool_size, integer(), default: 1000
    field :max_connections_per_user, integer(), default: 5
  end
  
  # Public API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts)
  end
  
  def connect(user_id, socket_pid, metadata \\ %{}) do
    GenServer.call(__MODULE__, {:connect, user_id, socket_pid, metadata})
  end
  
  def disconnect(connection_id) do
    GenServer.call(__MODULE__, {:disconnect, connection_id})
  end
  
  def get_connection(connection_id) do
    GenServer.call(__MODULE__, {:get_connection, connection_id})
  end
  
  def get_user_connections(user_id) do
    GenServer.call(__MODULE__, {:get_user_connections, user_id})
  end
  
  def broadcast_to_user(user_id, message) do
    GenServer.call(__MODULE__, {:broadcast_to_user, user_id, message})
  end
  
  def broadcast_to_connections(connection_ids, message) do
    GenServer.call(__MODULE__, {:broadcast_to_connections, connection_ids, message})
  end
  
  def get_stats do
    GenServer.call(__MODULE__, :get_stats)
  end
  
  # GenServer callbacks
  @impl true
  def init(opts) do
    pool_size = Keyword.get(opts, :pool_size, 1000)
    max_per_user = Keyword.get(opts, :max_connections_per_user, 5)
    
    state = %__MODULE__{
      connection_pool: ConnectionPool.new(pool_size),
      pool_size: pool_size,
      max_connections_per_user: max_per_user,
    }
    
    # Subscribe to connection events
    Phoenix.PubSub.subscribe(KronopCoreElixir.PubSub, "connection_events")
    
    Logger.info("ConnectionManager started with pool size: #{pool_size}")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:connect, user_id, socket_pid, metadata}, _from, state) do
    case create_connection(user_id, socket_pid, metadata, state) do
      {:ok, connection, new_state} ->
        # Broadcast connection event
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "connection_events",
          {:connection_created, connection.id, user_id, metadata}
        )
        
        # Update user connections mapping
        user_connections = Map.get(new_state.user_connections, user_id, MapSet.new())
        user_connections = MapSet.put(user_connections, connection.id)
        new_state = %{new_state | user_connections: Map.put(new_state.user_connections, user_id, user_connections)}
        
        {:reply, {:ok, connection}, new_state}
      
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:disconnect, connection_id}, _from, state) do
    case Map.get(state.active_connections, connection_id) do
      nil ->
        {:reply, {:error, :not_found}, state}
      
      connection ->
        # Remove from active connections
        new_active_connections = Map.delete(state.active_connections, connection_id)
        
        # Remove from user connections
        user_connections = Map.get(state.user_connections, connection.user_id, MapSet.new())
        user_connections = MapSet.delete(user_connections, connection_id)
        new_user_connections = Map.put(state.user_connections, connection.user_id, user_connections)
        
        # Return connection to pool
        {:ok, new_pool} = ConnectionPool.return_connection(state.connection_pool, connection)
        
        new_state = %{
          state |
          active_connections: new_active_connections,
          user_connections: new_user_connections,
          connection_pool: new_pool
        }
        
        # Broadcast disconnection event
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "connection_events",
          {:connection_removed, connection_id, connection.user_id}
        )
        
        {:reply, :ok, new_state}
    end
  end
  
  def handle_call({:get_connection, connection_id}, _from, state) do
    connection = Map.get(state.active_connections, connection_id)
    {:reply, connection, state}
  end
  
  def handle_call({:get_user_connections, user_id}, _from, state) do
    connections = Map.get(state.user_connections, user_id, MapSet.new())
    connection_ids = MapSet.to_list(connections)
    
    active_connections = Enum.map(connection_ids, fn id ->
      Map.get(state.active_connections, id)
    end)
    |> Enum.filter(&(&1))
    
    {:reply, active_connections, state}
  end
  
  def handle_call({:broadcast_to_user, user_id, message}, _from, state) do
    connection_ids = Map.get(state.user_connections, user_id, MapSet.new())
    
    results = Enum.map(connection_ids, fn connection_id ->
      case Map.get(state.active_connections, connection_id) do
        nil -> {:error, :not_found}
        connection -> 
          send_message(connection.socket_pid, message)
          {:ok, connection_id}
      end
    end)
    
    successful = Enum.count(results, fn {result, _} -> result == :ok end)
    
    {:reply, {:ok, successful}, state}
  end
  
  def handle_call({:broadcast_to_connections, connection_ids, message}, _from, state) do
    results = Enum.map(connection_ids, fn connection_id ->
      case Map.get(state.active_connections, connection_id) do
        nil -> {:error, :not_found}
        connection ->
          send_message(connection.socket_pid, message)
          {:ok, connection_id}
      end
    end)
    
    successful = Enum.count(results, fn {result, _} -> result == :ok end)
    
    {:reply, {:ok, successful}, state}
  end
  
  def handle_call(:get_stats, _from, state) do
    stats = %{
      total_connections: map_size(state.active_connections),
      pool_size: state.pool_size,
      available_connections: ConnectionPool.available_count(state.connection_pool),
      max_connections_per_user: state.max_connections_per_user,
      user_count: map_size(state.user_connections),
    }
    
    {:reply, stats, state}
  end
  
  # PubSub callbacks
  def handle_info({:connection_created, connection_id, user_id, metadata}, state) do
    Logger.info("Connection created: #{connection_id} for user #{user_id}")
    {:noreply, state}
  end
  
  def handle_info({:connection_removed, connection_id, user_id}, state) do
    Logger.info("Connection removed: #{connection_id} for user #{user_id}")
    {:noreply, state}
  end
  
  # Private functions
  defp create_connection(user_id, socket_pid, metadata, state) do
    # Check user connection limit
    user_connections = Map.get(state.user_connections, user_id, MapSet.new())
    
    if MapSet.size(user_connections) >= state.max_connections_per_user do
      {:error, :too_many_connections}
    else
      # Get connection from pool
      case ConnectionPool.get_connection(state.connection_pool) do
        {:ok, connection} ->
          # Initialize connection
          connection = Connection.init(connection, user_id, socket_pid, metadata)
          
          # Add to active connections
          new_active_connections = Map.put(state.active_connections, connection.id, connection)
          
          {:ok, connection, %{state | active_connections: new_active_connections}}
        
        {:error, reason} ->
          {:error, reason}
      end
    end
  end
  
  defp send_message(socket_pid, message) do
    case Phoenix.Channel.Server.push(socket_pid, message) do
      :ok -> :ok
      {:error, reason} -> {:error, reason}
    end
  end
end
