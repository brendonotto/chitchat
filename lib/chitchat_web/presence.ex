defmodule ChitchatWeb.Presence do
  use Phoenix.Presence,
    otp_app: :chitchat,
    pubsub_server: Chitchat.PubSub
end
