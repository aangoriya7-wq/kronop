defmodule KronopCoreElixir.RealTime.PresenceTracker do
  @moduledoc """
  Tracks user presence and activity
  
  Manages:
  - User online/offline status
  - Activity monitoring
  - Presence statistics
  - Session management
  """
  
  use GenServer
  use Phoenix.PubSub
  require Logger
  
  alias KronopCoreElixir.RealTime.{Presence, PresenceRegistry}
  
  @type user_id :: String
  @type presence :: %Presence{}
  @type session_id :: String
  
  defstruct registry: %PresenceRegistry{},
            stats: %{
              total_users: integer(),
              online_users: integer(),
              total_sessions: integer(),
              active_sessions: integer(),
            }
  
  # Public API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts)
  end
  
  def track_user(user_id, session_id, metadata \\ %{}) do
    GenServer.call(__MODULE__, {:track_user, user_id, session_id, metadata})
  end
  
  def untrack_user(user_id, session_id) do
    GenServer.call(__MODULE__, {:untrack_user, user_id, session_id})
  end
  
  def get_user_presence(user_id) do
    GenServer.call(__MODULE__, {:get_user_presence, user_id})
  end
  
  def get_online_users do
    GenServer.call(__MODULE__, :get_online_users)
  end
  
  def get_user_sessions(user_id) do
    GenServer.call(__MODULE__, {:get_user_sessions, user_id})
  end
  
  def update_user_activity(user_id, session_id, activity) do
    GenServer.call(__MODULE__, {:update_user_activity, user_id, session_id, activity})
  end
  
  def get_stats do
    GenServer.call(__MODULE__, :get_stats)
  end
  
  # GenServer callbacks
  @impl true
  def init(opts) do
    registry = PresenceRegistry.new()
    
    state = %__MODULE__{
      registry: registry,
      stats: %{
        total_users: 0,
        online_users: 0,
        total_sessions: 0,
        active_sessions: 0,
      }
    }
    
    # Subscribe to presence events
    Phoenix.PubSub.subscribe(KronopCoreElixir.PubSub, "presence_events")
    
    Logger.info("PresenceTracker started")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:track_user, user_id, session_id, metadata}, _from, state) do
    presence = Presence.new(user_id, session_id, metadata)
    
    case PresenceRegistry.add_presence(state.registry, presence) do
      {:ok, new_registry} ->
        # Update stats
        new_stats = update_stats_for_add(state.registry, new_registry, state.stats)
        
        # Broadcast presence event
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "presence_events",
          {:user_online, user_id, session_id, metadata}
        )
        
        new_state = %{state | registry: new_registry, stats: new_stats}
        {:reply, {:ok, presence}, new_state}
      
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:untrack_user, user_id, session_id}, _from, state) do
    case PresenceRegistry.remove_presence(state.registry, user_id, session_id) do
      {:ok, new_registry} ->
        # Update stats
        new_stats = update_stats_for_remove(state.registry, new_registry, state.stats)
        
        # Broadcast presence event
        Phoenix.PubSub.broadcast(
          KronopCoreElixir.PubSub,
          "presence_events",
          {:user_offline, user_id, session_id}
        )
        
        new_state = %{state | registry: new_registry, stats: new_stats}
        {:reply, :ok, new_state}
      
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call({:get_user_presence, user_id}, _from, state) do
    presence = PresenceRegistry.get_user_presence(state.registry, user_id)
    {:reply, presence, state}
  end
  
  def handle_call(:get_online_users, _from, state) do
    online_users = PresenceRegistry.get_online_users(state.registry)
    {:reply, online_users, state}
  end
  
  def handle_call({:get_user_sessions, user_id}, _from, state) do
    sessions = PresenceRegistry.get_user_sessions(state.registry, user_id)
    {:reply, sessions, state}
  end
  
  def handle_call({:update_user_activity, user_id, session_id, activity}, _from, state) do
    case PresenceRegistry.update_presence_activity(state.registry, user_id, session_id, activity) do
      {:ok, new_registry} ->
        new_state = %{state | registry: new_registry}
        {:reply, :ok, new_state}
      
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end
  
  def handle_call(:get_stats, _from, state) do
    {:reply, state.stats, state}
  end
  
  # PubSub callbacks
  def handle_info({:user_online, user_id, session_id, metadata}, state) do
    Logger.info("User came online: #{user_id} (session: #{session_id})")
    {:noreply, state}
  end
  
  def handle_info({:user_offline, user_id, session_id}, state) do
    Logger.info("User went offline: #{user_id} (session: #{session_id})")
    {:noreply, state}
  end
  
  # Private functions
  defp update_stats_for_add(old_registry, new_registry, stats) do
    total_users = map_size(new_registry)
    online_users = PresenceRegistry.get_online_users(new_registry)
    total_sessions = PresenceRegistry.get_total_sessions(new_registry)
    active_sessions = PresenceRegistry.get_active_sessions(new_registry)
    
    %{stats |
      total_users: total_users,
      online_users: online_users,
      total_sessions: total_sessions,
      active_sessions: active_sessions
    }
  end
  
  defp update_stats_for_remove(old_registry, new_registry, stats) do
    total_users = map_size(new_registry)
    online_users = PresenceRegistry.get_online_users(new_registry)
    total_sessions = PresenceRegistry.get_total_sessions(new_registry)
    active_sessions = PresenceRegistry.get_active_sessions(new_registry)
    
    %{stats |
      total_users: total_users,
      online_users: online_users,
      total_sessions: total_sessions,
      active_sessions: active_sessions
    }
  end
end
