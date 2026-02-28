defmodule KronopCoreElixir.RealTime.Presence do
  @moduledoc """
  Represents a user's presence
  
  Contains:
  - User identification
  - Session information
  - Activity tracking
  - Metadata
  """
  
  @type user_id :: String
  @type session_id :: String
  @type metadata :: map()
  @type activity :: map()
  
  defstruct user_id: nil,
            session_id: nil,
            metadata: %{},
            activity: %{},
            created_at: nil,
            last_activity: nil,
            is_online: true
  
  @type t :: %__MODULE__{
    user_id: user_id(),
    session_id: session_id(),
    metadata: metadata(),
    activity: activity(),
    created_at: DateTime.t(),
    last_activity: DateTime.t(),
    is_online: boolean()
  }
  
  @spec new(String.t(), String.t(), map()) :: t()
  def new(user_id, session_id, metadata \\ %{}) do
    now = DateTime.utc()
    
    %__MODULE__{
      user_id: user_id,
      session_id: session_id,
      metadata: metadata,
      activity: %{
        current_reel: 0,
        scroll_speed: 0.0,
        watch_time: 0.0,
        interactions: 0,
        last_action: "connected",
      },
      created_at: now,
      last_activity: now,
      is_online: true,
    }
  end
  
  @spec update_activity(t(), map()) :: t()
  def update_activity(presence, activity) do
    new_activity = Map.merge(presence.activity, activity)
    
    %{presence |
      activity: new_activity,
      last_activity: DateTime.utc(),
      is_online: true
    }
  end
  
  @spec set_offline(t()) :: t()
  def set_offline(presence) do
    %{presence |
      is_online: false,
      last_activity: DateTime.utc()
    }
  end
  
  @spec set_online(t()) :: t()
  def set_online(presence) do
    %{presence |
      is_online: true,
      last_activity: DateTime.utc()
    }
  end
  
  @spec get_uptime(t()) :: non_neg_integer()
  def get_uptime(presence) do
    DateTime.diff(presence.created_at, DateTime.utc(), :second)
  end
  
  @spec is_active?(t()) :: boolean()
  def is_active?(presence) do
    presence.is_online and 
    get_uptime(presence) < 3600 and
    DateTime.diff(presence.last_activity, DateTime.utc(), :second) < 300
  end
  
  @spec get_current_reel(t()) :: integer()
  def get_current_reel(presence) do
    Map.get(presence.activity, :current_reel, 0)
  end
  
  @spec get_scroll_speed(t()) :: float()
  def get_scroll_speed(presence) do
    Map.get(presence.activity, :scroll_speed, 0.0)
  end
  
  @spec get_watch_time(t()) :: float()
  def get_watch_time(presence) do
    Map.get(presence.activity, :watch_time, 0.0)
  end
  
  @spec get_interactions(t()) :: integer()
  def get_interactions(presence) do
    Map.get(presence.activity, :interactions, 0)
  end
  
  @spec get_last_action(t()) :: String.t()
  def get_last_action(presence) do
    Map.get(presence.activity, :last_action, "connected")
  end
end
