import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse

try:
    from curl_cffi import requests as curl_requests
except ImportError:
    import requests as curl_requests  # fallback

CRAWL_RETRY = int(os.getenv("CRAWL_RETRY", "3"))
CRAWL_TIMEOUT = int(os.getenv("CRAWL_TIMEOUT", "30"))


def crawl_domain(domain: str) -> dict:
    """
    Crawl a domain and return all external href links found.

    Returns:
    {
        "success": True/False,
        "links": ["https://...", ...],       # all external hrefs (strings)
        "link_details": [{"href": "...", "anchor_text": "..."}],  # hrefs + anchors
        "error": None or "timeout" / "http_503" / etc
    }
    """
    last_error = "unknown"

    for scheme in ["https", "http"]:
        url = f"{scheme}://{domain}"
        for attempt in range(CRAWL_RETRY):
            try:
                response = curl_requests.get(
                    url,
                    impersonate="chrome124",
                    timeout=CRAWL_TIMEOUT,
                    allow_redirects=True,
                )
                if response.status_code >= 400:
                    last_error = f"http_{response.status_code}"
                    break  # HTTP error — don't retry, try next scheme

                soup = BeautifulSoup(response.text, "lxml")
                base_domain = _normalise_domain(domain)
                link_details = []

                for tag in soup.find_all("a", href=True):
                    href = tag["href"].strip()
                    if not href.startswith(("http://", "https://")):
                        continue
                    parsed = urlparse(href)
                    href_domain = _normalise_domain(parsed.netloc)
                    if href_domain == base_domain or href_domain.endswith(
                        "." + base_domain
                    ):
                        continue
                    anchor = tag.get_text(strip=True) or None
                    link_details.append({"href": href, "anchor_text": anchor})

                links = [item["href"] for item in link_details]
                return {
                    "success": True,
                    "links": links,
                    "link_details": link_details,
                    "error": None,
                }

            except Exception as exc:
                err = str(exc).lower()
                last_error = "timeout" if "timeout" in err else str(exc)

    return {"success": False, "links": [], "link_details": [], "error": last_error}


def _normalise_domain(netloc: str) -> str:
    domain = netloc.lower().split(":")[0]
    if domain.startswith("www."):
        domain = domain[4:]
    return domain
