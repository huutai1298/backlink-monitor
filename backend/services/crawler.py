import os
import re
import logging
from bs4 import BeautifulSoup
from urllib.parse import urlparse

try:
    from curl_cffi import requests as curl_requests
except ImportError:
    import requests as curl_requests  # fallback

CRAWL_RETRY = int(os.getenv("CRAWL_RETRY", "3"))
CRAWL_TIMEOUT = int(os.getenv("CRAWL_TIMEOUT", "30"))

logger = logging.getLogger(__name__)


def _clean_domain(raw: str) -> str:
    """Strip protocol, www, port, path, query and fragment from a domain string."""
    d = raw.strip()
    # Ensure urlparse sees a valid scheme so netloc is populated correctly
    if not re.match(r'^https?://', d, flags=re.IGNORECASE):
        d = 'https://' + d
    parsed = urlparse(d)
    netloc = parsed.netloc or parsed.path
    netloc = netloc.split(':')[0]  # strip port
    netloc = re.sub(r'^www\.', '', netloc, flags=re.IGNORECASE)
    return netloc.lower()


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
    original_domain = domain
    domain = _clean_domain(domain)
    last_error = "unknown"

    for scheme in ["https", "http"]:
        url = f"{scheme}://{domain}"
        for attempt in range(CRAWL_RETRY):
            try:
                logger.debug("Crawling %s (attempt %d/%d)", url, attempt + 1, CRAWL_RETRY)
                response = curl_requests.get(
                    url,
                    impersonate="chrome124",
                    timeout=CRAWL_TIMEOUT,
                    allow_redirects=True,
                )
                if response.status_code >= 400:
                    last_error = f"http_{response.status_code}"
                    logger.warning("Crawl %s → HTTP %s", url, response.status_code)
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
                logger.info("Crawl success: %s — %d links found", url, len(link_details))
                return {
                    "success": True,
                    "links": links,
                    "link_details": link_details,
                    "error": None,
                }

            except Exception as exc:
                err = str(exc).lower()
                last_error = "timeout" if "timeout" in err else str(exc)
                logger.warning("Crawl %s attempt %d failed: %s", url, attempt + 1, exc)

    logger.error(
        "Crawl failed for domain '%s' (original: '%s'): %s",
        domain,
        original_domain,
        last_error,
    )
    return {"success": False, "links": [], "link_details": [], "error": last_error}


def _normalise_domain(netloc: str) -> str:
    domain = netloc.lower().split(":")[0]
    if domain.startswith("www."):
        domain = domain[4:]
    return domain
