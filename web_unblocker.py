"""Oxylabs Web Unblocker helper - fetch hotel pages bypassing CAPTCHA.
Supports automatic credential rotation when limits are reached."""

import os
import re
import time
import urllib3
import threading
import json
from dataclasses import dataclass, field
from dotenv import load_dotenv
import requests

load_dotenv()
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from bs4 import BeautifulSoup


@dataclass
class OxylabsAccount:
    """Represents a single Oxylabs account with usage tracking."""
    username: str
    password: str
    is_exhausted: bool = False
    exhausted_until: float = 0  # timestamp when account becomes available again
    request_count: int = 0
    error_count: int = 0

    @property
    def proxy_url(self) -> str:
        return f"http://{self.username}:{self.password}@unblock.oxylabs.io:60000"

    def mark_exhausted(self, cooldown_seconds: int = 3600):
        """Mark account as exhausted with cooldown period."""
        self.is_exhausted = True
        self.exhausted_until = time.time() + cooldown_seconds
        self.error_count += 1

    def is_available(self) -> bool:
        """Check if account is available for use."""
        if not self.is_exhausted:
            return True
        # Check if cooldown has passed
        if time.time() >= self.exhausted_until:
            self.is_exhausted = False
            return True
        return False

    def reset(self):
        """Reset account status."""
        self.is_exhausted = False
        self.exhausted_until = 0
        self.error_count = 0


