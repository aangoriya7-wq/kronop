defmodule KronopCoreElixir.RealTime.Connection do
  @moduledoc """
  Represents a WebSocket connection
  
  Manages:
  - Connection metadata
  - Connection state
  - Message handling
  - Performance metrics
  """
  
  @type id :: String
  @type user_id :: String
  @type socket_pid :: pid()
  @type metadata :: map()
  @type stats :: map()
  
  defstruct id: nil,
            user_id: nil,
            socket_pid: nil,
            metadata: %{},
            stats: %{},
            created_at: nil,
            last_activity: nil,
            is_active: true
  
  @type t :: %__MODULE__{
    id: id(),
    user_id: user_id(),
    socket_pid: socket_pid(),
    metadata: metadata(),
    stats: stats(),
    created_at: DateTime.t(),
    last_activity: DateTime.t(),
    is_active: boolean()
  }
  
  @spec init(String.t(), String.t(), pid(), map()) :: {:ok, t()} | {:error, atom()}
  def init(connection_id, user_id, socket_pid, metadata \\ %{}) do
    now = DateTime.utc()
    
    connection = %__MODULE__{
      id: connection_id,
      user_id: user_id,
      socket_pid: socket_pid,
      metadata: metadata,
      stats: %{
        messages_sent: 0,
        messages_received: 0,
        bytes_sent: 0,
        bytes_received: 0,
        last_error: nil,
        error_count: 0,
        uptime_seconds: 0,
      },
      created_at: now,
      last_activity: now,
      is_active: true,
    }
    
    {:ok, connection}
  end
  
  @spec update_activity(t()) :: t()
  def update_activity(connection) do
    %{connection | 
      last_activity: DateTime.utc(),
      stats: Map.put(connection.stats, :uptime_seconds, 
        DateTime.diff(connection.created_at, DateTime.utc(), :second))
    }
  end
  
  @spec send_message(t(), any()) :: {:ok, t()} | {:error, atom()}
  def send_message(connection, message) do
    case Phoenix.Channel.Server.push(connection.socket_pid, message) do
      :ok ->
        updated_stats = connection.stats
        |> Map.put(:messages_sent, updated_stats.messages_sent + 1)
        |> Map.put(:bytes_sent, updated_stats.bytes_sent + byte_size(message))
        
        updated_connection = %{connection | 
          stats: updated_stats,
          last_activity: DateTime.utc()
        }
        
        {:ok, updated_connection}
      
      {:error, reason} ->
        updated_stats = connection.stats
        |> Map.put(:last_error, reason)
        |> Map.put(:error_count, updated_stats.error_count + 1)
        
        updated_connection = %{connection | 
          stats: updated_stats,
          last_activity: DateTime.utc()
        }
        
        {:error, reason}
    end
  end
  
  @spec receive_message(t(), any()) :: t()
  def receive_message(connection, message) do
    updated_stats = connection.stats
    |> Map.put(:messages_received, updated_stats.messages_received + 1)
    |> Map.put(:bytes_received, updated_stats.bytes_received + byte_size(message))
    
    %{connection | 
      stats: updated_stats,
      last_activity: DateTime.utc()
    }
  end
  
  @spec set_inactive(t()) :: t()
  def set_inactive(connection) do
    %{connection | is_active: false}
  end
  
  @spec set_active(t()) :: t()
  def set_active(connection) do
    %{connection | is_active: true}
  end
  
  @spec get_uptime(t()) :: non_neg_integer()
  def get_uptime(connection) do
      DateTime.diff(connection.created_at, DateTime.utc(), :second)
  end
  
  @spec is_healthy?(t()) :: boolean()
  def is_healthy?(connection) do
    connection.is_active and 
    connection.stats.error_count < 5 and
    get_uptime(connection) < 3600 # 1 hour max
  end
end
