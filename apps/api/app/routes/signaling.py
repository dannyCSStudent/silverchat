from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.auth import get_user_from_access_token
from app.repositories.matchmaking import MatchQueueRepository
from app.repositories.signaling import SignalingRepository

router = APIRouter(prefix="/ws", tags=["Signaling"])
queue = MatchQueueRepository()
signaling = SignalingRepository()


def _is_session_member(session_id: str, user_id: str) -> bool:
    session_rows = queue.get_sessions([session_id])
    if not session_rows:
        return False

    session_row = session_rows[0]
    return user_id in {
        session_row.get("initiator_user_id"),
        session_row.get("recipient_user_id"),
    }


@router.websocket("/signaling")
async def websocket_signaling(websocket: WebSocket, session_id: str, token: str):
    try:
        user = get_user_from_access_token(token)
    except Exception:
        await websocket.close(code=4401)
        return

    if not session_id or not _is_session_member(session_id, user.id):
        await websocket.close(code=4403)
        return

    await websocket.accept()
    peer_count = await signaling.join(session_id, user.id, websocket)
    await websocket.send_json(
        {
            "type": "ready",
            "session_id": session_id,
            "user_id": user.id,
            "peer_count": peer_count,
        }
    )

    try:
        while True:
            payload = await websocket.receive_json()
            message_type = payload.get("type")

            if message_type == "leave":
                await websocket.send_json(
                    {
                        "type": "left",
                        "session_id": session_id,
                        "user_id": user.id,
                    }
                )
                break

            if message_type == "ping":
                await websocket.send_json({"type": "pong", "session_id": session_id})
                continue

            await signaling.relay(session_id, user.id, payload)
    except WebSocketDisconnect:
        pass
    finally:
        await signaling.leave(session_id, user.id)
