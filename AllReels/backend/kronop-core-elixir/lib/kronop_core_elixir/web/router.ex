defmodule KronopCoreElixirWeb.Router do
  use KronopCoreElixirWeb, :router
  
  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {KronopCoreElixirWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end
  
  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end
  
  pipeline :websocket do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end
  
  scope "/", KronopCoreElixirWeb do
    pipe_through :browser
    
    get "/", PageController, :home
    get "/health", HealthController, :index
  end
  
  scope "/api/v1", KronopCoreElixirWeb do
    pipe_through :api
    
    # Real-time API endpoints
    post "/reels/:reel_id/updates", ReelController, :create_update
    get "/reels/:reel_id/updates", ReelController, :get_updates
    post "/reels/:reel_id/interactions", ReelController, :create_interaction
    get "/reels/:reel_id/interactions", ReelController, :get_interactions
    post "/reels/:reel_id/views", ReelController, :create_view
    get "/reels/:reel_id/views", ReelController, :get_views
    get "/reels/:reel_id/stats", ReelController, :get_stats
    get "/reels/:reel_id/metadata", ReelController, :get_metadata
    
    # User API endpoints
    post "/users/:user_id/presence", UserController, :update_presence
    get "/users/:user_id/presence", UserController, :get_presence
    get "/users/:user_id/stats", UserController, :get_stats
    get "/users/:user_id/activity", UserController, :get_activity
    post "/users/:user_id/activity", UserController, :create_activity
    get "/users/:user_id/preferences", UserController, :get_preferences
    put "/users/:user_id/preferences", UserController, :update_preferences
    
    # System API endpoints
    get "/system/stats", SystemController, :get_stats
    get "/system/health", SystemController, :health
    get "/system/metrics", SystemController, :get_metrics
    get "/system/performance", SystemController, :get_performance
    
    # Connection API endpoints
    get "/connections/stats", ConnectionController, :get_stats
    get "/connections/active", ConnectionController, :get_active
    post "/connections/broadcast", ConnectionController, :broadcast
    
    # Interaction API endpoints
    post "/interactions/toggle_like", InteractionController, :toggle_like
    get "/interactions/get_like_count", InteractionController, :get_like_count
    get "/interactions/get_user_liked_reels", InteractionController, :get_user_liked_reels
    
    post "/interactions/add_comment", InteractionController, :add_comment
    get "/interactions/get_comments", InteractionController, :get_comments
    get "/interactions/get_comment_count", InteractionController, :get_comment_count
    post "/interactions/like_comment", InteractionController, :like_comment
    
    post "/interactions/increment_share", InteractionController, :increment_share
    get "/interactions/get_share_count", InteractionController, :get_share_count
    get "/interactions/get_user_shared_reels", InteractionController, :get_user_shared_reels
    
    post "/interactions/toggle_save", InteractionController, :toggle_save
    get "/interactions/get_save_count", InteractionController, :get_save_count
    get "/interactions/get_user_saved_reels", InteractionController, :get_user_saved_reels
    
    post "/interactions/toggle_support", InteractionController, :toggle_support
    get "/interactions/get_support_count", InteractionController, :get_support_count
    get "/interactions/get_user_supporting", InteractionController, :get_user_supporting
    get "/interactions/get_user_supporters", InteractionController, :get_user_supporters
    
    get "/interactions/get_interaction_stats", InteractionController, :get_interaction_stats
    get "/interactions/get_user_interaction_history", InteractionController, :get_user_interaction_history
    get "/interactions/get_system_stats", InteractionController, :get_system_stats
    post "/interactions/batch_interactions", InteractionController, :batch_interactions
  end
  
  scope "/ws", KronopCoreElixirWeb do
    pipe_through :websocket
    
    # WebSocket channels
    get "/reel/:reel_id", ReelChannel, :join
    get "/user/:user_id", UserChannel, :join
    get "/system", SystemChannel, :join
    get "/interaction", InteractionChannel, :join
  end
  
  # LiveView routes
  scope "/", KronopCoreElixirWeb do
    pipe_through :browser
    
    live "/reels/:reel_id", ReelLive.Index, :index
    live "/reels/:reel_id/edit", ReelLive.Edit, :edit
    live "/users/:user_id", UserLive.Show, :show
    live "/dashboard", DashboardLive.Index, :index
  end
  
  # Error handling
  scope "/api/v1", KronopCoreElixirWeb do
    pipe_through :api
    
    match :*, "/:path", ErrorController, :not_found
  end
end
