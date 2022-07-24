defmodule Chitchat.Repo.Migrations.CreateRooms do
  use Ecto.Migration

  def change do
    create table(:rooms) do
      add :title, :string
      add :slug, :string

      timestamps()
    end

    # This makes it so each room's slug is unique
    create unique_index(:rooms, :slug)
  end
end
