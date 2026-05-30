"""AI-powered CAPTCHA solver for Playwright pages.
Uses OpenAI GPT-4o or Google Gemini to solve CAPTCHAs."""

import os
import base64
import tempfile
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()


def log(msg: str):
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)
    except Exception:
        pass


def image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


async def detect_captcha(page) -> bool:
    """Detect if a CAPTCHA is present on the page."""
    try:
        # Check for common CAPTCHA indicators
        captcha_selectors = [
            "[data-testid='anomaly-modal']",
            "#captcha",
            ".g-recaptcha",
            "iframe[src*='recaptcha']",
            "[data-testid='anomaly-modal-image-0']",
            ".cf-turnstile",
        ]
        for selector in captcha_selectors:
            if await page.locator(selector).count() > 0:
                return True

        # Check for text indicators
        content = await page.content()
        captcha_texts = [
            "verify you are human",
            "prove you are not a robot",
            "captcha",
            "anomaly detected",
            "unusual traffic",
        ]
        content_lower = content.lower()
        for text in captcha_texts:
            if text in content_lower:
                return True

        return False
    except Exception:
        return False


async def solve_captcha_with_ai(page, provider: str = "openai") -> bool:
    """Attempt to solve CAPTCHA using AI vision model."""
    try:
        # Take screenshot of the page
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            screenshot_path = tmp.name
            await page.screenshot(path=screenshot_path)

        if provider == "openai":
            solution = await solve_with_openai(screenshot_path)
        elif provider == "gemini":
            solution = await solve_with_gemini(screenshot_path)
        else:
            log(f"Unknown provider: {provider}")
            return False

        # Clean up temp file
        os.unlink(screenshot_path)

        if solution:
            log(f"AI solution: {solution}")
            return await apply_solution(page, solution)

        return False
    except Exception as e:
        log(f"CAPTCHA solver error: {e}")
        return False


async def solve_with_openai(image_path: str) -> dict | None:
    """Use OpenAI GPT-4o to analyze and solve CAPTCHA."""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        if not client.api_key:
            log("OpenAI API key not set")
            return None

        base64_image = image_to_base64(image_path)

        prompt = """Analyze this screenshot and help me solve the CAPTCHA.

If there's a CAPTCHA challenge visible:
1. For image selection CAPTCHAs: Tell me which grid positions (0-8, left-to-right, top-to-bottom) contain the target object.
2. For text CAPTCHAs: Read the text/numbers shown.
3. For puzzle CAPTCHAs: Estimate the pixel distance to move the slider.
4. If there's no CAPTCHA or it says "click skip", respond with {"action": "skip"}.

Respond in JSON format:
- For image selection: {"action": "click", "positions": [0, 3, 5]}
- For text: {"action": "type", "text": "abc123"}
- For puzzle: {"action": "slide", "distance": 150}
- For skip/no CAPTCHA: {"action": "skip"}
- If unclear: {"action": "unknown"}"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]}
            ],
            max_tokens=300,
            temperature=0
        )

        content = response.choices[0].message.content.strip()

        # Parse JSON response
        import json
        # Try to extract JSON from response
        json_match = content
        if "```" in content:
            import re
            match = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
            if match:
                json_match = match.group(1).strip()

        try:
            return json.loads(json_match)
        except json.JSONDecodeError:
            log(f"Failed to parse AI response: {content}")
            return None

    except Exception as e:
        log(f"OpenAI error: {e}")
        return None


async def solve_with_gemini(image_path: str) -> dict | None:
    """Use Google Gemini to analyze and solve CAPTCHA."""
    try:
        from google import genai
        from google.genai import types

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            log("Google API key not set")
            return None

        client = genai.Client(api_key=api_key)

        with open(image_path, 'rb') as f:
            image_bytes = f.read()

        prompt = """Analyze this screenshot and help me solve the CAPTCHA.

If there's a CAPTCHA challenge visible:
1. For image selection CAPTCHAs: Tell me which grid positions (0-8, left-to-right, top-to-bottom) contain the target object.
2. For text CAPTCHAs: Read the text/numbers shown.
3. For puzzle CAPTCHAs: Estimate the pixel distance to move the slider.
4. If there's no CAPTCHA or it says "click skip", respond with {"action": "skip"}.

