defmodule ChitchatWeb.Room.ShowLive do
  @moduledoc """
  A LiveView for creating and joining chat rooms.
  """

  use ChitchatWeb, :live_view

  alias Chitchat.Organizer
  alias Chitchat.ConnectedUser

  alias Chitchat.Presence

  @impl true
  def render(assigns) do
    ~H"""
    <h1><%= @room.title %></h1>
    """
  end

  @impl true
  def mount(%{"slug" => slug}, _session, socket) do
    user = create_connected_user()

    Phoenix.PubSub.subscribe(Chitchat.PubSub, "room:" <> slug)
    {:ok, _} = Presence.track(self(), "room:" <> slug, user.uuid, %{})

    case Organizer.get_room(slug) do
      nil ->
        {:ok,
          socket
          |> put_flash(:error, "That room does not exist.")
          |> push_redirect(to: Routes.room_new_path(socket, :new))
        }
      room ->
        {:ok,
          socket
          |> assign(:room, room)
          |> assign(:user, user)
          |> assign(:slug, slug)
        }
    end
  end

  defp create_connected_user do
    %ConnectedUser{uuid: UUID.uuid4()}
  end
end
