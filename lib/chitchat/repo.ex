defmodule Chitchat.Repo do
  use Ecto.Repo,
    otp_app: :chitchat,
    adapter: Ecto.Adapters.Postgres
end
