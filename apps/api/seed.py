import argparse

from app.db.supabase_client import supabase

clients = [
    {
        "name": "Acorn Atelier",
        "email": "ops@acornatelier.com",
        "profile_image_url": "https://randomuser.me/api/portraits/women/44.jpg",
        "banner_image_url": "https://picsum.photos/id/1011/1200/360",
        "status": "active",
        "notes": "Priority account focused on onboarding and expansion scope.",
        "last_contacted_at": "2026-03-21T10:00:00Z",
    },
    {
        "name": "Blue Peak Logistics",
        "phone": "(312) 555-0184",
        "profile_image_url": "https://randomuser.me/api/portraits/men/32.jpg",
        "banner_image_url": "https://picsum.photos/id/1031/1200/360",
        "status": "lead",
        "notes": "Waiting on budget confirmation before proposal review.",
    },
    {
        "name": "Fern Harbor Dental",
        "email": "frontdesk@fernharbor.example",
        "profile_image_url": "https://randomuser.me/api/portraits/women/68.jpg",
        "banner_image_url": "https://picsum.photos/id/1040/1200/360",
        "status": "completed",
        "notes": "Project completed and handed off successfully.",
        "last_contacted_at": "2026-03-14T15:30:00Z",
    },
]

tags = [
    {"name": "Priority", "color": "#f97316"},
    {"name": "Design", "color": "#0ea5e9"},
    {"name": "Follow Up", "color": "#f59e0b"},
]

assigned_tags = [
    ("Acorn Atelier", "Priority"),
    ("Acorn Atelier", "Design"),
    ("Blue Peak Logistics", "Follow Up"),
]

activity = [
    {
        "client_name": "Acorn Atelier",
        "interaction_type": "meeting",
        "notes": "Reviewed onboarding checklist and next quarter expansion scope.",
        "timestamp": "2026-03-23T16:00:00Z",
    },
    {
        "client_name": "Acorn Atelier",
        "interaction_type": "note",
        "notes": "Assigned design and priority tags after kickoff.",
        "timestamp": "2026-03-22T11:45:00Z",
    },
    {
        "client_name": "Blue Peak Logistics",
        "interaction_type": "follow_up",
        "notes": "Sent pricing summary and requested budget confirmation.",
        "timestamp": "2026-03-22T13:15:00Z",
    },
    {
        "client_name": "Fern Harbor Dental",
        "interaction_type": "email",
        "notes": "Shared handoff notes after project completion.",
        "timestamp": "2026-03-19T09:30:00Z",
    },
]


def clear_tables():
    print("truncating CRM tables")
    supabase.rpc("truncate_crm_tables").execute()



def insert_clients():
    response = supabase.table("clients").insert(clients).execute()
    if response.count is None and not response.data:
        raise SystemExit("client insert returned no rows")
    return {row["name"]: row["id"] for row in response.data}


def insert_tags():
    response = supabase.table("tags").insert(tags).execute()
    if response.count is None and not response.data:
        raise SystemExit("tag insert returned no rows")
    return {row["name"]: row["id"] for row in response.data}


def insert_assignments(client_map, tag_map):
    payload = [
        {"client_id": client_map[client], "tag_id": tag_map[tag]}
        for client, tag in assigned_tags
    ]
    try:
        supabase.table("client_tags").insert(payload).execute()
    except Exception as exc:
        raise SystemExit(f"client_tags insert failed: {exc}")




def insert_activity(client_map):
    payload = []
    for item in activity:
        payload.append(
            {
                "client_id": client_map[item["client_name"]],
                "interaction_type": item["interaction_type"],
                "notes": item["notes"],
                "timestamp": item["timestamp"],
            }
        )
    try:
        supabase.table("client_activity").insert(payload).execute()
    except Exception as exc:
        raise SystemExit(f"client_activity insert failed: {exc}")




def run(drop=False):
    if drop:
        clear_tables()

    client_map = insert_clients()
    tag_map = insert_tags()
    insert_assignments(client_map, tag_map)
    insert_activity(client_map)
    print(f"seeded {len(clients)} clients, {len(tags)} tags, {len(activity)} activities")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Supabase CRM sample data.")
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop existing CRM rows before inserting sample data.",
    )

    args = parser.parse_args()
    run(drop=args.drop)