Respond in JSON format only:
- For image selection: {"action": "click", "positions": [0, 3, 5]}
- For text: {"action": "type", "text": "abc123"}
- For puzzle: {"action": "slide", "distance": 150}
- For skip/no CAPTCHA: {"action": "skip"}
- If unclear: {"action": "unknown"}"""

        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type='image/png'),
                prompt
            ]
        )

        content = response.text.strip()

        # Parse JSON response
        import json
        import re
        json_match = content
        if "```" in content:
            match = re.search(r'```(?:json)?\s*(.*?)```', content, re.DOTALL)
            if match:
                json_match = match.group(1).strip()

        try:
            return json.loads(json_match)
        except json.JSONDecodeError:
            log(f"Failed to parse AI response: {content}")
            return None

    except Exception as e:
        log(f"Gemini error: {e}")
        return None


async def apply_solution(page, solution: dict) -> bool:
    """Apply the AI-provided solution to the page."""
    action = solution.get("action", "unknown")

    if action == "skip":
        # Try to find and click skip button
        try:
            skip_btn = page.locator("button:has-text('Skip'), a:has-text('Skip')")
            if await skip_btn.count() > 0:
                await skip_btn.first.click()
                await page.wait_for_timeout(1000)
                return True
        except Exception:
            pass
        return True  # No CAPTCHA to solve

    elif action == "click":
        positions = solution.get("positions", [])
        if not positions:
            return False

        try:
            # Find CAPTCHA image grid
            tiles = page.locator("[data-testid^='anomaly-modal-tile-']")
            if await tiles.count() == 0:
                tiles = page.locator(".rc-image-tile-wrapper, .captcha-tile")

            for pos in positions:
                if pos < await tiles.count():
                    await tiles.nth(pos).click()
                    await page.wait_for_timeout(500)

            # Look for submit/verify button
            submit = page.locator("button:has-text('Verify'), button:has-text('Submit')")
            if await submit.count() > 0:
                await submit.first.click()
                await page.wait_for_timeout(2000)

            return True
        except Exception as e:
            log(f"Click action error: {e}")
            return False

    elif action == "type":
        text = solution.get("text", "")
        if not text:
            return False

        try:
            input_field = page.locator("input[type='text'], input.captcha-input")
            if await input_field.count() > 0:
                await input_field.first.fill(text)
                await page.keyboard.press("Enter")
                await page.wait_for_timeout(2000)
                return True
        except Exception as e:
            log(f"Type action error: {e}")
            return False

    elif action == "slide":
        distance = solution.get("distance", 0)
        if not distance:
            return False

        try:
            slider = page.locator(".slider-handle, [class*='slider']")
            if await slider.count() > 0:
                box = await slider.first.bounding_box()
                if box:
                    await page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
                    await page.mouse.down()
                    await page.mouse.move(box['x'] + distance, box['y'] + box['height'] / 2, steps=10)
                    await page.mouse.up()
                    await page.wait_for_timeout(2000)
                    return True
        except Exception as e:
            log(f"Slide action error: {e}")
            return False

    return False


async def handle_captcha(page, provider: str = "openai", max_attempts: int = 3) -> bool:
    """Main function to detect and solve CAPTCHAs.

    Returns True if page is CAPTCHA-free (either no CAPTCHA or successfully solved).
    """
    for attempt in range(max_attempts):
        if not await detect_captcha(page):
            return True

        log(f"CAPTCHA detected, attempting to solve (attempt {attempt + 1}/{max_attempts})...")

        if await solve_captcha_with_ai(page, provider):
            # Wait and check if CAPTCHA is gone
            await page.wait_for_timeout(3000)
            if not await detect_captcha(page):
                log("CAPTCHA solved successfully!")
                return True
            log("CAPTCHA still present after solving attempt")
        else:
            log("Failed to solve CAPTCHA")

        # Try refreshing the page
        if attempt < max_attempts - 1:
            await page.reload()
            await page.wait_for_timeout(3000)

    return False
