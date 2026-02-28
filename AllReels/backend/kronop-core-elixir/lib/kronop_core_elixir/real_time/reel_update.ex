defmodule KronopCoreElixir.RealTime.ReelUpdate do
  @modudoc """
  Represents a reel update event
  
  Contains:
  - Reel identification
  - Update data
  - Target information
  - Timestamp
  """
  
  @type reel_id :: integer()
  @type update_data :: map()
  @type target_users :: [String.t()]
  @type target_channel :: String.t()
  
  defstruct id: nil,
            reel_id: nil,
            update_data: %{},
            target_users: [],
            target_channel: nil,
            timestamp: nil,
            priority: :normal
  
  @type t :: %__MODULE__{
    id: String.t(),
    reel_id: reel_id(),
    update_data: update_data(),
    target_users: target_users(),
    target_channel: target_channel(),
    timestamp: DateTime.t(),
    priority: atom()
  }
  
  @spec new(integer(), map()) :: t()
  def new(reel_id, update_data) do
    %__MODULE__{
      id: UUID.uuid4(),
      reel_id: reel_id,
      update_data: update_data,
      target_users: [],
      target_channel: nil,
      timestamp: DateTime.utc(),
      priority: :normal,
    }
  end
  
  @spec with_users(t(), [String.t()]) :: t()
  def with_users(update, user_ids) do
    %{update | target_users: user_ids}
  end
  
  @spec with_channel(t(), String.t()) :: t()
  def with_channel(update, channel) do
    %{update | target_channel: channel}
  end
  
  @spec with_priority(t(), atom()) :: t()
  def with_priority(update, priority) do
    %{update | priority: priority}
  end
  
  @spec with_data(t(), map()) :: t()
  def with_data(update, data) do
    %{update | update_data: data}
  end
  
  @spec to_json(t()) :: String.t()
  def to_json(update) do
    %{
      id: update.id,
      reel_id: update.reel_id,
      update_data: update.update_data,
      target_users: update.target_users,
      target_channel: update.target_channel,
      timestamp: DateTime.to_iso8601(update.timestamp),
      priority: update.priority,
    }
    |> Jason.encode!()
  end
  
  @spec from_json(String.t()) :: {:ok, t()} | {:error, any()}
  def from_json(json_string) do
    case Jason.decode(json_string) do
      {:ok, data} ->
        update = %__MODULE__{
          id: data["id"],
          reel_id: data["reel_id"],
          update_data: data["update_data"],
          target_users: data["target_users"] || [],
          target_channel: data["target_channel"],
          timestamp: DateTime.from_iso8601!(data["timestamp"]),
          priority: String.to_atom(data["priority"] || "normal"),
        }
        
        {:ok, update}
      
      {:error, reason} ->
        {:error, reason}
    end
  end
  
  @spec get_type(t()) :: atom()
  def get_type(update) do
    case update.update_data do
      %{"type" => "type_change"} -> :type_change
      %{"content" => "content_update"} -> :content_update
      %{"metadata" => "metadata_update"} -> :metadata_update
      %{"stats" => "stats_update"} -> :stats_update
      %{"interaction" => "interaction_update"} -> :interaction_update
      %{"view_count" => "view_count_update"} -> :view_count_update
      _ -> :general_update
    end
  end
  
  @spec get_reel_id(t()) :: integer()
  def get_reel_id(update) do
    update.reel_id
  end
  
  @spec get_timestamp(t()) :: DateTime.t()
  def get_timestamp(update) do
    update.timestamp
  end
  
  @spec is_high_priority?(t()) :: boolean()
  def is_high_priority?(update) do
    update.priority in [:urgent, :high]
  end
  
  @spec is_normal_priority?(t()) :: boolean()
  def is_normal_priority?(update) do
    update.priority == :normal
  end
  
  @spec is_low_priority?(t()) :: boolean()
  def is_low_priority?(update) do
    update.priority == :low
  end
  
  @spec has_target_users?(t()) :: boolean()
  def has_target_users?(update) do
      length(update.target_users) > 0
  end
  
  @spec has_target_channel?(t()) :: boolean()
  def has_target_channel?(update) do
      update.target_channel != nil
  end
  
  @spec get_target_count(t()) :: non_neg_integer()
  def get_target_count(update) do
      cond do
        has_target_users?(update) -> length(update.target_users)
        has_target_channel?(update) -> 1
        true -> 0
      end
  end
end