class CredentialRotator:
    """Manages multiple Oxylabs accounts with automatic rotation."""

    def __init__(self):
        self.accounts: list[OxylabsAccount] = []
        self.current_index: int = 0
        self.lock = threading.Lock()
        self._load_credentials()

    def _load_credentials(self):
        """Load credentials from environment variables or config."""
        # Load from .env: OXYLABS_USER_1, OXYLABS_PASS_1, OXYLABS_USER_2, etc.
        # Also support OXYLABS_USER, OXYLABS_PASS as primary account

        # Primary account
        primary_user = os.environ.get('OXYLABS_USER', '')
        primary_pass = os.environ.get('OXYLABS_PASS', '')
        if primary_user and primary_pass:
            self.accounts.append(OxylabsAccount(primary_user, primary_pass))

        # Additional accounts (OXYLABS_USER_2 through OXYLABS_USER_10)
        for i in range(2, 11):
            user = os.environ.get(f'OXYLABS_USER_{i}', '')
            password = os.environ.get(f'OXYLABS_PASS_{i}', '')
            if user and password:
                self.accounts.append(OxylabsAccount(user, password))

        # Also try loading from JSON config file
        config_path = os.path.join(os.path.dirname(__file__), 'oxylabs_accounts.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                for acc in config.get('accounts', []):
                    user = acc.get('username', '')
                    password = acc.get('password', '')
                    if user and password:
                        # Avoid duplicates
                        if not any(a.username == user for a in self.accounts):
                            self.accounts.append(OxylabsAccount(user, password))
            except Exception:
                pass

        if not self.accounts:
            print("WARNING: No Oxylabs credentials found!")

    def get_current_account(self) -> OxylabsAccount | None:
        """Get the current active account."""
        with self.lock:
            if not self.accounts:
                return None
            return self.accounts[self.current_index]

    def rotate_to_next(self) -> OxylabsAccount | None:
        """Rotate to the next available account."""
        with self.lock:
            if not self.accounts:
                return None

            # Try all accounts
            for _ in range(len(self.accounts)):
                self.current_index = (self.current_index + 1) % len(self.accounts)
                account = self.accounts[self.current_index]
                if account.is_available():
                    print(f"[Rotator] Switching to account: {account.username}")
                    return account

            # All accounts exhausted, find the one with earliest recovery
            earliest = min(self.accounts, key=lambda a: a.exhausted_until)
            wait_time = earliest.exhausted_until - time.time()
            if wait_time > 0:
                print(f"[Rotator] All accounts exhausted. Waiting {wait_time:.0f}s for {earliest.username}")
                time.sleep(min(wait_time, 60))  # Wait max 60s
            earliest.is_exhausted = False
            self.current_index = self.accounts.index(earliest)
            return earliest

    def mark_current_exhausted(self, cooldown_seconds: int = 3600):
        """Mark current account as exhausted and rotate."""
        with self.lock:
            if self.accounts:
                self.accounts[self.current_index].mark_exhausted(cooldown_seconds)
                print(f"[Rotator] Account exhausted: {self.accounts[self.current_index].username}")

    def get_stats(self) -> dict:
        """Get usage statistics for all accounts."""
        with self.lock:
            return {
                'total_accounts': len(self.accounts),
                'current_index': self.current_index,
                'current_account': self.accounts[self.current_index].username if self.accounts else None,
                'accounts': [
                    {
                        'username': a.username,
                        'is_exhausted': a.is_exhausted,
                        'request_count': a.request_count,
                        'error_count': a.error_count,
                    }
                    for a in self.accounts
                ]
            }


# Global rotator instance
_rotator = CredentialRotator()

HEADERS = {
    "X-Oxylabs-Render": "html",
}

# Rate limiter: max 3 concurrent requests to avoid blocking
_semaphore = threading.Semaphore(3)
_last_request_time = 0
_request_lock = threading.Lock()


def get_rotator() -> CredentialRotator:
    """Get the global credential rotator."""
    return _rotator


def fetch_page_via_unblocker(url: str, timeout: int = 60, retries: int = 3) -> str | None:
    """Fetch page HTML via Web Unblocker with automatic credential rotation.
    Returns None on failure."""
    global _last_request_time

    for attempt in range(retries):
        account = _rotator.get_current_account()
        if not account:
            print("[WebUnblocker] No accounts available!")
            return None

        with _semaphore:
            # Ensure minimum 500ms between requests
            with _request_lock:
                elapsed = time.time() - _last_request_time
                if elapsed < 0.5:
                    time.sleep(0.5 - elapsed)
                _last_request_time = time.time()

            try:
                proxies = {
                    "http": account.proxy_url,
                    "https": account.proxy_url,
                }

                response = requests.request(
                    "GET",
                    url,
                    verify=False,
                    proxies=proxies,
                    headers=HEADERS,
                    timeout=timeout,
                )

                account.request_count += 1

                if response.status_code == 200:
                    return response.text

                elif response.status_code == 401:
                    # Unauthorized - account credentials invalid or exhausted
                    print(f"[WebUnblocker] 401 for {account.username}, rotating...")
                    _rotator.mark_current_exhausted(cooldown_seconds=3600)
                    _rotator.rotate_to_next()
                    continue

                elif response.status_code == 403:
                    # Forbidden - possibly rate limited
                    print(f"[WebUnblocker] 403 for {account.username}, rotating...")
                    _rotator.mark_current_exhausted(cooldown_seconds=600)
                    _rotator.rotate_to_next()
                    continue

                elif response.status_code == 429:
                    # Too Many Requests - rate limited
                    print(f"[WebUnblocker] 429 rate limited for {account.username}, rotating...")
                    _rotator.mark_current_exhausted(cooldown_seconds=300)
                    _rotator.rotate_to_next()
                    continue

                elif response.status_code == 407:
                    # Proxy Authentication Required
                    print(f"[WebUnblocker] 407 auth required for {account.username}, rotating...")
                    _rotator.mark_current_exhausted(cooldown_seconds=3600)
                    _rotator.rotate_to_next()
                    continue

                else:
                    time.sleep(1)

            except requests.exceptions.Timeout:
                account.error_count += 1
                if attempt < retries - 1:
                    time.sleep(2)

            except requests.exceptions.ProxyError as e:
                if "401" in str(e) or "407" in str(e):
                    print(f"[WebUnblocker] Proxy auth error for {account.username}, rotating...")
                    _rotator.mark_current_exhausted(cooldown_seconds=3600)
                    _rotator.rotate_to_next()
                    continue
                account.error_count += 1
                if attempt < retries - 1:
                    time.sleep(1)

            except Exception as e:
                account.error_count += 1
                if attempt < retries - 1:
                    time.sleep(1)

    return None


def parse_page_text(html: str) -> str:
    """Extract visible text from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)


def count_images(html: str) -> int:
    """Count meaningful hotel images, filtering out logos/icons/tracking."""
    EXCLUDE = re.compile(
        r"logo|icon|favicon|avatar|sprite|banner|ad-|tracking|pixel|badge|"
        r"arrow|button|social|facebook|twitter|instagram|youtube|share|flag|"
        r"currency|chevron|close|menu|search|loading|spinner|placeholder|"
        r"payment|partner|award|store|app-store|google-play",
        re.IGNORECASE,
    )
    soup = BeautifulSoup(html, "html.parser")
    count = 0
    for img in soup.find_all("img"):
        w = img.get("width", "")
        h = img.get("height", "")
        try:
            if w and int(re.sub(r"[^\d]", "", str(w))) < 80:
                continue
            if h and int(re.sub(r"[^\d]", "", str(h))) < 80:
                continue
        except ValueError:
            pass

        src = (img.get("src") or img.get("data-src") or "").lower()
        alt = (img.get("alt") or "").lower()
        cls = " ".join(img.get("class", [])).lower()
        combined = f"{src} {alt} {cls}"

        if EXCLUDE.search(combined):
            continue

        if src.startswith("http"):
            count += 1

    return count
