import os
from enum import StrEnum

from convex import ConvexClient
from dotenv import load_dotenv

load_dotenv()

class Source(StrEnum):
    """Enum for video sources."""
    YOUTUBE = "youtube"


# Initialize Convex client
convex_url = os.environ.get("CONVEX_URL")
convex_client = ConvexClient(convex_url) if convex_url else None
private_api_key = os.environ.get("PRIVATE_API_KEY")


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
            "apiKey": private_api_key,
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
        {"apiKey": private_api_key, "userId": user_id},
    )


# Subscription service functions

def save_subscription_status(
    user_id: str,
    status: str,
    product_id: str | None = None,
    expired_at: str | None = None,
    is_trial: bool = False,
    event_type: str | None = None,
    raw_event: str | None = None,
) -> None:
    """Save or update subscription status to Convex."""
    if not convex_client:
        return
    convex_client.mutation(
        "subscriptions:upsert",
        {
            "apiKey": private_api_key,
            "userId": user_id,
            "status": status,
            "productId": product_id,
            "expiredAt": expired_at,
            "isTrial": is_trial,
            "eventType": event_type,
            "rawEvent": raw_event,
        },
    )


def get_subscription_status(user_id: str) -> dict | None:
    """Get user's subscription status from Convex."""
    if not convex_client:
        return None
    return convex_client.query(
        "subscriptions:getByUser",
        {"apiKey": private_api_key, "userId": user_id},
    )
