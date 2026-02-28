defmodule KronopCoreElixir.RealTime.UpdateQueue do
  @moduledoc """
  Queue for managing reel updates
  
  Provides:
  - FIFO queue operations
  - Batch processing
  - Size management
  - Performance optimization
  """
  
  use GenServer
  require Logger
  
  @type update :: %ReelUpdate{}
  
  defstruct queue: :queue.queue(),
            batch_size: integer(),
            max_size: integer(),
            flush_interval: integer()
  
  @type t :: %__MODULE__{
    queue: :queue.queue(),
    batch_size: integer(),
    max_size: integer(),
    flush_interval: integer()
  }
  
  def new(opts \\ []) do
    batch_size = Keyword.get(opts, :batch_size, 100)
    max_size = Keyword.get(opts, :max_size, 10000)
    flush_interval = Keyword.get(opts, :flush_interval, 50)
    
    queue = :queue.new()
    
    %__MODULE__{
      queue: queue,
      batch_size: batch_size,
      max_size: max_size,
      flush_interval: flush_interval,
    }
  end
  
  @spec add(t(), t()) :: {:ok, t()} | {:error, :queue_full}
  def add(queue, update) do
    if :queue.len(queue) >= queue.max_size do
      {:error, :queue_full}
    else
      new_queue = :queue.in(queue, update)
      {:ok, new_queue}
    end
  end
  
  @spec add_batch(t(), [t()]) :: {:ok, t()} | {:error, :queue_full}
  def add_batch(queue, updates) do
    case add_batch_with_limit(queue, updates, queue.max_size) do
      {:ok, new_queue, added} ->
        {:ok, new_queue}
      
      {:error, :queue_full} ->
        {:error, :queue_full}
    end
  end
  
  defp add_batch_with_limit(queue, updates, limit) do
    added_updates = []
    remaining_updates = updates
    
    Enum.each(updates, fn update ->
      if length(added_updates) >= limit do
        {:halt}
      end
      
      case add(queue, update) do
        {:ok, new_queue} ->
          added_updates = [update | added_updates]
          remaining_updates = List.delete_at(remaining_updates, 0)
          new_queue = new_queue
          continue
          
        {:error, :queue_full} ->
          {:error, :queue_full, added_updates, remaining_updates}
      end
    end)
    
    if length(added_updates) == length(updates) do
      {:ok, new_queue, []}
    else
      {:error, :queue_full, added_updates, remaining_updates}
    end
  end
  
  @spec size(t()) :: non_neg_integer()
  def size(queue) do
    :queue.len(queue)
  end
  
  @spec empty?(t()) :: boolean()
  def empty?(queue) do
    :queue.is_empty(queue)
  end
  
  @spec flush(t()) :: {:ok, [t()], t()} | {:empty, t()}
  def flush(queue) do
    if :queue.is_empty(queue) do
      {:empty, queue}
    else
      updates = :queue.to_list()
      new_queue = :queue.new()
      
      {:ok, updates, new_queue}
    end
  end
  
  @spec take(t(), integer()) :: {:ok, [t()], t()}
  def take(queue, count) do
    if :queue.is_empty(queue) do
      {:ok, [], queue}
    else
      {taken, remaining} = :queue.split(count)
      new_queue = :queue.from_list(remaining)
      
      {:ok, taken, new_queue}
    end
  end
  
  @spec peek(t()) :: {:ok, t() | :empty}
  def peek(queue) do
    if :queue.is_empty(queue) do
      :empty
    else
      {:ok, :queue.peek()}
    end
  end
  
  @spec to_list(t()) :: [t()]
  def to_list(queue) do
    :queue.to_list()
  end
  
  @spec clear(t()) :: t()
  def clear(queue) do
    :queue.new()
  end
  
  @spec utilization(t()) :: float()
  def utilization(queue) do
    size(queue) / queue.max_size * 100
  end
end
