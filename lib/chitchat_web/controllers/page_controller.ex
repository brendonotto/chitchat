defmodule ChitchatWeb.PageController do
  use ChitchatWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
