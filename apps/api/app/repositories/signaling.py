import asyncio

from fastapi import WebSocket


class SignalingRepository:
    def __init__(self):
        self._rooms: dict[str, dict[str, WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def join(self, session_id: str, user_id: str, websocket: WebSocket):
        async with self._lock:
            room = self._rooms.setdefault(session_id, {})
            room[user_id] = websocket
            peer_count = len(room)

        await self._broadcast(
            session_id,
            {
                "type": "peer-joined",
                "session_id": session_id,
                "user_id": user_id,
                "peer_count": peer_count,
            },
            exclude_user_id=user_id,
        )
        return peer_count

    async def leave(self, session_id: str, user_id: str):
        async with self._lock:
            room = self._rooms.get(session_id)
            if not room or user_id not in room:
                return

            room.pop(user_id, None)
            peer_count = len(room)
            if not room:
                self._rooms.pop(session_id, None)

        await self._broadcast(
            session_id,
            {
                "type": "peer-left",
                "session_id": session_id,
                "user_id": user_id,
                "peer_count": peer_count,
            },
            exclude_user_id=user_id,
        )

    async def relay(self, session_id: str, sender_user_id: str, payload: dict):
        await self._broadcast(
            session_id,
            {
                "type": payload.get("type", "signal"),
                "session_id": session_id,
                "from_user_id": sender_user_id,
                "payload": payload.get("payload"),
            },
            exclude_user_id=sender_user_id,
        )

    async def peer_count(self, session_id: str) -> int:
        async with self._lock:
            room = self._rooms.get(session_id)
            return len(room) if room else 0

    async def _broadcast(self, session_id: str, message: dict, exclude_user_id: str | None = None):
        async with self._lock:
            room = dict(self._rooms.get(session_id, {}))

        for user_id, websocket in room.items():
            if exclude_user_id and user_id == exclude_user_id:
                continue

            try:
                await websocket.send_json(message)
            except Exception:
                continue
