import os
from enum import StrEnum

from convex import ConvexClient


class Source(StrEnum):
    """Enum for video sources."""
    YOUTUBE = "youtube"


# Initialize Convex client
convex_url = os.environ.get("CONVEX_URL")
convex_client = ConvexClient(convex_url) if convex_url else None


def save_summary_request(
    user_id: str,
    video_id: str,
    title: str,
    author: str,
    thumbnail_url: str,
    length: int,
    source: Source = Source.YOUTUBE,
) -> None:
    """Save or update a user's summary request to Convex."""
    if not convex_client:
        return
    convex_client.mutation(
        "summaryRequests:upsert",
        {
            "userId": user_id,
            "source": source,
            "videoId": video_id,
            "title": title,
            "author": author,
            "thumbnailUrl": thumbnail_url,
            "length": length,
        },
    )


def get_user_history(user_id: str) -> list:
    """Get user's summary request history from Convex."""
    if not convex_client:
        return []
    return convex_client.query(
        "summaryRequests:listByUser",
        {"userId": user_id},
    )
