defmodule KronopCoreElixir.RealTime.PresenceRegistry do
  @moduledoc """
  Registry for managing user presence
  
  Provides:
  - Presence storage
  - User lookup
  - Session management
  - Activity tracking
  """
  
  use GenServer
  require Logger
  
  @type user_id :: String
  @type session_id :: String
  @type presence :: %Presence{}
  @type registry :: %{user_id() => %{session_id() => presence()}}
  
  defstruct registry: %{},
            session_index: %{},
            user_index: %{}
  
  @type t :: %__MODULE__{
    registry: registry(),
    session_index: %{session_id() => user_id()},
    user_index: %{user_id() => MapSet.t(session_id())}
  }
  
  def new do
    GenServer.start_link(__MODULE__, [])
  end
  
  def add_presence(registry, presence) do
    GenServer.call(registry, {:add_presence, presence})
  end
  
  def remove_presence(registry, user_id, session_id) do
    GenServer.call(registry, {:remove_presence, user_id, session_id})
  end
  
  def get_user_presence(registry, user_id) do
    GenServer.call(registry, {:get_user_presence, user_id})
  end
  
  def get_session_presence(registry, user_id, session_id) do
    GenServer.call(registry, {:get_session_presence, user_id, session_id})
  end
  
  def get_user_sessions(registry, user_id) do
    GenServer.call(registry, {:get_user_sessions, user_id})
  end
  
  def get_online_users(registry) do
    GenServer.call(registry, :get_online_users)
  end
  
  def get_total_sessions(registry) do
    GenServer.call(registry, :get_total_sessions)
  end
  
  def get_active_sessions(registry) do
    GenServer.call(registry, :get_active_sessions)
  end
  
  def update_presence_activity(registry, user_id, session_id, activity) do
    GenServer.call(registry, {:update_presence_activity, user_id, session_id, activity})
  end
  
  # GenServer callbacks
  @impl true
  def init(_opts) do
    state = %__MODULE__{
      registry: %{},
      session_index: %{},
      user_index: %{},
    }
    
    Logger.info("PresenceRegistry initialized")
    {:ok, state}
  end
  
  @impl true
  def handle_call({:add_presence, presence}, _from, state) do
    user_presences = Map.get(state.registry, presence.user_id, %{})
    
    # Check if user already has too many sessions (limit to 5)
    if map_size(user_presences) >= 5 do
      # Remove oldest session
      oldest_session = Enum.min_by(user_presences, fn {_id, p} -> p.created_at end)
      remove_presence(state, presence.user_id, oldest_session.session_id)
    end
    
    # Add new presence
    new_user_presences = Map.put(user_presences, presence.session_id, presence)
    new_registry = Map.put(state.registry, presence.user_id, new_user_presences)
    
    # Update session index
    new_session_index = Map.put(state.session_index, presence.session_id, presence.user_id)
    
    # Update user index
    user_sessions = Map.get(state.user_index, presence.user_id, MapSet.new())
    new_user_sessions = MapSet.put(user_sessions, presence.session_id)
    new_user_index = Map.put(state.user_index, presence.user_id, new_user_sessions)
    
    new_state = %{
      state |
      registry: new_registry,
      session_index: new_session_index,
      user_index: new_user_index
    }
    
    {:ok, new_state}
  end
  
  def handle_call({:remove_presence, user_id, session_id}, _from, state) do
    case Map.get(state.registry, user_id) do
      nil ->
        {:reply, {:error, :not_found}, state}
      
      user_presences ->
        case Map.get(user_presences, session_id) do
          nil ->
            {:reply, {:error, :session_not_found}, state}
          
          presence ->
            # Remove from user presences
            new_user_presences = Map.delete(user_presences, session_id)
            new_registry = Map.put(state.registry, user_id, new_user_presences)
            
            # Remove from session index
            new_session_index = Map.delete(state.session_index, session_id)
            
            # Remove from user index
            user_sessions = Map.get(state.user_index, user_id, MapSet.new())
            new_user_sessions = MapSet.delete(user_sessions, session_id)
            new_user_index = if MapSet.size(new_user_sessions) > 0 do
              Map.put(state.user_index, user_id, new_user_sessions)
            else
              Map.delete(state.user_index, user_id)
            end
            
            new_state = %{
              state |
              registry: new_registry,
              session_index: new_session_index,
              user_index: new_user_index
            }
            
            {:reply, :ok, new_state}
        end
    end
  end
  
  def handle_call({:get_user_presence, user_id}, _from, state) do
    case Map.get(state.registry, user_id) do
      nil ->
        {:reply, nil, state}
      
      user_presences ->
        # Return most recent session
        most_recent = Enum.max_by(user_presences, fn {_id, p} -> p.last_activity end)
        {:reply, most_recent, state}
    end
  end
  
  def handle_call({:get_session_presence, user_id, session_id}, _from, state) do
    case Map.get(state.registry, user_id) do
      nil ->
        {:reply, nil, state}
      
      user_presences ->
        case Map.get(user_presences, session_id) do
          nil ->
            {:reply, nil, state}
          
          presence ->
            {:reply, presence, state}
        end
    end
  end
  
  def handle_call({:get_user_sessions, user_id}, _from, state) do
    case Map.get(state.registry, user_id) do
      nil ->
        {:reply, [], state}
      
      user_presences ->
        sessions = Map.values(user_presences)
        {:reply, sessions, state}
    end
  end
  
  def handle_call(:get_online_users, _from, state) do
    online_users = 
      state.registry
      |> Enum.filter(fn {_user_id, user_presences} ->
        user_presences
        |> Enum.any?(fn {_session_id, presence} -> presence.is_online end)
      end)
      |> Enum.map(fn {user_id, _presences} -> user_id end)
    
    {:reply, online_users, state}
  end
  
  def handle_call(:get_total_sessions, _from, state) do
    total_sessions = 
      state.registry
      |> Enum.reduce(0, fn (_acc, {_user_id, user_presences} ->
        _acc + map_size(user_presences)
      end)
    
    {:reply, total_sessions, state}
  end
  
  def handle_call(:get_active_sessions, _from, state) do
    active_sessions = 
      state.registry
      |> Enum.reduce(0, fn (_acc, {_user_id, user_presences} ->
        _acc + Enum.count(user_presences, fn {_session_id, presence} -> presence.is_active? end)
      end)
    
    {:reply, active_sessions, state}
  end
  
  def handle_call({:update_presence_activity, user_id, session_id, activity}, _from, state) do
    case Map.get(state.registry, user_id) do
      nil ->
        {:reply, {:error, :not_found}, state}
      
      user_presences ->
        case Map.get(user_presences, session_id) do
          nil ->
            {:reply, {:error, :session_not_found}, state}
          
          presence ->
            updated_presence = Presence.update_activity(presence, activity)
            new_user_presences = Map.put(user_presences, session_id, updated_presence)
            new_registry = Map.put(state.registry, user_id, new_user_presences)
            
            new_state = %{state | registry: new_registry}
            {:reply, :ok, new_state}
        end
    end
  end
  
  # Private functions
  defp remove_presence(state, user_id, session_id) do
    case Map.get(state.registry, user_id) do
      nil ->
        state
      
      user_presences ->
        case Map.get(user_presences, session_id) do
          nil ->
            state
          
          presence ->
            new_user_presences = Map.delete(user_presences, session_id)
            new_registry = Map.put(state.registry, user_id, new_user_presences)
            
            # Remove from session index
            new_session_index = Map.delete(state.session_index, session_id)
            
            # Remove from user index
            user_sessions = Map.get(state.user_index, user_id, MapSet.new())
            new_user_sessions = MapSet.delete(user_sessions, session_id)
            new_user_index = if MapSet.size(new_user_sessions) > 0 do
              Map.put(state.user_index, user_id, new_user_sessions)
            else
              Map.delete(state.user_index, user_id)
            end
            
            %{
              state |
              registry: new_registry,
              session_index: new_session_index,
              user_index: new_user_index
            }
        end
    end
  end
end
