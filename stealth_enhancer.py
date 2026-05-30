"""Playwright stealth helpers - reduce CAPTCHA frequency on DDG."""

UA_POOL = [
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.9",
        "viewport": {"width": 1920, "height": 1080},
        "sec_ch_ua": '"Google Chrome";v="130", "Chromium";v="130", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "Windows",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.8",
        "viewport": {"width": 1536, "height": 864},
        "sec_ch_ua": '"Google Chrome";v="129", "Chromium";v="129", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "Windows",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "accept_language": "en-GB,en;q=0.9",
        "viewport": {"width": 1366, "height": 768},
        "sec_ch_ua": '"Google Chrome";v="128", "Chromium";v="128", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "Windows",
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.9",
        "viewport": {"width": 1680, "height": 1050},
        "sec_ch_ua": '"Google Chrome";v="130", "Chromium";v="130", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "macOS",
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.9",
        "viewport": {"width": 1440, "height": 900},
        "sec_ch_ua": '"Google Chrome";v="129", "Chromium";v="129", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "macOS",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.7",
        "viewport": {"width": 1600, "height": 900},
        "sec_ch_ua": '"Google Chrome";v="127", "Chromium";v="127", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "Windows",
    },
    {
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.6",
        "viewport": {"width": 1512, "height": 982},
        "sec_ch_ua": '"Google Chrome";v="128", "Chromium";v="128", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "macOS",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "accept_language": "en-US,en;q=0.9",
        "viewport": {"width": 1280, "height": 800},
        "sec_ch_ua": '"Google Chrome";v="126", "Chromium";v="126", "Not?A_Brand";v="99"',
        "sec_ch_ua_platform": "Windows",
    },
]


def pick_identity(worker_id: int) -> dict:
    """Deterministic identity for a worker. Wraps with modulo, handles negatives."""
    if not UA_POOL:
        return {
            "user_agent": "",
            "accept_language": "en-US,en;q=0.9",
            "viewport": {"width": 1280, "height": 720},
            "sec_ch_ua": "",
            "sec_ch_ua_platform": "Windows",
        }
    return UA_POOL[worker_id % len(UA_POOL)]


FINGERPRINT_INIT_SCRIPT = r"""
// Hide navigator.webdriver flag
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Fake navigator.plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
  ],
});

// Fake navigator.languages
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

// Sync screen dimensions with viewport
Object.defineProperty(screen, 'width', { get: () => window.innerWidth });
Object.defineProperty(screen, 'height', { get: () => window.innerHeight });
Object.defineProperty(screen, 'availWidth', { get: () => window.innerWidth });
Object.defineProperty(screen, 'availHeight', { get: () => window.innerHeight });

// WebGL vendor / renderer
const _getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.';            // UNMASKED_VENDOR_WEBGL
  if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
  return _getParameter.call(this, parameter);
};

// Fake chrome runtime
window.chrome = window.chrome || {
  runtime: {},
  csi: function() {},
  loadTimes: function() {},
  app: {},
};

// Permissions consistency
const _query = navigator.permissions && navigator.permissions.query
                ? navigator.permissions.query.bind(navigator.permissions)
                : null;
if (_query) {
  navigator.permissions.query = (params) =>
    params && params.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : _query(params);
}
"""


async def apply_stealth_to_context(context, identity: dict) -> None:
    """Apply identity headers + fingerprint init script to a Playwright BrowserContext.
    Swallows exceptions so a stealth failure never blocks the run."""
    try:
        await context.set_extra_http_headers({
            "Accept-Language": identity.get("accept_language", "en-US,en;q=0.9"),
            "Sec-CH-UA": identity.get("sec_ch_ua", ""),
            # Sec-CH-UA-Platform must be a quoted string per RFC 8941 (e.g. '"Windows"').
            "Sec-CH-UA-Platform": f'"{identity.get("sec_ch_ua_platform", "Windows")}"',
            "Sec-CH-UA-Mobile": "?0",
        })
    except Exception as e:
        print(f"[stealth] set_extra_http_headers failed: {e}", flush=True)

    try:
        await context.add_init_script(FINGERPRINT_INIT_SCRIPT)
    except Exception as e:
        print(f"[stealth] add_init_script failed: {e}", flush=True)


import random as _random


async def humanize_before_search(page) -> None:
    """Inject 2-4 random mouse moves + a small scroll to mimic a human.
    Swallows exceptions; never blocks search."""
    try:
        viewport = page.viewport_size or {"width": 1280, "height": 720}
        w = max(int(viewport.get("width", 1280)), 100)
        h = max(int(viewport.get("height", 720)), 100)

        moves = _random.randint(2, 4)
        for _ in range(moves):
            x = _random.randint(20, w - 20)
            y = _random.randint(20, h - 20)
            await page.mouse.move(x, y)
            await page.wait_for_timeout(_random.randint(200, 800))

        await page.mouse.wheel(0, _random.randint(200, 600))
    except Exception as e:
        print(f"[stealth] humanize_before_search failed: {e}", flush=True)
