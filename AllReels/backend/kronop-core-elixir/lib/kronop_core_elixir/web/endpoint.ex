defmodule KronopCoreElixirWeb.Endpoint do
  use Phoenix.Endpoint, :phoenix_ecto
  
  plug Plug.Router
  plug Plug.Parsers,
    plug :json,
    Plug.Phoenix.LiveReload
  
  plug CORS
  plug CORS,
    origin: ["*"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    max_age: 86400,
    expose_headers: ["*"]
  
  plug Plug.Static,
    at: "/",
    from: {:kronop_core_elixir_web, :static},
    gzip: true
  
  plug :api, "/api/v1"
  end
  
  scope "/api/v1" do
    pipe_through :api, :browser
  end
  
  scope "/api/v1" do
    pipe_through :api, :json
  end
  
  def handle_errors(conn, _params) do
    conn
    |> put_status(500)
    json(%{error: "Internal server error"})
  end
  
  def handle_not_found(conn, _params) do
    conn
    |> put_status(404)
    json(%{error: "Not found"})
  end
  
  def handle_unauthorized(conn, _params) do
    conn
    |> put_status(401)
    json(%{error: "Unauthorized"})
  end
end
